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

/*
 * Astro inlines small scripts straight into the HTML rather than emitting .js
 * files. Counting only .js therefore reported 0 bytes while the site really
 * shipped working JavaScript — a budget that could never fail. Both forms are
 * measured now, and per page, since page weight is what a visitor on mobile
 * data actually pays.
 */
describe('JavaScript budget', () => {
  const BUDGET_BYTES = 15_360;

  /** Inline <script> only: src= is counted separately, JSON-LD is not script. */
  const INLINE_SCRIPT =
    /<script(?![^>]*\bsrc=)(?![^>]*type=["']application\/ld\+json)[^>]*>([\s\S]*?)<\/script>/g;

  const externalBytes = () =>
    built()
      .filter((f) => f.endsWith('.js'))
      .reduce((sum, f) => sum + statSync(f).size, 0);

  const pageWeights = () =>
    built()
      .filter((f) => f.endsWith('.html'))
      .map((f) => {
        const inline = (readFileSync(f, 'utf8').match(INLINE_SCRIPT) ?? []).reduce(
          (n, s) => n + Buffer.byteLength(s, 'utf8'),
          0
        );
        return { file: f, bytes: inline };
      })
      .sort((a, b) => b.bytes - a.bytes);

  it(`no page ships more than ${BUDGET_BYTES} bytes of JavaScript`, () => {
    const shared = externalBytes();
    const worst = pageWeights()[0];
    const total = worst.bytes + shared;

    expect(
      total,
      `${worst.file} carries ${worst.bytes}B inline + ${shared}B external`
    ).toBeLessThan(BUDGET_BYTES);
  });

  it('actually finds the scripts it is meant to be measuring', () => {
    // Guards the regex: if it silently stops matching, the budget above
    // becomes a test that can never fail.
    const shop = pageWeights().find((p) => p.file.includes('shop'));
    expect(shop?.bytes, 'no inline script found on the shop page').toBeGreaterThan(0);
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
