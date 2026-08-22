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
    // Full label, not truncated to "Power" — next to a "Solar" chip that read
    // as electricity supply in general, not the specific product this is.
    short: 'Power banks',
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
 *
 * Every phrase here was rewritten against real usability feedback: a
 * non-technical reader could not tell "Confirmed before order" was answering
 * the row above it, "Battery — 85%+" carried no unit of meaning, and "unit"
 * read as warehouse language for "phone". None of the rewrites assert a fact
 * this business has not actually confirmed — see the two rules below.
 */
export function specRows(
  p: Product,
  shop: { networkLock: string; batteryMinimum: string; warrantyDays: number; conditionConfirmed: boolean }
): Array<{ label: string; value: string }> {
  /*
   * Two rules keep this from turning a plain-English pass into invented
   * policy: never state a specific grade, colour or battery figure the
   * supplier has not actually confirmed, and never claim delivery started
   * before the moment the site's returns page actually anchors it to.
   */
  const unconfirmed = 'We confirm this in writing before you pay';

  const rows: Array<{ label: string; value: string }> = [
    { label: 'Condition', value: p.conditionLabel },
  ];

  // The storage/capacity/wattage picker just above already shows every size
  // as a selectable chip — repeating the full list here as a spec row
  // answered a question the picker had already answered, without saying
  // which one the price and warranty on screen actually refer to.

  if (p.category === 'phones') {
    rows.push(
      { label: 'Network', value: `${shop.networkLock} — not tied to any one network` },
      {
        label: 'SIM card',
        value: isEsimRisk(p)
          ? 'Some units of this model have no SIM card slot at all — we check the exact phone and tell you which kind it is before you pay'
          : 'Takes a normal SIM card',
      },
      { label: 'Battery', value: shop.conditionConfirmed ? `${shop.batteryMinimum} of original capacity` : unconfirmed }
    );
  }

  rows.push({
    label: 'Colour',
    value: p.colours.length > 0 ? p.colours.join(', ') : unconfirmed,
  });

  rows.push(...p.specs);
  rows.push({ label: 'Warranty', value: `${shop.warrantyDays} days from delivery` });

  return rows;
}

/**
 * US-market iPhone 14 and newer ship with no SIM tray at all, and eSIM support
 * across MTN, Airtel, Glo and 9mobile is uneven. A buyer discovering that on
 * delivery day, weeks after paying, is the exact failure the shop copy
 * promises to avoid.
 */
export const isEsimRisk = (p: Product): boolean =>
  p.category === 'phones' && (p.appleGeneration ?? 0) >= 14;

/** True where the model predates its own replacement and cannot be sold new. */
export const isDiscontinued = (p: Product): boolean =>
  p.category === 'phones' && (p.appleGeneration ?? 99) <= 14;
