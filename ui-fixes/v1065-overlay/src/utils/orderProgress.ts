/**
 * v1.0.76 (Ankur, 14 Nov 2026): big, clear order status step tracker for the
 * customer's current order. Pure helpers (no Firebase, no React).
 *
 * Steps: Order received -> Confirmed -> Packed -> Dispatched -> Delivered.
 * Status mapping: pending = received, confirmed = confirmed, in_packing = packed
 * (staff "Packing done" / owner loading tick), dispatched, delivered.
 *
 * Times: the order stores createdAt (= Order received) and updatedAt (= when the
 * latest status/update was saved). There is no per-step time history in Firestore,
 * so only those two are shown; an optional `statusTimes` map is honoured if one
 * is ever stored. Nothing is invented.
 */

export type ProgressStepKey = 'received' | 'confirmed' | 'packed' | 'dispatched' | 'delivered';

export const PROGRESS_STEPS: readonly { key: ProgressStepKey; en: string; hi: string }[] = [
  { key: 'received', en: 'Order received', hi: 'ऑर्डर मिला' },
  { key: 'confirmed', en: 'Confirmed', hi: 'कन्फर्म' },
  { key: 'packed', en: 'Packed', hi: 'पैक हुआ' },
  { key: 'dispatched', en: 'Dispatched', hi: 'रवाना' },
  { key: 'delivered', en: 'Delivered', hi: 'डिलीवर' },
];

const STATUS_STEP: Record<string, number> = {
  pending: 0,
  confirmed: 1,
  in_packing: 2,
  dispatched: 3,
  delivered: 4,
};

/** Index of the current step, or -1 for cancelled / unknown status. */
export function currentStepIndex(status: unknown): number {
  return typeof status === 'string' && status in STATUS_STEP ? STATUS_STEP[status] : -1;
}

export function isActiveOrderStatus(status: unknown): boolean {
  return status === 'pending' || status === 'confirmed' || status === 'in_packing' || status === 'dispatched';
}

/** Firestore Timestamp, {seconds}, Date, millis or ISO string -> millis (or null). */
export function toMillis(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (typeof value === 'string') {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === 'object') {
    const v = value as { toMillis?: () => number; seconds?: unknown; _seconds?: unknown };
    if (typeof v.toMillis === 'function') {
      try { const ms = v.toMillis(); return Number.isFinite(ms) && ms > 0 ? ms : null; } catch { return null; }
    }
    const s = typeof v.seconds === 'number' ? v.seconds : typeof v._seconds === 'number' ? v._seconds : null;
    if (s != null && Number.isFinite(s) && s > 0) return s * 1000;
  }
  return null;
}

export interface ProgressSource {
  status?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
  statusTimes?: Partial<Record<ProgressStepKey, unknown>> | null;
}

export interface ProgressStepView {
  key: ProgressStepKey;
  en: string;
  hi: string;
  state: 'done' | 'current' | 'todo';
  timeMs: number | null;
}

export interface OrderProgressView {
  cancelled: boolean;
  currentIndex: number;
  steps: ProgressStepView[];
}

/** Builds the step tracker. Received gets createdAt; the current step gets updatedAt. */
export function buildOrderProgress(order: ProgressSource): OrderProgressView {
  const index = currentStepIndex(order.status);
  const cancelled = order.status === 'cancelled';
  const created = toMillis(order.createdAt);
  const updated = toMillis(order.updatedAt);
  const steps = PROGRESS_STEPS.map((step, i) => {
    const state: ProgressStepView['state'] = index < 0 ? 'todo' : i < index ? 'done' : i === index ? 'current' : 'todo';
    let timeMs = toMillis(order.statusTimes?.[step.key]);
    if (timeMs == null && i === 0) timeMs = created;
    if (timeMs == null && i === index && i > 0) timeMs = updated;
    if (state === 'todo') timeMs = null;
    return { ...step, state, timeMs };
  });
  return { cancelled, currentIndex: index, steps };
}

/** Short IST-style time for a step, e.g. "14 Nov, 3:05 pm". */
export function formatStepTime(ms: number | null, hi: boolean): string {
  if (ms == null) return '';
  try {
    return new Intl.DateTimeFormat(hi ? 'hi-IN' : 'en-IN', {
      day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata',
    }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString();
  }
}

/**
 * The customer's "current" order: the newest order that is still active
 * (pending -> dispatched). If none is active, the newest delivered order of
 * the last 24 hours, so a just-delivered order still shows its finished tracker.
 */
export function pickCurrentOrder<T extends ProgressSource & { isTrash?: unknown }>(orders: readonly T[], nowMs = Date.now()): T | null {
  const live = orders.filter((o) => o && o.isTrash !== true);
  const newest = (list: T[]) => list.slice().sort((a, b) => (toMillis(b.createdAt) || 0) - (toMillis(a.createdAt) || 0))[0] || null;
  const active = newest(live.filter((o) => isActiveOrderStatus(o.status)));
  if (active) return active;
  return newest(live.filter((o) => o.status === 'delivered' && nowMs - (toMillis(o.updatedAt) || 0) <= 24 * 3600 * 1000));
}
