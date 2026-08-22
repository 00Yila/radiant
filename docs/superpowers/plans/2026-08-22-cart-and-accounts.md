# Cart and Optional Accounts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add multi-item cart checkout and optional passwordless accounts (order-history only) to the Radiant Alpha shop, on top of the already-shipped single-item Paystack checkout and manual tracking system.

**Architecture:** Split the `orders` table into a payment envelope (`orders`) and per-line fulfillment rows (`order_items`, each with its own `pending → processing → shipped → delivered` status). Cart is a client-side (`localStorage`) addition alongside the existing no-JS "Pay Now" path, both posting to the same `checkout.php`. Accounts are sessions holding a verified email — no password, no `users` table — reusing `mail()` the way `contact.php` already does.

**Tech Stack:** Astro (static), vanilla PHP 8 + PDO/MySQL (Hostinger shared hosting), vanilla client-side TypeScript compiled by Astro's bundler, Vitest, Playwright.

**Spec:** `docs/superpowers/specs/2026-08-22-cart-and-accounts-design.md`

## Global Constraints

- Stay on MySQL/MariaDB (Hostinger Business plan) — confirmed earlier in this project; do not introduce Postgres-only syntax.
- The price/amount charged is never trusted from the browser, cart or not — every line is re-resolved against `public/data/catalogue/products.json` via `lookupCatalogueVariant()`.
- The existing single-item "Pay Now" path (`checkout.php`'s legacy branch) must keep working byte-for-byte identically — it's shipped, tested without JavaScript, and nothing in this plan removes it.
- No `users` table, no passwords, no saved addresses/payment methods — an account is a session holding a verified email (spec non-goals).
- Cart is `localStorage`-only; no server-side cart state, no cross-device sync.
- `docs/db/schema.sql` is replaced wholesale — nothing is in production yet, so no migration path is needed.
- No PHP runtime exists in this project's dev/CI environment. Every PHP-touching task's "test" step is a static, regex-based structural check (matching `tests/unit/checkout.test.ts`'s existing style) — never a claim that PHP was executed. Client-side TypeScript (`src/lib/client/cart.ts`) and Astro pages ARE fully testable here (Vitest, Playwright against built `dist/`), and every task touching them gets a real, running test.
- `order-webhook.php` and `order-callback.php` need **no code changes** in this plan — `markOrderPaid()`'s signature and the amount-vs-`orders.amount_kobo` comparison they both rely on are unchanged; the new item cascade happens entirely inside `markOrderPaid()`. Task 2 includes a regression check confirming this.

---

## Task 1: Redefine the status vocabulary — schema, TypeScript source of truth, and the cross-check test

**Files:**
- Modify: `docs/db/schema.sql` (full rewrite)
- Modify: `src/lib/orders.ts` (full rewrite)
- Modify: `tests/unit/checkout.test.ts` (rewrite the status/schema sections; leave the webhook and order-status sections alone for now — those get touched in later tasks)

**Interfaces:**
- Produces: `PAYMENT_STATUSES: readonly ['pending','paid','failed']`, `ITEM_STATUSES: readonly ['pending','processing','shipped','delivered']`, `TRACKING_STEPS: readonly ['processing','shipped','delivered']`, `ORDER_REDIRECTS` (unchanged: `confirmed`/`failed`/`notFound`), `CART_LIMITS: { maxItems: 20, maxQuantity: 10 }` — all exported from `src/lib/orders.ts`. Every later task that needs a status list or cart cap imports from here.

- [ ] **Step 1: Rewrite `docs/db/schema.sql`**

```sql
-- Radiant Alpha shop — orders schema.
--
-- Run once by hand in Hostinger's phpMyAdmin (hPanel → Databases → phpMyAdmin).
-- Hostinger shared hosting has no migration runner, and this repo has no
-- automated DB tooling — this file is documentation of what was run, not
-- something any build step executes. Nothing is in production yet, so this
-- is a full replacement, not a migration.
--
-- `orders` is a payment envelope (one row per Paystack transaction);
-- `order_items` is one row per cart line, each with its own fulfillment
-- status, since a multi-item order can have phones with different sourcing
-- lead times. `order_item_status_history` is an append-only log per item, so
-- the tracking/account views can show *when* each status was set. Every
-- status write goes through a shared PHP function (markOrderPaid() and
-- updateOrderItemStatus() in public/_lib/orders.php) that updates the row and
-- its history together, so they cannot drift apart.
--
-- order_items.status has no 'failed' value: a failed payment is entirely an
-- orders-level fact (the row never leaves 'pending'), so a failed order's
-- items simply stay 'pending' forever, which already reads correctly.

CREATE TABLE IF NOT EXISTS orders (
  id                       INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,

  -- Generated by us as 'RA-' . bin2hex(random_bytes(8)) before ever calling
  -- Paystack — 64 bits of entropy, since this doubles as half of the
  -- customer tracking page's auth check (reference + email).
  reference                VARCHAR(40)  NOT NULL UNIQUE,

  -- Sum of every order_items line at purchase time — a snapshot, not a
  -- computed value, so a later catalogue price change can never rewrite
  -- what a past order says it cost.
  amount_kobo              BIGINT UNSIGNED NOT NULL,
  currency                 CHAR(3)      NOT NULL DEFAULT 'NGN',

  customer_name            VARCHAR(120) NOT NULL,
  customer_email           VARCHAR(190) NOT NULL,
  customer_phone           VARCHAR(40)  NOT NULL,

  status                   ENUM('pending','paid','failed') NOT NULL DEFAULT 'pending',
  paystack_transaction_id  BIGINT UNSIGNED NULL,

  created_at               DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_customer_email (customer_email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_items (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_id         INT UNSIGNED NOT NULL,

  -- Every product/variant field is a SNAPSHOT at purchase time, not a
  -- foreign key into the catalogue — same reasoning as orders.amount_kobo.
  product_id       VARCHAR(80)  NOT NULL,
  product_label    VARCHAR(160) NOT NULL,
  variant_ref      VARCHAR(80)  NOT NULL,
  variant_label    VARCHAR(80)  NOT NULL,
  unit_price_kobo  BIGINT UNSIGNED NOT NULL,
  quantity         SMALLINT UNSIGNED NOT NULL DEFAULT 1,

  status            ENUM('pending','processing','shipped','delivered') NOT NULL DEFAULT 'pending',
  status_updated_at DATETIME NOT NULL,

  FOREIGN KEY (order_id) REFERENCES orders(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS order_item_status_history (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  order_item_id INT UNSIGNED NOT NULL,
  status        ENUM('pending','processing','shipped','delivered') NOT NULL,
  created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_item_id) REFERENCES order_items(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS login_tokens (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  email       VARCHAR(190) NOT NULL,

  -- SHA-256 of the raw token. The raw token exists only in the emailed URL —
  -- never stored — so a DB read alone can't be used to log in as someone.
  token_hash  CHAR(64)     NOT NULL,

  expires_at  DATETIME     NOT NULL,
  used_at     DATETIME     NULL,
  created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_token_hash (token_hash)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
```

- [ ] **Step 2: Rewrite `src/lib/orders.ts`**

```ts
/**
 * The status enums, redirect targets, and cart limits, mirrored from
 * public/_lib/orders.php, public/_lib/cart.php, and public/order-callback.php.
 * This file has no runtime consumer of its own on the server side — its job
 * is to give tests/unit/checkout.test.ts and tests/unit/cart.test.ts
 * something in TypeScript to check the PHP against, so the two can never
 * drift silently. It's also imported directly by the browser-side cart
 * module (src/lib/client/cart.ts), which is why CART_LIMITS lives here
 * rather than only in PHP.
 */

/** Payment-lifecycle status of the whole order (one Paystack transaction). */
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;

/** Fulfillment-lifecycle status of one line item within an order. */
export const ITEM_STATUSES = ['pending', 'processing', 'shipped', 'delivered'] as const;

/** The subset of ITEM_STATUSES the tracking/account timelines render as steps. */
export const TRACKING_STEPS = ['processing', 'shipped', 'delivered'] as const;

export const ORDER_REDIRECTS = {
  confirmed: '/order/confirmed/',
  failed: '/order/failed/',
  notFound: '/order/not-found/',
} as const;

export const CART_LIMITS = {
  maxItems: 20,
  maxQuantity: 10,
} as const;
```

- [ ] **Step 3: Rewrite the status/schema sections of `tests/unit/checkout.test.ts`**

Replace the two `describe` blocks named `'the order status enum stays in sync with the PHP'` with the following (leave every other `describe` block in the file untouched for now — later tasks touch them):

```ts
describe('the payment status enum stays in sync with the PHP', () => {
  const php = readFileSync('public/_lib/orders.php', 'utf8');

  const phpStatuses = [
    ...(php.match(/const PAYMENT_STATUSES = \[([\s\S]*?)\];/)?.[1] ?? '').matchAll(
      /'([a-z]+)'/g
    ),
  ].map((m) => m[1]);

  it('finds PAYMENT_STATUSES in the PHP', () => {
    expect(phpStatuses.length, 'could not parse PAYMENT_STATUSES out of orders.php').toBeGreaterThan(0);
  });

  it('matches the TypeScript source of truth exactly, in order', () => {
    expect(phpStatuses).toEqual([...PAYMENT_STATUSES]);
  });
});

describe('the item status enum stays in sync with the PHP', () => {
  const php = readFileSync('public/_lib/orders.php', 'utf8');

  const phpStatuses = [
    ...(php.match(/const ITEM_STATUSES = \[([\s\S]*?)\];/)?.[1] ?? '').matchAll(
      /'([a-z]+)'/g
    ),
  ].map((m) => m[1]);

  it('finds ITEM_STATUSES in the PHP', () => {
    expect(phpStatuses.length, 'could not parse ITEM_STATUSES out of orders.php').toBeGreaterThan(0);
  });

  it('matches the TypeScript source of truth exactly, in order', () => {
    expect(phpStatuses).toEqual([...ITEM_STATUSES]);
  });
});

describe('the schema ENUM columns match their TypeScript source of truth', () => {
  const schema = readFileSync('docs/db/schema.sql', 'utf8');

  it('orders.status matches PAYMENT_STATUSES', () => {
    const match = schema.match(/^\s*status\s+ENUM\(([^)]+)\)\s+NOT NULL DEFAULT 'pending'/m);
    expect(match, 'could not find orders.status ENUM in schema.sql').not.toBeNull();
    const values = [...match![1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
    expect(values).toEqual([...PAYMENT_STATUSES]);
  });

  it('order_items.status and order_item_status_history.status match ITEM_STATUSES', () => {
    const matches = [...schema.matchAll(/status\s+ENUM\(([^)]+)\)/g)]
      // orders.status is ENUM('pending','paid','failed') — 3 values, filtered out here.
      .map((m) => [...m[1].matchAll(/'([a-z]+)'/g)].map((s) => s[1]))
      .filter((values) => values.length !== PAYMENT_STATUSES.length);

    expect(matches.length, 'expected two ITEM_STATUSES ENUM columns').toBe(2);
    for (const values of matches) {
      expect(values).toEqual([...ITEM_STATUSES]);
    }
  });
});
```

Add the import at the top of the file (alongside the existing one):

```ts
import { PAYMENT_STATUSES, ITEM_STATUSES, ORDER_REDIRECTS } from '../../src/lib/orders';
```

- [ ] **Step 4: Run the updated unit test file and confirm the new sections fail for the right reason**

Run: `npx vitest run tests/unit/checkout.test.ts`
Expected: FAIL — `public/_lib/orders.php` still has the old `ORDER_STATUSES` constant and `docs/db/schema.sql` (just rewritten in Step 1) now has the new schema, so the PHP-side regexes for `PAYMENT_STATUSES`/`ITEM_STATUSES` find nothing yet. This is expected; Task 2 fixes it.

- [ ] **Step 5: Commit**

```bash
git add docs/db/schema.sql src/lib/orders.ts tests/unit/checkout.test.ts
git commit -m "Redefine order status vocabulary: payment envelope vs per-item fulfillment"
```

---

## Task 2: Rewrite `public/_lib/orders.php` for the envelope + line-items model

**Files:**
- Modify: `public/_lib/orders.php` (full rewrite)
- Modify: `tests/unit/checkout.test.ts` (add function-existence checks)

**Interfaces:**
- Consumes: nothing new (still uses `public/_lib/db.php`'s `dbConnect()`, unchanged).
- Produces (all in `public/_lib/orders.php`):
  - `const PAYMENT_STATUSES`, `const ITEM_STATUSES`
  - `generateOrderReference(): string`
  - `createPendingOrder(PDO $pdo, array $order, array $items): int` — `$order` needs keys `reference, amount_kobo, currency, customer_name, customer_email, customer_phone`; `$items` is a list of `['product_id','product_label','variant_ref','variant_label','unit_price_kobo','quantity']`. Returns the new order's id.
  - `findOrderByReference(PDO $pdo, string $reference): ?array`
  - `findOrderById(PDO $pdo, int $id): ?array`
  - `getOrderItems(PDO $pdo, int $orderId): array`
  - `markOrderPaid(PDO $pdo, array $order, int $paystackTransactionId): void` — **signature unchanged from before**; `order-webhook.php` and `order-callback.php` call this exactly as they already do.
  - `updateOrderItemStatus(PDO $pdo, int $itemId, string $status): bool`
  - `getOrderItemHistory(PDO $pdo, int $itemId): array`
  - `findOrderItemById(PDO $pdo, int $id): ?array`
  - `listOrders(PDO $pdo, int $limit = 200): array` — each row now also carries `item_count` (an integer subquery column) for the admin list view.
  - `listOrdersForEmail(PDO $pdo, string $email): array` — used by both the account page and, indirectly, the tracking lookup.

- [ ] **Step 1: Write the full replacement for `public/_lib/orders.php`**

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * Payment-lifecycle status of the whole order (one Paystack transaction).
 * Matched against by tests/unit/checkout.test.ts to keep this in sync with
 * the ENUM in docs/db/schema.sql and with src/lib/orders.ts.
 */
const PAYMENT_STATUSES = ['pending', 'paid', 'failed'];

/** Fulfillment-lifecycle status of one line item within an order. */
const ITEM_STATUSES = ['pending', 'processing', 'shipped', 'delivered'];

/** 64 bits of entropy — this doubles as half of the tracking page's auth check. */
function generateOrderReference(): string
{
    return 'RA-' . bin2hex(random_bytes(8));
}

/**
 * Creates the payment envelope and every line item in one call. $items is
 * never empty — checkout.php guarantees at least one resolved line before
 * this is ever called, for both the cart path and the legacy single-item
 * path (which builds a one-element $items array).
 */
function createPendingOrder(PDO $pdo, array $order, array $items): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO orders (reference, amount_kobo, currency, customer_name, customer_email, customer_phone, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)'
    );
    $stmt->execute([
        $order['reference'],
        $order['amount_kobo'],
        $order['currency'] ?? 'NGN',
        $order['customer_name'],
        $order['customer_email'],
        $order['customer_phone'],
        'pending',
    ]);

    $orderId = (int) $pdo->lastInsertId();

    $itemStmt = $pdo->prepare(
        'INSERT INTO order_items
            (order_id, product_id, product_label, variant_ref, variant_label, unit_price_kobo, quantity, status, status_updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    foreach ($items as $item) {
        $itemStmt->execute([
            $orderId,
            $item['product_id'],
            $item['product_label'],
            $item['variant_ref'],
            $item['variant_label'],
            $item['unit_price_kobo'],
            $item['quantity'],
            'pending',
        ]);
    }

    return $orderId;
}

function findOrderByReference(PDO $pdo, string $reference): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE reference = ? LIMIT 1');
    $stmt->execute([$reference]);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

function findOrderById(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

function getOrderItems(PDO $pdo, int $orderId): array
{
    $stmt = $pdo->prepare('SELECT * FROM order_items WHERE order_id = ? ORDER BY id ASC');
    $stmt->execute([$orderId]);
    return $stmt->fetchAll();
}

function findOrderItemById(PDO $pdo, int $id): ?array
{
    $stmt = $pdo->prepare('SELECT * FROM order_items WHERE id = ? LIMIT 1');
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    return $row === false ? null : $row;
}

/**
 * Marks the order paid, idempotently, and cascades every one of its items
 * from 'pending' to 'processing'. The `WHERE ... AND status = 'pending'` is
 * what makes a race between the Paystack callback and the webhook safe
 * without row locking: whichever request arrives first flips the row and
 * gets rowCount() === 1 (so the item cascade runs); the second request's
 * UPDATE matches zero rows and is a silent, correct no-op — the cascade
 * below never runs twice for the same order.
 *
 * Signature is unchanged from the single-item version of this function:
 * order-webhook.php and order-callback.php call this exactly as before.
 */
function markOrderPaid(PDO $pdo, array $order, int $paystackTransactionId): void
{
    if ($order['status'] !== 'pending') {
        return;
    }

    $pdo->beginTransaction();

    $stmt = $pdo->prepare(
        'UPDATE orders SET status = ?, paystack_transaction_id = ? WHERE id = ? AND status = ?'
    );
    $stmt->execute(['paid', $paystackTransactionId, $order['id'], 'pending']);

    if ($stmt->rowCount() === 1) {
        $items = $pdo->prepare('SELECT id FROM order_items WHERE order_id = ? AND status = ?');
        $items->execute([$order['id'], 'pending']);
        $itemIds = $items->fetchAll(PDO::FETCH_COLUMN);

        $updateItem = $pdo->prepare(
            'UPDATE order_items SET status = ?, status_updated_at = NOW() WHERE id = ?'
        );
        $historyItem = $pdo->prepare(
            'INSERT INTO order_item_status_history (order_item_id, status) VALUES (?, ?)'
        );

        foreach ($itemIds as $itemId) {
            $updateItem->execute(['processing', $itemId]);
            $historyItem->execute([$itemId, 'processing']);
        }
    }

    $pdo->commit();
}

/**
 * Used only by the admin tool. Validates $status against ITEM_STATUSES
 * before it ever reaches a prepared statement — the ENUM column would also
 * reject an invalid value, but failing here gives a clear message instead of
 * a raw DB error.
 */
function updateOrderItemStatus(PDO $pdo, int $itemId, string $status): bool
{
    if (!in_array($status, ITEM_STATUSES, true)) {
        return false;
    }

    $pdo->beginTransaction();
    $pdo->prepare('UPDATE order_items SET status = ?, status_updated_at = NOW() WHERE id = ?')
        ->execute([$status, $itemId]);
    $pdo->prepare('INSERT INTO order_item_status_history (order_item_id, status) VALUES (?, ?)')
        ->execute([$itemId, $status]);
    $pdo->commit();

    return true;
}

function getOrderItemHistory(PDO $pdo, int $itemId): array
{
    $stmt = $pdo->prepare(
        'SELECT status, created_at FROM order_item_status_history WHERE order_item_id = ? ORDER BY created_at ASC'
    );
    $stmt->execute([$itemId]);
    return $stmt->fetchAll();
}

/** Admin order list. item_count lets the list show "3 items" without an N+1 query per row. */
function listOrders(PDO $pdo, int $limit = 200): array
{
    $stmt = $pdo->prepare(
        'SELECT o.*, (SELECT COUNT(*) FROM order_items oi WHERE oi.order_id = o.id) AS item_count
         FROM orders o ORDER BY o.created_at DESC LIMIT ?'
    );
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}

/**
 * Every order for one email address, most recent first. Used by the account
 * order-history page. Guest orders show up automatically here the moment
 * someone logs into an account with the same email — there is no separate
 * "claim this order" step or foreign key to maintain.
 */
function listOrdersForEmail(PDO $pdo, string $email): array
{
    $stmt = $pdo->prepare('SELECT * FROM orders WHERE customer_email = ? ORDER BY created_at DESC');
    $stmt->execute([$email]);
    return $stmt->fetchAll();
}
```

- [ ] **Step 2: Run the unit tests and confirm the Task 1 sections now pass**

Run: `npx vitest run tests/unit/checkout.test.ts`
Expected: the `'the payment status enum...'`, `'the item status enum...'`, and `'the schema ENUM columns...'` blocks now PASS. Other blocks in the file (webhook, order-status redirects) will still reference things that haven't changed yet — they should still pass, since Task 1/2 didn't touch `order-webhook.php`, `order-callback.php`, or `order-status.php`.

- [ ] **Step 3: Add function-existence checks to `tests/unit/checkout.test.ts`**

Append a new `describe` block:

```ts
describe('orders.php exposes the functions the rest of the system calls', () => {
  const php = readFileSync('public/_lib/orders.php', 'utf8');

  it.each([
    'function createPendingOrder(PDO $pdo, array $order, array $items): int',
    'function markOrderPaid(PDO $pdo, array $order, int $paystackTransactionId): void',
    'function updateOrderItemStatus(PDO $pdo, int $itemId, string $status): bool',
    'function listOrdersForEmail(PDO $pdo, string $email): array',
    'function getOrderItems(PDO $pdo, int $orderId): array',
  ])('declares %s', (signature) => {
    expect(php).toContain(signature);
  });

  it('markOrderPaid cascades items inside the same idempotency guard, not a separate one', () => {
    // Guards against a regression where the item cascade gets its own
    // `WHERE status = 'pending'` check on order_items instead of relying on
    // the orders-row rowCount() check — that would make the cascade run
    // every time markOrderPaid is called instead of exactly once.
    const fn = php.match(/function markOrderPaid[\s\S]*?\n}/)?.[0] ?? '';
    expect(fn).toContain("rowCount() === 1");
  });
});
```

- [ ] **Step 4: Run the tests and confirm everything passes**

Run: `npx vitest run tests/unit/checkout.test.ts`
Expected: PASS, all blocks.

- [ ] **Step 5: Commit**

```bash
git add public/_lib/orders.php tests/unit/checkout.test.ts
git commit -m "Rewrite orders.php for the envelope + per-item fulfillment model"
```

---

## Task 3: Cart payload validation — `public/_lib/cart.php`

**Files:**
- Create: `public/_lib/cart.php`
- Create: `tests/unit/cart.test.ts`

**Interfaces:**
- Consumes: `CART_LIMITS` from `src/lib/orders.ts` (TypeScript side, for the cross-check test only — PHP has its own literal constants).
- Produces: `const CART_MAX_ITEMS`, `const CART_MAX_QUANTITY`, `parseCartItems(string $json): ?array` — returns a list of `['product' => string, 'variant' => string, 'quantity' => int]` or `null` on any malformed/out-of-bounds input. Consumed by `checkout.php` in Task 4.

- [ ] **Step 1: Write `public/_lib/cart.php`**

```php
<?php
declare(strict_types=1);

/**
 * Validates the JSON cart payload checkout.php receives from /cart/'s
 * "Proceed to Payment" form. Returns null on any structural problem —
 * checkout.php treats null exactly like a failed legacy-path validation
 * (redirect with ?error=invalid, no order created).
 *
 * This never looks up prices — that still happens per-line in checkout.php
 * via lookupCatalogueVariant(), the same as the legacy single-item path.
 * This file only shapes and bounds-checks what the browser sent.
 */

const CART_MAX_ITEMS = 20;
const CART_MAX_QUANTITY = 10;

function parseCartItems(string $json): ?array
{
    $decoded = json_decode($json, true);

    if (!is_array($decoded) || count($decoded) === 0 || count($decoded) > CART_MAX_ITEMS) {
        return null;
    }

    $items = [];
    foreach ($decoded as $row) {
        if (!is_array($row)) {
            return null;
        }

        $product = (string) ($row['product'] ?? '');
        $variant = (string) ($row['variant'] ?? '');
        $quantity = (int) ($row['quantity'] ?? 0);

        if ($product === '' || $variant === '' || $quantity < 1 || $quantity > CART_MAX_QUANTITY) {
            return null;
        }

        $items[] = ['product' => $product, 'variant' => $variant, 'quantity' => $quantity];
    }

    return $items;
}
```

- [ ] **Step 2: Write `tests/unit/cart.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CART_LIMITS } from '../../src/lib/orders';

describe('cart.php enforces the same limits as the TypeScript source of truth', () => {
  const php = readFileSync('public/_lib/cart.php', 'utf8');

  it('CART_MAX_ITEMS matches CART_LIMITS.maxItems', () => {
    const match = php.match(/const CART_MAX_ITEMS = (\d+);/);
    expect(match, 'could not find CART_MAX_ITEMS in cart.php').not.toBeNull();
    expect(Number(match![1])).toBe(CART_LIMITS.maxItems);
  });

  it('CART_MAX_QUANTITY matches CART_LIMITS.maxQuantity', () => {
    const match = php.match(/const CART_MAX_QUANTITY = (\d+);/);
    expect(match, 'could not find CART_MAX_QUANTITY in cart.php').not.toBeNull();
    expect(Number(match![1])).toBe(CART_LIMITS.maxQuantity);
  });

  it('declares parseCartItems with the expected signature', () => {
    expect(php).toContain('function parseCartItems(string $json): ?array');
  });

  it('rejects before resolving prices — no lookupCatalogueVariant call in this file', () => {
    // parseCartItems only shapes/bounds-checks; price resolution happens in
    // checkout.php. A price lookup creeping in here would duplicate the one
    // true price-resolution path this project relies on for security.
    expect(php).not.toContain('lookupCatalogueVariant');
  });
});
```

- [ ] **Step 3: Run the test**

Run: `npx vitest run tests/unit/cart.test.ts`
Expected: PASS, all 4 checks.

- [ ] **Step 4: Commit**

```bash
git add public/_lib/cart.php tests/unit/cart.test.ts
git commit -m "Add cart payload validation shared by checkout.php's cart path"
```

---

## Task 4: Shared secure session helper — `public/_lib/session.php`

**Files:**
- Create: `public/_lib/session.php`

**Interfaces:**
- Produces: `startSecureSession(): void` — consumed by `public/account/login.php`, `public/account/verify.php`, `public/account/orders.php`, and `public/account/logout.php` in Tasks 7-9. Reused three times, which is what justifies a shared file instead of inlining it (matching this codebase's existing bar for shared `_lib` helpers).

- [ ] **Step 1: Write `public/_lib/session.php`**

```php
<?php
declare(strict_types=1);

/**
 * Every page that touches $_SESSION for the account feature calls this
 * before session_start() would otherwise be called implicitly. Cookie flags
 * matter here specifically because this session carries a verified identity
 * (an email address), not just UI state:
 *   - HttpOnly: unreadable from JavaScript, so an XSS bug elsewhere on the
 *     site can't lift the session cookie.
 *   - Secure: never sent over plain HTTP.
 *   - SameSite=Lax: not attached to a cross-site POST, which is the same
 *     class of protection the admin tool's CSRF token gives its own form.
 */
function startSecureSession(): void
{
    if (session_status() === PHP_SESSION_ACTIVE) {
        return;
    }

    session_set_cookie_params([
        'lifetime' => 0,
        'path' => '/',
        'secure' => true,
        'httponly' => true,
        'samesite' => 'Lax',
    ]);

    session_start();
}
```

- [ ] **Step 2: Commit**

```bash
git add public/_lib/session.php
git commit -m "Add a secure session starter shared by the account pages"
```

---

## Task 5: Rewrite `public/checkout.php` to accept a cart alongside the legacy single-item path

**Files:**
- Modify: `public/checkout.php` (full rewrite)
- Modify: `tests/e2e/shop.spec.ts` (no test changes expected — this step just confirms the existing no-JS Pay Now tests still pass unmodified, which is the regression bar for this task)
- Modify: `tests/unit/checkout.test.ts` (add structural checks for the new branch)

**Interfaces:**
- Consumes: `parseCartItems()` from `public/_lib/cart.php` (Task 3), `createPendingOrder(PDO, array, array)` from `public/_lib/orders.php` (Task 2, note the new third `$items` parameter), `lookupCatalogueVariant()` from `public/_lib/catalogue.php` (unchanged).
- Produces: no new functions — this is an endpoint, not a library file.

- [ ] **Step 1: Write the full replacement for `public/checkout.php`**

```php
<?php
/**
 * Initiates a Paystack payment for either a single item (the legacy Pay Now
 * form, still no-JavaScript-required) or a whole cart (the /cart/ page's
 * "Proceed to Payment" form, which posts a JSON `items` field).
 *
 * The one rule that matters most in this whole feature, cart or not: the
 * amount charged always comes from public/data/catalogue/products.json —
 * generated at build time — never from anything the browser posted. Every
 * line, cart or legacy, is resolved through the same lookupCatalogueVariant()
 * call.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/http.php';
require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/orders.php';
require_once __DIR__ . '/_lib/catalogue.php';
require_once __DIR__ . '/_lib/paystack.php';
require_once __DIR__ . '/_lib/cart.php';

const SITE_DOMAIN = 'https://radiantalphadigital.com';
const PRODUCT_ID_PATTERN = '/^[a-z0-9-]+$/';

function shopRedirectTarget(string $productId, string $error): string
{
    $safeProduct = preg_match(PRODUCT_ID_PATTERN, $productId) === 1 ? $productId : null;
    return $safeProduct !== null
        ? '/shop/' . $safeProduct . '/?error=' . $error
        : '/shop/?error=' . $error;
}

// ---------------------------------------------------------------- guards
if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    redirect('/shop/');
}

// ---------------------------------------------------------- resolve lines
// Cart path: an `items` field means /cart/ submitted this, regardless of
// whether the legacy `product`/`variant` fields are also present (they
// never are, but detecting on `items` alone keeps this unambiguous).
$itemsJson = field('items');
$isCart = $itemsJson !== '';

if ($isCart) {
    $cartLines = parseCartItems($itemsJson);
    if ($cartLines === null) {
        redirect('/cart/?error=invalid');
    }
    $errorRedirect = '/cart/?error=invalid';
    $firstProductId = $cartLines[0]['product'];
} else {
    // ---- legacy single-item path: unchanged validation from before ----
    $productId = field('product');
    $variantRef = field('variant');

    if (field('bot-field') !== '') {
        redirect(shopRedirectTarget($productId, 'invalid'));
    }

    $legacyValid = $productId !== '' && $variantRef !== ''
        && mb_strlen($productId) <= 80 && mb_strlen($variantRef) <= 80;

    if (!$legacyValid) {
        redirect(shopRedirectTarget($productId, 'invalid'));
    }

    $cartLines = [['product' => $productId, 'variant' => $variantRef, 'quantity' => 1]];
    $errorRedirect = shopRedirectTarget($productId, 'invalid');
    $firstProductId = $productId;
}

// Honeypot is checked above for the legacy path (it needs $productId for the
// redirect target); the cart path shares the same field name and check.
if ($isCart && field('bot-field') !== '') {
    redirect($errorRedirect);
}

$name = field('name');
$email = field('email');
$phone = field('phone');

$contactValid = $name !== ''
    && $phone !== ''
    && filter_var($email, FILTER_VALIDATE_EMAIL) !== false
    && mb_strlen($name) <= 120
    && mb_strlen($phone) <= 40;

if (!$contactValid) {
    redirect($errorRedirect);
}

// ------------------------------------------------- resolve every line
$resolvedItems = [];
$amountKobo = 0;

foreach ($cartLines as $line) {
    $entry = lookupCatalogueVariant($line['product'], $line['variant']);
    if ($entry === null) {
        redirect($errorRedirect);
    }

    $unitPriceKobo = $entry['price'] * 100;
    $amountKobo += $unitPriceKobo * $line['quantity'];

    $resolvedItems[] = [
        'product_id' => $line['product'],
        'product_label' => $entry['product_label'],
        'variant_ref' => $line['variant'],
        'variant_label' => $entry['variant_label'],
        'unit_price_kobo' => $unitPriceKobo,
        'quantity' => $line['quantity'],
    ];
}

// ---------------------------------------------------------------- order
$pdo = dbConnect();
$reference = generateOrderReference();

$orderId = createPendingOrder($pdo, [
    'reference' => $reference,
    'amount_kobo' => $amountKobo,
    'customer_name' => $name,
    'customer_email' => $email,
    'customer_phone' => $phone,
], $resolvedItems);

// ---------------------------------------------------------------- paystack
$result = paystackInitialize($email, $amountKobo, $reference, SITE_DOMAIN . '/order-callback.php');

if (($result['status'] ?? false) !== true || empty($result['data']['authorization_url'])) {
    // No updateOrderStatus() call needed here: the order row is already
    // 'pending', and a failed Paystack init just leaves it that way — there
    // is no per-order 'failed' transition function to call since failure is
    // the terminal state a pending order simply never leaves.
    redirect($isCart ? '/cart/?error=payment-init' : shopRedirectTarget($firstProductId, 'payment-init'));
}

redirect($result['data']['authorization_url']);
```

Note the removed `updateOrderStatus($pdo, $orderId, 'failed')` call from the old version: that function no longer exists (Task 2 replaced it with `updateOrderItemStatus`, which operates on items, not the order envelope), and the order row is already `pending`, which correctly represents "never completed" without a dedicated `failed`-on-init-failure write. This is intentional, not an oversight — `PAYMENT_STATUSES` includes `failed` for the webhook/callback rejection path (an explicit Paystack `status: false` response), not for "Paystack was never reached at all."

- [ ] **Step 2: Run the existing no-JS Pay Now e2e tests to confirm the legacy path is unaffected**

Run: `npx playwright test tests/e2e/shop.spec.ts -g "Pay Now form works without JavaScript"`
Expected: PASS, both tests, unchanged from before this task.

- [ ] **Step 3: Add structural checks to `tests/unit/checkout.test.ts`**

Append:

```ts
describe('checkout.php resolves both the legacy and cart paths through the same catalogue lookup', () => {
  const php = readFileSync('public/checkout.php', 'utf8');

  it('detects the cart path from a non-empty items field', () => {
    expect(php).toContain("field('items')");
  });

  it('never trusts a price from the request — every line calls lookupCatalogueVariant', () => {
    const calls = php.match(/lookupCatalogueVariant\(/g) ?? [];
    expect(calls.length).toBe(1); // one call site, inside the shared per-line loop
  });

  it('rejects an unparseable cart payload before any order is created', () => {
    const cartBranchIndex = php.indexOf('parseCartItems(');
    const createOrderIndex = php.indexOf('createPendingOrder(');
    expect(cartBranchIndex).toBeGreaterThan(-1);
    expect(createOrderIndex).toBeGreaterThan(-1);
    expect(cartBranchIndex).toBeLessThan(createOrderIndex);
  });
});
```

- [ ] **Step 4: Run the full unit test file**

Run: `npx vitest run tests/unit/checkout.test.ts`
Expected: PASS, all blocks.

- [ ] **Step 5: Commit**

```bash
git add public/checkout.php tests/unit/checkout.test.ts
git commit -m "Extend checkout.php to accept a multi-item cart alongside Pay Now"
```

---

## Task 6: Browser-side cart module — `src/lib/client/cart.ts`

**Files:**
- Create: `src/lib/client/cart.ts`
- Create: `tests/unit/cart-client.test.ts`

**Interfaces:**
- Consumes: `CART_LIMITS` from `src/lib/orders.ts` (Task 1).
- Produces: `CartItem`, `CartStorage` (types), `readCart(storage)`, `addToCart(storage, item, quantity?)`, `updateQuantity(storage, product, variant, quantity)`, `removeFromCart(storage, product, variant)`, `clearCart(storage)`, `cartTotal(items)`, `cartCount(items)`. Consumed by Task 7 (product page button + header badge) and Task 8 (`/cart/` page), both passing `window.localStorage` as `storage` (it structurally satisfies `CartStorage`).

This module takes its storage as a parameter specifically so it's testable in this project's plain-Node Vitest environment without adding a `jsdom` dependency — every call site in the browser just passes `localStorage` directly.

- [ ] **Step 1: Write the failing test — `tests/unit/cart-client.test.ts`**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  readCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  cartTotal,
  cartCount,
  type CartStorage,
} from '../../src/lib/client/cart';
import { CART_LIMITS } from '../../src/lib/orders';

/** A minimal in-memory stand-in for window.localStorage. */
function fakeStorage(): CartStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('readCart', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(readCart(fakeStorage())).toEqual([]);
  });

  it('returns an empty array for corrupted JSON rather than throwing', () => {
    const storage = fakeStorage();
    storage.setItem('ra-cart', 'not json');
    expect(readCart(storage)).toEqual([]);
  });
});

