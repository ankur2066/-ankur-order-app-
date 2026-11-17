import { collection, doc, getDoc, increment, onSnapshot, query, serverTimestamp, setDoc, where, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import type { Order } from '../types';
import { projectionDrift, toStaffOrderView } from '../utils/staffProjection';
import { customerDocId } from './customers';
import { syncTrackingDispatch } from './busDispatch';

const STATUS_MESSAGE: Record<string, string> = {
  in_packing: 'ड्राई आइस और थर्मोकोल पैकिंग जारी है।',
  dispatched: 'ड्राई आइस बस / ट्रांसपोर्टर को हैंडओवर कर दी गई है।',
  delivered: 'ऑर्डर सफलतापूर्वक डिलीवर / हैंडओवर हो गया।',
};

/**
 * OWNER client: copies staff status changes to the public tracking document
 * (staff never see the tracking token) and clears statusSyncPending.
 * Runs whenever the owner app is open; customers see the change after that.
 */
export function watchStaffStatusSync(getOrder: (orderId: string) => Order | undefined): () => void {
  const inFlight = new Set<string>();
  return onSnapshot(query(collection(db, 'staffOrderViews'), where('statusSyncPending', '==', true)), (snap) => {
    snap.docs.forEach((viewDoc) => {
      const view = viewDoc.data() as { status?: string };
      const orderId = viewDoc.id;
      if (inFlight.has(orderId) || !view.status) return;
      inFlight.add(orderId);
      void (async () => {
        let order = getOrder(orderId);
        if (!order) {
          const fresh = await getDoc(doc(db, 'orders', orderId));
          order = fresh.exists() ? (fresh.data() as Order) : undefined;
        }
        const batch = writeBatch(db);
        if (order?.trackingToken) {
          batch.update(doc(db, 'order_tracking', order.trackingToken), { status: view.status, lastStatusUpdate: STATUS_MESSAGE[view.status!] || 'स्टेटस अपडेट हुआ।', updatedAt: serverTimestamp() });
        }
        batch.update(viewDoc.ref, { statusSyncPending: false, updatedAt: serverTimestamp() });
        await batch.commit();
        // v1.0.72: separate best-effort copy of mode / stop / bus number for the customer.
        if (view.status === 'dispatched' && order) void syncTrackingDispatch(order);
        if (view.status === 'delivered' && order?.customerPhone) {
          try { await setDoc(doc(db, 'customers', customerDocId(order.customerPhone)), { completedOrders: increment(1), tag: 'Old' }, { merge: true }); } catch { /* legacy orders without a customer doc */ }
        }
      })().catch((error) => console.warn('Staff status sync deferred:', error)).finally(() => inFlight.delete(orderId));
    });
  }, (error) => console.warn('Staff status sync listener error:', error));
}

/** OWNER client: seed or patch the staff-safe projection for one order. */
export async function syncStaffProjection(order: Order): Promise<void> {
  const ref = doc(db, 'staffOrderViews', order.orderId);
  const existing = await getDoc(ref);
  const patch = projectionDrift(existing.exists() ? existing.data() : undefined, order as any);
  if (!patch) return;
  if (!existing.exists()) await setDoc(ref, toStaffOrderView(order as any));
  else await setDoc(ref, { ...patch, updatedAt: serverTimestamp() }, { merge: true });
}
