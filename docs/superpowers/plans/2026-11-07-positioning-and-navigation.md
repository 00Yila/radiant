# Positioning and Navigation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reposition the Radiant Alpha site as a web and software studio: new homepage hero and trust strip, Shop demoted to the footer, services trimmed to five, pricing units shown, a response-time promise on Contact, and the Gmail address removed.

**Architecture:** Astro static site (content collections for services, shared `src/lib/*` helpers) plus a PHP contact handler on Hostinger. All changes are content, markup and config; the only new logic is one tiny shared helper (`applyCartCount`) in the existing browser-side cart module. Vitest guards source-level invariants; Playwright guards rendered behaviour.

**Tech Stack:** Astro 7, TypeScript, Vitest, Playwright, Apache `.htaccess` (Hostinger).

**Spec:** `docs/superpowers/specs/2026-11-07-positioning-and-navigation-design.md`

## Global Constraints

- Hero H1 is exactly: **Fast, mobile-first websites and web apps for Abuja businesses.**
- Hero lede is exactly: **Websites from ₦150,000, live in 2–3 weeks. Software, e-commerce and marketing when you're ready.**
- Secondary hero button text is exactly: **WhatsApp us your current site for a free review** (a `wa.me` link to `SITE.whatsappNumber`).
- Response-time line on Contact is exactly: **We reply within one working day.**
- `SITE.tagline` is NOT changed; the footer and OG alt text keep using it.
- Services kept: Software Development, Website Design & Development, E-Commerce Solutions, Digital Marketing, IT Consulting. Services removed: Solar & PV Installation, Networking & IT Infrastructure, Technology Products.
- The Shop stays live at `/shop` with working checkout. Do not touch shop pages, `checkout.php`, or any cart/account logic beyond the Cart link visibility in Task 3.
- No invented claims: do not add client names, sector lists ("clinics, schools, NGOs"), statistics, or credentials that are not already published on the site.
- `radiantalphadigital@gmail.com` must not appear anywhere in `src/` or `public/` after Task 5.
- There is no PHP runtime and no Apache in dev. `contact.php` and `.htaccess` changes are verified by reading the files in tests, never by executing them. Do not claim otherwise.
- Every commit message ends with the trailer `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>` (pass it as a second `-m`).
- Working directory is the repo root: `C:\Users\hp\OneDrive\Desktop\CT New folder\.claude\worktrees\practical-sanderson-255ced`.

## Running the tests

- Unit: `npx vitest run <file>` (whole suite: `npm run test:unit`).
- E2E needs a fresh build first: `npm run build`, then `npx playwright test <file>`. The Playwright config starts `npm run preview`. Astro's preview runs as a background daemon, so Playwright may print `Process from config.webServer exited early` on the first run even though the server is up. If that happens, run the same command once more; it then reuses the live server on port 4321. When all work is finished, stop the daemon with `npx astro preview stop`.

## File map

| File | Change |
|---|---|
| `src/content/services/{solar-pv-installation,networking-infrastructure,technology-products}.md` | Delete (Task 1) |
| `src/lib/contact.ts`, `public/contact.php` | Drop the three retired subjects (Task 1) |
| `src/components/ServiceGlyph.astro` | Drop two glyph branches (Task 1) |
| `public/.htaccess` | Add 301 redirects for retired URLs (Task 1) |
| `tests/unit/positioning.test.ts` | New: source-level invariants for every task |
| `tests/e2e/positioning.spec.ts` | New: rendered behaviour for every task |
| `src/content.config.ts`, `src/content/services/{digital-marketing,it-consulting}.md` | `startingUnit` field, tiers 1-2 only (Task 2) |
| `src/pages/services/index.astro`, `src/pages/services/[slug].astro`, `src/pages/index.astro` (cards only) | Two tiers, units, pricing table (Task 2) |
| `src/lib/client/cart.ts`, `tests/unit/cart-client.test.ts` | `applyCartCount` helper (Task 3) |
| `src/components/Header.astro`, `src/components/Footer.astro`, `src/pages/shop/[product].astro` (script only), `tests/e2e/cart.spec.ts` | Nav changes, hidden Cart link (Task 3) |
| `src/pages/index.astro` | Hero, trust strip, remove phone section (Task 4) |
| `src/pages/contact.astro`, `src/lib/site.ts` | Response time, Gmail removal (Task 5) |

---

### Task 1: Retire three services, their contact subjects, and redirect the old URLs

**Files:**
- Delete: `src/content/services/solar-pv-installation.md`, `src/content/services/networking-infrastructure.md`, `src/content/services/technology-products.md`
- Modify: `src/lib/contact.ts`, `public/contact.php`, `src/components/ServiceGlyph.astro`, `public/.htaccess`
- Modify (fixtures): `tests/unit/contact.test.ts`, `tests/e2e/start-project.spec.ts`
- Create: `tests/unit/positioning.test.ts`

