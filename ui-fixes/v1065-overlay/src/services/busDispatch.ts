import { deleteField, serverTimestamp, updateDoc } from 'firebase/firestore';
import type { Order } from '../types';
import { orderRef as resolvedOrderRef, trackingRef as resolvedTrackingRef } from './productOrders';
import { syncStaffProjection } from './staffSync';
import { normalizeBusNumber, trackingDispatchFields } from '../utils/busDispatch';

/**
 * v1.0.72 OWNER client. Each write is separate and best-effort so an older
 * published firestore.rules (without busNumber) can never block a status
 * change, payment toggle or the WhatsApp button; it only skips the copy.
 */
export async function syncTrackingDispatch(order: Order): Promise<boolean> {
  if (!order.trackingToken) return false;
  const fields = trackingDispatchFields(order);
  const patch: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [key, value] of Object.entries(fields)) patch[key] = value === null ? deleteField() : value;
  try {
    await updateDoc(resolvedTrackingRef(order.trackingToken), patch);
    return true;
  } catch (error) {
    console.warn('Tracking dispatch info not copied (publish firestore.rules v1.0.72):', error);
    return false;
  }
}

/** Saves the bus number on the order, then copies it to tracking and the staff view. */
export async function saveBusNumber(order: Order, raw: string): Promise<{ saved: boolean; busNumber: string }> {
  const busNumber = normalizeBusNumber(raw);
  const next: Order = { ...order, busNumber: busNumber || undefined };
  let saved = false;
  try {
    await updateDoc(resolvedOrderRef(order.orderId), { busNumber: busNumber || deleteField(), updatedAt: serverTimestamp() });
    saved = true;
  } catch (error) {
    console.warn('Bus number not saved on order (publish firestore.rules v1.0.72):', error);
  }
  if (saved) {
    await syncTrackingDispatch(next);
    try { await syncStaffProjection(next); } catch (error) { console.warn('Staff view bus number sync deferred:', error); }
  }
  return { saved, busNumber };
}
