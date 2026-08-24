import { test, expect } from '@playwright/test';

/*
 * order-status.php (the actual DB lookup) isn't reachable in this
 * environment — no PHP runtime, no database. What's tested here is what the
 * static site owns: the lookup form works without JavaScript and posts to
 * the right place, and the result page renders correctly off a stubbed query
 * string, which is exactly what order-status.php's redirect hands it.
 */
test.describe('the order lookup form works without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every field is present and the form is submittable natively', async ({ page }) => {
    await page.goto('/track');

    const form = page.locator('form[action="/order-status.php"]');
    await expect(form).toHaveAttribute('method', 'get');
    await expect(form.getByLabel('Order reference')).toBeVisible();
    await expect(form.getByLabel('Email address')).toBeVisible();
    await expect(form.getByRole('button', { name: /track order/i })).toBeVisible();
  });
});

test('the reference prefills from a ?reference= link', async ({ page }) => {
  await page.goto('/track/?reference=RA-abc123');
  await expect(page.getByLabel('Order reference')).toHaveValue('RA-abc123');
});

function encodeItems(items: unknown): string {
  const json = JSON.stringify(items);
  return Buffer.from(json).toString('base64url');
}

test.describe('the result page renders a timeline from the query string', () => {
  test('shows completed steps with dates and future steps as not yet', async ({ page }) => {
    const items = [
      {
        label: 'Apple iPhone 15 Pro Max — 256GB',
        quantity: 1,
        status: 'processing',
        dates: { paid: '2026-08-01 10:00:00', processing: '2026-08-02 09:00:00' },
      },
    ];
    await page.goto(`/track/result/?ref=RA-abc123&items=${encodeItems(items)}`);

    await expect(page.getByText('Order reference RA-abc123')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Apple iPhone 15 Pro Max — 256GB × 1/ })).toBeVisible();

    const processing = page.locator('.timeline__step', { hasText: 'processing' });
    await expect(processing).toHaveClass(/is-done/);

    const delivered = page.locator('.timeline__step', { hasText: 'delivered' });
    await expect(delivered).toHaveClass(/is-pending/);
    await expect(delivered).toContainText('Not yet');
  });

  test('renders more than one item independently', async ({ page }) => {
    const items = [
      { label: 'iPhone 13 — 128GB', quantity: 1, status: 'shipped', dates: {} },
      { label: 'iPhone 15 — 256GB', quantity: 2, status: 'processing', dates: {} },
    ];
    await page.goto(`/track/result/?ref=RA-multi&items=${encodeItems(items)}`);

    await expect(page.locator('.item-card')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: /iPhone 13 — 128GB × 1/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /iPhone 15 — 256GB × 2/ })).toBeVisible();
  });

  test('shows a pending note instead of a timeline for an unpaid item', async ({ page }) => {
    const items = [{ label: 'iPhone 15', quantity: 1, status: 'pending', dates: {} }];
    await page.goto(`/track/result/?ref=RA-abc123&items=${encodeItems(items)}`);

    await expect(page.locator('.timeline')).toHaveCount(0);
    await expect(page.locator('.pending-note')).toContainText("haven't received a completed payment");
  });
});