**Interfaces:**
- Produces: `tests/unit/positioning.test.ts` with helpers `serviceIds: string[]` (sorted ids from `src/content/services/*.md`) and `frontmatter(id: string, key: string): string | undefined` (raw trimmed YAML value, quotes included). Tasks 2 and 5 append to this file and reuse both helpers.

- [ ] **Step 1: Write the failing unit test**

Create `tests/unit/positioning.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { SUBJECTS, SUBJECT_BY_SERVICE, MESSAGE_PROMPT } from '../../src/lib/contact';

/** Service ids, from the filenames the collection is built out of. */
export const serviceIds = readdirSync('src/content/services')
  .filter((f) => f.endsWith('.md'))
  .map((f) => f.replace(/\.md$/, ''))
  .sort();

/** Raw, trimmed YAML value for a top-level frontmatter key (quotes included). */
export const frontmatter = (id: string, key: string): string | undefined =>
  readFileSync(`src/content/services/${id}.md`, 'utf8')
    .match(new RegExp(`^${key}:\\s*(.+)$`, 'm'))?.[1]
    ?.trim();

describe('the service list is trimmed to the five core offers', () => {
  it('has exactly the five services the owner chose', () => {
    expect(serviceIds).toEqual([
      'digital-marketing',
      'ecommerce-solutions',
      'it-consulting',
      'software-development',
      'website-design-development',
    ]);
  });

  it('keeps every remaining service in tier 1 or 2', () => {
    for (const id of serviceIds) {
      expect(['1', '2'], id).toContain(frontmatter(id, 'tier'));
    }
  });

  it('offers no contact subject, mapping or prompt for the retired services', () => {
    for (const subject of [
      'Networking & infrastructure',
      'Solar & PV installation',
      'Technology products',
    ]) {
      expect(SUBJECTS, subject).not.toContain(subject);
    }
    for (const id of [
      'networking-infrastructure',
      'solar-pv-installation',
      'technology-products',
    ]) {
      expect(SUBJECT_BY_SERVICE[id], id).toBeUndefined();
      expect(MESSAGE_PROMPT[id], id).toBeUndefined();
    }
  });
});

describe('retired service URLs redirect instead of 404ing', () => {
  const htaccess = readFileSync('public/.htaccess', 'utf8');

  it('sends solar and networking to the services index', () => {
    expect(htaccess).toContain(
      'RedirectMatch 301 ^/services/(solar-pv-installation|networking-infrastructure)/?$ /services/'
    );
  });

  it('sends technology products to the shop', () => {
    expect(htaccess).toContain(
      'RedirectMatch 301 ^/services/technology-products/?$ /shop/'
    );
  });
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run tests/unit/positioning.test.ts`
Expected: FAIL. The service-list test sees eight ids, the subject test finds the retired subjects, and both redirect tests fail.

- [ ] **Step 3: Delete the three service pages**

```bash
git rm src/content/services/solar-pv-installation.md src/content/services/networking-infrastructure.md src/content/services/technology-products.md
```

- [ ] **Step 4: Trim `src/lib/contact.ts`**

Replace the `SUBJECTS` array:

old:
```ts
  'IT consulting',
  'Networking & infrastructure',
  'Solar & PV installation',
  'Technology products',
  'Something else',
] as const;
```
new:
```ts
  'IT consulting',
  'Something else',
] as const;
```

Replace the end of `SUBJECT_BY_SERVICE`:

old:
```ts
  'it-consulting': 'IT consulting',
  'networking-infrastructure': 'Networking & infrastructure',
  'solar-pv-installation': 'Solar & PV installation',
  'technology-products': 'Technology products',
};
```
new:
```ts
  'it-consulting': 'IT consulting',
};
```

Replace the end of `MESSAGE_PROMPT`:

old:
```ts
  'it-consulting':
    'What decision or problem are you weighing up?',
  'networking-infrastructure':
    'How many people and devices, and is it a new site or an existing one?',
  'solar-pv-installation':
    'What do you need to keep running, and for how long without the grid?',
  'technology-products':
    'Which device or model are you after, and how many?',
};
```
new:
```ts
  'it-consulting':
    'What decision or problem are you weighing up?',
};
```

- [ ] **Step 5: Trim `public/contact.php`**

old:
```php
    'IT consulting',
    'Networking & infrastructure',
    'Solar & PV installation',
    'Technology products',
    'Something else',
];
```
new:
```php
    'IT consulting',
    'Something else',
];
```

(`tests/unit/contact.test.ts` already asserts this list matches `contact.ts` exactly, so a mismatch between the two files fails the suite.)

- [ ] **Step 6: Remove the two glyph branches in `src/components/ServiceGlyph.astro`**

Delete this block (and the blank line before it), leaving `</svg>` directly after the `it-consulting` branch:

