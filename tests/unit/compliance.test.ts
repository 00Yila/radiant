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
    expect(component).toContain('We use these details only to find your order.');
  });
});

describe('every form that collects personal data carries the notice', () => {
  const pages: Array<[string, string, string]> = [
    ['src/pages/contact.astro', 'enquiry', 'Send message'],
    ['src/pages/start-project.astro', 'enquiry', 'Send project brief'],
    ['src/pages/cart/index.astro', 'order', 'Proceed to Payment'],
    ['src/pages/account/login.astro', 'signin', 'Send me a link'],
    ['src/pages/shop/[product].astro', 'order', 'Pay {formatNaira(v.price)} now'],
    ['src/pages/track/index.astro', 'lookup', 'Track order</button>'],
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

describe('the order lookup form keeps the email out of the web address', () => {
  const page = readFileSync('src/pages/track/index.astro', 'utf8');

  it('submits with POST, not GET', () => {
    expect(page).toContain('<form method="post" action="/order-status.php"');
    expect(page).not.toContain('method="get"');
  });
});

describe('expired login tokens are not kept forever', () => {
  const php = readFileSync('public/account/login.php', 'utf8');

  it('deletes expired tokens with a prepared statement', () => {
    expect(php).toContain("DELETE FROM login_tokens WHERE expires_at < NOW()");
  });

  it('prunes before inserting the new token', () => {
    const prune = php.indexOf('DELETE FROM login_tokens');
    const insert = php.indexOf('INSERT INTO login_tokens');
    expect(prune).toBeGreaterThan(-1);
    expect(insert).toBeGreaterThan(-1);
    expect(prune).toBeLessThan(insert);
  });
});

describe('the privacy policy describes what the site really does', () => {
  const page = readFileSync('src/pages/privacy.astro', 'utf8');

  it('no longer names Netlify as the host', () => {
    expect(page).not.toMatch(/netlify/i);
  });

  it.each([
    'Hostinger',
    'Paystack',
    'WhatsApp',
    'Nigeria Data Protection Commission',
    'ndpc.gov.ng',
    'legitimate interest',
    'outside Nigeria',
    'session cookie',
  ])('mentions %s', (phrase) => {
    expect(page).toContain(phrase);
  });

  it('states fixed retention periods', () => {
    expect(page).toContain('2 years');
    expect(page).toContain('6 years');
    expect(page).toContain('expired ones are cleared out whenever a new link is requested');
  });

  it('shows the shared last-updated date', () => {
    expect(page).toContain('SITE.legalUpdated');
  });

  it('discloses server logs and how long they are kept', () => {
    expect(page).toContain('<strong>Server logs.</strong>');
    expect(page).toContain('your IP address, browser type and the pages you request');
    expect(page).toContain('<strong>Server logs:</strong> kept for a short period set by our host.');
  });

  it('says what Paystack receives', () => {
    expect(page).toContain(
      'Paystack processes payments: we give it your email address, the amount and an order reference,'
    );
    expect(page).not.toContain('processes card payments');
  });

  it('describes the enquiry fields and the cookie condition accurately', () => {
    expect(page).toContain('an optional phone number, the subject and your message');
    expect(page).toContain('only if you use &ldquo;Your orders&rdquo;');
    expect(page).not.toContain('only if you sign in');
  });

  it('cites no statute section numbers', () => {
    expect(page).not.toMatch(/\bsection\s+\d+\b/i);
    expect(page).not.toMatch(/\bs\.\s?\d+\b/);
  });

  it('does not claim NDPC registration', () => {
    expect(page).not.toMatch(/registered with the (nigeria data protection|ndpc)/i);
  });
});

describe('the terms match instant checkout', () => {
  const page = readFileSync('src/pages/terms.astro', 'utf8');

  it('confirms orders on payment, not on a quoted price', () => {
    expect(page).toContain('after your payment is confirmed');
    expect(page).toContain('the price shown at checkout when you pay');
    expect(page).not.toContain('confirmed with you at the point of order');
  });

  it('explains payments and refunds through Paystack', () => {
    expect(page).toContain('Paystack');
    expect(page).toContain('<h2>Payments</h2>');
  });

  it('has governing law and a dispute step', () => {
    expect(page).toContain('<h2>Governing law and disputes</h2>');
    expect(page).toContain('laws of the Federal Republic of Nigeria');
    expect(page).toContain('within 30 days');
  });

  it('shows the shared last-updated date', () => {
    expect(page).toContain('SITE.legalUpdated');
  });

  it('leaves the cancellation sentence exactly as it was', () => {
    expect(page).toContain(
      'Once procurement and shipping have begun, an order cannot be cancelled.'
    );
  });
});

describe('the privacy policy states a recognised basis for WhatsApp messages', () => {
  it('does not say "you contacted us" is the basis', () => {
    const page = readFileSync('src/pages/privacy.astro', 'utf8');
    expect(page).not.toContain('Our basis is that you contacted us');
    expect(page).toContain('Our basis is taking steps at your request.');
  });
});
