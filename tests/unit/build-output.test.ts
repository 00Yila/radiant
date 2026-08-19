import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Properties of the built files themselves. These need no browser, so they run
 * here in seconds rather than in Playwright — and unlike an HTTP check they
 * always read the real build, not whichever server happens to be listening.
 */

const DIST = 'dist';

function walk(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? walk(path) : [path];
  });
}

const built = () => {
  const files = walk(DIST);
  expect(files.length, 'run `npm run build` before this test').toBeGreaterThan(0);
  return files;
};

describe('every image in the built output carries an alt attribute', () => {
  it('has no <img> without alt', () => {
    const offenders: string[] = [];

    for (const file of built().filter((f) => f.endsWith('.html'))) {
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
    const scripts = built().filter((f) => f.endsWith('.js'));
    const total = scripts.reduce((sum, f) => sum + statSync(f).size, 0);

    expect(
      total,
      `${(total / 1024).toFixed(1)}KB across ${scripts.length} file(s):\n${scripts.join('\n')}`
    ).toBeLessThan(BUDGET_BYTES);
  });
});

/*
 * The canonical and the sitemap must name the same URL for a page. They
 * disagreed on every page but the home page until the canonical gained the
 * trailing slash the directory-based output already used — two different
 * "preferred" URLs for one document, which is what canonical exists to prevent.
 */
describe('the sitemap agrees with the pages it lists', () => {
  const sitemap = () => readFileSync(join(DIST, 'sitemap-0.xml'), 'utf8');

  it('omits the internal comps, which are noindex and robots-disallowed', () => {
    expect(sitemap()).not.toContain('/comps/');
  });

  it('lists the canonical URL of every indexable page', () => {
    const xml = sitemap();
    const missing: string[] = [];

    for (const file of built().filter((f) => f.endsWith('.html'))) {
      const html = readFileSync(file, 'utf8');
      if (/<meta\s+name="robots"\s+content="[^"]*noindex/.test(html)) continue;

      const canonical = html.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
      expect(canonical, `${file} declares no canonical`).toBeTruthy();
      if (!xml.includes(`<loc>${canonical}</loc>`)) missing.push(`${file} -> ${canonical}`);
    }

    expect(missing, `not listed in the sitemap:\n${missing.join('\n')}`).toEqual([]);
  });
});