```astro
  {name === 'networking-infrastructure' && (
    <>
      {/* the logo's connected nodes */}
      <path d="M20 17v6M20 20l-4.6 3M20 20l4.6 3" />
      <circle cx="20" cy="15.4" r="1.8" class="glyph__gold" />
      <circle cx="14.6" cy="25" r="1.8" />
      <circle cx="25.4" cy="25" r="1.8" />
    </>
  )}

  {name === 'technology-products' && (
    <>
      <rect x="15.4" y="12.6" width="9.2" height="14.8" rx="1.8" />
      <path d="M18.6 24.6h2.8" class="glyph__gold" />
    </>
  )}
```

Also update the file's header comment: change "seven of these cost no requests" to "five of these cost no requests".

- [ ] **Step 7: Add the redirects to `public/.htaccess`**

The file already ends with an `<IfModule mod_alias.c>` block. Replace it:

old:
```apache
<IfModule mod_alias.c>
  RedirectMatch 404 ^/_lib/
</IfModule>
```
new:
```apache
<IfModule mod_alias.c>
  RedirectMatch 404 ^/_lib/

  # Services retired in the positioning pass. They were never indexed, but any
  # stray link should land somewhere useful instead of a 404.
  RedirectMatch 301 ^/services/(solar-pv-installation|networking-infrastructure)/?$ /services/
  RedirectMatch 301 ^/services/technology-products/?$ /shop/
</IfModule>
```

- [ ] **Step 8: Re-point the old fixtures at a surviving service**

`tests/unit/contact.test.ts` (two places), replace every `solar-pv-installation` with `software-development`:

```ts
  it('encodes the service id into the link', () => {
    expect(contactUrlForService('software-development')).toBe(
      '/contact?subject=software-development'
    );
  });

  it('sends "Start Your Project" to the guided intake, not the plain form', () => {
    expect(startProjectUrlForService('software-development')).toBe(
      '/start-project?subject=software-development'
    );
  });
```

`tests/e2e/start-project.spec.ts`:

old:
```ts
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
```
new:
```ts
  test('a service page carries its subject into the guided intake', async ({ page }) => {
    await page.goto('/services/software-development');
    await page.locator('.ra-actions').first()
      .getByRole('link', { name: 'Start Your Project' }).click();

    await expect(page).toHaveURL(/\/start-project/);
    await expect(
      page.locator('input[name="subject"][value="Software development"]')
    ).toBeChecked();
    await expect(page.locator('#message-guide')).toHaveText(/replace or automate/i);
  });

  test('"Get in Touch" on the same page still goes to the plain contact form', async ({ page }) => {
    await page.goto('/services/software-development');
    await page.getByRole('link', { name: 'Get in Touch' }).first().click();
    await expect(page).toHaveURL(/\/contact(?!.*start-project)/);
    await expect(page.getByLabel('What can we help with?')).toHaveValue('Software development');
  });
```

Same file, the subject-radio count drops from nine to six:

old: `await expect(page.locator('input[name="subject"]')).toHaveCount(9);`
new: `await expect(page.locator('input[name="subject"]')).toHaveCount(6);`

- [ ] **Step 9: Run unit tests**

Run: `npm run test:unit`
Expected: PASS (all suites, including the new `positioning.test.ts` and the `contact.php` ↔ `contact.ts` subject-agreement test).

- [ ] **Step 10: Build and run the affected e2e spec**

Run: `npm run build`, then `npx playwright test tests/e2e/start-project.spec.ts`
Expected: build succeeds with three fewer service pages; the spec passes on both `mobile` and `desktop` projects.

Note: `/services/` still renders an empty "Equip" tier until Task 2. That is expected and harmless.

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "Retire Solar, Networking and Technology Products services" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Two-tier services page, billing units, and cleaned pricing table

**Files:**
- Modify: `src/content.config.ts`, `src/content/services/digital-marketing.md`, `src/content/services/it-consulting.md`, `src/pages/services/index.astro`, `src/pages/services/[slug].astro`, `src/pages/index.astro` (the service-card price line only)
- Modify (append): `tests/unit/positioning.test.ts`
- Create: `tests/e2e/positioning.spec.ts`

**Interfaces:**
- Consumes: `serviceIds`, `frontmatter()` from `tests/unit/positioning.test.ts` (Task 1).
- Produces: optional service field `startingUnit: '/month' | '/hour'`, read by the homepage cards, services cards and service detail page. `tests/e2e/positioning.spec.ts` (new), which Tasks 3-5 append to.

- [ ] **Step 1: Write the failing unit tests**

Append to `tests/unit/positioning.test.ts`:

