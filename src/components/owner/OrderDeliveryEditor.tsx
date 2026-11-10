import React, { useState } from 'react';
import { doc, serverTimestamp, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../../firebase';
import type { Order } from '../../types';
import { DeliveryModePicker } from '../DeliveryModePicker';
import { findStop, isDeliveryMode, validateDeliveryChoice, DELIVERY_MODE_LABELS, type DeliveryMode, type DeliverySettings } from '../../utils/delivery';
import { syncStaffProjection } from '../../services/staffSync';
import { customerDocId } from '../../services/customers';

/**
 * Owner changes an order's delivery mode / stop and must choose:
 * "Sirf is order ke liye" (order only) or "Hamesha ke liye" (also the customer's default).
 * A stop that became inactive is shown with a warning; it is never silently changed.
 */
export function OrderDeliveryEditor({ order, settings }: { order: Order; settings: DeliverySettings }) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<DeliveryMode | undefined>(isDeliveryMode(order.deliveryMode) ? order.deliveryMode : undefined);
  const [busStopId, setBusStopId] = useState<string | undefined>(order.busStopId);
  const [askScope, setAskScope] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const currentStop = findStop(settings, order.busStopId);
  const inactiveCurrent = order.deliveryMode === 'BUS' && (!currentStop || !currentStop.active);
  const label = isDeliveryMode(order.deliveryMode)
    ? `${DELIVERY_MODE_LABELS[order.deliveryMode].en}${order.deliveryMode === 'BUS' ? ` · ${currentStop?.name || order.busStopId || '?'}` : ''}`
    : 'Delivery mode not set';

  const apply = async (scope: 'order' | 'always') => {
    const error = validateDeliveryChoice(mode, busStopId, settings);
    if (error) { setMessage(error); setAskScope(false); return; }
    setBusy(true); setMessage('');
    try {
      const patch = { deliveryMode: mode!, ...(mode === 'BUS' ? { busStopId: busStopId! } : {}) };
      await updateDoc(doc(db, 'orders', order.orderId), { ...patch, ...(mode !== 'BUS' ? { busStopId: deleteField() } : {}), updatedAt: serverTimestamp() });
      await syncStaffProjection({ ...order, ...patch, ...(mode !== 'BUS' ? { busStopId: undefined } : {}) } as Order);
      if (scope === 'always' && order.customerPhone) {
        const id = customerDocId(order.customerPhone);
        await setDoc(doc(db, 'customers', id), { phone: id, defaultDeliveryMode: mode, defaultBusStopId: mode === 'BUS' ? busStopId : deleteField() }, { merge: true });
      }
      setMessage(scope === 'always' ? 'Order aur customer default dono update.' : 'Sirf is order ka delivery update.');
      setAskScope(false); setOpen(false);
    } catch {
      setMessage('Delivery update nahi hua.');
    } finally { setBusy(false); }
  };

  return <div className="order-delivery-editor space-y-2">
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className={`stop-chip stop-tag-${order.deliveryMode === 'BUS' ? currentStop?.color || 'unassigned' : isDeliveryMode(order.deliveryMode) ? 'local' : 'unassigned'}`}>{label}</span>
      {inactiveCurrent && <span role="alert" className="delivery-warning rounded-xl px-2 py-1">Stop inactive — naya stop chunein</span>}
      <button type="button" className="soft-button secondary-button" onClick={() => setOpen(!open)} aria-expanded={open}>Delivery badlein</button>
    </div>
    {open && <div className="soft-card-inset space-y-2 p-3">
      <DeliveryModePicker mode={mode} busStopId={busStopId} settings={settings} language="en" staleStopId={inactiveCurrent ? order.busStopId : undefined}
        onChange={(next) => { setMode(next.mode); setBusStopId(next.busStopId); setAskScope(false); }} disabled={busy} />
      {!askScope ? <button type="button" className="soft-button primary-button" disabled={busy || !mode} onClick={() => setAskScope(true)}>Save</button> :
        <div className="flex flex-wrap gap-2" role="group" aria-label="Apply delivery change">
          <button type="button" className="soft-button secondary-button" disabled={busy} onClick={() => void apply('order')}>Sirf is order ke liye</button>
          <button type="button" className="soft-button primary-button" disabled={busy || !order.customerPhone} onClick={() => void apply('always')}>Hamesha ke liye</button>
        </div>}
    </div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </div>;
}

export default OrderDeliveryEditor;
