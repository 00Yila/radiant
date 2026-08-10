# Radiant Alpha Digital Services Ltd — Website Design Spec

**Date:** 2026-08-10
**Status:** Approved for planning
**Phase:** 1 of 2

---

## 1. Purpose

Build the public website for Radiant Alpha Digital Services Ltd: a marketing site for its
digital-services business plus a browsable product catalogue for its phone retail arm.

The site carries an unusual burden. The company was incorporated on 17 March 2026 and has no
client portfolio, no reviews, and no trading history. It is simultaneously asking businesses to
commission software projects up to ₦500,000 and asking consumers to pre-pay up to ₦2.4m for a
phone that arrives in 3–4 weeks. Every design decision below is downstream of one problem:
**establishing trust that the company has not yet had time to earn.**

A second constraint shapes everything: the company sells web design. The site is therefore its
own primary portfolio piece. It must be demonstrably well-built, not merely adequate.

---

## 2. Canonical company facts

These supersede the content brief wherever they conflict.

| Field | Value |
|---|---|
| Registered name | RADIANT ALPHA DIGITAL SERVICES LTD |
| RC number | 9421582 |
| Incorporated | 17 March 2026 |
| Domain | `radiantalphadigital.com` |
| Primary email (site-wide) | `help@radiantalphadigital.com` |
| Secondary email (Contact page only) | `radiantalphadigital@gmail.com` |
| Phone / WhatsApp | +234 912 966 5798 |
| Public location | "Abuja, FCT, Nigeria" |
| Founder / Director | Arabs David-Pari |

### Never published

- **The registered street address.** B09, Standard Estate, Galadimawa is the founder's home
  address. City-level only, everywhere, without exception.
- **The TIN** (2623730842678). It means nothing to a consumer and is needless exposure.
- **The superseded contact details** from the brief: `00yila.dev@gmail.com`, +234 704 015 9044.

The **RC number is published** in the footer. It is the one credential that lets a cautious buyer
independently verify the company on the CAC portal, which is exactly what a cautious buyer does.

---

## 3. Scope

### Phase 1 — this build

Complete marketing site, seven individual service pages, blog with admin authoring, and a full
browsable catalogue of all 53 iPhone listings with prices, filtering, and individual product
pages. Orders are placed via a pre-filled WhatsApp message. No cart, no card payment, no backend.

### Phase 2 — deferred, not designed here

Cart, checkout, Paystack/Flutterwave payment, order database, confirmation emails, order
tracking, laptop and accessory catalogues, real product photography, real portfolio, real
testimonials, live social links, solar/renewable services.

Every deferred item has a slot waiting in Phase 1: swap an image field, flip a flag, fill an
empty collection. None requires a rebuild.

### Why phased

The e-commerce half needs a merchant account, a hosted backend, and product photography that does
not yet exist. The marketing half needs none of those. Phasing gets the company trading this
month at zero monthly cost and zero payment-handling risk. WhatsApp is already the company's
stated primary contact channel, so the pre-order flow adds no new habit for the owner.

---

## 4. Architecture

**Astro + Decap CMS + Netlify, with the domain and email on the existing Hostinger Business plan.**

| Concern | Choice | Reason |
|---|---|---|
| Framework | Astro | Renders to static HTML, ships zero JS by default. Traffic is Nigerian mobile, frequently on 3G; page weight is the dominant UX factor. Content collections generate 53 product pages and 7 service pages from data, with build-time schema validation. |
| CMS | Decap CMS at `/admin` | Git-backed: content is Markdown and data files in the owner's own repository, not rows in a vendor's database. WYSIWYG editing, image upload, product forms. No third-party content vendor. |
| Host / deploy | Netlify (free tier) | Handles Decap's GitHub authentication natively, avoiding a separately hosted OAuth service. Netlify Forms covers the contact form. |
| Domain + email | Hostinger Business (already owned) | DNS points at Netlify; mail stays on Hostinger. Uses a subscription already paid for, for the two things Netlify cannot provide. |