```ts
describe('recurring prices carry their billing unit', () => {
  it('marks marketing as monthly and consulting as hourly', () => {
    expect(frontmatter('digital-marketing', 'startingUnit')).toBe('"/month"');
    expect(frontmatter('it-consulting', 'startingUnit')).toBe('"/hour"');
  });

  it('leaves one-off services without a unit', () => {
    for (const id of [
      'software-development',
      'website-design-development',
      'ecommerce-solutions',
    ]) {
      expect(frontmatter(id, 'startingUnit'), id).toBeUndefined();
    }
  });
});

describe('the services page no longer advertises retired offers', () => {
  const page = readFileSync('src/pages/services/index.astro', 'utf8');

  it('has no Equip tier', () => {
    expect(page).not.toContain("name: 'Equip'");
  });

  it('has no network-setup price row', () => {
    expect(page).not.toContain('Network Setup');
  });

  it('does not name networking in its meta description', () => {
    expect(page).not.toMatch(/description="[^"]*networking/i);
  });

  it('names the software row to match its card', () => {
    expect(page).toContain("service: 'Software Development'");
    expect(page).not.toContain('Custom Web Application');
  });
});
```

Create `tests/e2e/positioning.spec.ts`:

```ts
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
```

- [ ] **Step 2: Run the unit tests and confirm they fail**

Run: `npx vitest run tests/unit/positioning.test.ts`
Expected: FAIL on units, the Equip tier, Network Setup, the meta description and the row name.

- [ ] **Step 3: Update the services schema in `src/content.config.ts`**

old:
```ts
    /** Which band of the Build → Grow → Equip hierarchy this service sits in. */
    tier: z.union([z.literal(1), z.literal(2), z.literal(3)]),
    startingFrom: z.number().int().positive().optional(),
```
new:
```ts
    /** Which band of the Build → Grow hierarchy this service sits in. */
    tier: z.union([z.literal(1), z.literal(2)]),
    startingFrom: z.number().int().positive().optional(),
    /** Shown after the price for recurring or hourly services: "From ₦80,000/month". */
    startingUnit: z.enum(['/month', '/hour']).optional(),
```

- [ ] **Step 4: Add the units to the two service files**

`src/content/services/digital-marketing.md`: add a line directly after `startingFrom: 80000`:

```yaml
startingFrom: 80000
startingUnit: "/month"
```

`src/content/services/it-consulting.md`: add a line directly after `startingFrom: 25000`:

```yaml
startingFrom: 25000
startingUnit: "/hour"
```

- [ ] **Step 5: Edit `src/pages/services/index.astro`**

Comment above `tiers`:

old:
```ts
/*
 * Seven services in one flat grid reads as a list of whatever we happen to
 * offer. Grouped into Build → Grow → Equip it reads as a progression, and a
 * visitor can find their own stage in it.
 */
```
new:
```ts
/*
 * A flat grid of services reads as a list of whatever we happen to offer.
 * Grouped into Build → Grow it reads as a progression, and a visitor can find
 * their own stage in it.
 */
```

Remove the third tier:

old:
```ts
    blurb: 'Getting it in front of people, and making sound decisions about it.',
  },
  {
    n: 3,
    name: 'Equip',
    blurb: 'The networks and hardware everything else runs on.',
  },
] as const;
```
new:
```ts
    blurb: 'Getting it in front of people, and making sound decisions about it.',
  },
] as const;
```

Pricing table rows:

old: `  { service: 'Custom Web Application', from: 500000, unit: '' },`
new: `  { service: 'Software Development', from: 500000, unit: '' },`

Delete this whole line: `  { service: 'Network Setup', from: 100000, unit: '' },`

