import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { formatNaira } from '../../src/lib/format';

type Variant = { label: string; price: number; ref: string; colour?: string };
type Product = {
  id: string;
  category: string;
  brand: string;
  model: string;
  conditionTier: string;
  conditionLabel: string;
  tierRank: number;
  variantAxis: string;
  variants: Variant[];
  colours: string[];
  appleGeneration?: number;
};

/** Every catalogue file, the same way content.config.ts loads them. */
const products: Product[] = readdirSync('src/content/products')
  .filter((f) => f.endsWith('.json'))
  .flatMap((f) => JSON.parse(readFileSync(join('src/content/products', f), 'utf8')));

const phones = products.filter((p) => p.category === 'phones');

/**
 * The catalogue was transcribed from docs/content-brief.md §8a. Prices are the
 * one thing on this site a customer could be materially harmed by, so the
 * source of truth is re-parsed here and compared rather than trusted.
 */
function pricesFromBrief(): Map<string, number> {
  const brief = readFileSync('docs/content-brief.md', 'utf8');
  const section = brief
    .split('8a. Initial Product Catalog')[1]
    .split('*Laptops')[0];

  const found = new Map<string, number>();
  for (const line of section.split('\n')) {
    const m = line.match(/\|\s*(iPhone[^|]+?)\s*\|\s*(\d+GB)\s*\|\s*₦([\d,]+)\s*\|/);
    if (m) found.set(`${m[1].trim()} ${m[2]}`, Number(m[3].replace(/,/g, '')));
  }
  return found;
}

/** Every buyable configuration, flattened back out of the model grouping. */
const listings = phones.flatMap((p) =>
  p.variants.map((v) => ({ ...v, model: p.model, id: p.id }))
);

describe('phone catalogue', () => {
  const brief = pricesFromBrief();

  it('groups the 53 listings into one page per model', () => {
    expect(phones).toHaveLength(28);
    expect(listings).toHaveLength(53);
    expect(brief.size).toBe(53);
  });

  it('carries every listing in the brief, and no extras', () => {
    const ours = new Set(listings.map((l) => `${l.model} ${l.label}`));
    expect([...brief.keys()].filter((k) => !ours.has(k))).toEqual([]);
    expect([...ours].filter((k) => !brief.has(k))).toEqual([]);
  });

  it('prices match the brief exactly', () => {
    const wrong = listings
      .filter((l) => brief.get(`${l.model} ${l.label}`) !== l.price)
      .map((l) => `${l.model} ${l.label}: ${l.price} != ${brief.get(`${l.model} ${l.label}`)}`);
    expect(wrong).toEqual([]);
  });

  it('has unique page ids and unique stock references', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(new Set(listings.map((l) => l.ref)).size).toBe(listings.length);
  });

  it('uses URL-safe ids', () => {
    const bad = products.filter((p) => !/^[a-z0-9-]+$/.test(p.id));
    expect(bad.map((p) => p.id)).toEqual([]);
  });

  it('gives every model at least one variant', () => {
    expect(products.filter((p) => p.variants.length === 0)).toEqual([]);
  });

  /*
   * The variant picker is pure CSS — one :nth-of-type rule per position, and
   * [product].astro writes four. A fifth variant would render a chip whose
   * panel could never be shown, so the ceiling is asserted rather than trusted.
   */
  it('never exceeds the four variants the CSS picker can address', () => {
    const over = products
      .filter((p) => p.variants.length > 4)
      .map((p) => `${p.model}: ${p.variants.length}`);
    expect(over).toEqual([]);
  });

  it('orders variants cheapest first', () => {
    for (const p of products) {
      const prices = p.variants.map((v) => v.price);
      expect(prices, p.model).toEqual([...prices].sort((a, b) => a - b));
    }
  });

  it('formats every price without breaking the naira formatter', () => {
    for (const l of listings) {
      expect(formatNaira(l.price)).toMatch(/^₦[\d,]+$/);
    }
  });
});

/*
 * The condition tiers are the site's central honesty claim, and they are
 * derived from when Apple discontinued each model — not from anything a
 * supplier has confirmed. These assertions pin the derivation to the spec's
 * table so a later edit cannot quietly relabel a used handset as new.
 */
describe('condition tiers match the spec', () => {
  /* The spec's table counts listings, not model pages, so flatten first. */
  const count = (tier: string) =>
    phones
      .filter((p) => p.conditionTier === tier)
      .reduce((n, p) => n + p.variants.length, 0);

  it('splits 33 / 8 / 8 / 4 listings across the four tiers', () => {
    expect(count('used-or-refurbished')).toBe(33);
    expect(count('refurbished-or-nos')).toBe(8);
    expect(count('unconfirmed')).toBe(8);
    expect(count('new')).toBe(4);
  });

  it('never calls a discontinued model new', () => {
    const wrong = phones.filter(
      (p) => (p.appleGeneration ?? 99) <= 15 && p.conditionTier === 'new'
    );
    expect(wrong.map((p) => p.model)).toEqual([]);
  });

  it('only the current generation is marked new', () => {
    for (const p of phones.filter((p) => p.conditionTier === 'new')) {
      expect(p.appleGeneration, `${p.model} marked new`).toBe(17);
    }
  });
});

/*
 * These hold for every category, not only phones — they are what stops a
 * laptop or solar entry being added in a shape the shop cannot render.
 */
describe('catalogue integrity across all categories', () => {
  const CATEGORIES = ['phones', 'laptops', 'power-banks', 'accessories', 'solar'];

  it('uses a known category and a brand on every product', () => {
    for (const p of products) {
      expect(CATEGORIES, `${p.model}`).toContain(p.category);
      expect(p.brand?.trim(), `${p.model} has no brand`).toBeTruthy();
    }
  });

  it('page ids are unique across categories, not just within one', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
  });

  it('stock references are unique across the whole catalogue', () => {
    const refs = products.flatMap((p) => p.variants.map((v) => v.ref));
    const dupes = refs.filter((r, i) => refs.indexOf(r) !== i);
    expect([...new Set(dupes)]).toEqual([]);
  });

  it('names the axis the buyer is choosing on', () => {
    for (const p of products) {
      expect(p.variantAxis?.trim(), `${p.model} has no variantAxis`).toBeTruthy();
    }
  });

  it('reserves appleGeneration for Apple phones', () => {
    const wrong = products.filter(
      (p) => p.appleGeneration !== undefined && !(p.category === 'phones' && p.brand === 'Apple')
    );
    expect(wrong.map((p) => `${p.brand} ${p.model}`)).toEqual([]);
  });
});
