# Compliance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Privacy Policy and Terms accurate and NDPA-aligned, add a one-line privacy notice at every form, and make the policy's "login links are deleted once expired" promise true.

**Architecture:** Astro static pages plus one tiny PHP change. One shared `PrivacyNote` component renders the notice at all five forms, one shared `SITE.legalUpdated` field dates both legal pages, and Vitest source checks plus Playwright rendered checks guard every promise the policy makes.

**Tech Stack:** Astro 7, TypeScript, Vitest, Playwright, PHP (Hostinger).

**Spec:** `docs/superpowers/specs/2026-11-16-compliance-design.md`

## Global Constraints

- Retention periods are exactly: enquiry emails **2 years** after the last contact; order records **6 years**; login tokens deleted once expired.
- No statute section numbers anywhere in the published copy. Describe the rights and lawful bases in plain language only.
- No consent checkbox and no cookie banner.
- The existing cancellation sentence in Terms ("Once procurement and shipping have begun, an order cannot be cancelled.") must NOT be changed, and no new cancellation or refund promise may be added.
- The policy must not claim NDPC registration either way, and must not name a country for server locations.
- Do not touch `public/contact.php`, `checkout.php`, refunds/returns/warranty copy, or `tests/unit/privacy.test.ts`.
- `SITE.legalUpdated` is exactly `'16 November 2026'`.
- There is no PHP runtime in dev. The `login.php` change is verified by reading its source in a test; do not claim it was executed.
- Commit messages carry NO attribution or co-author trailer lines.
- Work from the repo root: `C:\Users\hp\OneDrive\Desktop\CT New folder\.claude\worktrees\practical-sanderson-255ced`. Stage specific files, never `git add -A` (a hook modifies `.impeccable/hook.cache.json`, which must not be committed).

## Running the tests

- Unit: `npx vitest run <file>` (all: `npm run test:unit`).
- E2E needs a fresh build: `npm run build`, then `npx playwright test <file>`. Astro's preview runs as a background daemon, so Playwright may print `Process from config.webServer exited early` on the first run; run the same command once more. Make sure no `astro dev` server is on port 4321 (its toolbar breaks mobile tests). When finished: `npx astro preview stop`.

## File map

| File | Change |
|---|---|
| `src/lib/site.ts` | add `legalUpdated` (Task 1) |
| `src/components/PrivacyNote.astro` | new shared notice (Task 1) |
| `src/pages/contact.astro`, `start-project.astro`, `shop/[product].astro`, `cart/index.astro`, `account/login.astro` | add `<PrivacyNote>` above each submit button (Task 1) |
| `tests/unit/compliance.test.ts`, `tests/e2e/compliance.spec.ts` | new; grown across tasks |
| `public/account/login.php` | prune expired tokens (Task 2) |
| `src/pages/privacy.astro` | rewrite (Task 3) |
| `src/pages/terms.astro` | targeted edits (Task 4) |

---

### Task 1: Shared date, shared notice component, and a notice on all five forms

**Files:**
- Modify: `src/lib/site.ts`, `src/pages/contact.astro`, `src/pages/start-project.astro`, `src/pages/shop/[product].astro`, `src/pages/cart/index.astro`, `src/pages/account/login.astro`
- Create: `src/components/PrivacyNote.astro`, `tests/unit/compliance.test.ts`, `tests/e2e/compliance.spec.ts`

**Interfaces:**
- Produces: `SITE.legalUpdated: '16 November 2026'` (used by Tasks 3 and 4).
- Produces: `<PrivacyNote kind="enquiry" | "order" | "signin" />`, rendering `<p class="privacy-note">…See our <a href="/privacy">privacy policy</a>.</p>`.
- Produces: `tests/unit/compliance.test.ts` and `tests/e2e/compliance.spec.ts`; Tasks 2-4 append to them.

- [ ] **Step 1: Write the failing tests**

Create `tests/unit/compliance.test.ts`:

```ts
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
```

Create `tests/e2e/compliance.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the tests and confirm they fail**

Run: `npx vitest run tests/unit/compliance.test.ts`
Expected: FAIL (`legalUpdated` is undefined and `PrivacyNote.astro` does not exist).

- [ ] **Step 3: Add the shared date to `src/lib/site.ts`**

old:
```ts
  preOrderLeadTime: '3–4 weeks',
} as const);
```
new:
```ts
  preOrderLeadTime: '3–4 weeks',

  /** Shown as "Last updated" on both the Privacy Policy and the Terms. */
  legalUpdated: '16 November 2026',
} as const);
```

- [ ] **Step 4: Create `src/components/PrivacyNote.astro`**

```astro
---
/*
 * The one-sentence notice shown directly above a form's submit button. Every
 * form on the site that collects personal data uses this, so the wording and
 * the link to /privacy cannot drift between forms.
 */
