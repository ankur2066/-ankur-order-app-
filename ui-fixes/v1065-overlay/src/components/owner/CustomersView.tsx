import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, isUserAdmin } from '../../firebase';
import { istDateKey } from '../../utils/dispatchSchedule';
import type { User } from 'firebase/auth';
import type { Order } from '../../types';

type CustomerRow = { id: string; uid?: string; name?: string; phone?: string; firstLoginAt?: any; lastLoginAt?: any; orderCount?: number; completedOrders?: number; tag?: 'New' | 'Old' };
function dateKey(value: any): string { const d = value?.toDate?.() || (value instanceof Date ? value : null); return d ? istDateKey(d) : ''; }
// v1.0.74 (Ankur, 13 Nov 2026): "Customer login" list — app customers by their latest login (IST).
function loginTime(value: any): string { const d = value?.toDate?.() || (value instanceof Date ? value : null); return d ? d.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }) : '—'; }
export function appLoginRows<T extends { uid?: string; lastLoginAt?: any }>(rows: T[]): T[] {
  const ms = (v: any) => v?.toMillis?.() ?? (v instanceof Date ? v.getTime() : 0);
  return rows.filter(c => !!c.uid && c.uid !== 'owner_manual_entry' && !!c.lastLoginAt).sort((a, b) => ms(b.lastLoginAt) - ms(a.lastLoginAt));
}

const phoneKey = (p?: string) => String(p || '').replace(/\D/g, '').slice(-10);
const orderDay = (o: Order) => dateKey(o.createdAt) || o.dispatchDate || '';
const orderAmount = (o: Order) => Number(o.customerTotal ?? o.totalAmount ?? 0) || 0;
const isPaid = (o: Order) => o.paymentStatus === 'payment_verified';
const rupee = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
const STATUS_LABEL: Record<string, string> = { pending: 'Pending', confirmed: 'Confirmed', in_packing: 'Packing', dispatched: 'Dispatched', delivered: 'Delivered', cancelled: 'Cancelled' };

/** Per-customer ledger built from the owner's live orders (grouped by last 10 digits of the mobile). */
type Ledger = { key: string; name: string; phone: string; orders: Order[]; kg: number; amount: number; paid: number; due: number; first: string; last: string };
export function buildLedgers(orders: Order[]): Map<string, Ledger> {
  const map = new Map<string, Ledger>();
  for (const o of orders) {
    if (o.isTrash || o.testOrder || o.status === 'cancelled') continue;
    const key = phoneKey(o.customerPhone); if (!key) continue;
    const l = map.get(key) || { key, name: o.customerName || 'Customer', phone: o.customerPhone, orders: [], kg: 0, amount: 0, paid: 0, due: 0, first: '', last: '' };
    const amt = orderAmount(o); const day = orderDay(o);
    l.orders.push(o); l.kg += Number(o.quantityKg) || 0; l.amount += amt;
    if (isPaid(o)) l.paid += Number(o.verifiedReceivedAmount ?? amt) || 0; else l.due += amt;
    if (day && (!l.last || day > l.last)) { l.last = day; l.name = o.customerName || l.name; }
    if (day && (!l.first || day < l.first)) l.first = day;
    map.set(key, l);
  }
  map.forEach(l => l.orders.sort((a, b) => orderDay(b).localeCompare(orderDay(a))));
  return map;
}

