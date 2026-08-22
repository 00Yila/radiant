<?php
/**
 * Initiates a Paystack payment for one product variant.
 *
 * Follows public/contact.php's conventions: strict types, a fixed redirect
 * map rather than ever building a Location header from unvalidated input,
 * explicit length caps checked before anything else, a honeypot.
 *
 * The one rule that matters most in this whole feature: the amount charged
 * always comes from public/data/catalogue/products.json — a file this
 * server generates at build time — never from anything the browser posted.
 * See public/_lib/catalogue.php.
 */

declare(strict_types=1);

require_once __DIR__ . '/_lib/http.php';
require_once __DIR__ . '/_lib/db.php';
require_once __DIR__ . '/_lib/orders.php';
require_once __DIR__ . '/_lib/catalogue.php';
require_once __DIR__ . '/_lib/paystack.php';

// Matches SITE.domain in src/lib/site.ts. Hardcoded rather than derived from
// $_SERVER['HTTP_HOST'] — the callback_url is where Paystack sends a paying
// customer's browser back to, and that must never depend on a header the
// request itself supplied.
const SITE_DOMAIN = 'https://radiantalphadigital.com';

// Same shape as content.config.ts's product id regex — used only to decide
// whether a product id is safe to embed in a redirect path; the actual
// product lookup below happens against the catalogue file regardless.
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

$productId = field('product');
$variantRef = field('variant');

// Honeypot: answer as if nothing happened, same reasoning as contact.php —
// telling a bot it failed only invites a retry with the field cleared, and a
// bot submitting this form never completes a real payment regardless.
if (field('bot-field') !== '') {
    redirect(shopRedirectTarget($productId, 'invalid'));
}

$name = field('name');
$email = field('email');
$phone = field('phone');

$valid = $productId !== ''
    && $variantRef !== ''
    && $name !== ''
    && $phone !== ''
    && filter_var($email, FILTER_VALIDATE_EMAIL) !== false
    && mb_strlen($name) <= 120
    && mb_strlen($phone) <= 40
    && mb_strlen($productId) <= 80
    && mb_strlen($variantRef) <= 80;

if (!$valid) {
    redirect(shopRedirectTarget($productId, 'invalid'));
}

// The amount comes from here, and nowhere else in this file.
$catalogueEntry = lookupCatalogueVariant($productId, $variantRef);
if ($catalogueEntry === null) {
    redirect(shopRedirectTarget($productId, 'invalid'));
}

$amountKobo = $catalogueEntry['price'] * 100;

// ---------------------------------------------------------------- order
$pdo = dbConnect();
$reference = generateOrderReference();

$orderId = createPendingOrder($pdo, [
    'reference' => $reference,
    'product_id' => $productId,
    'product_label' => $catalogueEntry['product_label'],
    'variant_ref' => $variantRef,
    'variant_label' => $catalogueEntry['variant_label'],
    'amount_kobo' => $amountKobo,
    'customer_name' => $name,
    'customer_email' => $email,
    'customer_phone' => $phone,
]);

// ---------------------------------------------------------------- paystack
$result = paystackInitialize($email, $amountKobo, $reference, SITE_DOMAIN . '/order-callback.php');

if (($result['status'] ?? false) !== true || empty($result['data']['authorization_url'])) {
    updateOrderStatus($pdo, $orderId, 'failed');
    redirect(shopRedirectTarget($productId, 'payment-init'));
}

redirect($result['data']['authorization_url']);
