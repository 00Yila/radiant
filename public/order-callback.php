<?php
/**
 * The customer's browser lands here after Paystack's checkout page. This is
 * a convenience for showing a fast confirmation — it is NOT the source of
 * truth for whether payment happened (order-webhook.php is, since a customer
 * who closes the tab mid-payment never reaches this file at all). Still
 * verifies server-side via the Verify Transaction API rather than trusting
 * the redirect itself, which carries no signature.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/orders.php';
require_once __DIR__ . '/_lib/paystack.php';
require_once __DIR__ . '/_lib/http.php';

$reference = field('reference');

if ($reference === '') {
    redirect('/order/not-found/');
}

$pdo = dbConnect();
$order = findOrderByReference($pdo, $reference);

if ($order === null) {
    redirect('/order/not-found/');
}

$refParam = 'ref=' . rawurlencode($reference);
$result = paystackVerify($reference);
$data = $result['data'] ?? [];

$accepted = ($result['status'] ?? false) === true
    && ($data['status'] ?? null) === 'success'
    && (int) ($data['amount'] ?? -1) === (int) $order['amount_kobo']
    && ($data['currency'] ?? null) === $order['currency'];

if ($accepted) {
    markOrderPaid($pdo, $order, (int) ($data['id'] ?? 0));
    redirect('/order/confirmed/?' . $refParam);
}

redirect('/order/failed/?' . $refParam);
