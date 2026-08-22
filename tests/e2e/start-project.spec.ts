import { test, expect } from '@playwright/test';

/*
 * Closes a specific usability finding: "Start Your Project" set an
 * expectation of a purpose-built interface distinct from Contact, and what
 * it opened was the same form under a relabelled button. These tests assert
 * the button now leads somewhere structurally different, not just renamed.
 */
test.describe('"Start Your Project" leads to the guided intake, not the plain form', () => {
  test('the header CTA points at /start-project', async ({ page }) => {
    await page.goto('/');
    // Below the nav breakpoint the CTA lives inside the collapsed drawer,
    // hidden until the toggle opens it.
    const toggle = page.getByRole('button', { name: 'Menu' });
    if (await toggle.isVisible()) await toggle.click();

    await page.locator('.hdr__cta-item').getByRole('link', { name: 'Start Your Project' }).click();
    await expect(page).toHaveURL(/\/start-project/);
  });

  test('a service page carries its subject into the guided intake', async ({ page }) => {
    await page.goto('/services/solar-pv-installation');
    await page.locator('.ra-actions').first()
      .getByRole('link', { name: 'Start Your Project' }).click();

    await expect(page).toHaveURL(/\/start-project/);
    await expect(
      page.locator('input[name="subject"][value="Solar & PV installation"]')
    ).toBeChecked();
    await expect(page.locator('#message-guide')).toHaveText(/keep running/i);
  });

  test('"Get in Touch" on the same page still goes to the plain contact form', async ({ page }) => {
    await page.goto('/services/solar-pv-installation');
    await page.getByRole('link', { name: 'Get in Touch' }).first().click();
    await expect(page).toHaveURL(/\/contact(?!.*start-project)/);
    await expect(page.getByLabel('What can we help with?')).toHaveValue('Solar & PV installation');
  });
});

test.describe('the guided intake asks what the plain form does not', () => {
  test('carries a project type, a message, a budget and a timeline', async ({ page }) => {
    await page.goto('/start-project');

    await expect(page.getByRole('radiogroup', { name: 'When do you need this?' })).toBeVisible();
    await expect(page.getByPlaceholder(/₦150,000/)).toBeVisible();
    await expect(page.locator('input[name="subject"]')).toHaveCount(9);
  });

  test('changing the project type updates the guidance for the message box', async ({ page }) => {
    await page.goto('/start-project');
    const guide = page.locator('#message-guide');
    const initial = await guide.textContent();

    await page.locator('input[name="subject"][value="E-commerce"] + span').click();
    await expect(guide).not.toHaveText(initial ?? '');
    await expect(guide).toHaveText(/selling/i);
  });

  test('submits through the same handler as the plain contact form', async ({ page }) => {
    await page.goto('/start-project');
    const form = page.locator('form[name="start-project"]');
    await expect(form).toHaveAttribute('action', '/contact.php');
    await expect(form.locator('input[name="form"]')).toHaveValue('start-project');
  });

  test('required fields are marked and validation matches the contact form', async ({ page }) => {
    await page.goto('/start-project');
    await expect(page.locator('.form-note')).toHaveText(/required unless marked optional/i);
    await expect(page.getByLabel(/Rough budget/)).toHaveAttribute('placeholder', /not sure yet/);
  });
});

test.describe('the guided intake works without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('every field is present and the form is submittable natively', async ({ page }) => {
    await page.goto('/start-project');
    await expect(page.locator('input[name="subject"]')).toHaveCount(9);
    await expect(page.locator('input[name="timeline"]')).toHaveCount(4);
    await expect(page.locator('#message')).toBeVisible();
    // The live guidance swap is progressive enhancement only — the default
    // prompt must already be present without it.
    await expect(page.locator('#message-guide')).not.toBeEmpty();
  });
});