interface Props {
  kind: 'enquiry' | 'order' | 'signin';
}
const { kind } = Astro.props;

const text = {
  enquiry: 'We use these details only to reply to your enquiry.',
  order:
    'We use these details to process and deliver your order. Card payments are handled by Paystack.',
  signin: "We'll use your email only to send your sign-in link.",
}[kind];
---
<p class="privacy-note">{text} See our <a href="/privacy">privacy policy</a>.</p>

<style>
  .privacy-note {
    font-size: var(--ra-step--1);
    color: var(--ra-fg-muted);
  }
  .privacy-note a {
    text-decoration: underline;
  }
</style>
```

- [ ] **Step 5: Add the notice to the five forms**

`src/pages/contact.astro`:

old: `import Section from '../components/Section.astro';`
new:
```astro
import Section from '../components/Section.astro';
import PrivacyNote from '../components/PrivacyNote.astro';
```
old: `          <button type="submit" class="ra-btn ra-btn--primary">Send message</button>`
new:
```astro
          <PrivacyNote kind="enquiry" />
          <button type="submit" class="ra-btn ra-btn--primary">Send message</button>
```

`src/pages/start-project.astro`:

old: `import Section from '../components/Section.astro';`
new:
```astro
import Section from '../components/Section.astro';
import PrivacyNote from '../components/PrivacyNote.astro';
```
old: `          <button type="submit" class="ra-btn ra-btn--primary">Send project brief</button>`
new:
```astro
          <PrivacyNote kind="enquiry" />
          <button type="submit" class="ra-btn ra-btn--primary">Send project brief</button>
```

`src/pages/cart/index.astro`:

old: `import Section from '../../components/Section.astro';`
new:
```astro
import Section from '../../components/Section.astro';
import PrivacyNote from '../../components/PrivacyNote.astro';
```
old: `      <button type="submit" class="ra-btn ra-btn--gold">Proceed to Payment</button>`
new:
```astro
      <PrivacyNote kind="order" />
      <button type="submit" class="ra-btn ra-btn--gold">Proceed to Payment</button>
```

`src/pages/account/login.astro`:

old: `import Section from '../../components/Section.astro';`
new:
```astro
import Section from '../../components/Section.astro';
import PrivacyNote from '../../components/PrivacyNote.astro';
```
old: `      <button type="submit" class="ra-btn ra-btn--primary">Send me a link</button>`
new:
```astro
      <PrivacyNote kind="signin" />
      <button type="submit" class="ra-btn ra-btn--primary">Send me a link</button>
```

`src/pages/shop/[product].astro` (the per-variant Pay Now form):

old: `import Button from '../../components/Button.astro';`
new:
```astro
import Button from '../../components/Button.astro';
import PrivacyNote from '../../components/PrivacyNote.astro';
```
old:
```astro
                  <Button as="button" type="submit" variant="gold">
                    Pay {formatNaira(v.price)} now
                  </Button>
```
new:
```astro
                  <PrivacyNote kind="order" />
                  <Button as="button" type="submit" variant="gold">
                    Pay {formatNaira(v.price)} now
                  </Button>
```

- [ ] **Step 6: Run the unit tests**

Run: `npm run test:unit`
Expected: PASS, including the new `compliance.test.ts`.

- [ ] **Step 7: Build and run the e2e tests**

Run: `npm run build`, then `npx playwright test tests/e2e/compliance.spec.ts tests/e2e/cart.spec.ts tests/e2e/shop.spec.ts tests/e2e/start-project.spec.ts tests/e2e/account.spec.ts tests/e2e/accessibility.spec.ts`
Expected: PASS on `mobile` and `desktop`. The accessibility spec confirms the new notice meets contrast and structure rules; the form specs confirm the notice did not break any existing form behaviour.

- [ ] **Step 8: Commit**

```bash
git add src/lib/site.ts src/components/PrivacyNote.astro src/pages/contact.astro src/pages/start-project.astro src/pages/cart/index.astro src/pages/account/login.astro "src/pages/shop/[product].astro" tests/unit/compliance.test.ts tests/e2e/compliance.spec.ts
git commit -m "Add a privacy notice above every form that collects personal data"
```

---

### Task 2: Delete expired login tokens

**Files:**
- Modify: `public/account/login.php`
- Modify (append): `tests/unit/compliance.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `tests/unit/compliance.test.ts`:

