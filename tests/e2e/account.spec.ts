import { test, expect } from '@playwright/test';

/*
 * The email → token → session round trip needs a live PHP runtime and mail
 * delivery, neither of which exist in this environment (same limitation
 * noted for the original checkout build). What's testable here is the
 * static frontend: the login form works with no JavaScript and posts to the
 * right place, and the static confirmation pages render correctly.
 */

test.describe('the login form works without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('posts email to account/login.php', async ({ page }) => {
    await page.goto('/account/login');

    const form = page.locator('form[action="/account/login.php"]');
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form.getByLabel('Email address')).toBeVisible();
    await expect(form.getByRole('button', { name: /send me a link/i })).toBeVisible();

    const honeypot = form.locator('input[name="bot-field"]');
    await expect(honeypot).toHaveValue('');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
  });
});

test('the check-email page renders', async ({ page }) => {
  await page.goto('/account/check-email');
  await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
});

test('the link-expired page offers a way to request a new link', async ({ page }) => {
  await page.goto('/account/link-expired');
  await expect(page.getByRole('link', { name: /request a new link/i })).toHaveAttribute('href', '/account/login/');
});
