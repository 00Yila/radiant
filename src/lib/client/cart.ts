import { CART_LIMITS } from '../orders';

export interface CartItem {
  product: string;
  variant: string;
  label: string;
  price: number;
  quantity: number;
}

/**
 * Structurally matches window.localStorage (and Storage in general), taken
 * as a parameter so this module is testable in Vitest's plain Node
 * environment without a jsdom dependency — every browser call site just
 * passes `localStorage` directly, which already satisfies this shape.
 */
export interface CartStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const STORAGE_KEY = 'ra-cart';

export function readCart(storage: CartStorage): CartItem[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch {
    return [];
  }
}

function writeCart(storage: CartStorage, items: CartItem[]): CartItem[] {
  storage.setItem(STORAGE_KEY, JSON.stringify(items));
  return items;
}

function findLine(items: CartItem[], product: string, variant: string): CartItem | undefined {
  return items.find((i) => i.product === product && i.variant === variant);
}

export function addToCart(
  storage: CartStorage,
  item: Omit<CartItem, 'quantity'>,
  quantity = 1
): CartItem[] {
  const items = readCart(storage);
  const existing = findLine(items, item.product, item.variant);

  if (existing) {
    existing.quantity = Math.min(existing.quantity + quantity, CART_LIMITS.maxQuantity);
    return writeCart(storage, items);
  }

  if (items.length >= CART_LIMITS.maxItems) {
    // Silently refuses a new distinct line rather than throwing — the caller
    // (the "Add to Cart" button handler) treats an unchanged cart as the
    // signal that nothing happened.
    return items;
  }

  items.push({ ...item, quantity: Math.min(quantity, CART_LIMITS.maxQuantity) });
  return writeCart(storage, items);
}

export function updateQuantity(
  storage: CartStorage,
  product: string,
  variant: string,
  quantity: number
): CartItem[] {
  const items = readCart(storage);
  if (quantity <= 0) {
    return writeCart(storage, items.filter((i) => !(i.product === product && i.variant === variant)));
  }

  const existing = findLine(items, product, variant);
  if (existing) {
    existing.quantity = Math.min(quantity, CART_LIMITS.maxQuantity);
  }
  return writeCart(storage, items);
}

export function removeFromCart(storage: CartStorage, product: string, variant: string): CartItem[] {
  const items = readCart(storage).filter((i) => !(i.product === product && i.variant === variant));
  return writeCart(storage, items);
}

export function clearCart(storage: CartStorage): void {
  writeCart(storage, []);
}

export function cartTotal(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.price * i.quantity, 0);
}

export function cartCount(items: CartItem[]): number {
  return items.reduce((sum, i) => sum + i.quantity, 0);
}