```ts
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
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/unit/compliance.test.ts`
Expected: FAIL on both new tests.

- [ ] **Step 3: Add the prune to `public/account/login.php`**

old:
```php
$pdo = dbConnect();
$pdo->prepare(
    'INSERT INTO login_tokens (email, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))'
)->execute([$email, $tokenHash]);
```
new:
```php
$pdo = dbConnect();

// Expired links are useless and each row holds an email address, so drop them
// here instead of keeping them forever. The privacy policy promises this.
$pdo->prepare('DELETE FROM login_tokens WHERE expires_at < NOW()')->execute();

$pdo->prepare(
    'INSERT INTO login_tokens (email, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))'
)->execute([$email, $tokenHash]);
```

- [ ] **Step 4: Run the unit tests**

Run: `npm run test:unit`
Expected: PASS. Note `tests/unit/account.test.ts` still passes: its pattern only forbids `SELECT … FROM users|orders`.

- [ ] **Step 5: Commit**

```bash
git add public/account/login.php tests/unit/compliance.test.ts
git commit -m "Delete expired login tokens when a new one is issued"
```

---

### Task 3: Rewrite the privacy policy

**Files:**
- Modify: `src/pages/privacy.astro` (full replacement)
- Modify (append): `tests/unit/compliance.test.ts`, `tests/e2e/compliance.spec.ts`

**Interfaces:**
- Consumes: `SITE.legalUpdated`, `SITE.legalName`, `SITE.rcNumber`, `SITE.location`, `SITE.email`, `SITE.phoneDisplay` from `src/lib/site.ts`.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/compliance.test.ts`:

```ts
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

  it('cites no statute section numbers', () => {
    expect(page).not.toMatch(/\bsection\s+\d+\b/i);
    expect(page).not.toMatch(/\bs\.\s?\d+\b/);
  });

  it('does not claim NDPC registration', () => {
    expect(page).not.toMatch(/registered with the (nigeria data protection|ndpc)/i);
  });
});
```

Append to `tests/e2e/compliance.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the unit tests and confirm they fail**

Run: `npx vitest run tests/unit/compliance.test.ts`
Expected: FAIL (Netlify still present; the new phrases are missing).

- [ ] **Step 3: Replace `src/pages/privacy.astro` with this complete file**

