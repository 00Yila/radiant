import { test, expect } from '@playwright/test';

/*
 * The storage picker is radios plus CSS sibling selectors, chosen so it works
 * with scripting disabled. That property is invisible in normal testing — the
 * page looks identical either way — so it is asserted explicitly.
 */
test.describe('the storage picker works without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('switching storage changes price, reference and the order link', async ({ page }) => {
    await page.goto('/shop/iphone-15-pro-max');

    const visiblePanel = page.locator('.buy__panel:visible');
    await expect(visiblePanel).toHaveCount(1);
    await expect(visiblePanel).toContainText('₦1,154,150');
    await expect(visiblePanel).toContainText('IP15PM-256');

    await page.getByText('512GB', { exact: true }).click();

    await expect(visiblePanel).toHaveCount(1);
    await expect(visiblePanel).toContainText('₦1,225,350');
    await expect(visiblePanel).toContainText('IP15PM-512');

    const href = await visiblePanel.getByRole('link', { name: /ask on whatsapp first/i }).getAttribute('href');
    expect(decodeURIComponent(href!)).toContain('512GB — ₦1,225,350');
    expect(decodeURIComponent(href!)).toContain('Ref: IP15PM-512');
  });
});

test('every model page renders exactly one price at a time', async ({ page }) => {
  for (const slug of ['iphone-x', 'iphone-xr', 'iphone-17', 'iphone-14-pro-max']) {
    await page.goto(`/shop/${slug}`);
    await expect(page.locator('.buy__panel:visible'), slug).toHaveCount(1);
  }
});

test.describe('shop search, filter and paging', () => {
  test('shows ten by default and pages through the rest', async ({ page }) => {
    await page.goto('/shop');
    const tiles = page.locator('#catalogue .tile');
    const total = await tiles.count();

    await expect(page.locator('#shop-filter')).toBeVisible();
    await expect(tiles.locator('visible=true')).toHaveCount(10);
    await expect(page.locator('.more__status')).toHaveText(`Showing 10 of ${total}`);

    // The button now states how many it loads, e.g. "Show 10 more products" —
    // match loosely so the count/wording can flex without breaking the test.
    await page.getByRole('button', { name: /^Show \d+ more/ }).click();
    await expect(tiles.locator('visible=true')).toHaveCount(20);
  });

  test('the page size control changes how many load at a time', async ({ page }) => {
    await page.goto('/shop');
    const tiles = page.locator('#catalogue .tile');

    await page.getByLabel('How many to show').selectOption('5');
    await expect(tiles.locator('visible=true')).toHaveCount(5);

    await page.getByRole('button', { name: /^Show \d+ more/ }).click();
    await expect(tiles.locator('visible=true')).toHaveCount(10);

    await page.getByLabel('How many to show').selectOption('15');
    await expect(tiles.locator('visible=true')).toHaveCount(15);
  });

  test('search narrows the catalogue and hides paging once everything fits', async ({ page }) => {
    await page.goto('/shop');
    const tiles = page.locator('#catalogue .tile');

    await page.getByLabel('Search').fill('pro max');
    for (const name of await tiles.locator('visible=true').locator('h3').allTextContents()) {
      expect(name.toLowerCase()).toContain('pro max');
    }
    await expect(page.getByRole('button', { name: /^Show \d+ more/ })).toBeHidden();

    await page.getByLabel('Search').fill('qqqq');
    await expect(page.locator('#no-results')).toBeVisible();
    await expect(tiles.locator('visible=true')).toHaveCount(0);
  });

  test('category chips filter and report pressed state', async ({ page }) => {
    await page.goto('/shop');
    const phones = page.getByRole('button', { name: 'Phones' });
    await phones.click();
    await expect(phones).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByRole('button', { name: 'All' })).toHaveAttribute('aria-pressed', 'false');
  });

});

test.describe('the catalogue is complete without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every product renders and the dead controls stay hidden', async ({ page }) => {
    await page.goto('/shop');
    // All 28 are in the HTML — this is what search engines index.
    await expect(page.locator('#catalogue .tile')).toHaveCount(28);
    await expect(page.locator('#catalogue .tile').last()).toBeVisible();
    // Controls that cannot work must not be offered.
    await expect(page.locator('#shop-filter')).toBeHidden();
    await expect(page.locator('.more')).toBeHidden();
    await expect(page.locator('#no-results')).toBeHidden();
  });
});

test.describe('the Pay Now form works without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  // Full purchase completion isn't testable without hitting real Paystack —
  // this stops at "the form submits correctly natively," matching the
  // existing no-JS variant-picker test's scope.
  test('posts the right product, variant and price to /checkout.php', async ({ page }) => {
    await page.goto('/shop/iphone-15-pro-max');

    const visiblePanel = page.locator('.buy__panel:visible');
    const form = visiblePanel.locator('form.buy__form');

    await expect(form).toHaveAttribute('action', '/checkout.php');
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form.locator('input[name="product"]')).toHaveValue('iphone-15-pro-max');
    await expect(form.locator('input[name="variant"]')).toHaveValue('IP15PM-256');
    await expect(form.getByRole('button', { name: /pay ₦1,154,150 now/i })).toBeVisible();

    // The honeypot must be present but never something a sighted or
    // keyboard user would fill in by accident.
    const honeypot = form.locator('input[name="bot-field"]');
    await expect(honeypot).toHaveValue('');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
  });

  test('switching variant updates which form is reachable', async ({ page }) => {
    await page.goto('/shop/iphone-15-pro-max');
    await page.getByText('512GB', { exact: true }).click();

    const visiblePanel = page.locator('.buy__panel:visible');
    const form = visiblePanel.locator('form.buy__form');
    await expect(form.locator('input[name="variant"]')).toHaveValue('IP15PM-512');
  });
});

test.describe('service CTAs preselect their subject', () => {
  // "Start Your Project" now leads to /start-project — see
  // tests/e2e/start-project.spec.ts for that path. This file keeps only what
  // is specific to /contact itself: its own query-param handling regardless
  // of which link sent the visitor there.
  test('an unknown subject leaves the form untouched rather than half-set', async ({ page }) => {
    await page.goto('/contact?subject=not-a-service');
    await expect(page.getByLabel('What can we help with?')).toHaveValue('');
  });
});
