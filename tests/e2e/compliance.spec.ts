import { test, expect } from '@playwright/test';

const forms = [
  { label: 'contact', path: '/contact', form: 'form[action="/contact.php"]', text: /reply to your enquiry/i },
  { label: 'start-project', path: '/start-project', form: 'form[action="/contact.php"]', text: /reply to your enquiry/i },
  { label: 'cart checkout', path: '/cart', form: '#cart-checkout-form', text: /process and deliver your order/i },
  { label: 'sign-in', path: '/account/login', form: 'form[action="/account/login.php"]', text: /send your sign-in link/i },
  { label: 'Pay Now', path: '/shop/iphone-13', form: 'form[action="/checkout.php"]', text: /process and deliver your order/i },
];

test.describe('each form tells people how their details are used', () => {
  for (const f of forms) {
    test(`${f.label} form has a privacy notice linking to /privacy`, async ({ page }) => {
      await page.goto(f.path);
      const form = page.locator(f.form).first();
      const notice = form.locator('.privacy-note');
      await expect(notice).toContainText(f.text);
      await expect(notice.locator('a')).toHaveAttribute('href', '/privacy');
      // The notice sits directly above the submit control.
      await expect(form.locator('.privacy-note + button[type="submit"]')).toHaveCount(1);
    });
  }
});

test.describe('the privacy policy page', () => {
  test('has every required section and a last-updated date', async ({ page }) => {
    await page.goto('/privacy');
    for (const heading of [
      'Who we are',
      'What we collect, and why we are allowed to',
      'Cookies and similar storage',
      'What we do not do',
      'Who else handles your data',
      'Data leaving Nigeria',
      'How long we keep it',
      'Your rights',
      'Complaints',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible();
    }
    await expect(page.getByText('Last updated 16 November 2026')).toBeVisible();
    await expect(page.locator('main')).not.toContainText(/netlify/i);
  });

  test('links to the regulator', async ({ page }) => {
    await page.goto('/privacy');
    await expect(page.getByRole('link', { name: 'ndpc.gov.ng' })).toHaveAttribute(
      'href',
      'https://ndpc.gov.ng'
    );
  });
});

test.describe('the terms page', () => {
  test('shows the new sections and the last-updated date', async ({ page }) => {
    await page.goto('/terms');
    await expect(page.getByRole('heading', { level: 2, name: 'Payments' })).toBeVisible();
    await expect(
      page.getByRole('heading', { level: 2, name: 'Governing law and disputes' })
    ).toBeVisible();
    await expect(page.getByText('Last updated 16 November 2026')).toBeVisible();
  });
});

test('links in the legal pages are separated from the words before them', async ({ page }) => {
  for (const path of ['/privacy', '/terms']) {
    await page.goto(path);
    const glued = await page.$$eval('main a', (links) =>
      links
        .filter((a) => {
          const prev = a.previousSibling;
          return prev && prev.nodeType === 3 && !/[\s(]$/.test(prev.textContent ?? '');
        })
        .map((a) => a.textContent)
    );
    expect(glued, `${path}: links glued to the word before them`).toEqual([]);
  }
});
