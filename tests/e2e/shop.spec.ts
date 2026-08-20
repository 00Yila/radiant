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
