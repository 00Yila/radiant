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

    const href = await visiblePanel.getByRole('link', { name: /pre-order/i }).getAttribute('href');
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

test.describe('shop search and filter', () => {
  test('narrows the catalogue and reports how many match', async ({ page }) => {
    await page.goto('/shop');
    const tiles = page.locator('.tile');
    const total = await tiles.count();

    await expect(page.locator('#shop-filter')).toBeVisible();
    await expect(page.locator('.filter__count')).toHaveText(`${total} products`);

    await page.getByLabel('Search the shop').fill('pro max');
    await expect(tiles.locator('visible=true')).not.toHaveCount(total);
    for (const name of await tiles.locator('visible=true').locator('h3').allTextContents()) {
      expect(name.toLowerCase()).toContain('pro max');
    }

    // A search matching nothing shows the empty state, not a wall of headings.
    await page.getByLabel('Search the shop').fill('qqqq');
    await expect(page.locator('#no-results')).toBeVisible();
    await expect(page.locator('[data-section]')).toBeHidden();

    await page.getByLabel('Search the shop').fill('');
    await expect(page.locator('.filter__count')).toHaveText(`${total} products`);
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

  test('all products render and the dead filter UI stays hidden', async ({ page }) => {
    await page.goto('/shop');
    // Every product is in the HTML — this is what search engines index.
    await expect(page.locator('.tile')).toHaveCount(28);
    // Controls that cannot work must not be offered.
    await expect(page.locator('#shop-filter')).toBeHidden();
    await expect(page.locator('#no-results')).toBeHidden();
  });
});
