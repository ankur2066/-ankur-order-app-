import React, { useMemo, useState } from 'react';
import { istDateKey, addIstDays } from '../utils/dispatchSchedule';
import {
  groupForPacking, packingShareText, whatsappShareUrl, findStop, isDeliveryMode,
  LOCAL_GROUP, LOCAL_SUBTAG, DELIVERY_MODE_LABELS, type DeliverySettings, type PackingOrder,
} from '../utils/delivery';
import type { StaffAction } from '../utils/staffProjection';

export type PackingBoardOrder = PackingOrder & { status?: string; packingStatus?: string };

interface Props {
  orders: PackingBoardOrder[];
  settings: DeliverySettings;
  /** staff: status buttons; owner: filter only (owner keeps its own order cards). */
  mode: 'staff' | 'owner';
  canUpdate?: boolean;
  updatingId?: string | null;
  onAction?: (order: PackingBoardOrder, action: StaffAction) => void;
  /** Owner: tell the parent which group/date is selected so All Orders can filter. */
  onFilterChange?: (filter: { groupKey: string | null; dateKey: string }) => void;
  title?: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending', confirmed: 'Confirmed', in_packing: 'Packing', dispatched: 'Dispatched', delivered: 'Delivered', cancelled: 'Cancelled',
};
const STATUS_CLASS: Record<string, string> = {
  pending: 'status-pending', confirmed: 'status-confirmed', in_packing: 'status-packing', dispatched: 'status-dispatch', delivered: 'status-delivered',
};