describe('addToCart', () => {
  it('adds a new line item', () => {
    const storage = fakeStorage();
    const result = addToCart(storage, { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000 });
    expect(result).toEqual([
      { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000, quantity: 1 },
    ]);
    expect(readCart(storage)).toEqual(result);
  });

  it('merges into an existing line by product+variant instead of duplicating it', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000 });
    const result = addToCart(storage, { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000 }, 2);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it('caps quantity at CART_LIMITS.maxQuantity', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 }, CART_LIMITS.maxQuantity);
    const result = addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 }, 5);
    expect(result[0].quantity).toBe(CART_LIMITS.maxQuantity);
  });

  it('refuses to add a new distinct line beyond CART_LIMITS.maxItems, but still allows increasing an existing line', () => {
    const storage = fakeStorage();
    for (let i = 0; i < CART_LIMITS.maxItems; i++) {
      addToCart(storage, { product: `p${i}`, variant: 'x', label: 'X', price: 100 });
    }
    const beforeOverflow = readCart(storage).length;
    const afterAttempt = addToCart(storage, { product: 'one-too-many', variant: 'x', label: 'X', price: 100 });
    expect(afterAttempt).toHaveLength(beforeOverflow);

    const afterMerge = addToCart(storage, { product: 'p0', variant: 'x', label: 'X', price: 100 });
    expect(afterMerge.find((i) => i.product === 'p0')?.quantity).toBe(2);
  });
});

