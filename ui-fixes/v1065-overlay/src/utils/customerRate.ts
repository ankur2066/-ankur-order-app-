/**
 * v1.0.79 (Ankur, 17 Nov 2026): wholesale rates differ per customer (e.g. ₹35,
 * ₹30, ₹28 per kg). The owner saves a customer's own dry-ice rate on that
 * customer's users/{uid} profile as `customRatePerKg`. Rules already let only
 * the owner write that field (a customer may change only name/phone/city) and
 * let the customer read their own profile, so no rules change is needed.
 * Clearing the field ("Default rate") puts the customer back on the normal price.
 */
export const CUSTOM_RATE_FIELD = 'customRatePerKg';
export const CUSTOM_RATE_CHIPS = [35, 30, 28] as const;
export const CUSTOM_RATE_MAX = 1000;

/** A valid saved per-customer rate (₹/kg, > 0, ≤ 1000, rounded to paise), else undefined. */
export function parseCustomRate(value: unknown): number | undefined {
  const n = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(n) || n <= 0 || n > CUSTOM_RATE_MAX) return undefined;
  return Math.round(n * 100) / 100;
}

/** Dry-ice ₹/kg used for an order: the customer's own rate first, then the normal price for their type. */
export function effectiveDryIceRate(
  customerType: 'retail' | 'wholesale',
  rates: { dryIceRate: number; wholesaleRate?: number },
  customRate?: unknown,
): number | undefined {
  const own = parseCustomRate(customRate);
  if (own !== undefined) return own;
  return customerType === 'wholesale' ? rates.wholesaleRate : rates.dryIceRate;
}

/** Customer-facing line for a customer who has their own rate. */
export function customRateLine(rate: number, english = false): string {
  return english ? `Your special rate: ₹${rate}/kg` : `आपका खास रेट: ₹${rate}/kg`;
}

/**
 * Owner-facing rate label for an order card: the dry-ice ₹/kg actually booked
 * (orders already store dryIcePricePerKg; no new order field, so order rules are unchanged).
 */
export function orderRateLabel(order: { dryIcePricePerKg?: unknown }): string {
  const r = Number(order.dryIcePricePerKg);
  if (!Number.isFinite(r) || r <= 0) return '';
  return `Rate ₹${r}/kg`;
}
