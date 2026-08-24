<?php
declare(strict_types=1);

/**
 * Validates the JSON cart payload checkout.php receives from /cart/'s
 * "Proceed to Payment" form. Returns null on any structural problem —
 * checkout.php treats null exactly like a failed legacy-path validation
 * (redirect with ?error=invalid, no order created).
 *
 * This never looks up prices — price resolution happens in checkout.php,
 * the same as the legacy single-item path. This file only shapes and
 * bounds-checks what the browser sent.
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
