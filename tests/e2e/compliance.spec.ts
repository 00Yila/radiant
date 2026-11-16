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
