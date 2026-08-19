/**
 * Naira formatting. Always whole naira — kobo is never shown at these
 * price points, and trailing ".00" makes a 53-row price column noisier.
 * Pair with the .ra-numeric class so columns align.
 */
export function formatNaira(amount: number): string {
  if (!Number.isFinite(amount)) {
    throw new Error(`formatNaira expects a finite number, received ${amount}`);
  }
  if (amount < 0) {
    throw new Error(`formatNaira does not accept negative amounts: ${amount}`);
  }
  return `₦${Math.floor(amount).toLocaleString('en-NG')}`;
}
