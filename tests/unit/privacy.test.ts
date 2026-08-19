import { describe, it, expect, beforeAll } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const DIST = 'dist';

/**
 * Each entry is [label, pattern]. Patterns are regexes, not substrings:
 * "b09" is short enough to occur by chance inside a content-hashed asset
 * filename or a minified bundle, so it is matched with word boundaries.
 */
const FORBIDDEN: Array<[string, RegExp]> = [
  ['street address', /standard\s+estate/i],
  ['street address', /galadimawa/i],
  ['street address', /\bb09\b/i],
  ['tax identification number', /2623730842678/],
  ['superseded email', /00yila\.dev/i],
  ['superseded phone', /\+?234\s*704\s*015\s*9044/],
  ['superseded phone', /\b7040159044\b/],
];

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

describe('built output contains no private or superseded details', () => {
  let files: string[] = [];

  beforeAll(() => {
    files = walk(DIST)
      // Author-controlled output only. Hashed asset bundles under _astro/
      // are compiled artefacts of these same sources, so scanning them adds
      // no coverage and invites false positives from content hashes.
      .filter((f) => /\.(html|xml|txt|json)$/.test(f));
    expect(files.length, 'run `npm run build` before this test').toBeGreaterThan(0);
  });

  it.each(FORBIDDEN)('never leaks the %s (%s)', (_label, pattern) => {
    const offenders = files.filter((file) => pattern.test(readFileSync(file, 'utf8')));
    expect(offenders, `matched ${pattern} in: ${offenders.join(', ')}`).toEqual([]);
  });

  it('publishes the RC number, which is intentional', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toContain('9421582');
  });

  it('uses the current contact details', () => {
    const html = readFileSync(join(DIST, 'index.html'), 'utf8');
    expect(html).toContain('help@radiantalphadigital.com');
    expect(html).toContain('2349129665798');
  });
});

/*
 * Alt text and the JS budget are checked here rather than in Playwright: both
 * are properties of the built files themselves, so they need no browser and
 * fail in seconds instead of minutes.
 */
describe('every image in the built output carries an alt attribute', () => {
  it('has no <img> without alt', () => {
    const offenders: string[] = [];

    for (const file of walk(DIST).filter((f) => f.endsWith('.html'))) {
      const html = readFileSync(file, 'utf8');
      for (const tag of html.match(/<img\b[^>]*>/g) ?? []) {
        if (!/\salt\s*=/.test(tag)) offenders.push(`${file}: ${tag}`);
      }
    }

    expect(offenders, offenders.join('\n')).toEqual([]);
  });
});

describe('JavaScript budget', () => {
  const BUDGET_BYTES = 15_360;

  it(`ships under ${BUDGET_BYTES} bytes of JavaScript`, () => {
    const scripts = walk(DIST).filter((f) => f.endsWith('.js'));
    const total = scripts.reduce((sum, f) => sum + statSync(f).size, 0);

    expect(
      total,
      `${(total / 1024).toFixed(1)}KB across ${scripts.length} file(s):\n${scripts.join('\n')}`
    ).toBeLessThan(BUDGET_BYTES);
  });
});
