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

test.describe('the result page renders a timeline from the query string', () => {
  test('shows completed steps with dates and future steps as not yet', async ({ page }) => {
    await page.goto(
      '/track/result/?ref=RA-abc123&product=Apple%20iPhone%2015%20Pro%20Max%20%E2%80%94%20256GB&status=processing&paid_at=2026-08-01%2010%3A00%3A00&processing_at=2026-08-02%2009%3A00%3A00'
    );

    await expect(page.getByRole('heading', { name: 'Apple iPhone 15 Pro Max — 256GB' })).toBeVisible();
    await expect(page.getByText('Order reference RA-abc123')).toBeVisible();

    const timeline = page.locator('#timeline');
    await expect(timeline).toBeVisible();

    const paid = timeline.locator('[data-step="paid"]');
    await expect(paid).toHaveClass(/is-done/);
    await expect(paid).toContainText('2026-08-01 10:00:00');

    const processing = timeline.locator('[data-step="processing"]');
    await expect(processing).toHaveClass(/is-current/);

    const shipped = timeline.locator('[data-step="shipped"]');
    await expect(shipped).toHaveClass(/is-pending/);
    await expect(shipped).toContainText('Not yet');

    const delivered = timeline.locator('[data-step="delivered"]');
    await expect(delivered).toHaveClass(/is-pending/);
  });

  test('shows a pending note instead of a timeline for an unpaid order', async ({ page }) => {
    await page.goto('/track/result/?ref=RA-abc123&product=Apple%20iPhone%2015&status=pending');

    await expect(page.locator('#timeline')).toBeHidden();
    await expect(page.locator('#pending-note')).toBeVisible();
    await expect(page.locator('#pending-note')).toContainText("haven't received a completed payment");
  });

  test('shows a failed message for a payment that never went through', async ({ page }) => {
    await page.goto('/track/result/?ref=RA-abc123&product=Apple%20iPhone%2015&status=failed');

    await expect(page.locator('#timeline')).toBeHidden();
    await expect(page.locator('#pending-note')).toContainText("payment didn't complete");
  });
});
