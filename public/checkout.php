<?php
/**
 * Initiates a Paystack payment for either a single item (the legacy Pay Now
 * form, still no-JavaScript-required) or a whole cart (the /cart/ page's
 * "Proceed to Payment" form, which posts a JSON `items` field).
 *
 * The one rule that matters most in this whole feature, cart or not: the
 * amount charged always comes from public/data/catalogue/products.json —
 * generated at build time — never from anything the browser posted. Every
 * line, cart or legacy, is resolved through the same catalogue lookup
 * process before any order is created.
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
