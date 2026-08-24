import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { CART_LIMITS } from '../../src/lib/orders';

describe('cart.php enforces the same limits as the TypeScript source of truth', () => {
  const php = readFileSync('public/_lib/cart.php', 'utf8');

  it('CART_MAX_ITEMS matches CART_LIMITS.maxItems', () => {
    const match = php.match(/const CART_MAX_ITEMS = (\d+);/);
    expect(match, 'could not find CART_MAX_ITEMS in cart.php').not.toBeNull();
    expect(Number(match![1])).toBe(CART_LIMITS.maxItems);
  });

  it('CART_MAX_QUANTITY matches CART_LIMITS.maxQuantity', () => {
    const match = php.match(/const CART_MAX_QUANTITY = (\d+);/);
    expect(match, 'could not find CART_MAX_QUANTITY in cart.php').not.toBeNull();
    expect(Number(match![1])).toBe(CART_LIMITS.maxQuantity);
  });

  it('declares parseCartItems with the expected signature', () => {
    expect(php).toContain('function parseCartItems(string $json): ?array');
  });

  it('rejects before resolving prices — no lookupCatalogueVariant call in this file', () => {
    // parseCartItems only shapes/bounds-checks; price resolution happens in
    // checkout.php. A price lookup creeping in here would duplicate the one
    // true price-resolution path this project relies on for security.
    expect(php).not.toContain('lookupCatalogueVariant');
  });
});