**Rejected:** Next.js + TinaCMS (ships the React runtime to every visitor for a site that is 95%
static, and reintroduces a third-party content dependency). Eleventy (equivalent performance but
no clean Phase 2 path for checkout).

**Verify during implementation, do not assume:** the current Decap-on-Netlify authentication
setup. Hosting platforms revise free tiers and auth products frequently. Confirm against live
documentation before building the admin panel.

---

## 5. Site map

Primary nav, six items: **Services · Shop · Work · About · Blog · Contact**. Logo is Home.

| Route | Notes |
|---|---|
| `/` | Home |
| `/about` | Story, mission, vision, values, why-choose-us, founder |
| `/services` | Overview + full pricing table |
| `/services/software-development` | |
| `/services/website-design-development` | |
| `/services/ecommerce-solutions` | |
| `/services/digital-marketing` | |
| `/services/it-consulting` | |
| `/services/networking-infrastructure` | |
| `/services/technology-products` | Bridges into the shop |
| `/shop` | All products, filters, sort |
| `/shop/phones` | 53 iPhone listings |
| `/shop/laptops`, `/shop/accessories` | Designed "coming soon" states with WhatsApp enquiry |
| `/shop/[product]` | 53 generated product pages |
| `/work` | Portfolio, placeholder cards |
| `/blog`, `/blog/[post]` | |
| `/contact` | |
| `/returns`, `/privacy`, `/terms` | |
| `/404` | Designed, routes back to shop |

**Pricing has no standalone page.** The full table lives on `/services`; each service page repeats
only its own "from ₦X". A separate pricing page would be thin content competing with the service
pages for the same searches.

**Legal pages are not optional.** Returns is the page a nervous buyer looks for before sending
₦1.4m. Privacy is required the moment the contact form collects a name and phone number. Terms
puts the pre-order wait in writing, which is what makes it enforceable.

**Footer trust line:** `RC 9421582 · Registered with the Corporate Affairs Commission, Nigeria · Abuja, FCT`

**Floating WhatsApp button** on every page. It is the norm in this market, it is the company's
stated primary channel, and it is the entire Phase 1 revenue mechanism. Sized to thumb reach,
positioned never to obscure content or footer links.

---

## 6. Content architecture

Everything that changes is a CMS collection. Nothing that changes is hard-coded.

| Collection | Fields |
|---|---|
| `services` | title, slug, summary, body, starting price, FAQs, related services |
| `products` | see §8 |
| `posts` | title, date, excerpt, cover image, body, tags |
| `work` | portfolio cards |
| `testimonials` | quote, attribution, **`illustrative` flag** |
| `settings` | phone, both emails, WhatsApp number, social links, **pre-order lead time** |

Two of these carry more weight than they appear to.

**`settings.pre_order_lead_time`.** "3–4 weeks" appears on every product page, the shop banner,
the returns page, and inside every WhatsApp message. If the supplier timeline changes, that must
be one edit in `/admin` — not a developer searching 53 pages. Same principle for phone and email.

**`testimonials.illustrative`.** The brief supplies three placeholder quotes. Presenting invented
quotes as real client reviews would be fabricated endorsement — a genuine reputational and legal
liability if a customer ever asks who said it. While the flag is set, they render visibly as
"what you can expect", not as attributed reviews. Clearing the flag is what makes them testimonials.

---

## 7. Visual system

### The two registers

- **Light register (default)** — warm near-white canvas, navy text, gold as functional accent.
  All shop pages, service pages, blog posts, contact. Optimised for reading prices and specs in
  daylight on an inexpensive Android screen.
- **Dark register (rationed)** — deep navy bands with gold as light. Hero, section breaks,
  testimonial band, closing CTA, footer. Roughly 25–30% of any page. Never a full page.

This resolves the site's core tension. Business buyers need proof of taste; phone buyers need
clarity and legibility. The agency pages carry personality; the shop stays plainly functional.
Same brand, two registers, neither compromised for the other.

### The contrast constraint that drives it

