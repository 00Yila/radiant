import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatNaira } from '../../src/lib/format';

type Variant = { storage: string; price: number; ref: string; colour?: string };
type Product = {
  id: string;
  model: string;
  generation: number;
  conditionTier: string;
  conditionLabel: string;
  tierRank: number;
  variants: Variant[];
  colours: string[];
};

const products: Product[] = JSON.parse(
  readFileSync('src/content/products/phones.json', 'utf8')
);

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
const listings = products.flatMap((p) =>
  p.variants.map((v) => ({ ...v, model: p.model, id: p.id }))
);

describe('phone catalogue', () => {
  const brief = pricesFromBrief();

  it('groups the 53 listings into one page per model', () => {
    expect(products).toHaveLength(28);
    expect(listings).toHaveLength(53);
    expect(brief.size).toBe(53);
  });

  it('carries every listing in the brief, and no extras', () => {
    const ours = new Set(listings.map((l) => `${l.model} ${l.storage}`));
    expect([...brief.keys()].filter((k) => !ours.has(k))).toEqual([]);
    expect([...ours].filter((k) => !brief.has(k))).toEqual([]);
  });

  it('prices match the brief exactly', () => {
    const wrong = listings
      .filter((l) => brief.get(`${l.model} ${l.storage}`) !== l.price)
      .map((l) => `${l.model} ${l.storage}: ${l.price} != ${brief.get(`${l.model} ${l.storage}`)}`);
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
    products
      .filter((p) => p.conditionTier === tier)
      .reduce((n, p) => n + p.variants.length, 0);

  it('splits 33 / 8 / 8 / 4 listings across the four tiers', () => {
    expect(count('used-or-refurbished')).toBe(33);
    expect(count('refurbished-or-nos')).toBe(8);
    expect(count('unconfirmed')).toBe(8);
    expect(count('new')).toBe(4);
  });

  it('never calls a discontinued model new', () => {
    const wrong = products.filter(
      (p) => p.generation <= 15 && p.conditionTier === 'new'
    );
    expect(wrong.map((p) => `${p.model} ${p.storage}`)).toEqual([]);
  });

  it('only the current generation is marked new', () => {
    for (const p of products.filter((p) => p.conditionTier === 'new')) {
      expect(p.generation, `${p.model} marked new`).toBe(17);
    }
  });
});
