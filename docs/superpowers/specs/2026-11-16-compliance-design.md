# Compliance: privacy policy, terms, and notices at collection — design

Sub-project 2 of the external site audit (the order agreed with the owner:
positioning → **compliance** → SEO and schema → proof and people, with an
off-site checklist alongside).

## Context

The audit found the privacy policy falls short of Nigerian data-protection
expectations. Checking it against the repo showed it is also factually wrong
and out of date, which matters more than the audit's own list:

| Policy says | Reality in the repo |
|---|---|
| Site is hosted by Netlify; forms go through Netlify Forms | Hosted on Hostinger. Contact forms post to `public/contact.php`, which emails the owner with `mail()`. |
| Collects name, email, optional phone, message | Also stores order name, email and phone in MySQL; collects budget and timeline (start-project form); email plus a hashed one-time login token for "Your orders". |
| No mention of a payment processor | Paystack processes card payments. Card details never reach our server. |
| "No advertising or tracking cookies" | Still true: no analytics or ad scripts exist. But one cookie is now set: the PHP session cookie (`public/_lib/session.php`), only when a visitor signs in to "Your orders". |
| Retention: "as long as needed" | No fixed periods. |
| Rights: access, correction, deletion | Incomplete, and no mention of the right to complain to the regulator. |

Facts verified by grep over `src/` and `public/`: no analytics or tracking
code; `contact.php` sends mail and stores nothing; orders and login tokens are
stored in MySQL; the cart lives only in the visitor's browser (`localStorage`,
key `ra-cart`) until checkout.

The Terms page also predates instant checkout: it describes order
"confirmation" and a price "confirmed with you at the point of order", and has
no payment, governing-law or dispute provisions.

## Decisions made with the owner

- **Retention (sensible defaults):** enquiry emails 2 years after the last
  contact; order records 6 years (accounting and warranty); login tokens
  deleted once expired.
- **Lawful bases stated in the policy:** steps before a contract (enquiries),
  performing a contract (orders), legal obligation (accounting records), and
  legitimate interest (securing "Your orders").
- **No consent checkbox and no cookie banner.** The only cookie is strictly
  necessary and nothing tracks visitors.
- **No new cancellation promise.** The existing "cannot be cancelled once
  procurement and shipping have begun" sentence stays unchanged.

## Scope

In scope: `src/pages/privacy.astro` rewrite; targeted `src/pages/terms.astro`
edits; a one-sentence notice above the submit button of each form; expired-token
pruning in `public/account/login.php`; a shared `legalUpdated` date; tests.

Out of scope: SEO and schema work, the founder/proof content, the off-site
checklist, any NDPC registration or compliance filing, a cookie banner, and any
change to refunds, returns or warranty terms.

## Design

### Privacy policy (`src/pages/privacy.astro`)

Rewritten in place, same layout and plain-language style. Headings:

1. **Who we are.** `SITE.legalName`, RC `SITE.rcNumber`, `SITE.location`, and
   `SITE.email` as the contact point.
2. **What we collect, and why we are allowed to.** A short list or table:
   - Enquiry and start-project forms: name, email, phone, message, budget,
     timeline. Basis: steps taken at your request before a contract.
   - Orders: name, email, phone, order details. Basis: performing the contract;
     accounting records are also kept to meet legal obligations.
   - "Your orders" and order lookup: your email, an order reference, a one-time
     sign-in link, and a session cookie. Basis: performing the contract, and our
     legitimate interest in keeping your orders secure.
   - WhatsApp: your number and messages. Basis: you contacted us.
3. **Cookies and similar storage.** One session cookie, only if the visitor signs
   in to "Your orders"; strictly necessary; ends when the browser closes. The cart
   is kept in the visitor's own browser storage and is not sent anywhere until
   checkout. No analytics, advertising or tracking.
4. **Who else handles your data.** Hostinger (hosting, email, database), Paystack
   (card payments), WhatsApp. Replaces the incorrect Netlify paragraph.
5. **Data leaving Nigeria.** Providers may store or process data on servers
   outside Nigeria; we rely on their own data-protection commitments. The page
   states no specific country (not verified).