export function PackingBoard({ orders, settings, mode, canUpdate = false, updatingId, onAction, onFilterChange, title }: Props) {
  const today = istDateKey();
  const [dateKey, setDateKey] = useState(today);
  const [groupKey, setGroupKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const groups = useMemo(() => groupForPacking(orders, settings, dateKey), [orders, settings, dateKey]);
  const selected = groups.find((group) => group.key === groupKey) || null;
  const dayTotalKg = Math.round(groups.reduce((sum, group) => sum + group.totalKg, 0) * 100) / 100;
  const dayCount = groups.reduce((sum, group) => sum + group.count, 0);

  const choose = (key: string | null, nextDate = dateKey) => {
    setGroupKey(key);
    onFilterChange?.({ groupKey: key, dateKey: nextDate });
  };
  const changeDate = (next: string) => { setDateKey(next); choose(groupKey, next); };

  const share = async () => {
    if (!selected) return;
    const text = packingShareText(selected, dateKey);
    try {
      if (navigator.share) { await navigator.share({ text }); return; }
    } catch { /* fall back to WhatsApp link */ }
    window.open(whatsappShareUrl(text), '_blank', 'noopener,noreferrer');
    try { await navigator.clipboard?.writeText(text); setCopied(true); window.setTimeout(() => setCopied(false), 1800); } catch { /* optional */ }
  };

  return <section className="packing-board soft-card space-y-3" aria-label={title || 'Packing'}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      <h2 className="text-lg font-black">{title || 'Packing'}</h2>
      <div className="flex items-center gap-2 text-sm">
        <button type="button" className="pill-tab" aria-pressed={dateKey === today} onClick={() => changeDate(today)}>Aaj</button>
        <button type="button" className="pill-tab" aria-pressed={dateKey === addIstDays(today, 1)} onClick={() => changeDate(addIstDays(today, 1))}>Kal</button>
        <input aria-label="Packing date" type="date" className="pill-date" value={dateKey} onChange={(event) => event.target.value && changeDate(event.target.value)} />
      </div>
    </div>
    <p className="text-sm t-sub" aria-live="polite">{dateKey} · {dayCount} order · {dayTotalKg} KG</p>
    <div className="packing-stop-pills" role="tablist" aria-label="Bus stops and Local">
      {mode === 'owner' && <button type="button" role="tab" className="stop-pill stop-tag-unassigned" aria-pressed={groupKey === null} aria-selected={groupKey === null} onClick={() => choose(null)}>
        <span>Sab stops</span><b>{dayCount}</b>
      </button>}
      {groups.map((group) => <button type="button" role="tab" key={group.key} className={`stop-pill stop-tag-${group.color}`} aria-pressed={groupKey === group.key} aria-selected={groupKey === group.key} onClick={() => choose(groupKey === group.key && mode === 'owner' ? null : group.key)}>
        <span>{group.label}</span><b>{group.count}</b>
        {group.key === LOCAL_GROUP && group.count > 0 && <small className="block">{Object.entries(group.subTags).map(([tag, count]) => `${tag} ${count}`).join(' · ')}</small>}
      </button>)}
    </div>

    {selected && <div className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-bold">{selected.label} · {selected.count} order · <span className="packing-total">{selected.totalKg} KG</span></p>
        <button type="button" className="soft-button secondary-button" disabled={!selected.count} onClick={() => void share()}>{copied ? 'Copied' : 'Share (WhatsApp)'}</button>
      </div>
      {mode === 'staff' && (selected.count === 0 ? <p className="soft-card-inset p-3 text-sm">Is stop par {dateKey} ke liye koi order nahi.</p> :
        <ul className="space-y-2">{selected.orders.map((order) => {
          const stop = order.deliveryMode === 'BUS' ? findStop(settings, order.busStopId) : undefined;
          const tag = isDeliveryMode(order.deliveryMode) && order.deliveryMode !== 'BUS' ? LOCAL_SUBTAG[order.deliveryMode] : stop?.name || 'Mode not set';
          const busy = updatingId === order.orderId;
          const isLocal = selected.key === LOCAL_GROUP;
          return <li key={order.orderId} className="packing-card soft-card-inset p-3 space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <b className="text-base">{order.customerName || 'Customer'}</b>
              <span className={`stop-chip stop-tag-${stop?.color || (isLocal ? 'local' : 'unassigned')}`}>{tag}</span>
            </div>
            <p className="text-sm">{order.district || order.city || '—'} · <b>{Number(order.quantityKg) || 0} KG</b>{order.packCount ? ` · ${order.packCount} box` : ''}</p>
            {isDeliveryMode(order.deliveryMode) && <p className="text-sm t-sub">{DELIVERY_MODE_LABELS[order.deliveryMode].en}{stop ? ` · ${stop.name}` : ''}</p>}
            {order.deliveryNote && <p className="text-sm"><b>Note:</b> {order.deliveryNote}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <span className={`status-chip ${STATUS_CLASS[order.status || ''] || 'status-total'}`}>{order.packingStatus === 'packed' && order.status === 'in_packing' ? 'Packed' : STATUS_LABEL[order.status || ''] || order.status}</span>
              {busy && <span className="text-sm" role="status">Update ho raha hai…</span>}
            </div>
            {(order as any).waPhone && /^[0-9]{10}$/.test((order as any).waPhone) && <a className="soft-button secondary-button block text-center" target="_blank" rel="noopener noreferrer" aria-label={`${order.customerName || 'Customer'} ko WhatsApp`}
              href={`https://wa.me/91${(order as any).waPhone}?text=${encodeURIComponent(`नमस्ते ${order.customerName || ''} जी, Ankur Dryice से बात कर रहे हैं। आपके ${Number(order.quantityKg) || 0} KG ड्राई आइस ऑर्डर के बारे में।`)}`}>Customer ko WhatsApp</a>}
            {canUpdate && onAction && <div className="grid grid-cols-2 gap-2">
              <button type="button" className="soft-button status-action status-packing" disabled={busy || order.packingStatus === 'packed' || order.status === 'dispatched' || order.status === 'delivered'} onClick={() => onAction(order, 'packing_done')}>Packing done</button>
              {isLocal
                ? <button type="button" className="soft-button status-action status-delivered" disabled={busy || order.status === 'delivered'} onClick={() => onAction(order, 'handed_over')}>Handed over</button>
                : <button type="button" className="soft-button status-action status-dispatch" disabled={busy || order.status === 'dispatched' || order.status === 'delivered'} onClick={() => onAction(order, 'dispatched')}>Dispatched</button>}
            </div>}
          </li>;
        })}</ul>)}
    </div>}
    {!selected && mode === 'staff' && <p className="text-sm t-sub">Upar stop ya Local chunein.</p>}
  </section>;
}

export default PackingBoard;