The logo gold measures approximately **1.9:1 against white** — below the 4.5:1 WCAG minimum for
text. It is not a stylistic weakness; it is illegible to a meaningful share of visitors and fails
accessibility outright. Against the deep navy it measures approximately **8.4:1**.

Therefore, absolutely:

- **Gold on navy** — headlines, text, icons, active states. Encouraged.
- **Gold on white** — thin accents, underlines, dividers, small filled shapes carrying dark text.
  Never body text, never a link, never a label.
- **Buttons on light** — navy fill, white text. Gold-filled buttons carry **navy** text, not white.

The dark bands are not decorative. They are the only place the brand colour is permitted to
function as a brand colour.

### Typography

Two families. Both variable, both subset to Latin, both **self-hosted** rather than served from a
third-party CDN — saving a DNS lookup and a round trip, which matters disproportionately on 3G.

- **Grotesque, for everything functional** — nav, body, prices, specs, buttons.
  Candidates: General Sans, Satoshi. Explicitly not Inter, which now reads as the absence of a
  typographic decision.
- **Display face, for dark-register moments only** — hero headline, section openers, pull quotes.
  Candidates: Fraunces, Instrument Serif.

**The shop never uses the display face.** Someone comparing an iPhone 14 Pro against a 15 Pro
wants a spec sheet, not atmosphere.

**Prices use tabular figures.** Across a 53-item grid, proportional numerals make columns visibly
ragged.

Final selection is confirmed against built comps (§12), not chosen from a list.

### Motion

Short, functional, gated behind `prefers-reduced-motion`. Entrance fades on scroll; state
transitions on interactive elements. No parallax, no scroll-hijacking, **no animation library** —
one would cost more bytes than every page's content combined.

### Product imagery

Designed placeholder cards: correct silhouette, model name, storage, colourway, in navy and gold.
Systematic rather than improvised, so 53 of them read as a deliberate catalogue style rather than
53 missing photographs. The image slot is a single swappable field; replacing a placeholder with a
real photograph later is a per-product edit, not a rebuild.

Official Apple press imagery is deferred to Phase 2 — a deliberate choice to launch legally clean
rather than rely on non-enforcement.

---

## 8. Shop and pre-order flow

### The flow

Product page → price, specs, transparency block, pre-order notice → **"Pre-order on WhatsApp"** →
WhatsApp opens with the message pre-written:

> Hi Radiant Alpha, I'd like to pre-order:
> **iPhone 15 Pro Max — 256GB — ₦1,154,150**
> Ref: IP15PM-256
> I understand delivery is 3–4 weeks from order confirmation.

No backend, no payment risk, no monthly cost. The buyer arrives already having seen and
acknowledged both price and wait.

### No cart in Phase 1

Every launch product is a phone; nobody buys two phones at once; the accessory catalogue that
would justify a cart is empty. A cart now is machinery serving nothing. It arrives in Phase 2
alongside real checkout.

### Filtering

By model family, storage, and price range; sort by price. 53 items filter instantly client-side
in a few kilobytes of vanilla JavaScript. No framework.

### Pre-order notice — four placements

1. Shop index banner
2. Every product page, adjacent to **both** the price and the button
3. Returns page
4. **Inside the WhatsApp message itself**

The fourth exists because the message is the only copy the buyer keeps, which is what matters if
there is ever a dispute about what they were told.

### Empty categories

Laptops and accessories ship as designed "coming soon" states with a WhatsApp enquiry link. An
empty grid reads as a broken site; a designed state reads as a business with plans.

---

## 9. Product schema and the transparency block

### Required fields — build fails if any is missing

`model`, `storage`, `price`, `category`, `condition`, `grade`, `sim_type`, `battery_health`,
`network_lock`, `warranty_days`, `image`, `image_alt`

Enforcing these at build time is deliberate. It makes it structurally impossible to publish a
₦1.5m listing with a blank condition — the failure mode is a build error, not a live listing that
misleads a customer.

### The transparency block

Rendered identically on every product page:

> **Condition:** Refurbished — Grade A · **Network:** Factory unlocked
> **SIM:** Dual physical SIM · **Battery:** 90%+ · **Warranty:** 14 days

