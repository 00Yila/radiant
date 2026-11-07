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
