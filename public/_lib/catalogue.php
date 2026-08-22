<?php
declare(strict_types=1);

/**
 * Looks up a product+variant's real price from the manifest generated at
 * build time by scripts/export-catalogue-for-php.mjs — the one file
 * checkout.php is allowed to get an amount from. A price or product label
 * supplied by the client is never trusted for anything.
 *
 * Returns null if the id/ref pair isn't found — checkout.php treats that as
 * an invalid request, not as "charge nothing."
 */
function lookupCatalogueVariant(string $productId, string $variantRef): ?array
{
    $path = __DIR__ . '/../data/catalogue/products.json';
    if (!is_file($path)) {
        error_log('lookupCatalogueVariant(): manifest missing at ' . $path . ' — was `npm run build` run?');
        return null;
    }

    $catalogue = json_decode((string) file_get_contents($path), true);
    if (!is_array($catalogue)) {
        error_log('lookupCatalogueVariant(): manifest at ' . $path . ' is not valid JSON');
        return null;
    }

    foreach ($catalogue as $product) {
        if (($product['id'] ?? null) !== $productId) {
            continue;
        }
        foreach ($product['variants'] ?? [] as $variant) {
            if (($variant['ref'] ?? null) === $variantRef) {
                return [
                    'product_label' => trim($product['brand'] . ' ' . $product['model']),
                    'variant_label' => $variant['label'],
                    'price' => (int) $variant['price'],
                ];
            }
        }
    }

    return null;
}
