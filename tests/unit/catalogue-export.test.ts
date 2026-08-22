import { describe, it, expect } from 'vitest';
import { buildManifest, readCatalogue } from '../../scripts/export-catalogue-for-php.mjs';

/*
 * This is the test that catches price drift: checkout.php trusts
 * public/data/catalogue/products.json as the sole source of what a variant
 * actually costs, so every id / ref / price it reads has to match the
 * storefront's own catalogue exactly, with nothing dropped, renamed or
 * rounded along the way.
 */
describe('buildManifest round-trips every product exactly', () => {
  const products = readCatalogue();
  const manifest = buildManifest(products);

  it('reads at least one product from the catalogue', () => {
    expect(products.length).toBeGreaterThan(0);
  });

  it('keeps every product id, in the same order', () => {
    expect(manifest.map((p) => p.id)).toEqual(products.map((p) => p.id));
  });

  it('keeps every variant ref and price, for every product', () => {
    for (const [i, product] of products.entries()) {
      const entry = manifest[i];
      expect(entry.variants.map((v) => v.ref)).toEqual(product.variants.map((v) => v.ref));
      expect(entry.variants.map((v) => v.price)).toEqual(product.variants.map((v) => v.price));
    }
  });

  it('never emits a fractional or non-positive price', () => {
    for (const product of manifest) {
      for (const variant of product.variants) {
        expect(Number.isInteger(variant.price)).toBe(true);
        expect(variant.price).toBeGreaterThan(0);
      }
    }
  });

  it('has no duplicate variant ref across the whole catalogue', () => {
    const refs = manifest.flatMap((p) => p.variants.map((v) => v.ref));
    expect(new Set(refs).size).toBe(refs.length);
  });

  it('has no duplicate product id', () => {
    const ids = manifest.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
