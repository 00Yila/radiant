import { test, expect } from '@playwright/test';

test.describe('the services page', () => {
  test('lists the five core services in two tiers', async ({ page }) => {
    await page.goto('/services');
    await expect(page.locator('.ra-card')).toHaveCount(5);
    await expect(page.getByRole('heading', { name: 'Equip' })).toHaveCount(0);
  });

  test('shows the billing unit on recurring services', async ({ page }) => {
    await page.goto('/services');
    await expect(page.locator('.ra-card', { hasText: 'Digital Marketing' })).toContainText('/month');
    await expect(page.locator('.ra-card', { hasText: 'IT Consulting' })).toContainText('/hour');
  });
});

test.describe('navigation', () => {
  test('the header no longer lists Shop or Your orders', async ({ page }) => {
    await page.goto('/');
    const header = page.locator('header.hdr');
    await expect(header.getByRole('link', { name: 'Shop' })).toHaveCount(0);
    await expect(header.getByRole('link', { name: 'Your orders' })).toHaveCount(0);
  });

  test('the footer links to the shop and to order history', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'Shop (phones)' })).toHaveAttribute('href', '/shop');
    await expect(footer.getByRole('link', { name: 'Your orders' })).toHaveAttribute('href', '/account/login');
  });
});