describe('updateQuantity', () => {
  it('changes the quantity of a matching line', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 });
    const result = updateQuantity(storage, 'a', 'x', 4);
    expect(result[0].quantity).toBe(4);
  });

  it('removes the line when quantity drops to zero or below', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 });
    const result = updateQuantity(storage, 'a', 'x', 0);
    expect(result).toEqual([]);
  });
});

describe('removeFromCart', () => {
  it('removes only the matching line', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 });
    addToCart(storage, { product: 'b', variant: 'y', label: 'B', price: 200 });
    const result = removeFromCart(storage, 'a', 'x');
    expect(result).toEqual([{ product: 'b', variant: 'y', label: 'B', price: 200, quantity: 1 }]);
  });
});

describe('clearCart', () => {
  it('empties the cart', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 });
    clearCart(storage);
    expect(readCart(storage)).toEqual([]);
  });
});

describe('cartTotal and cartCount', () => {
  it('sums price*quantity and quantity respectively', () => {
    const items = [
      { product: 'a', variant: 'x', label: 'A', price: 100, quantity: 2 },
      { product: 'b', variant: 'y', label: 'B', price: 50, quantity: 3 },
    ];
    expect(cartTotal(items)).toBe(350);
    expect(cartCount(items)).toBe(5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run tests/unit/cart-client.test.ts`
Expected: FAIL — `src/lib/client/cart.ts` doesn't exist yet.

- [ ] **Step 3: Write `src/lib/client/cart.ts`**

```ts
import { CART_LIMITS } from '../orders';

export interface CartItem {
  product: string;
  variant: string;
  label: string;
  price: number;
  quantity: number;
}

/**
 * Structurally matches window.localStorage (and Storage in general), taken
 * as a parameter so this module is testable in Vitest's plain Node
 * environment without a jsdom dependency — every browser call site just
 * passes `localStorage` directly, which already satisfies this shape.
 */
export interface CartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'ra-cart';

export function readCart(storage: CartStorage): CartItem[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(storage: CartStorage, items: CartItem[]): CartItem[] {
  storage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

function findLine(items: CartItem[], product: string, variant: string): CartItem | undefined {
  return items.find((i) => i.product === product && i.variant === variant);
}

export function addToCart(
  storage: CartStorage,
  item: Omit<CartItem, 'quantity'>,
  quantity = 1
): CartItem[] {
  const items = readCart(storage);
  const existing = findLine(items, item.product, item.variant);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, CART_LIMITS.maxQuantity);
    return writeCart(storage, items);
  }

  if (items.length >= CART_LIMITS.maxItems) {
    // Silently refuses a new distinct line rather than throwing — the caller
    // (the "Add to Cart" button handler) treats an unchanged cart as the
    // signal that nothing happened.
    return items;
  }

  items.push({ ...item, quantity: Math.min(quantity, CART_LIMITS.maxQuantity) });
  return writeCart(storage, items);
}

export function updateQuantity(
  storage: CartStorage,
  product: string,
  variant: string,
  quantity: number
): CartItem[] {
  const items = readCart(storage);
  if (quantity <= 0) {
    return writeCart(storage, items.filter((i) => !(i.product === product && i.variant === variant)));
  }

  const existing = findLine(items, product, variant);
  if (existing) {
    existing.quantity = Math.min(quantity, CART_LIMITS.maxQuantity);
  }
  return writeCart(storage, items);
}

export function removeFromCart(storage: CartStorage, product: string, variant: string): CartItem[] {
  const items = readCart(storage).filter((i) => !(i.product === product && i.variant === variant));
  return writeCart(storage, items);
}

export function clearCart(storage: CartStorage): void {
  writeCart(storage, []);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run tests/unit/cart-client.test.ts`
Expected: PASS, all cases.

- [ ] **Step 5: Commit**

```bash
git add src/lib/client/cart.ts tests/unit/cart-client.test.ts
git commit -m "Add the browser-side cart module, storage-injected for testability"
```

---

## Task 7: Wire "Add to Cart" into the product page and a cart badge into the header

**Files:**
- Modify: `src/pages/shop/[product].astro:159-224` (the `.buy__panel` block from the last session's work — add an "Add to Cart" button next to the existing Pay Now form and WhatsApp button)
- Modify: `src/components/Header.astro` (add a cart link + badge, and a script that keeps it in sync with `localStorage` on every page load)

**Interfaces:**
- Consumes: `addToCart`, `cartCount`, `readCart` from `src/lib/client/cart.ts` (Task 6).

- [ ] **Step 1: Add the cart link and badge to `Header.astro`**

Add a new `<li>` inside the nav `<ul>`, immediately before the existing `hdr__cta-item`:

```astro
<li class="hdr__cart-item">
  <a href="/cart/" class="hdr__cart-link">
    Cart<span id="cart-badge" class="hdr__cart-badge" hidden>0</span>
  </a>
</li>
```

Add to the existing `<script>` block at the bottom of the file (after the existing keydown listener):

```ts
import { readCart, cartCount } from '../lib/client/cart';

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = cartCount(readCart(localStorage));
  badge.textContent = String(count);
  badge.hidden = count === 0;
}

updateCartBadge();
```

Add to the `<style>` block:

```css
.hdr__cart-link {
  display: inline-flex;
  align-items: center;
  gap: var(--ra-space-2xs);
  min-height: var(--ra-tap-min);
  padding-inline: var(--ra-space-s);
  border-radius: var(--ra-radius-s);
  color: var(--ra-ink);
  font-weight: 600;
  text-decoration: none;
  transition: background-color 160ms ease, color 160ms ease;
}
.hdr__cart-link:hover {
  background: var(--ra-gold-500);
  color: var(--ra-navy-900);
}
.hdr__cart-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.25rem;
  height: 1.25rem;
  padding-inline: 0.25rem;
  border-radius: 999px;
  background: var(--ra-navy-600);
  color: var(--ra-surface);
  font-size: var(--ra-step--2);
  font-weight: 700;
}
```

- [ ] **Step 2: Add the "Add to Cart" button to each `.buy__panel` in `src/pages/shop/[product].astro`**

Insert this immediately after the closing `</p>` of the "Want the exact battery and colour..." paragraph (the last element inside `.buy__panel`, right before its closing `</div>`), so it reads as a third option alongside Pay Now and WhatsApp:

```astro
                <button
                  type="button"
                  class="ra-btn ra-btn--secondary buy__add-cart"
                  data-product={product.id}
                  data-variant={v.ref}
                  data-label={`${v.label}${v.colour ? ` — ${v.colour}` : ''}`}
                  data-price={v.price}
                >
                  Add to Cart
                </button>
                <p class="buy__note">
                  Buying more than one item? Add each to your cart and pay for
                  everything in one order.
                </p>
```

Add a new `<script>` at the bottom of the file (after the existing frontmatter/markup, alongside where other pages put their client scripts — this file currently has none, so add a new block after the closing `</style>`):

```astro
<script>
  import { addToCart, cartCount, readCart } from '../../lib/client/cart';

  function updateBadge() {
    const badge = document.getElementById('cart-badge');
    if (!badge) return;
    const count = cartCount(readCart(localStorage));
    badge.textContent = String(count);
    badge.hidden = count === 0;
  }

  for (const button of document.querySelectorAll<HTMLButtonElement>('.buy__add-cart')) {
    button.addEventListener('click', () => {
      const { product, variant, label, price } = button.dataset;
      if (!product || !variant || !label || !price) return;

      addToCart(localStorage, { product, variant, label, price: Number(price) });
      updateBadge();

      const original = button.textContent;
      button.textContent = 'Added';
      setTimeout(() => {
        button.textContent = original;
      }, 1200);
    });
  }
</script>
```

- [ ] **Step 3: Build the site and manually verify in the browser preview**

Run: `npm run build`
Then use the preview tools: navigate to a product page, click "Add to Cart," confirm the header badge updates from hidden to showing "1," click a second variant's "Add to Cart," confirm the badge shows "2."

- [ ] **Step 4: Commit**

```bash
git add src/pages/shop/[product].astro src/components/Header.astro
git commit -m "Wire Add to Cart buttons and a header cart badge into the shop"
```

---

## Task 8: The `/cart/` page and its checkout form

**Files:**
- Create: `src/pages/cart/index.astro`
- Create: `tests/e2e/cart.spec.ts`

**Interfaces:**
- Consumes: `readCart`, `updateQuantity`, `removeFromCart`, `cartTotal` from `src/lib/client/cart.ts` (Task 6).
- Produces: a page at `/cart/` that posts `items` (JSON), `name`, `email`, `phone`, `bot-field` to `/checkout.php` — the shape `checkout.php`'s cart branch (Task 5) expects.

- [ ] **Step 1: Write `src/pages/cart/index.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
import { formatNaira } from '../../lib/format';
---
<Base
  title="Your cart"
  description="Review your cart and pay for everything in one order."
  path="/cart"
  noindex
>
  <Section register="dark">
    <p class="ra-eyebrow">Your cart</p>
    <h1 class="ra-display">Review your order.</h1>
  </Section>

  <Section>
    <p id="cart-empty" class="ra-lede" hidden>
      Your cart is empty. <a href="/shop">Browse the shop</a> to add something.
    </p>

    <ul id="cart-items" class="cart-items ra-measure" role="list"></ul>

    <p id="cart-total" class="cart-total" hidden></p>

    <form method="post" action="/checkout.php" id="cart-checkout-form" class="cart-form" hidden>
      <input type="hidden" name="items" id="cart-items-field" />

      <p class="ra-visually-hidden" aria-hidden="true">
        <label for="bot-field">Leave this field empty</label>
        <input id="bot-field" name="bot-field" tabindex="-1" autocomplete="off" />
      </p>

      <div class="cart-field">
        <label for="name">Your name</label>
        <input id="name" name="name" type="text" required autocomplete="name" maxlength="120" />
      </div>
      <div class="cart-field">
        <label for="email">Email address</label>
        <input id="email" name="email" type="email" required autocomplete="email" maxlength="190" />
      </div>
      <div class="cart-field">
        <label for="phone">Phone or WhatsApp number</label>
        <input id="phone" name="phone" type="tel" required autocomplete="tel" maxlength="40" />
      </div>

      <button type="submit" class="ra-btn ra-btn--gold">Proceed to Payment</button>
    </form>
  </Section>
</Base>

<script>
  import { readCart, updateQuantity, removeFromCart, cartTotal, type CartItem } from '../../lib/client/cart';
  import { formatNaira } from '../../lib/format';
  import { CART_LIMITS } from '../../lib/orders';

  const list = document.getElementById('cart-items')!;
  const emptyNote = document.getElementById('cart-empty')!;
  const totalEl = document.getElementById('cart-total')!;
  const form = document.getElementById('cart-checkout-form') as HTMLFormElement;
  const itemsField = document.getElementById('cart-items-field') as HTMLInputElement;

  function render() {
    const items = readCart(localStorage);
    list.innerHTML = '';

    if (items.length === 0) {
      emptyNote.hidden = false;
      totalEl.hidden = true;
      form.hidden = true;
      return;
    }

    emptyNote.hidden = true;
    totalEl.hidden = false;
    form.hidden = false;

    for (const item of items) {
      const li = document.createElement('li');
      li.className = 'cart-line';
      li.innerHTML = `
        <span class="cart-line__label">${item.label} <small>(${item.product})</small></span>
        <input type="number" min="0" max="${CART_LIMITS.maxQuantity}" value="${item.quantity}" class="cart-line__qty" aria-label="Quantity" />
        <span class="cart-line__price">${formatNaira(item.price * item.quantity)}</span>
        <button type="button" class="cart-line__remove">Remove</button>
      `;

      li.querySelector('.cart-line__qty')!.addEventListener('change', (e) => {
        const value = Number((e.target as HTMLInputElement).value);
        updateQuantity(localStorage, item.product, item.variant, value);
        render();
      });

      li.querySelector('.cart-line__remove')!.addEventListener('click', () => {
        removeFromCart(localStorage, item.product, item.variant);
        render();
      });

      list.appendChild(li);
    }

    totalEl.textContent = `Total: ${formatNaira(cartTotal(items))}`;
    itemsField.value = JSON.stringify(
      items.map((i: CartItem) => ({ product: i.product, variant: i.variant, quantity: i.quantity }))
    );
  }

  form.addEventListener('submit', () => {
    // Re-serialize immediately before submit in case a quantity input's
    // change event hasn't fired yet (e.g. blurred via a direct submit click).
    itemsField.value = JSON.stringify(
      readCart(localStorage).map((i) => ({ product: i.product, variant: i.variant, quantity: i.quantity }))
    );
  });

  render();
</script>

<style>
  .cart-items { list-style: none; padding: 0; display: grid; gap: var(--ra-space-m); }
  .cart-line {
    display: grid;
    grid-template-columns: 1fr auto auto auto;
    align-items: center;
    gap: var(--ra-space-m);
    padding: var(--ra-space-s) 0;
    border-bottom: 1px solid var(--ra-rule);
  }
  .cart-line__qty { width: 4rem; padding: var(--ra-space-2xs); }
  .cart-line__price { font-weight: 700; color: var(--ra-navy-600); }
  .cart-total { margin-top: var(--ra-space-l); font-size: var(--ra-step-1); font-weight: 700; }

  .cart-form { display: grid; gap: var(--ra-space-s); margin-top: var(--ra-space-l); max-width: 28rem; }
  .cart-field { display: grid; gap: var(--ra-space-2xs); }
  .cart-field label { font-weight: 600; font-size: var(--ra-step--1); }
  .cart-field input {
    min-height: var(--ra-tap-min);
    padding: var(--ra-space-s) var(--ra-space-m);
    border: 1px solid var(--ra-border);
    border-radius: var(--ra-radius-s);
    background: var(--ra-surface);
  }
</style>
```

- [ ] **Step 2: Write `tests/e2e/cart.spec.ts`**

```ts
import { test, expect, type Page } from '@playwright/test';

/*
 * The cart only exists as localStorage state, so every test seeds it via
 * page.evaluate before navigating to /cart/ — there is no server-side cart
 * to set up. checkout.php itself can't be exercised here (no PHP runtime),
 * so these tests stop at "the form is populated and points at the right
 * place," the same boundary the Pay Now no-JS tests use.
 */

type SeedItem = { product: string; variant: string; label: string; price: number; quantity: number };

async function seedCart(page: Page, items: SeedItem[]) {
  await page.goto('/cart/');
  await page.evaluate((data) => localStorage.setItem('ra-cart', JSON.stringify(data)), items);
  await page.reload();
}

test('an empty cart shows the empty message, not a checkout form', async ({ page }) => {
  await page.goto('/cart/');
  await expect(page.locator('#cart-empty')).toBeVisible();
  await expect(page.locator('#cart-checkout-form')).toBeHidden();
});

test('a seeded cart renders its lines and total', async ({ page }) => {
  await seedCart(page, [
    { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000, quantity: 2 },
  ]);

  await expect(page.locator('.cart-line')).toHaveCount(1);
  await expect(page.locator('.cart-line__price')).toContainText('760,000');
  await expect(page.locator('#cart-total')).toContainText('760,000');
});

test('removing the only line shows the empty message again', async ({ page }) => {
  await seedCart(page, [
    { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000, quantity: 1 },
  ]);

  await page.locator('.cart-line__remove').click();
  await expect(page.locator('#cart-empty')).toBeVisible();
});

test('the checkout form posts the serialized cart to /checkout.php', async ({ page }) => {
  await seedCart(page, [
    { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000, quantity: 2 },
    { product: 'iphone-15', variant: 'IP15-256', label: '256GB', price: 900000, quantity: 1 },
  ]);

  const form = page.locator('#cart-checkout-form');
  await expect(form).toHaveAttribute('action', '/checkout.php');

  const itemsFieldValue = await page.locator('#cart-items-field').inputValue();
  expect(JSON.parse(itemsFieldValue)).toEqual([
    { product: 'iphone-13', variant: 'IP13-128-BLK', quantity: 2 },
    { product: 'iphone-15', variant: 'IP15-256', quantity: 1 },
  ]);
});

test('Add to Cart on a product page updates the header badge', async ({ page }) => {
  await page.goto('/shop/iphone-15-pro-max');
  await page.evaluate(() => localStorage.removeItem('ra-cart'));
  await page.reload();

  await expect(page.locator('#cart-badge')).toBeHidden();

  await page.locator('.buy__panel:visible .buy__add-cart').click();
  await expect(page.locator('#cart-badge')).toBeVisible();
  await expect(page.locator('#cart-badge')).toHaveText('1');
});
```

- [ ] **Step 3: Build and run the new e2e tests**

Run: `npm run build && npx playwright test tests/e2e/cart.spec.ts`
Expected: PASS, all 5 tests.

- [ ] **Step 4: Commit**

```bash
git add src/pages/cart/index.astro tests/e2e/cart.spec.ts
git commit -m "Add the /cart/ page and its checkout-submission tests"
```

---

## Task 9: Passwordless login backend — `public/account/login.php`, `verify.php`, `logout.php`

**Files:**
- Create: `public/account/login.php`
- Create: `public/account/verify.php`
- Create: `public/account/logout.php`
- Modify: `tests/unit/checkout.test.ts` (add a small structural check file, or create `tests/unit/account.test.ts` — see Step 4)

**Interfaces:**
- Consumes: `startSecureSession()` from `public/_lib/session.php` (Task 4), `dbConnect()` from `public/_lib/db.php`, `field()`/`redirect()` from `public/_lib/http.php`.
- Produces: nothing new consumed by other tasks — `public/account/orders.php` (Task 11) only depends on `$_SESSION['email']` being set, which `verify.php` establishes.

- [ ] **Step 1: Write `public/account/login.php`**

```php
<?php
/**
 * Step one of passwordless login: takes an email, issues a single-use,
 * time-limited token, emails a link containing it, and always redirects to
 * the same "check your email" page — whether or not that email has ever
 * placed an order. Revealing the difference would turn this endpoint into
 * an oracle for "has this address ordered from us before."
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/http.php';
require_once __DIR__ . '/../_lib/db.php';

const SITE_DOMAIN = 'https://radiantalphadigital.com';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    redirect('/account/login/');
}

$email = field('email');

if (filter_var($email, FILTER_VALIDATE_EMAIL) === false || mb_strlen($email) > 190) {
    redirect('/account/login/?error=invalid');
}

$token = bin2hex(random_bytes(32));
$tokenHash = hash('sha256', $token);

$pdo = dbConnect();
$pdo->prepare(
    'INSERT INTO login_tokens (email, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 15 MINUTE))'
)->execute([$email, $tokenHash]);

$link = SITE_DOMAIN . '/account/verify.php?token=' . urlencode($token);
$body = "Click this link to view your order history:\n\n{$link}\n\nThis link expires in 15 minutes and can only be used once.";

mail(
    $email,
    'Your Radiant Alpha login link',
    wordwrap($body, 78, "\n", true),
    [],
    '-fno-reply@radiantalphadigital.com'
);

redirect('/account/check-email/');
```

- [ ] **Step 2: Write `public/account/verify.php`**

```php
<?php
/**
 * Step two of passwordless login: verifies the token from the emailed link,
 * marks it used (single-use), starts a session holding the verified email,
 * and redirects into the account area. An invalid, expired, or already-used
 * token gets the same "link expired" redirect regardless of which of those
 * three it was — no need to distinguish them for the visitor.
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/http.php';
require_once __DIR__ . '/../_lib/db.php';
require_once __DIR__ . '/../_lib/session.php';

$token = field('token');

if ($token === '') {
    redirect('/account/link-expired/');
}

$tokenHash = hash('sha256', $token);

$pdo = dbConnect();
$stmt = $pdo->prepare(
    'SELECT id, email FROM login_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW() LIMIT 1'
);
$stmt->execute([$tokenHash]);
$row = $stmt->fetch();

if ($row === false) {
    redirect('/account/link-expired/');
}

$pdo->prepare('UPDATE login_tokens SET used_at = NOW() WHERE id = ?')->execute([$row['id']]);

startSecureSession();
// Prevents session fixation: a session ID established before login is never
// reused as the authenticated session's ID.
session_regenerate_id(true);
$_SESSION['email'] = $row['email'];

redirect('/account/orders.php');
```

- [ ] **Step 3: Write `public/account/logout.php`**

```php
<?php
declare(strict_types=1);

require_once __DIR__ . '/../_lib/http.php';
require_once __DIR__ . '/../_lib/session.php';

startSecureSession();
$_SESSION = [];
session_destroy();

redirect('/account/login/');
```

- [ ] **Step 4: Write `tests/unit/account.test.ts`**

```ts
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

describe('the login flow never reveals whether an email has ordered before', () => {
  const php = readFileSync('public/account/login.php', 'utf8');

  it('redirects to the same check-email page regardless of lookup result', () => {
    // Only one redirect target should exist for the success path — a
    // second, different one would be exactly the oracle this must avoid.
    const matches = [...php.matchAll(/redirect\('\/account\/check-email\/'\)/g)];
    expect(matches.length).toBe(1);
  });

  it('never queries whether the email already has an account or order', () => {
    expect(php).not.toMatch(/SELECT.*FROM (users|orders)/i);
  });
});

describe('verify.php treats invalid, expired, and reused tokens identically', () => {
  const php = readFileSync('public/account/verify.php', 'utf8');

  it('has exactly one link-expired redirect for every failure case', () => {
    const matches = [...php.matchAll(/redirect\('\/account\/link-expired\/'\)/g)];
    expect(matches.length).toBe(2); // empty token, and lookup-not-found
  });

  it('checks used_at IS NULL and expires_at > NOW() in the same query', () => {
    expect(php).toMatch(/used_at IS NULL AND expires_at > NOW\(\)/);
  });

  it('regenerates the session id before trusting it as authenticated', () => {
    const setEmailIndex = php.indexOf("_SESSION['email']");
    const regenIndex = php.indexOf('session_regenerate_id(true)');
    expect(regenIndex).toBeGreaterThan(-1);
    expect(regenIndex).toBeLessThan(setEmailIndex);
  });
});

describe('logout.php fully clears the session', () => {
  const php = readFileSync('public/account/logout.php', 'utf8');

  it('empties $_SESSION before destroying it', () => {
    expect(php).toContain('$_SESSION = []');
    expect(php).toContain('session_destroy()');
  });
});
```

- [ ] **Step 5: Run the test**

Run: `npx vitest run tests/unit/account.test.ts`
Expected: PASS, all cases.

- [ ] **Step 6: Commit**

```bash
git add public/account/login.php public/account/verify.php public/account/logout.php tests/unit/account.test.ts
git commit -m "Add passwordless login backend: issue, verify, and destroy sessions"
```

---

## Task 10: Account frontend — login form, check-email, and link-expired pages

**Files:**
- Create: `src/pages/account/login.astro`
- Create: `src/pages/account/check-email.astro`
- Create: `src/pages/account/link-expired.astro`
- Create: `tests/e2e/account.spec.ts`

**Interfaces:**
- Produces: a form at `/account/login/` posting `email` + `bot-field` to `public/account/login.php` (Task 9) — the shape that endpoint expects.

- [ ] **Step 1: Write `src/pages/account/login.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
---
<Base
  title="View your orders"
  description="Enter your email to get a link to your order history."
  path="/account/login"
  noindex
>
  <Section register="dark">
    <p class="ra-eyebrow">Your orders</p>
    <h1 class="ra-display">See your order history.</h1>
    <p class="ra-lede">
      Enter your email and we&rsquo;ll send you a link — no password needed. It
      works whether or not you&rsquo;ve created an account before; if you&rsquo;ve
      ordered from us with this email, your orders will be there.
    </p>
  </Section>

  <Section>
    <form method="post" action="/account/login.php" class="login-form ra-measure">
      <p class="ra-visually-hidden" aria-hidden="true">
        <label for="bot-field">Leave this field empty</label>
        <input id="bot-field" name="bot-field" tabindex="-1" autocomplete="off" />
      </p>

      <div class="login-field">
        <label for="email">Email address</label>
        <input id="email" name="email" type="email" required autocomplete="email" maxlength="190" />
      </div>

      <button type="submit" class="ra-btn ra-btn--primary">Send me a link</button>
    </form>
  </Section>
</Base>

<style>
  .login-form { display: grid; gap: var(--ra-space-m); max-width: 28rem; }
  .login-field { display: grid; gap: var(--ra-space-2xs); }
  .login-field label { font-weight: 600; font-size: var(--ra-step--1); }
  .login-field input {
    min-height: var(--ra-tap-min);
    padding: var(--ra-space-s) var(--ra-space-m);
    border: 1px solid var(--ra-border);
    border-radius: var(--ra-radius-s);
    background: var(--ra-surface);
  }
</style>
```

- [ ] **Step 2: Write `src/pages/account/check-email.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
---
<Base
  title="Check your email"
  description="We've sent you a link to view your order history."
  path="/account/check-email"
  noindex
>
  <Section register="dark">
    <p class="ra-eyebrow">Almost there</p>
    <h1 class="ra-display">Check your email.</h1>
    <p class="ra-lede">
      If that address has ordered from us before, a link is on its way — it
      expires in 15 minutes. If it doesn&rsquo;t arrive in a few minutes, check
      your spam folder.
    </p>
  </Section>
</Base>
```

- [ ] **Step 3: Write `src/pages/account/link-expired.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
import Button from '../../components/Button.astro';
---
<Base
  title="Link expired"
  description="That login link is no longer valid."
  path="/account/link-expired"
  noindex
>
  <Section register="dark">
    <p class="ra-eyebrow">Link expired</p>
    <h1 class="ra-display">That link&rsquo;s no longer valid.</h1>
    <p class="ra-lede">
      Login links expire after 15 minutes and can only be used once. Request a
      new one below.
    </p>
    <Button href="/account/login/" variant="gold">Request a new link</Button>
  </Section>
</Base>
```

- [ ] **Step 4: Write `tests/e2e/account.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

/*
 * The email → token → session round trip needs a live PHP runtime and mail
 * delivery, neither of which exist in this environment (same limitation
 * noted for the original checkout build). What's testable here is the
 * static frontend: the login form works with no JavaScript and posts to the
 * right place, and the static confirmation pages render correctly.
 */

test.describe('the login form works without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('posts email to account/login.php', async ({ page }) => {
    await page.goto('/account/login');

    const form = page.locator('form[action="/account/login.php"]');
    await expect(form).toHaveAttribute('method', 'post');
    await expect(form.getByLabel('Email address')).toBeVisible();
    await expect(form.getByRole('button', { name: /send me a link/i })).toBeVisible();

    const honeypot = form.locator('input[name="bot-field"]');
    await expect(honeypot).toHaveValue('');
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
  });
});

test('the check-email page renders', async ({ page }) => {
  await page.goto('/account/check-email');
  await expect(page.getByRole('heading', { name: /check your email/i })).toBeVisible();
});

test('the link-expired page offers a way to request a new link', async ({ page }) => {
  await page.goto('/account/link-expired');
  await expect(page.getByRole('link', { name: /request a new link/i })).toHaveAttribute('href', '/account/login/');
});
```

- [ ] **Step 5: Build and run the tests**

Run: `npm run build && npx playwright test tests/e2e/account.spec.ts`
Expected: PASS, all 3 tests.

- [ ] **Step 6: Commit**

```bash
git add src/pages/account/login.astro src/pages/account/check-email.astro src/pages/account/link-expired.astro tests/e2e/account.spec.ts
git commit -m "Add the account login form and its static confirmation pages"
```

---

## Task 11: The account order-history page — `public/account/orders.php`

**Files:**
- Create: `public/account/orders.php`

**Interfaces:**
- Consumes: `startSecureSession()` (Task 4), `listOrdersForEmail(PDO, string)` and `getOrderItems(PDO, int)` (Task 2).

- [ ] **Step 1: Write `public/account/orders.php`**

```php
<?php
/**
 * Session-gated order history: every order placed with the logged-in
 * session's email, each with its line items and their individual statuses.
 * Guest orders appear here automatically the moment someone logs in with
 * the same email — this query is the entire mechanism, no separate linking
 * step exists.
 *
 * Plain PHP rather than an Astro page for the same reason the admin tool
 * is: this needs a live session + DB read on every request, which the
 * static site can't do.
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/session.php';
require_once __DIR__ . '/../_lib/db.php';
require_once __DIR__ . '/../_lib/orders.php';

startSecureSession();

if (!isset($_SESSION['email'])) {
    header('Location: /account/login/', true, 303);
    exit;
}

$email = $_SESSION['email'];

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function formatNaira(int $kobo): string
{
    return '₦' . number_format($kobo / 100, 2);
}

$pdo = dbConnect();
$orders = listOrdersForEmail($pdo, $email);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Your orders</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #10203a; background: #f7f7f5; max-width: 40rem; }
  h1 { font-size: 1.4rem; }
  .order { background: #fff; border-radius: 6px; padding: 1rem 1.25rem; margin-bottom: 1.25rem; }
  .order__ref { font-weight: 700; }
  .order__total { color: #5a6472; font-size: 0.9rem; }
  ul.items { list-style: none; padding: 0; margin-top: 0.75rem; }
  ul.items li { padding: 0.35rem 0; border-top: 1px solid #e3e3e0; font-size: 0.9rem; display: flex; justify-content: space-between; }
  .status { font-weight: 600; }
  a.logout { display: inline-block; margin-top: 1.5rem; }
</style>
</head>
<body>
  <h1>Your orders</h1>
  <p><?= h($email) ?></p>

  <?php if (count($orders) === 0): ?>
    <p>No orders yet.</p>
  <?php endif; ?>

  <?php foreach ($orders as $order): ?>
    <?php $items = getOrderItems($pdo, (int) $order['id']); ?>
    <div class="order">
      <p class="order__ref"><?= h($order['reference']) ?></p>
      <p class="order__total"><?= formatNaira((int) $order['amount_kobo']) ?> — <?= h($order['status']) ?></p>
      <ul class="items">
        <?php foreach ($items as $item): ?>
          <li>
            <span><?= h($item['product_label']) ?> — <?= h($item['variant_label']) ?> × <?= (int) $item['quantity'] ?></span>
            <span class="status"><?= h($item['status']) ?></span>
          </li>
        <?php endforeach; ?>
      </ul>
    </div>
  <?php endforeach; ?>

  <a class="logout" href="/account/logout.php">Log out</a>
</body>
</html>
```

- [ ] **Step 2: Commit**

```bash
git add public/account/orders.php
git commit -m "Add the session-gated account order-history page"
```

---

## Task 12: Admin rewrite for per-item status

**Files:**
- Modify: `public/admin/orders.php` (list view: show item count instead of a single product)
- Modify: `public/admin/order.php` (detail view: one status-change form per line item, CSRF scoped per item)

**Interfaces:**
- Consumes: `listOrders(PDO, int)` (now returns `item_count`), `getOrderItems(PDO, int)`, `findOrderItemById(PDO, int)`, `updateOrderItemStatus(PDO, int, string)`, `getOrderItemHistory(PDO, int)`, `ITEM_STATUSES` — all from Task 2.

- [ ] **Step 1: Rewrite `public/admin/orders.php`'s table for the envelope model**

`orders` rows no longer carry `product_label`/`variant_label` (moved to `order_items`) or `status_updated_at` (removed — Task 1's schema has no such column on `orders`; `created_at` is the only timestamp left on the envelope). Replace the whole `<table>...</table>` block with:

```php
<table>
    <thead>
      <tr>
        <th>Reference</th>
        <th>Items</th>
        <th>Customer</th>
        <th>Amount</th>
        <th>Payment</th>
        <th>Placed</th>
        <th></th>
      </tr>
    </thead>
    <tbody>
      <?php foreach ($orders as $order): ?>
        <tr>
          <td><?= h($order['reference']) ?></td>
          <td><?= (int) $order['item_count'] ?> item<?= (int) $order['item_count'] === 1 ? '' : 's' ?></td>
          <td><?= h($order['customer_name']) ?><br><small><?= h($order['customer_email']) ?></small></td>
          <td><?= formatNaira((int) $order['amount_kobo']) ?></td>
          <td><span class="status status-<?= h($order['status']) ?>"><?= h($order['status']) ?></span></td>
          <td><?= h($order['created_at']) ?></td>
          <td><a href="/admin/order.php?id=<?= (int) $order['id'] ?>">View</a></td>
        </tr>
      <?php endforeach; ?>
    </tbody>
  </table>
```

The `status` column stays — it's now unambiguously the *payment* status (`pending`/`paid`/`failed`), distinct from the per-item fulfillment status shown on the detail page. The existing `.status-pending`/`.status-paid`/`.status-failed` CSS classes in this file's `<style>` block already cover exactly those three values; delete the now-unused `.status-processing`, `.status-shipped`, and `.status-delivered` rules from that block, since fulfillment status is never rendered on this list view anymore.

- [ ] **Step 2: Rewrite `public/admin/order.php` for per-item status**

```php
<?php
/**
 * Internal single-order view. Each line item gets its own status-change
 * form, since fulfillment now happens per item, not per order. Same access-
 * control assumption as orders.php: Apache Basic Auth on the whole
 * directory — see docs/admin-setup.md.
 *
 * CSRF token is now scoped per item id (rather than per order id), since
 * that's the granularity being changed: hash_hmac('sha256', $itemId . '|' .
 * date('Y-m-d'), $secret). Same reasoning as before — Basic Auth alone
 * doesn't stop a cross-site replay of this form.
 */

declare(strict_types=1);

require_once __DIR__ . '/../_lib/db.php';
require_once __DIR__ . '/../_lib/orders.php';
require_once __DIR__ . '/../_lib/config.php';

function h(string $value): string
{
    return htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
}

function formatNaira(int $kobo): string
{
    return '₦' . number_format($kobo / 100, 2);
}

function itemCsrfToken(int $itemId, string $secret): string
{
    return hash_hmac('sha256', $itemId . '|' . date('Y-m-d'), $secret);
}

$id = (int) ($_GET['id'] ?? 0);

if ($id <= 0) {
    http_response_code(404);
    exit('Order not found.');
}

$pdo = dbConnect();
$order = findOrderById($pdo, $id);

if ($order === null) {
    http_response_code(404);
    exit('Order not found.');
}

$secret = appConfig()['csrf_secret'];
$error = null;

if (($_SERVER['REQUEST_METHOD'] ?? '') === 'POST') {
    $itemId = (int) ($_POST['item_id'] ?? 0);
    $token = (string) ($_POST['csrf'] ?? '');
    $status = (string) ($_POST['status'] ?? '');

    if ($itemId <= 0 || !hash_equals(itemCsrfToken($itemId, $secret), $token)) {
        http_response_code(403);
        exit('Invalid or expired form — go back and try again.');
    }

    // Confirms the posted item actually belongs to the order this page is
    // showing — not a security boundary (there's one trusted admin behind
    // Basic Auth), but it catches a stale-page mistake before it silently
    // edits the wrong order's item.
    $targetItem = findOrderItemById($pdo, $itemId);
    if ($targetItem === null || (int) $targetItem['order_id'] !== $id) {
        http_response_code(404);
        exit('That item does not belong to this order.');
    }

    if (!updateOrderItemStatus($pdo, $itemId, $status)) {
        $error = 'Not a valid status.';
    } else {
        header('Location: /admin/order.php?id=' . $id, true, 303);
        exit;
    }
}

$items = getOrderItems($pdo, $id);
?>
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Order <?= h($order['reference']) ?> — Admin</title>
<style>
  body { font-family: system-ui, sans-serif; margin: 2rem; color: #10203a; background: #f7f7f5; max-width: 42rem; }
  dl { display: grid; grid-template-columns: 10rem 1fr; gap: 0.4rem 1rem; background: #fff; padding: 1rem 1.25rem; border-radius: 6px; }
  dt { color: #5a6472; font-size: 0.85rem; }
  dd { margin: 0; font-weight: 600; }
  h1 { font-size: 1.3rem; }
  .item { background: #fff; border-radius: 6px; padding: 1rem 1.25rem; margin-top: 1rem; }
  ol.timeline { list-style: none; padding: 0; }
  ol.timeline li { padding: 0.35rem 0; border-bottom: 1px solid #e3e3e0; font-size: 0.9rem; }
  select { padding: 0.4rem; font-size: 1rem; }
  button { padding: 0.5rem 1rem; font-size: 1rem; margin-left: 0.5rem; cursor: pointer; }
  .error { color: #8a1f1f; }
  a.back { display: inline-block; margin-bottom: 1rem; }
</style>
</head>
<body>
  <a class="back" href="/admin/orders.php">&larr; All orders</a>
  <h1>Order <?= h($order['reference']) ?></h1>

  <?php if ($error !== null): ?>
    <p class="error"><?= h($error) ?></p>
  <?php endif; ?>

  <dl>
    <dt>Payment status</dt><dd><?= h($order['status']) ?></dd>
    <dt>Total</dt><dd><?= formatNaira((int) $order['amount_kobo']) ?></dd>
    <dt>Customer</dt><dd><?= h($order['customer_name']) ?></dd>
    <dt>Email</dt><dd><?= h($order['customer_email']) ?></dd>
    <dt>Phone</dt><dd><?= h($order['customer_phone']) ?></dd>
    <dt>Placed</dt><dd><?= h($order['created_at']) ?></dd>
  </dl>

  <?php foreach ($items as $item): ?>
    <div class="item">
      <p><strong><?= h($item['product_label']) ?> — <?= h($item['variant_label']) ?></strong> × <?= (int) $item['quantity'] ?></p>
      <p><?= formatNaira((int) $item['unit_price_kobo']) ?> each — status: <strong><?= h($item['status']) ?></strong></p>

      <?php $history = getOrderItemHistory($pdo, (int) $item['id']); ?>
      <ol class="timeline">
        <?php foreach ($history as $row): ?>
          <li><?= h($row['status']) ?> — <?= h($row['created_at']) ?></li>
        <?php endforeach; ?>
      </ol>

      <form method="post" action="/admin/order.php?id=<?= (int) $order['id'] ?>">
        <input type="hidden" name="item_id" value="<?= (int) $item['id'] ?>">
        <input type="hidden" name="csrf" value="<?= h(itemCsrfToken((int) $item['id'], $secret)) ?>">
        <select name="status">
          <?php foreach (ITEM_STATUSES as $status): ?>
            <option value="<?= h($status) ?>" <?= $status === $item['status'] ? 'selected' : '' ?>><?= h($status) ?></option>
          <?php endforeach; ?>
        </select>
        <button type="submit">Update</button>
      </form>
    </div>
  <?php endforeach; ?>
</body>
</html>
```

- [ ] **Step 3: Add a structural test to `tests/unit/checkout.test.ts`**

Append:

```ts
describe('admin/order.php scopes its CSRF token per item, not per order', () => {
  const php = readFileSync('public/admin/order.php', 'utf8');

  it('signs the token over the item id', () => {
    expect(php).toContain("hash_hmac('sha256', $itemId . '|' . date('Y-m-d'), $secret)");
  });

  it('validates item_id before touching the database', () => {
    const validateIndex = php.indexOf('hash_equals(itemCsrfToken');
    const updateIndex = php.indexOf('updateOrderItemStatus(');
    expect(validateIndex).toBeGreaterThan(-1);
    expect(updateIndex).toBeGreaterThan(-1);
    expect(validateIndex).toBeLessThan(updateIndex);
  });

  it('confirms the posted item belongs to the order on screen before updating it', () => {
    expect(php).toContain('findOrderItemById($pdo, $itemId)');
    expect(php).toContain("(int) $targetItem['order_id'] !== $id");
  });
});
```

- [ ] **Step 4: Run the tests**

Run: `npx vitest run tests/unit/checkout.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add public/admin/orders.php public/admin/order.php tests/unit/checkout.test.ts
git commit -m "Rewrite admin order view for per-item status changes"
```

---

## Task 13: Tracking rewrite for multi-item orders

**Files:**
- Modify: `public/order-status.php` (full rewrite: emit a multi-item encoded blob instead of flattened single-status query params)
- Modify: `src/pages/track/result.astro` (full rewrite: decode the blob, loop over items instead of assuming one)
- Modify: `tests/e2e/track.spec.ts` (update the result-page tests for the new multi-item shape)

**Interfaces:**
- Consumes: `findOrderByReference`, `getOrderItems`, `getOrderItemHistory` from `public/_lib/orders.php` (Task 2).

- [ ] **Step 1: Rewrite `public/order-status.php`**

```php
<?php
/**
 * Customer-facing order lookup: reference + the email it was placed with.
 * Both must match, or the response is identical either way. Encodes every
 * line item's product, quantity, status, and status history dates into one
 * base64url JSON blob rather than flattening a single item's statuses into
 * separate query params — this now has to represent N items, and a
 * per-field flattening scheme doesn't scale to that.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/http.php';
require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/orders.php';

$reference = field('reference');
$email = field('email');

if ($reference === '' || $email === '') {
    redirect('/track/?error=missing');
}

$pdo = dbConnect();
$order = findOrderByReference($pdo, $reference);

$matches = $order !== null
    && strcasecmp(trim($order['customer_email']), trim($email)) === 0;

if (!$matches) {
    redirect('/order/not-found/');
}

$items = getOrderItems($pdo, (int) $order['id']);

$payload = [];
foreach ($items as $item) {
    $history = getOrderItemHistory($pdo, (int) $item['id']);
    $dates = [];
    foreach ($history as $row) {
        if (!isset($dates[$row['status']])) {
            $dates[$row['status']] = $row['created_at'];
        }
    }

    $payload[] = [
        'label' => $item['product_label'] . ' — ' . $item['variant_label'],
        'quantity' => (int) $item['quantity'],
        'status' => $item['status'],
        'dates' => $dates,
    ];
}

$encoded = rtrim(strtr(base64_encode((string) json_encode($payload)), '+/', '-_'), '=');

redirect('/track/result/?ref=' . rawurlencode($order['reference']) . '&items=' . $encoded);
```

- [ ] **Step 2: Rewrite `src/pages/track/result.astro`**

```astro
---
import Base from '../../layouts/Base.astro';
import Section from '../../components/Section.astro';
import Button from '../../components/Button.astro';
import { TRACKING_STEPS } from '../../lib/orders';
---
<Base
  title="Order status"
  description="Your order's current status and delivery timeline."
  path="/track/result"
  noindex
>
  <Section register="dark">
    <p class="ra-eyebrow">Order status</p>
    <h1 class="ra-display">Your order</h1>
    <p class="ra-lede" id="ref-line">&nbsp;</p>
  </Section>

  <Section>
    <div id="items"></div>

    <p class="help">
      Something look wrong? <Button href="/contact" variant="secondary">Contact us</Button>
    </p>
  </Section>
</Base>

<script define:vars={{ STEPS: TRACKING_STEPS }}>
  function base64UrlDecode(value) {
    const padded = value.replace(/-/g, '+').replace(/_/g, '/');
    const withPadding = padded + '='.repeat((4 - (padded.length % 4)) % 4);
    return atob(withPadding);
  }

  const params = new URLSearchParams(location.search);
  const ref = params.get('ref');
  const encoded = params.get('items');

  const refLine = document.getElementById('ref-line');
  if (refLine) refLine.textContent = ref ? `Order reference ${ref}` : '';

  const container = document.getElementById('items');
  if (!container || !encoded) {
    if (container) container.textContent = 'No order details to show.';
  } else {
    let items = [];
    try {
      items = JSON.parse(base64UrlDecode(encoded));
    } catch {
      items = [];
    }

    for (const item of items) {
      const card = document.createElement('div');
      card.className = 'item-card';

      const currentIndex = STEPS.indexOf(item.status);
      const stepsHtml = STEPS.map((step, i) => {
        const date = item.dates?.[step];
        const cls = i <= currentIndex ? 'is-done' : 'is-pending';
        const dateText = i <= currentIndex ? (date ?? '') : 'Not yet';
        return `<li class="timeline__step ${cls}"><span>${step}</span><span>${dateText}</span></li>`;
      }).join('');

      card.innerHTML = `
        <h2>${item.label} × ${item.quantity}</h2>
        ${
          currentIndex === -1
            ? `<p class="pending-note">${item.status === 'pending' ? "We haven't received a completed payment for this order yet." : 'No status yet.'}</p>`
            : `<ol class="timeline">${stepsHtml}</ol>`
        }
      `;
      container.appendChild(card);
    }

    if (items.length === 0) {
      container.textContent = 'No items found for this order.';
    }
  }
</script>

<style>
  .item-card { margin-bottom: var(--ra-space-xl); max-width: 32rem; }
  .item-card h2 { font-size: var(--ra-step-1); margin-bottom: var(--ra-space-s); }

  .pending-note {
    background: var(--ra-navy-50);
    border: 1px solid rgb(239 180 46 / 0.4);
    border-radius: var(--ra-radius-s);
    padding: var(--ra-space-m) var(--ra-space-l);
  }

  .timeline { display: grid; gap: var(--ra-space-s); padding: 0; list-style: none; }
  .timeline__step {
    display: flex;
    justify-content: space-between;
    gap: var(--ra-space-m);
    padding: var(--ra-space-s) var(--ra-space-m);
    border-radius: var(--ra-radius-s);
    border: 1px solid var(--ra-rule);
  }
  .timeline__step.is-pending { color: var(--ra-fg-muted); }
  .timeline__step.is-done { border-color: var(--ra-gold-500); }

  .help { margin-top: var(--ra-space-xl); display: flex; align-items: center; gap: var(--ra-space-m); flex-wrap: wrap; }
</style>
```

- [ ] **Step 3: Rewrite `tests/e2e/track.spec.ts`'s result-page block**

Replace the existing `describe('the result page renders a timeline from the query string', ...)` block with:

```ts
function encodeItems(items: unknown): string {
  const json = JSON.stringify(items);
  return Buffer.from(json).toString('base64url');
}

test.describe('the result page renders a timeline from the query string', () => {
  test('shows completed steps with dates and future steps as not yet', async ({ page }) => {
    const items = [
      {
        label: 'Apple iPhone 15 Pro Max — 256GB',
        quantity: 1,
        status: 'processing',
        dates: { paid: '2026-08-01 10:00:00', processing: '2026-08-02 09:00:00' },
      },
    ];
    await page.goto(`/track/result/?ref=RA-abc123&items=${encodeItems(items)}`);

    await expect(page.getByText('Order reference RA-abc123')).toBeVisible();
    await expect(page.getByRole('heading', { name: /Apple iPhone 15 Pro Max — 256GB × 1/ })).toBeVisible();

    const processing = page.locator('.timeline__step', { hasText: 'processing' });
    await expect(processing).toHaveClass(/is-done/);

    const delivered = page.locator('.timeline__step', { hasText: 'delivered' });
    await expect(delivered).toHaveClass(/is-pending/);
    await expect(delivered).toContainText('Not yet');
  });

  test('renders more than one item independently', async ({ page }) => {
    const items = [
      { label: 'iPhone 13 — 128GB', quantity: 1, status: 'shipped', dates: {} },
      { label: 'iPhone 15 — 256GB', quantity: 2, status: 'processing', dates: {} },
    ];
    await page.goto(`/track/result/?ref=RA-multi&items=${encodeItems(items)}`);

    await expect(page.locator('.item-card')).toHaveCount(2);
    await expect(page.getByRole('heading', { name: /iPhone 13 — 128GB × 1/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: /iPhone 15 — 256GB × 2/ })).toBeVisible();
  });

  test('shows a pending note instead of a timeline for an unpaid item', async ({ page }) => {
    const items = [{ label: 'iPhone 15', quantity: 1, status: 'pending', dates: {} }];
    await page.goto(`/track/result/?ref=RA-abc123&items=${encodeItems(items)}`);

    await expect(page.locator('.timeline')).toHaveCount(0);
    await expect(page.locator('.pending-note')).toContainText("haven't received a completed payment");
  });
});
```

Remove the old `shows a failed message for a payment that never went through` test — `order_items.status` has no `failed` value (Task 1's design decision), so this case no longer applies at the item level; a failed order simply has no successful `order-status.php` lookup path to reach in the first place (payment never completed, so nothing to track).

- [ ] **Step 4: Build and run the tracking tests**

Run: `npm run build && npx playwright test tests/e2e/track.spec.ts`
Expected: PASS, all tests in the file.

- [ ] **Step 5: Commit**

```bash
git add public/order-status.php src/pages/track/result.astro tests/e2e/track.spec.ts
git commit -m "Generalize tracking to N items with independent per-item timelines"
```

---

## Task 14: Full integration pass

**Files:**
- No new files — this task is verification and small cleanup only.

- [ ] **Step 1: Run the full build**

Run: `npm run build`
Expected: succeeds, no errors, all pages including `/cart/`, `/account/login/`, `/account/check-email/`, `/account/link-expired/` appear in the route list.

- [ ] **Step 2: Run the full test suite**

Run: `npm test`
Expected: every unit test file passes (`checkout.test.ts`, `cart.test.ts`, `cart-client.test.ts`, `account.test.ts`, `catalogue-export.test.ts`), and every e2e spec passes on both desktop and mobile projects (`shop.spec.ts` including the still-unmodified Pay Now no-JS tests, `cart.spec.ts`, `account.spec.ts`, `track.spec.ts`, plus every pre-existing spec file untouched by this plan).

- [ ] **Step 3: Manually verify the cart flow in the browser preview**

Use the preview tools: add two different products to the cart from their product pages, visit `/cart/`, adjust a quantity, remove nothing, fill in the checkout form, and confirm the form's `items` hidden field contains the right JSON before submitting (submitting for real requires live Paystack keys and isn't possible here — confirming the payload is correct is the achievable bar).

- [ ] **Step 4: Update `docs/admin-setup.md` with the CSRF scope change**

Find the "CSRF secret" section and update the sentence describing what the token signs:

```markdown
## CSRF secret

The status-change form on `order.php` is also protected by a stateless CSRF
token, signed with the `csrf_secret` value from `appConfig()` (see
`public/config/radiant-alpha.php.example`) — one token per line item, since
status is now tracked per item rather than per order. This is unrelated to
the Basic Auth step above — it stops a cross-site replay through an
already-authenticated admin session, which Basic Auth alone does not
prevent. No setup needed beyond having a real `csrf_secret` configured,
which `checkout.php` and the Paystack endpoints already require.
```

- [ ] **Step 5: Commit**

```bash
git add docs/admin-setup.md
git commit -m "Update admin-setup docs for per-item CSRF scope"
```

---

## What's still a manual, post-deploy step (not part of this plan)

- Running the rewritten `docs/db/schema.sql` by hand in phpMyAdmin (nothing is in production yet, so this replaces the earlier schema wholesale).
- A live Paystack test-mode dry run: single-item Pay Now, a two-item cart order, webhook/callback confirmation, per-item admin status changes, guest tracking, and an actual login-link email round trip — none of which are exercisable without a real PHP runtime, database, and mail delivery, none of which exist in this dev environment.
