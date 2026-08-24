import { test, expect, type Page } from '@playwright/test';

/*
 * The cart only exists as localStorage state, so every test seeds it via
 * page.evaluate before navigating to /cart/ — there is no server-side cart
 * to set up. checkout.php itself can't be exercised here (no PHP runtime),
 * so these tests stop at "the form is populated and points at the right
 * place," the same boundary the Pay Now no-JS tests use.
 */

type SeedItem = { product: string; variant: string; label: string; price: number; quantity: number };

async function seedCart(page: Page, items: SeedItem[]) {
  await page.goto('/cart/');
  await page.evaluate((data) => localStorage.setItem('ra-cart', JSON.stringify(data)), items);
  await page.reload();
}

test('an empty cart shows the empty message, not a checkout form', async ({ page }) => {
  await page.goto('/cart/');
  await expect(page.locator('#cart-empty')).toBeVisible();
  await expect(page.locator('#cart-checkout-form')).toBeHidden();
});

test('a seeded cart renders its lines and total', async ({ page }) => {
  await seedCart(page, [
    { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000, quantity: 2 },
  ]);

  await expect(page.locator('.cart-line')).toHaveCount(1);
  await expect(page.locator('.cart-line__price')).toContainText('760,000');
  await expect(page.locator('#cart-total')).toContainText('760,000');
});

test('removing the only line shows the empty message again', async ({ page }) => {
  await seedCart(page, [
    { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000, quantity: 1 },
  ]);

  await page.locator('.cart-line__remove').click();
  await expect(page.locator('#cart-empty')).toBeVisible();
});

test('the checkout form posts the serialized cart to /checkout.php', async ({ page }) => {
  await seedCart(page, [
    { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000, quantity: 2 },
    { product: 'iphone-15', variant: 'IP15-256', label: '256GB', price: 900000, quantity: 1 },
  ]);

  const form = page.locator('#cart-checkout-form');
  await expect(form).toHaveAttribute('action', '/checkout.php');

  const itemsFieldValue = await page.locator('#cart-items-field').inputValue();
  expect(JSON.parse(itemsFieldValue)).toEqual([
    { product: 'iphone-13', variant: 'IP13-128-BLK', quantity: 2 },
    { product: 'iphone-15', variant: 'IP15-256', quantity: 1 },
  ]);
});

test('Add to Cart on a product page updates the header badge', async ({ page }) => {
  await page.goto('/shop/iphone-15-pro-max');
  await page.evaluate(() => localStorage.removeItem('ra-cart'));
  await page.reload();

  await expect(page.locator('#cart-badge')).toBeHidden();

  await page.locator('.buy__panel:visible .buy__add-cart').click();
  await expect(page.locator('#cart-badge')).toBeVisible();
  await expect(page.locator('#cart-badge')).toHaveText('1');
});