6. **How long we keep it.** The three periods above.
7. **Your rights.** Access, correction, deletion, restriction, objection,
   portability, and withdrawal of consent where consent is the basis. Records we
   must keep for accounting cannot be deleted early. Response within 30 days
   (unchanged from the current policy).
8. **Complaints.** To us first at `SITE.email`, or to the Nigeria Data Protection
   Commission (ndpc.gov.ng).
9. **Last updated**, from `SITE.legalUpdated`.

The existing "What we do not do" list is kept (it is still accurate). Wording
uses no statute section numbers: the available sources disagree on numbering and
the Act's text was not retrieved in full, so the page describes the rights and
bases in plain language only.

### Terms (`src/pages/terms.astro`)

- Pre-order terms: "after your order is confirmed" becomes "after your payment is
  confirmed"; the price clause becomes "the price shown at checkout when you
  pay" (what `checkout.php` actually charges).
- New **Payments** section: card payments are processed by Paystack; we do not
  see or store card details; refunds are returned to the original payment method
  (consistent with `returns.astro`).
- New **Governing law and disputes** section: Nigerian law; the courts of the
  FCT, Abuja; contact us first so we can try to resolve a dispute within 30 days.
  The existing sentence preserving statutory consumer rights stays.
- "Last updated" from `SITE.legalUpdated`.
- The cancellation sentence is untouched.

### Notices at the point of collection

One sentence directly above each form's submit button, linking to `/privacy`:

| Form | File | Sentence |
|---|---|---|
| Contact | `src/pages/contact.astro` | "We use these details only to reply to your enquiry. See our privacy policy." |
| Start project | `src/pages/start-project.astro` | same |
| Pay Now (per variant) | `src/pages/shop/[product].astro` | "We use these details to process and deliver your order. Card payments are handled by Paystack. See our privacy policy." |
| Cart checkout | `src/pages/cart/index.astro` | same as Pay Now |
| Sign in | `src/pages/account/login.astro` | "We'll use your email only to send your sign-in link. See our privacy policy." |

### Token pruning (`public/account/login.php`)

Before inserting a new token, run `DELETE FROM login_tokens WHERE expires_at <
NOW()` as a prepared statement. No scheduled job: the table is small and this is
the only write path. This makes the "deleted once expired" retention line true.

### Shared date (`src/lib/site.ts`)

Add `legalUpdated: '16 November 2026'` to `SITE`. Privacy and Terms both render
it. One edit updates both pages.

## Error handling and risks

- **Not legal advice.** The text is careful drafting from public secondary
  sources. A qualified person should review it before the owner relies on it.
  This is stated in the plan's final report, not on the public page.
- **Retention depends on the owner.** The 2-year enquiry period holds only if old
  enquiries are cleared from the mailbox; the 6-year order period has no deletion
  mechanism and needs none. The owner confirms the 6 years with an accountant.
- **NDPC registration is unresolved.** The audit could not tell whether a very
  small ICT company must register as a data controller or processor of major
  importance. The policy makes no registration claim either way.
- **Existing tests.** `tests/unit/privacy.test.ts` (private-details leak check)
  is untouched and must keep passing. Any e2e test that clicks through the forms
  must still pass with a notice added above the button.

## Testing

- New `tests/unit/compliance.test.ts` (source-level): privacy page has no
  "Netlify"; names Hostinger, Paystack, the Nigeria Data Protection Commission,
  "legitimate interest", "2 years", "6 years"; Terms mention Paystack and the
  laws of Nigeria; `login.php` contains the prepared expired-token DELETE;
  `SITE.legalUpdated` exists and both pages reference it.
- New e2e in `tests/e2e/compliance.spec.ts`: each of the five forms shows its
  notice with a link whose href is `/privacy`; the Privacy page renders every
  required heading; both legal pages show the last-updated date.
- Existing accessibility and SEO specs must pass unchanged.
- `login.php` cannot be executed here (no PHP), so its change is verified by
  reading the source in a unit test, as with earlier PHP changes.

## Open items for the owner

- Have someone qualified read the final Privacy and Terms text.
- Confirm the 6-year order-record period with an accountant.
- Check whether NDPC registration applies to the business.
- Commit to clearing enquiry emails older than 2 years.
- Confirm where Hostinger's servers are, if you want the policy to say so.