```astro
---
import Base from '../layouts/Base.astro';
import Section from '../components/Section.astro';
import { SITE } from '../lib/site';
---
<Base
  title="Privacy Policy"
  description="How Radiant Alpha Digital Services collects, uses, and protects the personal information you give us through our website, orders and contact channels."
  path="/privacy"
>
  <Section register="dark">
    <h1 class="ra-display">Privacy Policy</h1>
    <p class="ra-lede lede--tight">How we handle the information you give us.</p>
  </Section>

  <Section>
    <div class="ra-measure ra-prose">
      <p class="updated">Last updated {SITE.legalUpdated}</p>

      <h2>Who we are</h2>
      <p>
        {SITE.legalName}, RC {SITE.rcNumber}, {SITE.location}, is responsible for the
        personal information described on this page. Questions about it:
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> or {SITE.phoneDisplay}.
      </p>

      <h2>What we collect, and why we are allowed to</h2>
      <ul>
        <li>
          <strong>Enquiry and project forms.</strong> Your name, email address, phone
          number and message and, on the project form, your budget and timeline. We use
          them to reply to you and to scope your project. Our basis is taking steps at
          your request before a contract.
        </li>
        <li>
          <strong>Orders.</strong> Your name, email address, phone number and what you
          ordered. We use them to take payment, source and deliver your order and support
          you afterwards. Our basis is performing the contract with you. We also keep order
          records because the law requires us to keep accounts.
        </li>
        <li>
          <strong>Your orders and order tracking.</strong> Your email address and order
          reference, a one-time sign-in link we email you, and a session cookie. We use
          them to show you your own orders and nobody else&rsquo;s. Our basis is
          performing the contract with you and our legitimate interest in keeping your
          orders secure.
        </li>
        <li>
          <strong>WhatsApp.</strong> Your phone number and the messages you send. We use
          them to reply to you. Our basis is that you contacted us.
        </li>
      </ul>

      <h2>Cookies and similar storage</h2>
      <p>
        We set one cookie, and only if you sign in to &ldquo;Your orders&rdquo;: a session
        cookie that keeps you signed in. It is strictly necessary for that feature and is
        deleted when you close your browser. Your shopping cart is kept in your own
        browser&rsquo;s storage on your device and is not sent to us until you check out.
        We do not use analytics, advertising or tracking cookies.
      </p>

      <h2>What we do not do</h2>
      <ul>
        <li>We do not sell, rent, or trade your personal information</li>
        <li>We do not share it with third parties for marketing</li>
        <li>We do not send marketing messages you did not ask for</li>
        <li>We do not use advertising or tracking cookies on this site</li>
      </ul>

      <h2>Who else handles your data</h2>
      <p>
        Hostinger hosts this website, our order database and our email. Paystack
        processes card payments: you enter your card details on Paystack&rsquo;s own page
        and we never see or store them. WhatsApp handles WhatsApp messages. Each of these
        providers processes data under its own privacy policy and security commitments.
      </p>

      <h2>Data leaving Nigeria</h2>
      <p>
        Some of these providers may store or process your information on servers outside
        Nigeria. When they do, we rely on their own data-protection commitments.
      </p>

      <h2>How long we keep it</h2>
      <ul>
        <li><strong>Enquiries:</strong> 2 years after our last contact with you.</li>
        <li>
          <strong>Order records:</strong> 6 years from the date of the order, for warranty,
          accounting and tax purposes.
        </li>
        <li>
          <strong>Sign-in links:</strong> deleted after they expire. They last 15 minutes,
          and expired ones are cleared out whenever a new link is requested.
        </li>
      </ul>

      <h2>Your rights</h2>
      <p>
        Under the Nigeria Data Protection Act you may ask for a copy of the personal
        information we hold about you, ask us to correct or delete it, ask us to restrict
        how we use it, object to our use of it, receive it in a portable format, and
        withdraw your consent where we rely on consent. We cannot delete records we are
        legally required to keep, such as order records, before the period above ends.
        Email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> and we will respond within
        30 days.
      </p>

      <h2>Complaints</h2>
      <p>
        If you are unhappy with how we have handled your information, please tell us
        first at <a href={`mailto:${SITE.email}`}>{SITE.email}</a> so we can put it right.
        You also have the right to complain to the Nigeria Data Protection Commission
        (<a href="https://ndpc.gov.ng" rel="noopener noreferrer">ndpc.gov.ng</a>).
      </p>
    </div>
  </Section>
</Base>

<style>
  .lede--tight { margin-block: var(--ra-space-m) 0; }
  .updated { color: var(--ra-fg-muted); font-size: var(--ra-step--1); }
</style>
```

- [ ] **Step 4: Run the unit tests**

Run: `npm run test:unit`
Expected: PASS (the existing `privacy.test.ts` leak check still passes: the new page contains no street address, TIN, or superseded contact details).

- [ ] **Step 5: Build and run the e2e tests**

Run: `npm run build`, then `npx playwright test tests/e2e/compliance.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/seo.spec.ts`
Expected: PASS on `mobile` and `desktop`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/privacy.astro tests/unit/compliance.test.ts tests/e2e/compliance.spec.ts
git commit -m "Rewrite the privacy policy to match how the site actually works"
```

---

### Task 4: Update the Terms for instant checkout

**Files:**
- Modify: `src/pages/terms.astro`
- Modify (append): `tests/unit/compliance.test.ts`, `tests/e2e/compliance.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/compliance.test.ts`:

```ts
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
```

Append to `tests/e2e/compliance.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the unit tests and confirm they fail**

Run: `npx vitest run tests/unit/compliance.test.ts`
Expected: FAIL on the new terms tests only.

- [ ] **Step 3: Edit `src/pages/terms.astro`**

"Last updated" line, directly after the opening of the prose div:

old:
```astro
    <div class="ra-measure ra-prose">
      <h2>Who we are</h2>
```
new:
```astro
    <div class="ra-measure ra-prose">
      <p class="updated">Last updated {SITE.legalUpdated}</p>

      <h2>Who we are</h2>
```

Order confirmation wording:

old: `        after your order is confirmed, which is what allows us to price competitively.`
new: `        after your payment is confirmed, which is what allows us to price competitively.`

Price clause:

old:
```astro
        Prices are quoted in Nigerian Naira and may change without notice. The price that
        applies to your order is the price confirmed with you at the point of order.
```
new:
```astro
        Prices are quoted in Nigerian Naira and may change without notice. The price that
        applies to your order is the price shown at checkout when you pay.
```

New Payments section, inserted between the pre-order paragraphs and "Product descriptions":

