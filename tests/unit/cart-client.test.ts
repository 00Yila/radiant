import { describe, it, expect, beforeEach } from 'vitest';
import {
  readCart,
  addToCart,
  updateQuantity,
  removeFromCart,
  clearCart,
  cartTotal,
  cartCount,
  type CartStorage,
} from '../../src/lib/client/cart';
import { CART_LIMITS } from '../../src/lib/orders';

/** A minimal in-memory stand-in for window.localStorage. */
function fakeStorage(): CartStorage {
  const data = new Map<string, string>();
  return {
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
  };
}

describe('readCart', () => {
  it('returns an empty array when nothing is stored', () => {
    expect(readCart(fakeStorage())).toEqual([]);
  });

  it('returns an empty array for corrupted JSON rather than throwing', () => {
    const storage = fakeStorage();
    storage.setItem('ra-cart', 'not json');
    expect(readCart(storage)).toEqual([]);
  });
});

describe('addToCart', () => {
  it('adds a new line item', () => {
    const storage = fakeStorage();
    const result = addToCart(storage, { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000 });
    expect(result).toEqual([
      { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000, quantity: 1 },
    ]);
    expect(readCart(storage)).toEqual(result);
  });

  it('merges into an existing line by product+variant instead of duplicating it', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000 });
    const result = addToCart(storage, { product: 'iphone-13', variant: 'IP13-128-BLK', label: '128GB', price: 380000 }, 2);
    expect(result).toHaveLength(1);
    expect(result[0].quantity).toBe(3);
  });

  it('caps quantity at CART_LIMITS.maxQuantity', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 }, CART_LIMITS.maxQuantity);
    const result = addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 }, 5);
    expect(result[0].quantity).toBe(CART_LIMITS.maxQuantity);
  });

  it('refuses to add a new distinct line beyond CART_LIMITS.maxItems, but still allows increasing an existing line', () => {
    const storage = fakeStorage();
    for (let i = 0; i < CART_LIMITS.maxItems; i++) {
      addToCart(storage, { product: `p${i}`, variant: 'x', label: 'X', price: 100 });
    }
    const beforeOverflow = readCart(storage).length;
    const afterAttempt = addToCart(storage, { product: 'one-too-many', variant: 'x', label: 'X', price: 100 });
    expect(afterAttempt).toHaveLength(beforeOverflow);

    const afterMerge = addToCart(storage, { product: 'p0', variant: 'x', label: 'X', price: 100 });
    expect(afterMerge.find((i) => i.product === 'p0')?.quantity).toBe(2);
  });
});

describe('updateQuantity', () => {
  it('changes the quantity of a matching line', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 });
    const result = updateQuantity(storage, 'a', 'x', 4);
    expect(result[0].quantity).toBe(4);
  });

  it('removes the line when quantity drops to zero or below', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 });
    const result = updateQuantity(storage, 'a', 'x', 0);
    expect(result).toEqual([]);
  });
});

describe('removeFromCart', () => {
  it('removes only the matching line', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 });
    addToCart(storage, { product: 'b', variant: 'y', label: 'B', price: 200 });
    const result = removeFromCart(storage, 'a', 'x');
    expect(result).toEqual([{ product: 'b', variant: 'y', label: 'B', price: 200, quantity: 1 }]);
  });
});

describe('clearCart', () => {
  it('empties the cart', () => {
    const storage = fakeStorage();
    addToCart(storage, { product: 'a', variant: 'x', label: 'A', price: 100 });
    clearCart(storage);
    expect(readCart(storage)).toEqual([]);
  });
});

describe('cartTotal and cartCount', () => {
  it('sums price*quantity and quantity respectively', () => {
    const items = [
      { product: 'a', variant: 'x', label: 'A', price: 100, quantity: 2 },
      { product: 'b', variant: 'y', label: 'B', price: 50, quantity: 3 },
    ];
    expect(cartTotal(items)).toBe(350);
    expect(cartCount(items)).toBe(5);
  });
});
