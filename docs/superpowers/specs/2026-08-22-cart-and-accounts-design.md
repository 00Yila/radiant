# Cart and optional accounts — design

## Context

The shop currently supports one purchase shape: pick a variant on the
product page, submit a single-item form to `checkout.php`, pay via
Paystack, get a reference to track manually. That's shipped and tested.

Two things are being added on top of it:

1. **A cart** — buy more than one item (possibly different products) in a
   single order.
2. **Optional accounts** — a customer can see their past orders without
   re-entering a reference and email every time, but never has to create
   one to check out. Confirmed scope: accounts exist **only** to show order
   history. No saved addresses, no saved payment methods, no preferences.

Two decisions already made with the user, both load-bearing for the design
below:

- **Status is tracked per line item, not per order.** A cart order can
  contain phones with different sourcing lead times, so "shipped" for one
  item doesn't mean "shipped" for the whole order.
- **Guest orders link to an account automatically by email.** If someone
  checks out as a guest with `alex@example.com` and later logs into an
  account with that same email, their earlier guest orders show up — no
  explicit "claim this order" step.

## Non-goals (explicit)

- Saved shipping addresses or saved payment methods.
- Password-based auth, "forgot password" flows, email verification beyond
  the login link itself.
- Per-unit status within a single cart line (a line with quantity 2 moves
  through processing → shipped → delivered as one unit, not two).
- Rate-limiting or anti-abuse on login-link requests. A malicious actor
  could request repeated login emails to someone else's address as a
  minor nuisance; at this traffic volume that's an acceptable risk, not
  something to build defenses for now.
- Cross-device cart sync for logged-in users. The cart is `localStorage`
  only, same as an anonymous visitor's.
- Changing anything about how Paystack is called, verified, or how
  price-tampering is prevented — that machinery (`_lib/paystack.php`,
  `_lib/catalogue.php`, the webhook signature check) is reused unchanged.

## Architecture

### Cart: additive, not a replacement

The existing "Pay Now" button (no JavaScript required, one item, instant
checkout) stays exactly as it is — it's already shipped, tested without
JS, and is the right choice for the common case of buying one thing.

Cart is a **second, independent path**:

- An "Add to Cart" button next to Pay Now on each product panel. This one
  requires JavaScript (a cart cannot exist without client-side state) and
  writes to `localStorage`.
- A cart badge in the header showing item count.
- A `/cart` page (client-rendered from `localStorage`) listing items with
  quantity steppers and a remove control, plus a "Proceed to Payment"
  button.
- That button POSTs the whole cart — item list plus name/email/phone — to
  `checkout.php`.

`checkout.php` ends up accepting two shapes on the same endpoint:

- **Legacy / Pay Now**: `product`, `variant`, `name`, `email`, `phone` —
  unchanged, byte-for-byte the same validation and behavior as today.
- **Cart**: an `items` field containing JSON —
  `[{"product":"iphone-13","variant":"IP13-128-BLK","quantity":2}, ...]`
  — plus the same `name`/`email`/`phone`. Detected by the presence of a
  non-empty `items` field; if absent, falls through to the legacy path.

Cart validation adds two caps to prevent an absurd or abusive payload:
max 20 distinct line items, max 10 quantity per line. Every line is still
looked up against the catalogue manifest exactly like today — the price
never comes from the browser, cart or not.

### Data model: split `orders` into envelope + line items

```sql
CREATE TABLE orders (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  reference                VARCHAR(40)  NOT NULL UNIQUE,
  amount_kobo              BIGINT UNSIGNED NOT NULL,   -- sum of all line items, snapshot
  currency                 CHAR(3)      NOT NULL DEFAULT 'NGN',
  customer_name            VARCHAR(120) NOT NULL,
  customer_email           VARCHAR(190) NOT NULL,
  customer_phone           VARCHAR(40)  NOT NULL,
  status                   ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  paystack_transaction_id  BIGINT UNSIGNED NULL,
  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_customer_email (customer_email)
);

CREATE TABLE order_items (
  id             INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id       INT UNSIGNED NOT NULL,
  product_id     VARCHAR(80)  NOT NULL,
  product_label  VARCHAR(160) NOT NULL,
  variant_ref    VARCHAR(80)  NOT NULL,
  variant_label  VARCHAR(80)  NOT NULL,
  unit_price_kobo BIGINT UNSIGNED NOT NULL,
  quantity       SMALLINT UNSIGNED NOT NULL DEFAULT 1,
  status            ENUM('pending','processing','shipped','delivered') NOT NULL DEFAULT 'pending',
  status_updated_at DATETIME NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);

CREATE TABLE order_item_status_history (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT UNSIGNED NOT NULL,
  status        ENUM('pending','processing','shipped','delivered') NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id)
);

CREATE TABLE login_tokens (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(190) NOT NULL,
  token_hash  CHAR(64)     NOT NULL,   -- sha256 of the raw token; raw token exists only in the emailed link
  expires_at  DATETIME     NOT NULL,
  used_at     DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_token_hash (token_hash)
);
```

`orders.status` is now purely a payment-lifecycle field
(`pending`/`paid`/`failed`); fulfillment lifecycle lives entirely on
`order_items.status`. `markOrderPaid()` keeps its existing idempotent
`WHERE status = 'pending'` guard on the order row, and — inside the same
transaction, only when that guard actually flips the row — bulk-updates
every `order_items` row for that order from `pending` to `processing`
and writes one `order_item_status_history` row per item. The admin's
status-change action moves from "change an order's status" to "change
one line item's status," validated against
`['processing','shipped','delivered']` (an item is never manually moved
back to `pending` — that only happens automatically, pre-payment).

