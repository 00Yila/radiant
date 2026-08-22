<?php
/**
 * Customer-facing order lookup: reference + the email it was placed with.
 * Both must match, or the response is identical either way — a wrong
 * reference and a wrong email look the same, so this can never be used to
 * confirm whether a given reference or a given email exists on its own.
 *
 * Communicates back to the static site only via redirect + query string, the
 * same convention as order-callback.php — this file renders no HTML itself.
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

$history = getOrderHistory($pdo, (int) $order['id']);

// Only ever the first time each status was reached — matches what the
// timeline needs to show and nothing else from the log.
$dates = [];
foreach ($history as $row) {
    if (!isset($dates[$row['status']])) {
        $dates[$row['status']] = $row['created_at'];
    }
}

$params = [
    'ref' => $order['reference'],
    'product' => $order['product_label'] . ' — ' . $order['variant_label'],
    'status' => $order['status'],
];

foreach (['paid', 'processing', 'shipped', 'delivered'] as $step) {
    if (isset($dates[$step])) {
        $params[$step . '_at'] = $dates[$step];
    }
}

redirect('/track/result/?' . http_build_query($params));