The Nigerian imported-phone market runs on vagueness; most sellers disclose condition and lock
status only after the box is open. A company with no reviews cannot compete on trust the ordinary
way. It can compete by being conspicuously the most transparent seller a buyer encounters that
week. This block is expected to do more for conversion than any amount of visual polish.

### Grading vocabulary

"Premium" is a marketing adjective, not a condition. A buyer reading "premium" on a ₦1.4m listing
hears "new". Listings therefore state a grade:

- **New** — sealed, unopened
- **Grade A** — excellent, minimal to no visible wear, battery 85%+
- **Grade B** — light visible wear, fully functional, battery 80%+

"Premium" may still appear alongside a grade, never instead of one.

### Condition tiers — drafts pending supplier confirmation

Inferred from model age and price. Pre-filled as drafts so the owner corrects populated fields
rather than filling 53 blanks. **Nothing publishes until confirmed.**

| Tier | Listings | Assessment |
|---|---|---|
| iPhone X → 14 Pro Max | 33 | **Used or refurbished.** Discontinued 2018–2023. Cannot be new. |
| iPhone 15 family | 8 | Refurbished or new-old-stock. Superseded twice. |
| iPhone 16 family | 8 | Ambiguous. Confirm specifically. |
| iPhone 17 family + Air | 4 | New. Current generation, priced above US retail in dollar terms. |

The age signal requires no exchange-rate assumption: Apple discontinued the iPhone X in 2018, so
no iPhone X sold in 2026 is new, from any source. The price signal corroborates — the iPhone X
64GB at ₦200,950 is roughly $130–140, which is used-market pricing.

### Warranty terms — confirmed

