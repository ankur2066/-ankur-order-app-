/**
 * v1.0.72 bus number (pure, no Firebase).
 * The owner types the bus number once (WhatsApp prompt or the delivery editor);
 * it is saved on the order as `busNumber` and copied to
 *   - the public tracking doc (order_tracking: deliveryMode, busStopId, busNumber)
 *   - the staff projection (staffOrderViews.busNumber)
 * A bus number is not sensitive: no phone, price or PIN travels with it.
 */
import { isDeliveryMode } from './delivery.ts';

export const BUS_NUMBER_MAX = 20;

/** Trimmed, upper-case, single-spaced; '' when empty or not a plausible bus/vehicle number. */
export function normalizeBusNumber(raw: unknown): string {
  if (typeof raw !== 'string') return '';
  const value = raw.trim().replace(/\s+/g, ' ').toUpperCase();
  if (!value || value.length > BUS_NUMBER_MAX) return '';
  return /^[A-Z0-9][A-Z0-9 \-\/]*$/.test(value) ? value : '';
}

export interface DispatchSource {
  deliveryMode?: string;
  busStopId?: string;
  busNumber?: string;
}

/**
 * Fields the owner client writes to the public tracking doc.
 * null = remove the field (e.g. the order is no longer a bus order).
 */
export function trackingDispatchFields(order: DispatchSource): { deliveryMode: string | null; busStopId: string | null; busNumber: string | null } {
  const mode = isDeliveryMode(order.deliveryMode) ? order.deliveryMode : null;
  const isBus = mode === 'BUS';
  const stop = isBus && typeof order.busStopId === 'string' && order.busStopId.length >= 2 ? order.busStopId : null;
  const bus = isBus ? normalizeBusNumber(order.busNumber) || null : null;
  return { deliveryMode: mode, busStopId: stop, busNumber: bus };
}

const MODE_TEXT: Record<string, { hi: string; en: string }> = {
  BUS: { hi: 'बस से', en: 'By bus' },
  PORTER: { hi: 'Porter से', en: 'By Porter' },
  LOCAL: { hi: 'लोकल डिलीवरी से', en: 'Local delivery' },
  SHOP_PICKUP: { hi: 'दुकान पिकअप', en: 'Shop pickup' },
};

export interface TrackingDispatchView { modeHi: string; modeEn: string; stopName?: string; busNumber?: string }

/**
 * What the customer tracking page shows under "dispatched": mode, bus stop and
 * bus number. Nothing before dispatch; no bus number line when none was saved.
 */
export function trackingDispatchView(tracking: { status?: string; deliveryMode?: string; busNumber?: string }, stopName?: string): TrackingDispatchView | null {
  if (tracking.status !== 'dispatched' && tracking.status !== 'delivered') return null;
  if (!isDeliveryMode(tracking.deliveryMode)) return null;
  const text = MODE_TEXT[tracking.deliveryMode];
  const view: TrackingDispatchView = { modeHi: text.hi, modeEn: text.en };
  if (tracking.deliveryMode === 'BUS') {
    const stop = typeof stopName === 'string' ? stopName.trim() : '';
    if (stop) view.stopName = stop;
    const bus = normalizeBusNumber(tracking.busNumber);
    if (bus) view.busNumber = bus;
  }
  return view;
}
