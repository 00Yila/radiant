# Positioning and navigation — design

Sub-project 1 of 5 from the external audit at `Radiant Alpha website audit.md`.

## Context

An external audit concluded the site is technically sound and honest but sells
too many things: a web and software studio that also sells phones and installs
solar panels reads as a general trader. It recommends narrowing the offer to web
and software for Abuja businesses.

The audit was written from text extractions of the live site and is partly out
of date or wrong, so each finding was checked against this repo before being
adopted:

| Audit claim | Reality in the repo |
|---|---|
| No JSON-LD anywhere | `Seo.astro` emits `Organization` on every page; home, shop, blog and service pages add their own blocks. The real gap is narrower (see sub-project 3). |
| Hosted on Netlify | Hosted on Hostinger with a PHP contact handler. `privacy.astro:42` is wrong. (Sub-project 4.) |
| Shop "states no payment method" | Paystack checkout, cart and accounts now exist. |
| robots.txt / sitemap unverified | Both exist and are correct. |
| Canonicals lack trailing slashes | `Seo.astro` already adds them. Only internal nav `href`s lack them. |

The claims below were confirmed and are what this sub-project acts on: offer
sprawl on the homepage, phone-retail trust badges, Shop in the main nav, Solar and
Networking in the services list, and pricing-presentation leaks on the Services
page.

## Decisions made with the owner

- **Shop:** demoted, not removed. It stays live at `/shop` with full checkout.
  It leaves the homepage and main nav and is linked from the footer.
- **Services kept:** Software Development, Website Design & Development,
  E-Commerce Solutions, Digital Marketing, IT Consulting.
- **Services removed:** Solar & PV Installation, Networking & IT Infrastructure,
  Technology Products.
- **Domain mailbox:** the owner confirmed `help@radiantalphadigital.com` sends
  and receives, so `radiantalphadigital@gmail.com` and the "if the form doesn't
  work" fallback line are removed in this sub-project. Only the domain address
  remains on the Contact page.
- **Response-time promise:** "We reply within one working day."
- **Free-review CTA:** approved. The secondary hero button becomes a WhatsApp
  offer to review a visitor's current site.

## Scope

In scope: homepage hero, trust strip and phone section; header and footer
navigation; the services collection, services index page and contact subjects;
pricing-unit display; response-time line on Contact; tests for all of it.

Out of scope, each its own spec and plan, in this order:

1. Compliance: privacy and terms rewrite (fixes the Netlify error, adds Paystack,
   lawful basis, retention, rights, NDPC complaint, notice under forms).
2. SEO and schema: `ProfessionalService`, `founder`, `areaServed`, `sameAs`;
   titles and metas; trailing-slash nav links; honeypot, footer headings, OG types.
3. Proof and people: founder photo and bio, this site as a case study, blog
   bylines, softening "one of Africa's leading…".
4. Off-site checklist (not code): Search Console, Google Business Profile,
   LinkedIn, and a deliverability check of mail DNS (SPF, DKIM, DMARC) so
   messages from `help@` don't land in spam.

Also deferred, because it needs the owner's real business terms: the audit's
three website packages, five-step process and deposit split.

## Design

### Homepage (`src/pages/index.astro`)

**Hero.** The H1 changes from `SITE.tagline` to **"Fast, mobile-first websites
and web apps for Abuja businesses."** `SITE.tagline` itself is unchanged, since
the footer and OG alt text still use it. The lede becomes: "Websites from
₦150,000, live in 2–3 weeks. Software, e-commerce and marketing when you're
ready." Both figures are already published in the FAQ on the same page. The
sector list from the audit ("clinics, schools, NGOs") is not used, because it is
unconfirmed.

**Buttons.** "Start Your Project" stays as the primary CTA. The secondary button
changes from "Explore Our Services" to **"WhatsApp us your current site for a
free review"**, using `buildWhatsAppUrl` with a prefilled message asking for a
review of the sender's site.

**Trust strip.** The `credentials` array replaces its two phone items. New array:
`RC 9421582 / Registered with the CAC`, `Abuja, FCT / Serving all of Nigeria`,
`From ₦150,000 / Business websites`, `2–3 weeks / Typical website delivery`. The
comment above it ("every figure is one we can evidence") stays true.

**What we do.** The subline becomes "Four core services, plus IT consulting."
(Software, Website, E-Commerce and Marketing are the four `lead` services.)

