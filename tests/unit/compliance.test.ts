import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { SITE } from '../../src/lib/site';

describe('one shared date for the legal pages', () => {
  it('defines legalUpdated', () => {
    expect(SITE.legalUpdated).toBe('16 November 2026');
  });
});

describe('the privacy notice component', () => {
  const component = readFileSync('src/components/PrivacyNote.astro', 'utf8');

  it('links to the privacy policy', () => {
    expect(component).toContain('href="/privacy"');
  });

  it('has wording for each kind of form', () => {
    expect(component).toContain('We use these details only to reply to your enquiry.');
    expect(component).toContain(
      'We use these details to process and deliver your order. Card payments are handled by Paystack.'
    );
    expect(component).toContain("We'll use your email only to send your sign-in link.");
  });
});

describe('every form that collects personal data carries the notice', () => {
  const pages: Array<[string, string, string]> = [
    ['src/pages/contact.astro', 'enquiry', 'Send message'],
    ['src/pages/start-project.astro', 'enquiry', 'Send project brief'],
    ['src/pages/cart/index.astro', 'order', 'Proceed to Payment'],
    ['src/pages/account/login.astro', 'signin', 'Send me a link'],
    ['src/pages/shop/[product].astro', 'order', 'Pay {formatNaira(v.price)} now'],
  ];

  it.each(pages)('%s shows a %s notice before its submit button', (file, kind, label) => {
    const source = readFileSync(file, 'utf8');
    const note = source.indexOf(`<PrivacyNote kind="${kind}" />`);
    // lastIndexOf: the label may also appear earlier, in a comment.
    const button = source.lastIndexOf(label);
    expect(note, `no <PrivacyNote kind="${kind}" /> in ${file}`).toBeGreaterThan(-1);
    expect(button, `could not find the submit button "${label}" in ${file}`).toBeGreaterThan(-1);
    expect(note).toBeLessThan(button);
  });
});
