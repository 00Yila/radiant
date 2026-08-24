/**
 * The status enums, redirect targets, and cart limits, mirrored from
 * public/_lib/orders.php, public/_lib/cart.php, and public/order-callback.php.
 * This file has no runtime consumer of its own on the server side — its job
 * is to give tests/unit/checkout.test.ts and tests/unit/cart.test.ts
 * something in TypeScript to check the PHP against, so the two can never
 * drift silently. It's also imported directly by the browser-side cart
 * module (src/lib/client/cart.ts), which is why CART_LIMITS lives here
 * rather than only in PHP.
 */

/** Payment-lifecycle status of the whole order (one Paystack transaction). */
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed'] as const;

/** Fulfillment-lifecycle status of one line item within an order. */
export const ITEM_STATUSES = ['pending', 'processing', 'shipped', 'delivered'] as const;

/** The subset of ITEM_STATUSES the tracking/account timelines render as steps. */
export const TRACKING_STEPS = ['processing', 'shipped', 'delivered'] as const;

export const ORDER_REDIRECTS = {
  confirmed: '/order/confirmed/',
  failed: '/order/failed/',
  notFound: '/order/not-found/',
} as const;

export const CART_LIMITS = {
  maxItems: 20,
  maxQuantity: 10,
} as const;