- **48 hours** — inspection window. Damaged, wrong, or dead on arrival: replacement or refund.
  *(Already the company's stated policy.)*
- **14 days** — defect warranty. Hardware faults in normal use: repair or replacement. Excludes
  physical damage, water, cracked screens.
- **Excluded on any non-new unit** — battery degradation and cosmetic wear.

Short and honoured beats generous and unhonoured.

### `sim_type`, and what was excluded

The owner excluded the **model region code** (`LL/A`, `ZP/A`, `CH/A`) from the site. It is jargon
a buyer cannot interpret, and it is not displayed.

**`sim_type` is retained**, because it is a functional matter rather than a spec detail: US-market
iPhone 14 and newer have **no SIM tray at all** and are eSIM-only, and eSIM support across MTN,
Airtel and Glo remains uneven. A buyer discovering this on delivery day, four weeks after paying,
is a refund and a public complaint. Where a listing is eSIM-only, the product page states so
**above the pre-order button**, not buried in a spec table.

*(Open item — see §13. If the owner also excludes `sim_type`, remove the field and this section.)*

### Supplier questions outstanding

Stock is sourced from China. Required before the shop goes live:

1. New sealed, refurbished, or used? If refurbished — by whom, and are parts genuine?
2. Factory unlocked or carrier locked?
3. For iPhone 14 and above — **is there a physical SIM tray?**
4. Do IMEIs check clean on Apple's coverage page, free of activation lock and blacklisting?
5. Battery health percentage on non-new units.

Answers to 1–3 populate the product pages. Answers to 4–5 prevent absorbing the cost of returns.

**Note:** an earlier claim in discussion that mainland-Chinese units have an undisableable camera
shutter sound was incorrect. That requirement is Japanese (`J/A`) and South Korean (`KH/A`).

---

## 10. Performance, SEO, accessibility

### Performance budget

- **LCP under 2.5s on throttled 3G**
- **Under ~15KB JavaScript site-wide** — mobile nav and shop filters only
- Self-hosted variable fonts, subset, preloaded
- AVIF/WebP with explicit dimensions (no layout shift), responsive `srcset`, lazy below fold
- No animation library, no icon font, no jQuery. Icons are inline SVG.

A slow site is itself evidence against a five-month-old company.

### SEO

Hand-written titles and meta descriptions per page, never templated. Structured data: Organization
(carrying the RC number), LocalBusiness (Abuja), Service per service page, **Product on all 53
listings with `availability: PreOrder`** — truthful, and what surfaces prices in search results —
plus BlogPosting, BreadcrumbList, and FAQPage. Auto-generated sitemap, robots.txt, canonical URLs
on `https://radiantalphadigital.com`, Open Graph and Twitter cards per page.

The seven separate service pages and the blog are the entire SEO strategy, and neither works
without the other. That interdependence is why the CMS was worth building.

### Accessibility — WCAG 2.2 AA

Contrast is handled by the gold-on-navy rule (§7). Beyond it: 44×44px minimum tap targets,
visible focus rings, logical tab order, keyboard-operable filters with results announced via live
region, real labels on every form field, errors announced, `prefers-reduced-motion` honoured.

**Alt text is a required CMS field and the build fails without it**, so it cannot quietly rot as
products are added.

---

## 11. Error handling and testing

### Error handling

- Designed 404 routing back to the shop
- **Contact form** — Netlify Forms, honeypot spam filtering, client and server validation,
  explicit success *and* failure states, and a **WhatsApp fallback shown on failure**. A form that
  fails silently is a lost customer never known about.
- Designed empty states: laptops, accessories, empty blog, empty portfolio, no filter results
- Failed images fall back to a styled placeholder, not a broken-image icon
- Build-time: schema validation and broken internal links fail the build

### Testing — proportionate

No unit tests. For a content site they would be bloat. What is built:

1. **Build-time schema validation** — a product missing price, condition, or alt text fails the
   build rather than publishing
2. **Playwright smoke tests on the revenue path only** — WhatsApp links carry correct model,
   price and reference across a sample of products; filters work; mobile nav opens and closes;
   contact form submits
3. **Lighthouse budget in CI** — build fails if performance or accessibility regresses
4. **Manual pass on a real mid-range Android over a throttled connection** before launch

The WhatsApp link is the entire Phase 1 revenue mechanism, so it is the one thing genuinely
warranting automated tests.

---

## 12. Build sequence

1. Repository, Astro scaffold, design tokens, deploy pipeline
2. **Comps: home hero and one product page** — approved before the full site is written
3. Layout shell, nav, footer, WhatsApp button
4. Marketing pages: Home, About, Services index, 7 service pages
5. Shop: catalogue data, filters, product template, empty states
6. Blog, Work, Contact, legal pages
7. Decap CMS and `/admin`
8. SEO, structured data, accessibility pass
9. Tests, Lighthouse budget, device testing
10. Domain cutover and launch

Step 2 is a gate, not a formality. The visual direction is confirmed against built comps rather
than described in prose.

---

## 13. Open items

**Blocking the shop only — the rest of the site can launch without them:**

| Item | Owner | Notes |
|---|---|---|
| Supplier answers to §9 questions | Client | Condition, lock status, SIM tray, IMEI status, battery health |
| Confirm condition tier drafts | Client | Correct the pre-filled tiering in §9 |
| Confirm `sim_type` retention | Client | Keep as functional disclosure, or exclude with region code |

**Not blocking launch:**

| Item | Owner | Notes |
|---|---|---|
| `help@` mailbox created in Hostinger hPanel | Client | Site references it from day one |
| DNS pointed at Netlify | Both | At cutover |
| Delivery areas covered | Client | For returns/terms pages |
| Final font selection | Designer | Confirmed at comp stage (§12) |
| Decap-on-Netlify auth verification | Designer | Against live docs, before step 7 |

---

## 14. Success criteria

1. Lighthouse ≥ 95 performance and ≥ 100 accessibility on mobile
2. LCP under 2.5s on throttled 3G
3. All 53 products live with complete, confirmed transparency blocks
4. Owner publishes a blog post and edits a product price through `/admin` without assistance
5. No street address, TIN, or superseded contact detail anywhere in the built output
6. Every gold element passes 4.5:1 against its actual background
7. WhatsApp pre-order produces a correctly populated message on a real Android device
