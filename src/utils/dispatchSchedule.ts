export type DispatchSlot = 'morning' | 'evening';
export type DispatchBucket = 'today_morning' | 'today_evening' | 'tomorrow_morning' | 'tomorrow_evening' | 'upcoming' | 'old_overdue' | 'date_not_set';

export function istDateKey(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function addIstDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + days, 6));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}-${String(date.getUTCDate()).padStart(2, '0')}`;
}

function createdDateKey(createdAt: any): string | null {
  const date = createdAt?.toDate?.() || (typeof createdAt?.seconds === 'number' ? new Date(createdAt.seconds * 1000) : createdAt instanceof Date ? createdAt : null);
  return date instanceof Date && !Number.isNaN(date.getTime()) ? istDateKey(date) : null;
}

export function dispatchParts(order: { dispatchDate?: string; slot?: string; dispatchSlot?: string; dispatchTiming?: string; createdAt?: any }) {
  const timing = (order.dispatchTiming || '').toLowerCase();
  const storedSlot = order.dispatchSlot || order.slot;
  const slot: DispatchSlot = storedSlot === 'morning' || (!storedSlot && (timing.includes('सुबह') || timing.includes('morning'))) ? 'morning' : 'evening';
  let date = /^\d{4}-\d{2}-\d{2}$/.test(order.dispatchDate || '') ? order.dispatchDate! : createdDateKey(order.createdAt);
  if (date && !order.dispatchDate && (timing.includes('कल') || timing.includes('tomorrow'))) date = addIstDays(date, 1);
  return { date, slot };
}

export function dispatchBucket(order: { dispatchDate?: string; slot?: string; dispatchSlot?: string; dispatchTiming?: string; createdAt?: any }, today = istDateKey()): DispatchBucket {
  const { date, slot } = dispatchParts(order);
  if (!date) return 'date_not_set';
  if (date < today) return 'old_overdue';
  if (date === today) return slot === 'morning' ? 'today_morning' : 'today_evening';
  if (date === addIstDays(today, 1)) return slot === 'morning' ? 'tomorrow_morning' : 'tomorrow_evening';
  // v1.0.70: a dispatch date after tomorrow is upcoming work, never "old / overdue".
  return 'upcoming';
}

export function formatDispatchDate(dateKey: string | null | undefined, slot: DispatchSlot, language: 'hi' | 'en' = 'hi', now = new Date()): string {
  if (!dateKey) return language === 'hi' ? `तारीख तय नहीं · ${slot === 'morning' ? 'सुबह' : 'शाम'}` : `Date not set · ${slot}`;
  const today = istDateKey(now);
  const prefix = dateKey === today ? (language === 'hi' ? 'आज' : 'Today') : dateKey === addIstDays(today, 1) ? (language === 'hi' ? 'कल' : 'Tomorrow') : new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }).format(new Date(`${dateKey}T12:00:00+05:30`));
  const suffix = language === 'hi' ? (slot === 'morning' ? 'सुबह' : 'शाम') : (slot === 'morning' ? 'Morning' : 'Evening');
  return `${prefix}, ${suffix}`;
}