(`Technical Support` stays. It has no service page and is flagged for the owner in the spec's open items.)

Meta description:

old: `description="Software development, website design, e-commerce, digital marketing, IT consulting, and networking for businesses across Nigeria. Transparent starting prices."`
new: `description="Software development, website design, e-commerce, digital marketing, and IT consulting for businesses across Nigeria. Transparent starting prices."`

Card price:

old:
```astro
                <p class="ra-card__price ra-numeric">
                  From {formatNaira(service.data.startingFrom)}
                </p>
```
new:
```astro
                <p class="ra-card__price ra-numeric">
                  From {formatNaira(service.data.startingFrom)}{service.data.startingUnit ?? ''}
                </p>
```

- [ ] **Step 6: Show the unit on the homepage cards and the detail page**

`src/pages/index.astro`:

old: `<p class="ra-card__price ra-numeric">From {formatNaira(service.data.startingFrom)}</p>`
new: `<p class="ra-card__price ra-numeric">From {formatNaira(service.data.startingFrom)}{service.data.startingUnit ?? ''}</p>`

`src/pages/services/[slug].astro`:

old: `const { title, summary, startingFrom, faqs } = service.data;`
new: `const { title, summary, startingFrom, startingUnit, faqs } = service.data;`

old: `      <p class="from ra-numeric">Starting from {formatNaira(startingFrom)}</p>`
new: `      <p class="from ra-numeric">Starting from {formatNaira(startingFrom)}{startingUnit ?? ''}</p>`

(Leave the JSON-LD `price` field at line ~48 alone.)

- [ ] **Step 7: Run unit tests**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 8: Build and run the e2e spec**

Run: `npm run build`, then `npx playwright test tests/e2e/positioning.spec.ts`
Expected: build succeeds (the schema rejects any service left in tier 3, so this also proves none remain); both services-page tests pass on both projects.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Collapse services to two tiers and show billing units" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Move Shop out of the header; show the Cart link only when the cart has items

**Files:**
- Modify: `src/lib/client/cart.ts`, `src/components/Header.astro`, `src/components/Footer.astro`, `src/pages/shop/[product].astro` (script block only)
- Modify (tests): `tests/unit/cart-client.test.ts`, `tests/e2e/cart.spec.ts`, `tests/e2e/positioning.spec.ts`

**Interfaces:**
- Produces: `applyCartCount(link: CartIndicatorElement | null, badge: CartIndicatorElement | null, count: number): void` and `interface CartIndicatorElement { hidden: boolean; textContent: string | null }`, exported from `src/lib/client/cart.ts`. Behaviour: `link.hidden = count === 0`; `badge.textContent = String(count)`; `badge.hidden = count === 0`; null elements are skipped.
- Produces: the header Cart link now has `id="cart-link"` and the `hidden` attribute by default.

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/cart-client.test.ts`, and add `applyCartCount` to its import list from `'../../src/lib/client/cart'`:

```ts
describe('applyCartCount', () => {
  const el = () => ({ hidden: true, textContent: '' as string | null });

  it('keeps the link and badge hidden when the cart is empty', () => {
    const link = el();
    const badge = el();
    applyCartCount(link, badge, 0);
    expect(link.hidden).toBe(true);
    expect(badge.hidden).toBe(true);
    expect(badge.textContent).toBe('0');
  });

  it('reveals the link and writes the count when there are items', () => {
    const link = el();
    const badge = el();
    applyCartCount(link, badge, 3);
    expect(link.hidden).toBe(false);
    expect(badge.hidden).toBe(false);
    expect(badge.textContent).toBe('3');
  });

  it('tolerates elements that are not on the page', () => {
    expect(() => applyCartCount(null, null, 2)).not.toThrow();
  });
});
```

Append to `tests/e2e/positioning.spec.ts`:

```ts
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
```

In `tests/e2e/cart.spec.ts`, extend the last test:

old:
```ts
  await expect(page.locator('#cart-badge')).toBeHidden();

  await page.locator('.buy__panel:visible .buy__add-cart').click();
  await expect(page.locator('#cart-badge')).toBeVisible();
  await expect(page.locator('#cart-badge')).toHaveText('1');
```
new:
```ts
  await expect(page.locator('#cart-link')).toBeHidden();
  await expect(page.locator('#cart-badge')).toBeHidden();

  await page.locator('.buy__panel:visible .buy__add-cart').click();
  await expect(page.locator('#cart-link')).toBeVisible();
  await expect(page.locator('#cart-badge')).toBeVisible();
  await expect(page.locator('#cart-badge')).toHaveText('1');
```

- [ ] **Step 2: Run the unit test and confirm it fails**

Run: `npx vitest run tests/unit/cart-client.test.ts`
Expected: FAIL. `applyCartCount` is not exported yet.

- [ ] **Step 3: Add the helper to `src/lib/client/cart.ts`**

Append at the end of the file:

```ts
/** The two bits of an element the cart indicator touches; lets tests pass plain objects. */
export interface CartIndicatorElement {
  hidden: boolean;
  textContent: string | null;
}

/**
 * Shows the header Cart link only when there is something in the cart, and
 * writes the count into its badge. Shared by the header and the product page
 * so the two cannot drift apart.
 */
export function applyCartCount(
  link: CartIndicatorElement | null,
  badge: CartIndicatorElement | null,
  count: number
): void {
  if (link) link.hidden = count === 0;
  if (badge) {
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
}
```

- [ ] **Step 4: Edit `src/components/Header.astro`**

Remove Shop from the nav:

old:
```ts
  { href: '/services', label: 'Services' },
  { href: '/shop', label: 'Shop' },
  { href: '/work', label: 'Work' },
```
new:
```ts
  { href: '/services', label: 'Services' },
  { href: '/work', label: 'Work' },
```

Replace the Cart link and delete "Your orders":

old:
```astro
      <a href="/cart/" class="hdr__cart-link">
        Cart<span id="cart-badge" class="hdr__cart-badge" hidden>0</span>
      </a>

      <a href="/account/login/" class="hdr__cart-link">Your orders</a>
```
new:
```astro
      <a href="/cart/" id="cart-link" class="hdr__cart-link" hidden>
        Cart<span id="cart-badge" class="hdr__cart-badge" hidden>0</span>
      </a>
```

In the `<script>` block:

old:
```ts
  import { readCart, cartCount } from '../lib/client/cart';
```
new:
```ts
  import { readCart, cartCount, applyCartCount } from '../lib/client/cart';
```

old:
```ts
  function updateCartBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = cartCount(readCart(localStorage));
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  updateCartBadge();
```
new:
```ts
  applyCartCount(
    document.getElementById('cart-link'),
    document.getElementById('cart-badge'),
    cartCount(readCart(localStorage))
  );
```

In the `<style>` block, directly after `.hdr__cart-badge[hidden] { display: none; }` add (the link's own `display: inline-flex` otherwise overrides the `hidden` attribute):

```css
  .hdr__cart-link[hidden] { display: none; }
```

- [ ] **Step 5: Edit `src/components/Footer.astro`**

old: `      { href: '/shop', label: 'Shop' },`
new: `      { href: '/shop', label: 'Shop (phones)' },`

- [ ] **Step 6: Use the helper on the product page**

In the `<script>` block at the bottom of `src/pages/shop/[product].astro`:

old:
```ts
  import { addToCart, cartCount, readCart } from '../../lib/client/cart';

  function updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = cartCount(readCart(localStorage));
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }
```
new:
```ts
  import { addToCart, cartCount, readCart, applyCartCount } from '../../lib/client/cart';

  function updateBadge() {
    applyCartCount(
      document.getElementById('cart-link'),
      document.getElementById('cart-badge'),
      cartCount(readCart(localStorage))
    );
  }
```

- [ ] **Step 7: Run unit tests**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 8: Build and run e2e**

Run: `npm run build`, then `npx playwright test tests/e2e/cart.spec.ts tests/e2e/positioning.spec.ts tests/e2e/accessibility.spec.ts`
Expected: PASS on both projects. The accessibility spec confirms the header still meets WCAG after the change.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Move Shop to the footer and hide the Cart link until it is used" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Homepage hero, trust strip and phone section

**Files:**
- Modify: `src/pages/index.astro`
- Modify (append): `tests/e2e/positioning.spec.ts`

**Interfaces:**
- Consumes: `buildWhatsAppUrl({ message }): string` from `src/lib/whatsapp.ts`; `Button` supports `href`, `variant`, `external`.

- [ ] **Step 1: Check nothing depends on the old copy**

Run: `grep -rn "Building Digital Solutions\|Explore Our Services\|Typical pre-order\|Defect warranty on hardware" tests/`
Expected: no output. If any test references this copy, update that test to the new copy in this task.

- [ ] **Step 2: Write the failing e2e tests**

Append to `tests/e2e/positioning.spec.ts`:

```ts
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
```

- [ ] **Step 3: Build, run, and confirm the tests fail**

Run: `npm run build`, then `npx playwright test tests/e2e/positioning.spec.ts -g "homepage"`
Expected: FAIL on all four.

- [ ] **Step 4: Edit the frontmatter of `src/pages/index.astro`**

Add the import next to the others:

old: `import { SITE } from '../lib/site';`
new:
```ts
import { SITE } from '../lib/site';
import { buildWhatsAppUrl } from '../lib/whatsapp';
```

Add the review link just before the `const reasons = [` line:

```ts
/* The low-commitment first step: a prospect sends their current site and we review it. */
const reviewUrl = buildWhatsAppUrl({
  message: "Hi Radiant Alpha, I'd like a free review of my current website. Here's the link: ",
});

```

Replace the `credentials` array:

old:
```ts
const credentials = [
  { figure: `RC ${SITE.rcNumber}`, label: 'Registered with the CAC' },
  { figure: 'Abuja, FCT', label: 'Serving all of Nigeria' },
  { figure: SITE.preOrderLeadTime, label: 'Typical pre-order delivery' },
  { figure: '14 days', label: 'Defect warranty on hardware' },
];
```
new:
```ts
const credentials = [
  { figure: `RC ${SITE.rcNumber}`, label: 'Registered with the CAC' },
  { figure: 'Abuja, FCT', label: 'Serving all of Nigeria' },
  { figure: 'From ₦150,000', label: 'Business websites' },
  { figure: '2–3 weeks', label: 'Typical website delivery' },
];
```

Update the comment above it: replace "the registration, the location, and the two timeframes published on /returns" with "the registration, the location, and the website price and timeline published in the FAQ below".

- [ ] **Step 5: Edit the markup in `src/pages/index.astro`**

Hero:

old:
```astro
    <h1 class="ra-display hero__title">{SITE.tagline}</h1>
    <p class="ra-lede">
      We help businesses establish a powerful digital presence through professional web
      development, custom software, digital marketing, IT consulting, and quality
      technology products.
    </p>
    <div class="ra-actions">
      <Button href="/start-project" variant="gold">Start Your Project</Button>
      <Button href="/services" variant="secondary">Explore Our Services</Button>
    </div>
```
new:
```astro
    <h1 class="ra-display hero__title">Fast, mobile-first websites and web apps for Abuja businesses.</h1>
    <p class="ra-lede">
      Websites from ₦150,000, live in 2–3 weeks. Software, e-commerce and marketing when you're ready.
    </p>
    <div class="ra-actions">
      <Button href="/start-project" variant="gold">Start Your Project</Button>
      <Button href={reviewUrl} variant="secondary" external>WhatsApp us your current site for a free review</Button>
    </div>
```

"What we do" subline:

old: `      Four core services, plus IT consulting, networking, and technology products.`
new: `      Four core services, plus IT consulting.`

Delete the whole phone section, from `  <Section class="products">` through its closing `  </Section>` (the block containing the `products__grid`, the "Technology products, described honestly" heading, the `Browse the Shop` button and the `<picture class="products__shot">`).

Closing call to action:

old:
```astro
      Whether you need a professional website, custom software, digital marketing, IT
      consulting, or quality technology products — let's build something remarkable together.
```
new:
```astro
      Whether you need a professional website, custom software, digital marketing, or IT
      consulting — let's build something remarkable together.
```

- [ ] **Step 6: Edit the styles in `src/pages/index.astro`**

The new H1 is longer than the old tagline, so loosen the measure and cap the size:

old:
```css
  .hero__title {
    max-width: 15ch;
    font-size: clamp(2.75rem, 1.6rem + 5.2vw, 5.5rem);
```
new:
```css
  .hero__title {
    max-width: 20ch;
    font-size: clamp(2.25rem, 1.4rem + 4vw, 4.25rem);
```

Also update the comment above it: replace "it should break into three stacked lines" wording with "held to a narrow measure so it breaks into a few stacked lines".

Remove the now-unused rules:

old:
```css
  .more { margin-top: var(--ra-space-l); font-weight: 600; }
  .shop-cta { margin-top: var(--ra-space-l); }
```
new:
```css
  .more { margin-top: var(--ra-space-l); font-weight: 600; }
```

Delete this whole block:
```css
  .products__grid { display: grid; gap: var(--ra-space-xl); align-items: center; }
  @media (min-width: 900px) {
    .products__grid { grid-template-columns: 1fr 1fr; gap: var(--ra-space-2xl); }
  }
  .products__shot {
    display: block;
    overflow: hidden;
    border-radius: var(--ra-radius-l);
    /* The photo is dark on dark; a hairline keeps its edge legible on canvas. */
    box-shadow: 0 0 0 1px var(--ra-border), var(--ra-shadow-m);
  }
  .products__shot img { width: 100%; height: auto; }
```

- [ ] **Step 7: Build and run the tests**

Run: `npm run build`, then `npx playwright test tests/e2e/positioning.spec.ts tests/e2e/seo.spec.ts tests/e2e/accessibility.spec.ts`
Expected: PASS on both projects.

- [ ] **Step 8: Look at it**

Start the dev server (`npm run dev`) and open `http://localhost:4321/` at desktop and phone width. Confirm the H1 wraps cleanly and does not overflow, the two hero buttons fit without breaking the layout at 320px width (the review button label is long), and the trust strip shows four items. If the long button label overflows at 320px, let it wrap by adding `white-space: normal;` to a `.hero .ra-actions a` rule in this file's `<style>`; do not shorten the approved label.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "Reposition the homepage around web and software" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Contact page: response time, domain email only

**Files:**
- Modify: `src/pages/contact.astro`, `src/lib/site.ts`
- Modify (append): `tests/unit/positioning.test.ts`, `tests/e2e/positioning.spec.ts`

- [ ] **Step 1: Write the failing tests**

Append to `tests/unit/positioning.test.ts`:

```ts
describe('the Gmail address is gone', () => {
  it('is not defined in the site facts', () => {
    expect(readFileSync('src/lib/site.ts', 'utf8')).not.toContain('gmail');
    expect(readFileSync('src/lib/site.ts', 'utf8')).not.toContain('emailSecondary');
  });

  it('is not referenced by the contact page', () => {
    const page = readFileSync('src/pages/contact.astro', 'utf8');
    expect(page).not.toContain('emailSecondary');
    expect(page).not.toContain('Alternative email');
  });
});
```

Append to `tests/e2e/positioning.spec.ts`:

```ts
test.describe('the contact page', () => {
  test('promises a reply time and shows only the domain email', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.getByText('We reply within one working day.')).toBeVisible();
    await expect(page.locator('main')).toContainText('help@radiantalphadigital.com');
    expect(await page.content()).not.toContain('gmail');
  });

  test('no longer hedges about the form failing', async ({ page }) => {
    await page.goto('/contact');
    await expect(page.locator('main')).not.toContainText("If the form doesn’t work");
  });
});
```

- [ ] **Step 2: Run the unit test and confirm it fails**

Run: `npx vitest run tests/unit/positioning.test.ts`
Expected: FAIL on the two Gmail tests.

- [ ] **Step 3: Edit `src/pages/contact.astro`**

Lede:

old:
```astro
      Whether you need a professional website, digital marketing, IT consulting, or
      quality technology products, we&rsquo;re here to help.
```
new:
```astro
      Whether you need a professional website, custom software, digital marketing, or
      IT consulting, we&rsquo;re here to help.
```

Response time:

old:
```astro
          For the fastest response, send us a message on WhatsApp. We&rsquo;re also available by
          email for project enquiries and business partnerships.
```
new:
```astro
          For the fastest response, send us a message on WhatsApp. We&rsquo;re also available by
          email for project enquiries and business partnerships. We reply within one working day.
```

Delete the Gmail row:

```astro
          <li>
            <span class="channels__label">Alternative email</span>
            <a href={`mailto:${SITE.emailSecondary}`}>{SITE.emailSecondary}</a>
          </li>
```

Delete the fallback paragraph:

```astro
        <p class="fallback">
          If the form doesn&rsquo;t work for any reason, message us on
          <a href={waUrl} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          or email <a href={`mailto:${SITE.email}`}>{SITE.email}</a> instead.
        </p>
```

In `<style>`, delete the whole `.fallback { … }` rule (from the line `.fallback {` to its closing `}`). `waUrl` is still used by the WhatsApp channel link above, so keep that import and constant.

- [ ] **Step 4: Edit `src/lib/site.ts`**

Delete the line: `  emailSecondary: 'radiantalphadigital@gmail.com',`

- [ ] **Step 5: Run unit tests**

Run: `npm run test:unit`
Expected: PASS.

- [ ] **Step 6: Build and run e2e**

Run: `npm run build`, then `npx playwright test tests/e2e/positioning.spec.ts tests/e2e/accessibility.spec.ts tests/e2e/start-project.spec.ts`
Expected: PASS on both projects. The build succeeds, which also proves nothing else still imports `SITE.emailSecondary`.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "Promise a one-day reply and drop the Gmail address from Contact" -m "Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Full verification

**Files:** none changed unless a check fails.

- [ ] **Step 1: Confirm nothing points at the retired pages**

Run: `grep -rn "solar-pv-installation\|networking-infrastructure\|technology-products" src public tests`
Expected: the only matches are the two `RedirectMatch` lines in `public/.htaccess` and the assertions in `tests/unit/positioning.test.ts`. Any other hit is a dangling reference. Fix it.

- [ ] **Step 2: Confirm the Gmail address is gone from shipped files**

Run: `grep -rn "gmail" src public`
Expected: no output.

- [ ] **Step 3: Run everything**

Run: `npm test`
Expected: build succeeds, all unit tests pass, all e2e tests pass on `mobile` and `desktop`. If Playwright reports `Process from config.webServer exited early`, re-run `npx playwright test` once (see "Running the tests"). Do not treat a green run after that retry as suspicious; it is the preview daemon quirk.

- [ ] **Step 4: Review the built pages by eye**

With `npm run dev`, open `/`, `/services/`, `/contact/`, `/shop/`, and a product page. Confirm: the header has no Shop or Your orders link; the Cart link appears only after adding a product; the footer shows "Shop (phones)" and "Your orders"; the shop and checkout still work.

- [ ] **Step 5: Stop the preview daemon and check the tree**

Run: `npx astro preview stop`, then `git status`
Expected: clean working tree (everything committed).

- [ ] **Step 6: Record the deploy steps for the owner**

No file change. When reporting completion, tell the owner:
1. Upload the new `dist/` build to `public_html` as before. `contact.php` and the form's subject list changed together, so both must be uploaded in the same deploy or contact submissions will be rejected.
2. After upload, open `/services/solar-pv-installation/` and `/services/technology-products/` and confirm they redirect (the `.htaccess` rules cannot be tested without Apache).
3. Decide whether the "Technical Support" row in the services pricing table stays.

---

## Self-review

**Spec coverage**

| Spec requirement | Task |
|---|---|
| New hero H1, lede, free-review CTA | 4 |
| Trust strip replaces phone items | 4 |
| "What we do" subline; phone section removed; closing CTA copy | 4 |
| Shop out of header, into footer as "Shop (phones)" | 3 |
| Cart link hidden until items; "Your orders" out of header | 3 |
| Delete three services; contact subjects (TS and PHP); glyphs | 1 |
| 301 redirects | 1 |
| Services page: two tiers, Network Setup removed, row renamed, meta description | 2 |
| `startingUnit` field and display on cards, homepage and detail page | 2 |
| Response-time line on Contact | 5 |
| Gmail and fallback line removed; `emailSecondary` removed | 5 |
| Tests re-pointed from Solar fixture; new unit and e2e assertions | 1, 2, 3, 4, 5 |
| `SITE.tagline` unchanged | untouched in all tasks |
| Dangling-link grep | 6 |

**Placeholder scan:** no TBD/TODO; every code step shows the code or the exact old/new strings.

**Type and name consistency:** `applyCartCount`, `CartIndicatorElement`, `#cart-link`, `#cart-badge`, `startingUnit`, `serviceIds`, `frontmatter` are defined once and used with identical names and signatures in later tasks. The `'Software development'` subject label (lowercase d) matches `SUBJECTS` in `contact.ts`. The `Shop (phones)` label matches between Task 3's component edit and its e2e test.