**Phone section.** The "Technology products, described honestly" section and its
`products` styles are removed from the homepage.

### Navigation (`Header.astro`, `Footer.astro`)

- Header `links` loses `Shop`: Services, Work, About, Contact, plus the CTA.
- The Cart link (`.hdr__cart-link`) gets the `hidden` attribute by default. The
  existing header script reveals it when `cartCount(readCart(localStorage)) > 0`,
  and the product page's `updateBadge` reveals it after an add. Without
  JavaScript it stays hidden, which is acceptable because carts cannot be built
  without JavaScript.
- The header "Your orders" link added in the last release is removed. The footer
  link remains.
- Footer: Shop remains in the Support group and is renamed "Shop (phones)" so
  its scope is clear.

### Services

- Delete `src/content/services/solar-pv-installation.md`,
  `networking-infrastructure.md`, `technology-products.md`.
- `src/lib/contact.ts`: remove the three subject entries from `SUBJECTS`,
  `SUBJECT_BY_SERVICE` and `MESSAGE_PROMPT`.
- `ServiceGlyph.astro`: remove the `networking-infrastructure` and
  `technology-products` glyph branches (solar has none).
- `src/pages/services/index.astro`:
  - Collapse the `tiers` array from three (Build, Grow, Equip) to two (Build,
    Grow), since Equip is now empty. Verified: tier 3 holds only the three
    services being deleted; the remaining five are tier 1 (Software, Website,
    E-Commerce) or tier 2 (Marketing, IT Consulting), so no re-tiering is needed.
  - Remove the "Network Setup" row from `pricing`. "Technical Support" has no
    matching service page, so it is left for the owner to decide; it is flagged
    in the plan, not silently deleted.
  - Update the meta description to drop "networking".
  - Rename `pricing` rows to match service titles: "Custom Web Application"
    becomes "Software Development".
- `src/content.config.ts`: add optional `startingUnit: z.enum(['/month',
  '/hour']).optional()` to the services schema. Cards on the homepage and
  services page render `From {price}{unit}`. Set it on Digital Marketing
  (`/month`) and IT Consulting (`/hour`).
- `public/.htaccess`: add `RedirectMatch 301` rules sending
  `/services/solar-pv-installation/` and `/services/networking-infrastructure/`
  to `/services/`, and `/services/technology-products/` to `/shop/`. Both with
  and without trailing slash.

### Contact page (`src/pages/contact.astro`)

- Add the line "We reply within one working day." near the form.
- Remove the "Alternative email" entry (`SITE.emailSecondary`) from the page, and
  the fallback sentence "If the form doesn't work for any reason…". Remove
  `emailSecondary` from `src/lib/site.ts`. Verified by grep: it is used only in
  `contact.astro:50` and defined in `site.ts:15`, and no test references it.
- The domain mailbox is the only email shown.

## Error handling and risks

- **Dangling links.** A grep of `src/` for the three removed slugs found
  references only in `contact.ts`, `ServiceGlyph.astro` and tests. No blog post,
  FAQ or page links to them. Re-run the grep as the first plan step to confirm.
- **Redirects are unverifiable in dev.** There is no Apache locally. The rules are
  checked by reading `.htaccess`, and the owner confirms after upload that a
  removed URL redirects.
- **Removing the hero tagline.** `HeroFigure` and other components must not
  depend on the H1 text. Checked while implementing.

## Testing

- `contact.test.ts` and `start-project.spec.ts` currently use
  `solar-pv-installation` as their fixture; both move to
  `software-development`.
- New unit assertions: `SUBJECTS` contains none of the removed subjects; the
  services collection has exactly five entries; every entry has a `tier` of 1 or
  2; entries with a recurring price carry `startingUnit`.
- New e2e: homepage has no "Technology products" section and none of the phone
  trust items; header nav has no Shop link and the footer does; `/services/`
  shows exactly five service cards with units on Marketing and Consulting; Cart
  link is hidden on first visit and visible after an Add to Cart (extends
  `cart.spec.ts`); Contact shows the response-time line and no Gmail address or
  fallback sentence.
- `.htaccess` redirect rules are asserted by a unit test that reads the file.
- Existing accessibility and SEO specs must continue to pass unchanged.

## Open items for the owner

- Confirm the hero H1 wording on review of the built page.
- Decide whether the "Technical Support" pricing row stays.
- After upload, confirm the three old service URLs redirect.
