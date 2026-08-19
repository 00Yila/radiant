import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = [
  '/', '/about', '/work', '/services', '/services/software-development',
  '/services/digital-marketing', '/contact', '/contact/thanks', '/returns',
  '/privacy', '/terms', '/shop', '/blog', '/404',
];

for (const path of PAGES) {
  test(`${path} has no detectable WCAG 2.2 AA violations`, async ({ page }) => {
    await page.goto(path);
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    const summary = results.violations.map(
      (v) => `${v.id} (${v.nodes.length}): ${v.help}`
    );
    expect(summary, `${path} violations`).toEqual([]);
  });
}

test.describe('keyboard access', () => {
  test('the skip link is the first focusable element and works', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const focused = page.locator(':focus');
    await expect(focused).toHaveText(/skip to content/i);
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main/);
  });

  test('every interactive element shows a visible focus ring', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const outline = await page.locator(':focus').evaluate(
      (el) => getComputedStyle(el).outlineStyle
    );
    expect(outline).not.toBe('none');
  });

  /*
   * The gold focus ring is invisible against a gold button, so those swap to a
   * navy or white ring depending on the register behind them. Asserting it here
   * stops a later tidy-up from collapsing the rules back to one colour.
   */
  test('the gold CTA does not take a gold focus ring', async ({ page }) => {
    await page.goto('/');
    const ring = await page.locator('a.ra-btn--gold').first().evaluate((el) => {
      el.focus();
      return getComputedStyle(el).outlineColor;
    });
    expect(ring).not.toBe('rgb(239, 180, 46)');
  });
});

test.describe('the FAQ accordion works without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('answers are reachable with scripting disabled', async ({ page }) => {
    await page.goto('/');
    const first = page.locator('details.faq').first();
    await expect(first).toBeVisible();
    await first.locator('summary').click();
    await expect(first).toHaveAttribute('open', '');
  });
});

test.describe('motion', () => {
  /*
   * emulateMedia rather than test.use({ reducedMotion }) — the fixture option
   * silently failed to apply here (matchMedia reported false inside the page),
   * so the assertion was measuring the ordinary transition and would have
   * passed only if the guard were broken. Assert the query matches first.
   */
  test('transitions are suppressed when reduced motion is requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');

    const { matches, duration } = await page
      .locator('a[class*="ra-btn"]')
      .first()
      .evaluate((el) => ({
        matches: matchMedia('(prefers-reduced-motion: reduce)').matches,
        duration: getComputedStyle(el).transitionDuration,
      }));

    expect(matches, 'reduced-motion emulation did not take effect').toBe(true);
    expect(parseFloat(duration)).toBeLessThan(0.05);
  });

  test('transitions are present when reduced motion is not requested', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/');
    const duration = await page
      .locator('a[class*="ra-btn"]')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(parseFloat(duration)).toBeGreaterThan(0.05);
  });
});

test.describe('layout', () => {
  test('no page scrolls horizontally at 320px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    for (const path of ['/', '/services', '/contact', '/shop']) {
      await page.goto(path);
      const overflows = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth
      );
      expect(overflows, `${path} overflows horizontally at 320px`).toBe(false);
    }
  });
});
