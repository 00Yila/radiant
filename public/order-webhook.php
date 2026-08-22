<?php
/**
 * Paystack's server-to-server confirmation. This — not order-callback.php —
 * is the actual source of truth: a customer who closes the tab mid-payment,
 * or whose browser never makes it back to us, still completes here.
 *
 * The one rule that must never be broken in this file: nothing in the
 * payload is trusted until the signature is verified. That check happens
 * before a single field is read out of the decoded body.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/config.php';
require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/orders.php';

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    http_response_code(405);
    exit;
}

// Must be the RAW bytes — the signature is computed over the exact request
// body, not over whatever $_POST reconstructs from it.
$rawBody = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';

$config = appConfig();
$expected = hash_hmac('sha512', (string) $rawBody, $config['paystack_secret_key']);

// hash_equals — never ===  — so this comparison itself doesn't leak timing
// information about how much of the signature matched.
if ($signature === '' || !hash_equals($expected, $signature)) {
    http_response_code(401);
    exit;
}

// The signature is what makes this payload trustworthy — no further live
// verification call is needed here (unlike order-callback.php, which has no
// signature to check and must call paystackVerify() instead).
$event = json_decode((string) $rawBody, true);

if (!is_array($event) || ($event['event'] ?? null) !== 'charge.success') {
    // Any other event type: acknowledge and ignore, so Paystack does not
    // retry an event this endpoint has no reason to act on.
    http_response_code(200);
    exit;
}

$data = $event['data'] ?? [];
$reference = (string) ($data['reference'] ?? '');

if ($reference === '') {
    http_response_code(200);
    exit;
}

$pdo = dbConnect();
$order = findOrderByReference($pdo, $reference);

if ($order === null) {
    // Unknown reference: nothing to update. Still 200 — this is not a
    // signature failure, just an event about an order we have no record of.
    http_response_code(200);
    exit;
}

// Idempotent by construction (see markOrderPaid()'s docblock): safe whether
// this fires once, twice, or arrives before/after order-callback.php.
if (
    $order['status'] === 'pending'
    && (int) ($data['amount'] ?? 0) === (int) $order['amount_kobo']
    && ($data['currency'] ?? '') === $order['currency']
) {
    markOrderPaid($pdo, $order, (int) ($data['id'] ?? 0));
}

http_response_code(200);
