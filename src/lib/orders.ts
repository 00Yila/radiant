/**
 * The order-status enum and fixed redirect targets, mirrored from
 * public/_lib/orders.php and public/order-callback.php. This file has no
 * runtime consumer of its own — its only job is to give
 * tests/unit/checkout.test.ts something in TypeScript to check the PHP
 * against, so the two can never drift silently.
 */

export const ORDER_STATUSES = [
  'pending',
  'paid',
  'processing',
  'shipped',
  'delivered',
  'failed',
] as const;

/** The subset of statuses the customer tracking timeline renders as steps. */
export const TRACKING_STEPS = ['paid', 'processing', 'shipped', 'delivered'] as const;

export const ORDER_REDIRECTS = {
  confirmed: '/order/confirmed/',
  failed: '/order/failed/',
  notFound: '/order/not-found/',
} as const;