old:
```astro
      <h2>Product descriptions</h2>
```
new:
```astro
      <h2>Payments</h2>
      <p>
        Card payments for shop orders are processed by Paystack. You enter your card
        details on Paystack&rsquo;s page, and we never see or store them. Your order is
        confirmed once Paystack confirms your payment. If we refund an order, the money
        goes back to the payment method you used, as set out in our
        <a href="/returns">Returns &amp; Warranty</a> policy.
      </p>

      <h2>Product descriptions</h2>
```

New Governing law section, inserted before "Changes to these terms":

old:
```astro
      <h2>Changes to these terms</h2>
```
new:
```astro
      <h2>Governing law and disputes</h2>
      <p>
        These terms are governed by the laws of the Federal Republic of Nigeria, and the
        courts of the Federal Capital Territory, Abuja, have jurisdiction. If you have a
        complaint, please contact us first at
        <a href={`mailto:${SITE.email}`}>{SITE.email}</a> so that we can try to resolve it
        within 30 days before either of us takes it further.
      </p>

      <h2>Changes to these terms</h2>
```

Style: in the `<style>` block, add after the `.lede--tight` rule:

```css
  .updated { color: var(--ra-fg-muted); font-size: var(--ra-step--1); }
```

Do NOT touch the "Once procurement and shipping have begun, an order cannot be cancelled." sentence.

- [ ] **Step 4: Run the unit tests**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 5: Build and run the e2e tests**

Run: `npm run build`, then `npx playwright test tests/e2e/compliance.spec.ts tests/e2e/accessibility.spec.ts`
Expected: PASS on `mobile` and `desktop`.

- [ ] **Step 6: Commit**

```bash
git add src/pages/terms.astro tests/unit/compliance.test.ts tests/e2e/compliance.spec.ts
git commit -m "Update the terms for instant checkout, payments and governing law"
```

---

### Task 5: Full verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: No stale host or contact details anywhere shipped**

Run: `grep -rniE "netlify" src public` and `grep -rn "gmail" src public`
Expected: the only `netlify` hits are in `public/.htaccess` comments about the build config (not user-facing). No `gmail` hits. List every match you see.

- [ ] **Step 2: Every form has a notice**

Run: `grep -rn "<PrivacyNote" src/pages`
Expected: exactly five matches (contact, start-project, cart, login, product page).

- [ ] **Step 3: Run everything**

Run: `npm test`
Expected: build succeeds; all unit tests and all e2e tests pass on `mobile` and `desktop`. If Playwright prints `Process from config.webServer exited early`, re-run `npx playwright test` once. Report the exact counts.

- [ ] **Step 4: Look at the pages**

With the built preview (`npx astro preview`) open `/privacy/`, `/terms/`, `/contact/`, `/account/login/`, `/cart/` and a product page. Confirm: the policy reads cleanly with nine sections and a last-updated line; the Terms show Payments and Governing law; each form shows its notice just above its button and the "privacy policy" link opens `/privacy/`. Report what you observed. Stop the preview afterwards with `npx astro preview stop`.

- [ ] **Step 5: Tree check**

Run: `git status`
Expected: clean except for the hook-modified `.impeccable/hook.cache.json`.

- [ ] **Step 6: Record the owner's follow-ups**

No file change. Include these in the final report:
1. Have someone qualified read the final Privacy and Terms text; it is careful drafting from public secondary sources, not legal advice.
2. Confirm the 6-year order-record period with an accountant.
3. Check whether NDPC registration applies; the policy makes no claim either way.
4. Commit to clearing enquiry emails older than 2 years.
5. Upload `dist/` including `account/login.php` together. After upload, request a sign-in link once and confirm it still arrives.
6. If wanted, confirm Hostinger's server location so the policy can say where data is held.

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| Privacy policy: nine sections, bases, retention 2y/6y/expired, rights, NDPC complaint, date, no Netlify, no section numbers | 3 |
| Terms: payment-confirmed wording, price at checkout, Payments, Governing law and disputes, date, cancellation sentence untouched | 4 |
| Notice above the submit button at all five forms | 1 |
| Expired-token pruning in `login.php` | 2 |
| Shared `legalUpdated` date | 1 (defined), 3 and 4 (used) |
| No cookie banner, no consent checkbox | not built, by design |
| Source-level tests and e2e tests; existing leak test untouched | 1-4 |
| Owner follow-ups | 5 |

**Placeholder scan:** none; every code step shows the full code or exact old/new strings.

**Name consistency:** `SITE.legalUpdated`, `PrivacyNote` with `kind` values `enquiry|order|signin`, class `privacy-note`, and the heading strings in the e2e specs match the headings in the privacy and terms code exactly.