function CustomerLedger({ l, onBack }: { l: Ledger; onBack: () => void }) {
  return <section className="soft-card space-y-3" aria-label="Customer ledger">
    <button type="button" className="soft-button secondary-button" onClick={onBack}>← सभी ग्राहक</button>
    <div><h2 className="text-xl font-black">{l.name}</h2><p>{l.phone}</p><small>पहला ऑर्डर {l.first || '—'} · आखिरी {l.last || '—'}</small></div>
    <div className="grid grid-cols-2 gap-2 text-center">
      {([['कुल ऑर्डर', String(l.orders.length)], ['कुल किलो', `${l.kg} KG`], ['कुल रकम', rupee(l.amount)], ['मिला (Paid)', rupee(l.paid)]] as const).map(([a, b]) => <div className="soft-card-inset p-3" key={a}><small>{a}</small><div className="font-black">{b}</div></div>)}
    </div>
    <div className={`soft-card-inset p-3 text-center font-black ${l.due > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{l.due > 0 ? `बाकी (Due): ${rupee(l.due)}` : 'कोई बाकी नहीं ✓'}</div>
    <h3 className="font-black">ऑर्डर का पूरा हिसाब</h3>
    <ul className="space-y-2">{l.orders.map(o => <li className="soft-card-inset p-3" key={o.orderId}>
      <div className="flex justify-between gap-2"><b>#{o.orderId.slice(-4)} · {orderDay(o) || '—'}</b><span className={`status-chip ${isPaid(o) ? 'status-delivered' : 'status-pending'}`}>{isPaid(o) ? 'Paid' : 'Due'}</span></div>
      <p>{o.quantityKg} KG · {rupee(orderAmount(o))} · {STATUS_LABEL[o.status] || o.status}{o.district ? ` · ${o.district}` : ''}</p>
    </li>)}</ul>
  </section>;
}

export function CustomersView({ user, orders = [] }: { user: User | null; orders?: Order[] }) {
  const [rows, setRows] = useState<CustomerRow[]>([]); const [search, setSearch] = useState('');
  const [range, setRange] = useState('all'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [view, setView] = useState<'all' | 'login'>('all');
  useEffect(() => {
    if (!isUserAdmin(user)) return;
    return onSnapshot(query(collection(db, 'customers'), orderBy('lastLoginAt', 'desc')), snap => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerRow))));
  }, [user]);
  const ledgers = useMemo(() => buildLedgers(orders), [orders]);
  const loginRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return appLoginRows(rows).filter(c => !term || `${c.name || ''} ${c.phone || c.id}`.toLowerCase().includes(term));
  }, [rows, search]);
  // Customers from the directory plus everyone who placed an order (owner-created and guest orders included).
  const allRows = useMemo(() => {
    const seen = new Set(rows.map(c => phoneKey(c.phone || c.id)));
    const extra: CustomerRow[] = [];
    ledgers.forEach(l => { if (!seen.has(l.key)) extra.push({ id: l.key, name: l.name, phone: l.phone, orderCount: l.orders.length, tag: l.orders.some(o => o.status === 'delivered') ? 'Old' : 'New' }); });
    return [...rows, ...extra];
  }, [rows, ledgers]);
  const filtered = useMemo(() => {
    const today = istDateKey(); const cutoff = range === 'today' ? today : range === '7' || range === '30' ? istDateKey(new Date(Date.now() - Number(range) * 86400000)) : '';
    const term = search.trim().toLowerCase();
    return allRows.filter(c => {
      const l = ledgers.get(phoneKey(c.phone || c.id));
      const day = l?.last || dateKey(c.lastLoginAt);
      const inDate = range === 'custom' ? (!from || day >= from) && (!to || day <= to) : !cutoff || day >= cutoff;
      return inDate && (!term || `${c.name || ''} ${c.phone || c.id} ${c.tag || ''}`.toLowerCase().includes(term));
    });
  }, [allRows, ledgers, search, range, from, to]);
  if (!isUserAdmin(user)) return null;
  const open = openKey ? ledgers.get(openKey) : undefined;
  if (open) return <CustomerLedger l={open} onBack={() => setOpenKey(null)} />;
  const counts = allRows.reduce((a, c) => ({ total: a.total + 1, new: a.new + (c.tag !== 'Old' ? 1 : 0), old: a.old + (c.tag === 'Old' ? 1 : 0) }), { total: 0, new: 0, old: 0 });
  return <section className="soft-card space-y-4" aria-label="Customers">
    <h2 className="text-xl font-black">Customers</h2>
    <div className="flex gap-2" role="tablist" aria-label="Customer views">
      <button type="button" role="tab" className="soft-button secondary-button" aria-pressed={view === 'all'} aria-selected={view === 'all'} onClick={() => setView('all')}>सभी ग्राहक</button>
      <button type="button" role="tab" data-customer-login-tab className="soft-button secondary-button" aria-pressed={view === 'login'} aria-selected={view === 'login'} onClick={() => setView('login')}>Customer login ({appLoginRows(rows).length})</button>
    </div>
    {view === 'login' ? <>
      <input className="w-full rounded-xl p-3" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or mobile" aria-label="Search customer logins" />
      <p className="text-sm">ऐप में लॉगिन किए ग्राहक, सबसे हाल का लॉगिन सबसे ऊपर।</p>
      {loginRows.length === 0 ? <p className="soft-card-inset p-4 text-center text-sm font-bold">अभी कोई ग्राहक लॉगिन नहीं।</p> :
      <ul className="space-y-2" aria-label="Customer logins">{loginRows.map(c => {
        const l = ledgers.get(phoneKey(c.phone || c.id));
        return <li key={c.id}><button type="button" className="soft-card-inset p-3 w-full text-left" disabled={!l} onClick={() => l && setOpenKey(l.key)}>
          <div className="flex justify-between gap-2"><b>{c.name || l?.name || 'Customer'}</b><span className={`status-chip ${dateKey(c.lastLoginAt) === istDateKey() ? 'status-delivered' : 'status-pending'}`}>{dateKey(c.lastLoginAt) === istDateKey() ? 'आज' : (c.tag || 'New')}</span></div>
          <p>{c.phone || c.id} · {l ? l.orders.length : (c.orderCount || 0)} orders</p>
          <small>Last login: {loginTime(c.lastLoginAt)} · पहला: {dateKey(c.firstLoginAt) || '—'}</small>
        </button></li>;
      })}</ul>}
    </> : <>
    <div className="grid grid-cols-3 gap-2 text-center">{[['Total', counts.total], ['New', counts.new], ['Old', counts.old]].map(([label, count]) => <div className="soft-card-inset p-3" key={label}><b>{label}</b><div>{count}</div></div>)}</div>
    <input className="w-full rounded-xl p-3" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or mobile" aria-label="Search customers" />
    <div className="flex flex-wrap gap-2">{[['all', 'सभी'], ['today', 'Today'], ['7', '7 days'], ['30', '30 days'], ['custom', 'Custom']].map(([v, l]) => <button className="soft-button secondary-button" key={v} onClick={() => setRange(v)} aria-pressed={range === v}>{l}</button>)}</div>
    {range === 'custom' && <div className="flex gap-2"><input aria-label="From date" type="date" value={from} onChange={e => setFrom(e.target.value)} /><input aria-label="To date" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>}
    <ul className="space-y-2">{filtered.map(c => {
      const l = ledgers.get(phoneKey(c.phone || c.id));
      return <li key={c.id}><button type="button" className="soft-card-inset p-3 w-full text-left" disabled={!l} onClick={() => l && setOpenKey(l.key)}>
        <div className="flex justify-between gap-2"><b>{c.name || l?.name || 'Customer'}</b><span className={`status-chip ${c.tag === 'Old' ? 'status-delivered' : 'status-pending'}`}>{c.tag || 'New'}</span></div>
        <p>{c.phone || c.id} · {l ? l.orders.length : (c.orderCount || 0)} orders{l ? ` · ${l.kg} KG · ${rupee(l.amount)}` : ''}</p>
        {l && l.due > 0 && <p className="font-bold text-rose-700">बाकी: {rupee(l.due)}</p>}
        <small>Last: {l?.last || dateKey(c.lastLoginAt) || '—'}{l ? ' · पूरा हिसाब देखें ›' : ''}</small>
      </button></li>;
    })}</ul>
    </>}
  </section>;
}