There is no `users` table. An "account" is nothing more than a session
holding a verified email address; every query against it is
`WHERE customer_email = <session email>`.

`order_items.status` has no `failed` value — a failed payment is entirely
an `orders`-level fact (the row never leaves `pending`), so a failed
order's items simply stay `pending` forever, which already reads
correctly ("this never happened") without a dedicated state.

Nothing is in production yet, so `docs/db/schema.sql` is replaced
wholesale rather than written as an `ALTER TABLE` migration — there is no
live data to preserve.

### Accounts: passwordless, session-based, three small PHP pages

Reuses the `mail()` setup `contact.php` already has — the site already
sends outbound mail today.

- `src/pages/account/login.astro` — static form, one field (email),
  posts to `public/account/login.php`. No live data needed to render it,
  so it stays a plain Astro page like `track/index.astro`.
- `public/account/login.php` — generates a random token
  (`random_bytes(32)`), stores its SHA-256 hash with a 15-minute
  expiry, emails a link containing the raw token, then redirects to a
  static `src/pages/account/check-email.astro` ("we sent you a link")
  regardless of whether the email is one we've seen before — this endpoint
  must never reveal whether an email has ordered from us.
- `public/account/verify.php` — GET `?token=...`. Hashes the incoming
  token, looks it up, checks `used_at IS NULL AND expires_at > NOW()`,
  marks it used, calls `session_regenerate_id(true)` (session-fixation
  protection), sets `$_SESSION['email']`, redirects to
  `public/account/orders.php`. An invalid/expired/reused token redirects
  to a static "link expired, request a new one" page.
- `public/account/orders.php` — session-gated (redirects to
  `/account/login/` if `$_SESSION['email']` isn't set). Plain PHP,
  templated the same way `admin/orders.php` is, because it needs a live
  session + DB read on every request — the same reason the admin tool
  isn't an Astro page. Lists every order for the session's email, each
  with its line items and their individual status.
- `public/account/logout.php` — destroys the session, redirects to
  `/account/login/`.

### Tracking: generalized to N items, still a static result page

The current guest-tracking flow (`order-status.php` redirects to
`track/result.astro`, which reads a flattened one-item query string)
doesn't scale to "N items, each with its own status and dates" — cramming
that into individual query params is exactly the kind of fragile encoding
worth avoiding.

**Revised from the original draft of this spec** (which proposed folding
this into a PHP-rendered page shared with the account view): this project
has no PHP runtime in its dev/CI environment, ever, and leans on
Playwright against the built static `dist/` output as its only
verification method throughout. Moving the result page's rendering into
PHP would make it untestable until a real deploy — too large a
testability loss for a cosmetic-only benefit (shared markup). Decision:
keep the result page static, generalized to carry multiple items in one
encoded parameter instead of one status's worth of flattened fields.

- `src/pages/track/index.astro` stays as-is (the no-JS lookup form).
- It now posts to `public/order-status.php` (unchanged endpoint name;
  only its output shape changes).
- `order-status.php` does the reference+email lookup (identical
  not-found response either way, exactly as today), builds a JSON array
  of `{product_label, variant_label, quantity, status, status_dates}`
  per item, base64url-encodes it, and redirects to
  `/track/result/?ref=...&items=<encoded>`.
- `track/result.astro` decodes and renders the array client-side —
  same per-item timeline treatment the original single-item version had,
  looped once per item instead of assumed-singular.
- `account/orders.php` (PHP-rendered, since it's session-gated and needs
  a live DB read regardless) implements its own — smaller — rendering of
  the same underlying data. The two are not required to share a render
  function; any visual drift between them is a copy-editing concern, not
  a correctness one, since both read from the same `order_items` /
  `order_item_status_history` tables.

### What's reused unchanged

`_lib/paystack.php`, `_lib/catalogue.php`, `_lib/config.php`,
`_lib/http.php`, `order-webhook.php`'s signature verification, and the
admin Basic Auth setup are untouched. `order-webhook.php` and
`order-callback.php` are updated only to verify the paid amount against
the sum of `order_items` instead of a single row, and to call the new
bulk item-status transition.

## Error handling

- Cart payload fails validation (bad JSON, over the item/quantity caps,
  an unknown product/variant) → same redirect-to-shop-with-`?error=`
  pattern `checkout.php` already uses; no partial order is ever created.
- A `login.php` request for an unrecognized email still "succeeds" from
  the visitor's point of view (same check-your-email redirect) — telling
  them otherwise would let this endpoint be used to test whether an email
  has ordered before.
- An expired or already-used token in `verify.php` never says which —
  both look identical, mirroring the reference/email not-found pattern
  from tracking.

## Testing

- Extend `tests/unit/checkout.test.ts`: the new `order_items` /
  `login_tokens` ENUMs in `schema.sql` stay in sync with PHP; the
  legacy single-item POST shape to `checkout.php` still parses exactly
  as before (regression guard, since this is the path most likely to
  break silently while cart is being added).
- New `tests/unit/cart.test.ts`: the item/quantity caps, and that a cart
  JSON payload's total matches the sum of its lines.
- `tests/e2e/shop.spec.ts`: existing no-JS Pay Now tests must keep
  passing unchanged — this is the regression bar for "didn't touch the
  legacy path."
- New `tests/e2e/cart.spec.ts`: add two different items, adjust quantity,
  remove one, submit, correct total.
- New `tests/e2e/account.spec.ts`: login form submits correctly with no
  JS; a stubbed session state renders the right order list (the actual
  token/email round trip isn't testable here — no PHP/mail runtime in
  this environment, same limitation noted for the original checkout
  build).

## Open item for the user before implementation

None outstanding — the questions that mattered (order-history-only
accounts, per-item status, auto-link-by-email) are already answered and
reflected above.
