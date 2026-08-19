import { test, expect } from '@playwright/test';

test.describe('document head', () => {
  test('has a unique title and meta description', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Radiant Alpha/);
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', /.{50,}/);
  });

  test('declares a canonical URL on the production domain', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      'https://radiantalphadigital.com/'
    );
  });

  test('declares Open Graph tags', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:title"]')).toHaveCount(1);
    await expect(page.locator('meta[property="og:type"]')).toHaveAttribute('content', 'website');
  });

  /*
   * twitter:card was set to summary_large_image long before any image existed,
   * which rendered every shared link as a blank card. The absolute URL matters:
   * scrapers silently drop relative paths.
   */
  test('declares an absolute Open Graph image', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
      'content',
      /^https:\/\/radiantalphadigital\.com\/.+\.(png|jpg)$/
    );
    await expect(page.locator('meta[property="og:image:alt"]')).toHaveAttribute(
      'content',
      /.+/
    );
  });

  test('the Open Graph image is actually served', async ({ page, request }) => {
    await page.goto('/');
    const url = await page.locator('meta[property="og:image"]').getAttribute('content');
    const path = new URL(url!).pathname;
    const response = await request.get(path);
    expect(response.status(), `${path} must exist in the build`).toBe(200);
  });

  test('emits Organization structured data carrying the RC number', async ({ page }) => {
    await page.goto('/');
    const json = await page.locator('script[type="application/ld+json"]').first().textContent();
    const data = JSON.parse(json!);
    expect(data['@type']).toBe('Organization');
    expect(JSON.stringify(data)).toContain('9421582');
  });

  test('the home page emits FAQPage structured data', async ({ page }) => {
    await page.goto('/');
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents();
    const faq = blocks.map((b) => JSON.parse(b)).find((d) => d['@type'] === 'FAQPage');
    expect(faq, 'no FAQPage block found').toBeTruthy();
    expect(faq.mainEntity.length).toBeGreaterThanOrEqual(4);
  });

  test('sets the document language to Nigerian English', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-NG');
  });

  test('comps are excluded from indexing', async ({ page }) => {
    await page.goto('/comps/hero');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  });

  test('every page declares its own canonical', async ({ page }) => {
    for (const path of ['/about', '/services', '/contact', '/returns']) {
      await page.goto(path);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
        'href',
        `https://radiantalphadigital.com${path}/`
      );
    }
  });
});

/*
 * Sitemap/canonical agreement is asserted in tests/unit/build-output.test.ts,
 * against dist/ on disk. The sitemap is emitted at build time only, so over
 * HTTP this check silently depends on whether dev or preview happens to be
 * serving — the dev server returns the 404 page for /sitemap-0.xml.
 */
