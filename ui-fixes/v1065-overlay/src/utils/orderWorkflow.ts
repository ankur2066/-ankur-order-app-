/**
 * v1.0.70 owner order workflow (pure helpers, no Firebase):
 *  - "New orders" = only status 'pending' (not yet confirmed by the owner).
 *  - Confirm moves an order to 'confirmed'; only confirmed-onwards orders count
 *    in packing by stop and the dispatch slots, so Alambagh/Kaiserbagh counts
 *    never include an order the owner has not seen.
 *  - Loading tick = the existing 'in_packing' status (same as staff "Packing done");
 *    dispatched/delivered also count as loaded. No new Firestore field.
 *  - Old/Overdue = past dispatch date AND still not dispatched (confirmed/in_packing).
 */
import { dispatchBucket, dispatchParts, istDateKey, type DispatchBucket } from './dispatchSchedule.ts';

export interface WorkflowOrder {
  status?: string;
  isTrash?: boolean;
  dispatchDate?: string;
  slot?: string;
  dispatchSlot?: string;
  dispatchTiming?: string;
  createdAt?: any;
}

export const LOADED_STATUSES: readonly string[] = ['in_packing', 'dispatched', 'delivered'];

export function isNewOrder(order: WorkflowOrder): boolean {
  return !order.isTrash && order.status === 'pending';
}

/** Confirmed by the owner and not cancelled: the orders that count for packing and dispatch. */
export function isConfirmedWork(order: WorkflowOrder): boolean {
  return !order.isTrash && !!order.status && order.status !== 'pending' && order.status !== 'cancelled';
}

export function isLoaded(order: WorkflowOrder): boolean {
  return LOADED_STATUSES.includes(order.status || '');
}

/** Status to write when the owner ticks / unticks the loading box; null = no change allowed. */
export function loadToggleStatus(order: WorkflowOrder, loaded: boolean): 'in_packing' | 'confirmed' | null {
  if (loaded) return order.status === 'confirmed' ? 'in_packing' : null;
  return order.status === 'in_packing' ? 'confirmed' : null;
}

/** Dispatch-slot membership for the owner's slot buttons: confirmed work only; overdue = not yet dispatched. */
export function workSlotMatches(order: WorkflowOrder, key: DispatchBucket, today: string = istDateKey()): boolean {
  if (!isConfirmedWork(order)) return false;
  if (dispatchBucket(order, today) !== key) return false;
  if (key === 'old_overdue') return order.status === 'confirmed' || order.status === 'in_packing';
  return true;
}

export function loadCounts(orders: WorkflowOrder[]): { total: number; loaded: number } {
  const work = orders.filter(isConfirmedWork);
  return { total: work.length, loaded: work.filter(isLoaded).length };
}

/** Today's dispatch work still needing the owner: unconfirmed orders and confirmed-but-not-loaded orders. */
export function todayAttention(orders: WorkflowOrder[], today: string = istDateKey()): { unconfirmed: number; unloaded: number } {
  const todays = orders.filter((o) => !o.isTrash && o.status !== 'cancelled' && dispatchParts(o).date === today);
  return {
    unconfirmed: todays.filter(isNewOrder).length,
    unloaded: todays.filter((o) => o.status === 'confirmed').length,
  };
}

/** New orders, earliest dispatch date first (undated last), newest booking first within a day. */
export function sortNewOrders<T extends WorkflowOrder>(orders: T[]): T[] {
  const key = (o: T) => dispatchParts(o).date || '9999-99-99';
  return orders.filter(isNewOrder).sort((a, b) => key(a).localeCompare(key(b)) || ((b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0)));
}
