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

test.describe('the homepage', () => {
  test('leads with the web and software offer', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Fast, mobile-first websites and web apps for Abuja businesses.'
    );
    await expect(page.locator('main')).toContainText(
      "Websites from ₦150,000, live in 2–3 weeks. Software, e-commerce and marketing when you're ready."
    );
  });

  test('offers a free review over WhatsApp as the low-commitment step', async ({ page }) => {
    await page.goto('/');
    const review = page.getByRole('link', { name: 'WhatsApp us your current site for a free review' });
    await expect(review).toHaveAttribute('href', /^https:\/\/wa\.me\/2349129665798\?text=/);
    // Scoped to the hero: the header's own CTA sits in the collapsed menu on mobile.
    await expect(page.locator('.hero').getByRole('link', { name: 'Start Your Project' })).toBeVisible();
  });

  test('shows evidenced web facts in the trust strip, not phone retail', async ({ page }) => {
    await page.goto('/');
    const creds = page.locator('.creds');
    await expect(creds).toContainText('RC 9421582');
    await expect(creds).toContainText('From ₦150,000');
    await expect(creds).toContainText('2–3 weeks');
    await expect(creds).not.toContainText('pre-order');
    await expect(creds).not.toContainText('hardware');
  });

  test('no longer sells phones', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: /Technology products/i })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Browse the Shop' })).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText('Smartphones');
  });
});
