<?php
declare(strict_types=1);

require_once __DIR__ . '/db.php';

/**
 * Single source of truth for the status list — matched against by
 * tests/unit/checkout.test.ts to keep this in sync with the ENUM in
 * docs/db/schema.sql and with any status shown in the admin UI.
 */
const ORDER_STATUSES = ['pending', 'paid', 'processing', 'shipped', 'delivered', 'failed'];

/** 64 bits of entropy — this doubles as half of the tracking page's auth check. */
function generateOrderReference(): string
{
    return 'RA-' . bin2hex(random_bytes(8));
}

function createPendingOrder(PDO $pdo, array $order): int
{
    $stmt = $pdo->prepare(
        'INSERT INTO orders
            (reference, product_id, product_label, variant_ref, variant_label,
             amount_kobo, currency, customer_name, customer_email, customer_phone,
             status, status_updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())'
    );
    $stmt->execute([
        $order['reference'],
        $order['product_id'],
        $order['product_label'],
        $order['variant_ref'],
        $order['variant_label'],
        $order['amount_kobo'],
        $order['currency'] ?? 'NGN',
        $order['customer_name'],
        $order['customer_email'],
        $order['customer_phone'],
        'pending',
    ]);

    $orderId = (int) $pdo->lastInsertId();
    $pdo->prepare('INSERT INTO order_status_history (order_id, status) VALUES (?, ?)')
        ->execute([$orderId, 'pending']);

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

/**
 * Marks an order paid, idempotently. The `WHERE ... AND status = 'pending'`
 * is what makes a race between the Paystack callback and the webhook safe
 * without row locking: whichever request arrives first flips the row and
 * gets rowCount() === 1 (so its history insert runs); the second request's
 * UPDATE matches zero rows and is a silent, correct no-op.
 */
function markOrderPaid(PDO $pdo, array $order, int $paystackTransactionId): void
{
    if ($order['status'] !== 'pending') {
        return;
    }

    $pdo->beginTransaction();
    $stmt = $pdo->prepare(
        'UPDATE orders SET status = ?, status_updated_at = NOW(), paystack_transaction_id = ?
         WHERE id = ? AND status = ?'
    );
    $stmt->execute(['paid', $paystackTransactionId, $order['id'], 'pending']);

    if ($stmt->rowCount() === 1) {
        $pdo->prepare('INSERT INTO order_status_history (order_id, status) VALUES (?, ?)')
            ->execute([$order['id'], 'paid']);
    }
    $pdo->commit();
}

/**
 * Used only by the admin tool. Validates $status against ORDER_STATUSES
 * before it ever reaches a prepared statement — the ENUM column would also
 * reject an invalid value, but failing here gives a clear message instead of
 * a raw DB error, and keeps the admin UI from constructing an invalid state
 * even transiently.
 */
function updateOrderStatus(PDO $pdo, int $orderId, string $status): bool
{
    if (!in_array($status, ORDER_STATUSES, true)) {
        return false;
    }

    $pdo->beginTransaction();
    $pdo->prepare('UPDATE orders SET status = ?, status_updated_at = NOW() WHERE id = ?')
        ->execute([$status, $orderId]);
    $pdo->prepare('INSERT INTO order_status_history (order_id, status) VALUES (?, ?)')
        ->execute([$orderId, $status]);
    $pdo->commit();

    return true;
}

function getOrderHistory(PDO $pdo, int $orderId): array
{
    $stmt = $pdo->prepare(
        'SELECT status, created_at FROM order_status_history WHERE order_id = ? ORDER BY created_at ASC'
    );
    $stmt->execute([$orderId]);
    return $stmt->fetchAll();
}

function listOrders(PDO $pdo, int $limit = 200): array
{
    $stmt = $pdo->prepare('SELECT * FROM orders ORDER BY created_at DESC LIMIT ?');
    $stmt->bindValue(1, $limit, PDO::PARAM_INT);
    $stmt->execute();
    return $stmt->fetchAll();
}
