import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { formatNaira } from '../../src/lib/format';

type Product = {
  id: string;
  model: string;
  storage: string;
  price: number;
  ref: string;
  generation: number;
  conditionTier: string;
  conditionLabel: string;
  tierRank: number;
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

describe('phone catalogue', () => {
  const brief = pricesFromBrief();

  it('carries every listing in the brief, and no extras', () => {
    expect(products).toHaveLength(53);
    expect(brief.size).toBe(53);
    const ours = new Set(products.map((p) => `${p.model} ${p.storage}`));
    expect([...brief.keys()].filter((k) => !ours.has(k))).toEqual([]);
  });

  it('prices match the brief exactly', () => {
    const wrong = products
      .filter((p) => brief.get(`${p.model} ${p.storage}`) !== p.price)
      .map((p) => `${p.model} ${p.storage}: ${p.price} != ${brief.get(`${p.model} ${p.storage}`)}`);
    expect(wrong).toEqual([]);
  });

  it('has unique ids and unique stock references', () => {
    expect(new Set(products.map((p) => p.id)).size).toBe(products.length);
    expect(new Set(products.map((p) => p.ref)).size).toBe(products.length);
  });

  it('uses URL-safe ids', () => {
    const bad = products.filter((p) => !/^[a-z0-9-]+$/.test(p.id));
    expect(bad.map((p) => p.id)).toEqual([]);
  });

  it('formats every price without breaking the naira formatter', () => {
    for (const p of products) {
      expect(formatNaira(p.price)).toMatch(/^₦[\d,]+$/);
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
  const count = (tier: string) =>
    products.filter((p) => p.conditionTier === tier).length;

  it('splits 33 / 8 / 8 / 4 across the four tiers', () => {
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
