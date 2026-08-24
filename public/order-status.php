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
