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

/**
 * The subset of ITEM_STATUSES an admin may manually set. 'pending' is a
 * valid *initial* item state (set by createPendingOrder(), left there for a
 * failed payment) but is never a manual transition target — that would let
 * an admin move a paid item's status back to "pending", which then makes
 * the customer-facing tracking page claim the order hasn't been paid for.
 * Same three values as TRACKING_STEPS in src/lib/orders.ts.
 */
const ADMIN_SETTABLE_STATUSES = ['processing', 'shipped', 'delivered'];

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
 * Used only by the admin tool. Validates $status against
 * ADMIN_SETTABLE_STATUSES (not the full ITEM_STATUSES) before it ever
 * reaches a prepared statement — an item is never manually moved back to
 * 'pending', so that value is deliberately excluded here even though the
 * ENUM column itself would accept it.
 */
function updateOrderItemStatus(PDO $pdo, int $itemId, string $status): bool
{
    if (!in_array($status, ADMIN_SETTABLE_STATUSES, true)) {
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
