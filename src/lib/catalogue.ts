import type { CollectionEntry } from 'astro:content';

export type Product = CollectionEntry<'products'>['data'];
export type Category = Product['category'];

/**
 * Display order of the shop's sections, plus the copy each one carries.
 * Ordered by what a visitor is most likely to have come for.
 */
export const CATEGORY_LABELS: Record<
  Category,
  { label: string; short: string; note: string }
> = {
  phones: {
    label: 'Phones',
    short: 'Phones',
    note: 'Condition stated on every listing.',
  },
  laptops: {
    label: 'Laptops',
    short: 'Laptops',
    note: '',
  },
  'power-banks': {
    label: 'Power banks',
    short: 'Power',
    note: '',
  },
  accessories: {
    label: 'Accessories',
    short: 'Accessories',
    note: 'Keyboards, mice, cases and cables.',
  },
  solar: {
    label: 'Solar panels & batteries',
    short: 'Solar',
    note: 'Installation is available as a service.',
  },
};

/** Products flagged for the featured rail, in the shop's normal sort order. */
export const featuredProducts = (products: Product[]): Product[] =>
  sortProducts(products.filter((p) => p.featured));

/** Cheapest configuration — what the index shows as the "From" price. */
export const priceFrom = (p: Product): number =>
  Math.min(...p.variants.map((v) => v.price));

/**
 * Newest first where we have a generation to sort by, then cheapest.
 *
 * appleGeneration only exists on Apple phones, so everything else falls back to
 * price alone rather than being pushed to the bottom by a missing field.
 */
export function sortProducts(products: Product[]): Product[] {
  return [...products].sort(
    (a, b) =>
      (b.appleGeneration ?? 0) - (a.appleGeneration ?? 0) ||
      a.brand.localeCompare(b.brand) ||
      priceFrom(a) - priceFrom(b)
  );
}

/**
 * The spec rows a listing shows, chosen by category.
 *
 * A phone needs network lock and SIM type; a solar panel does not, and padding
 * every category with "n/a" rows would make the honest disclosures harder to
 * find rather than easier.
 */
export function specRows(
  p: Product,
  shop: { networkLock: string; batteryMinimum: string; warrantyDays: number; conditionConfirmed: boolean }
): Array<{ label: string; value: string }> {
  const unconfirmed = 'Confirmed before order';
  const rows: Array<{ label: string; value: string }> = [
    { label: 'Condition', value: p.conditionLabel },
    { label: p.variantAxis, value: p.variants.map((v) => v.label).join(', ') },
  ];

  if (p.category === 'phones') {
    rows.push(
      { label: 'Network', value: shop.networkLock },
      { label: 'SIM', value: isEsimRisk(p) ? `${unconfirmed} — may be eSIM-only` : 'Physical SIM' },
      { label: 'Battery', value: shop.conditionConfirmed ? shop.batteryMinimum : unconfirmed }
    );
  }

  rows.push({
    label: 'Colour',
    value: p.colours.length > 0 ? p.colours.join(', ') : unconfirmed,
  });

  rows.push(...p.specs);
  rows.push({ label: 'Warranty', value: `${shop.warrantyDays} days` });

  return rows;
}

/**
 * US-market iPhone 14 and newer ship with no SIM tray at all, and eSIM support
 * across MTN, Airtel and Glo is uneven. A buyer discovering that on delivery
 * day, weeks after paying, is the exact failure the shop copy promises to avoid.
 */
export const isEsimRisk = (p: Product): boolean =>
  p.category === 'phones' && (p.appleGeneration ?? 0) >= 14;

/** True where the model predates its own replacement and cannot be sold new. */
export const isDiscontinued = (p: Product): boolean =>
  p.category === 'phones' && (p.appleGeneration ?? 99) <= 14;
