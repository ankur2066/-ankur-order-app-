import React, { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db, isUserAdmin } from '../../firebase';
import { istDateKey } from '../../utils/dispatchSchedule';
import type { User } from 'firebase/auth';

type CustomerRow = { id: string; uid?: string; name?: string; phone?: string; firstLoginAt?: any; lastLoginAt?: any; orderCount?: number; completedOrders?: number; tag?: 'New' | 'Old' };
function dateKey(value: any): string { const d = value?.toDate?.() || (value instanceof Date ? value : null); return d ? istDateKey(d) : ''; }
export function CustomersView({ user }: { user: User | null }) {
  const [rows, setRows] = useState<CustomerRow[]>([]); const [search, setSearch] = useState('');
  const [range, setRange] = useState('7'); const [from, setFrom] = useState(''); const [to, setTo] = useState('');
  useEffect(() => {
    if (!isUserAdmin(user)) return;
    return onSnapshot(query(collection(db, 'customers'), orderBy('lastLoginAt', 'desc')), snap => setRows(snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerRow))));
  }, [user]);
  const filtered = useMemo(() => {
    const today = istDateKey(); const cutoff = range === 'today' ? today : range === '7' || range === '30' ? istDateKey(new Date(Date.now() - Number(range) * 86400000)) : '';
    const term = search.trim().toLowerCase();
    return rows.filter(c => { const day = dateKey(c.lastLoginAt); const inDate = range === 'custom' ? (!from || day >= from) && (!to || day <= to) : !cutoff || day >= cutoff;
      return inDate && (!term || `${c.name || ''} ${c.phone || c.id} ${c.tag || ''}`.toLowerCase().includes(term)); });
  }, [rows, search, range, from, to]);
  if (!isUserAdmin(user)) return null;
  const counts = rows.reduce((a, c) => ({ total: a.total + 1, new: a.new + (c.tag !== 'Old' ? 1 : 0), old: a.old + (c.tag === 'Old' ? 1 : 0) }), { total: 0, new: 0, old: 0 });
  return <section className="soft-card space-y-4" aria-label="Customers">
    <h2 className="text-xl font-black">Customers</h2>
    <div className="grid grid-cols-3 gap-2 text-center">{[['Total', counts.total], ['New', counts.new], ['Old', counts.old]].map(([label, count]) => <div className="soft-card-inset p-3" key={label}><b>{label}</b><div>{count}</div></div>)}</div>
    <input className="w-full rounded-xl p-3" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or mobile" aria-label="Search customers" />
    <div className="flex flex-wrap gap-2">{[['today','Today'],['7','7 days'],['30','30 days'],['custom','Custom']].map(([v,l]) => <button className="soft-button secondary-button" key={v} onClick={() => setRange(v)} aria-pressed={range === v}>{l}</button>)}</div>
    {range === 'custom' && <div className="flex gap-2"><input aria-label="From date" type="date" value={from} onChange={e => setFrom(e.target.value)} /><input aria-label="To date" type="date" value={to} onChange={e => setTo(e.target.value)} /></div>}
    <ul className="space-y-2">{filtered.map(c => <li className="soft-card-inset p-3" key={c.id}><div className="flex justify-between gap-2"><b>{c.name || 'Customer'}</b><span className={`status-chip ${c.tag === 'Old' ? 'status-delivered' : 'status-pending'}`}>{c.tag || 'New'}</span></div><p>{c.phone || c.id} · {c.orderCount || 0} orders · {c.completedOrders || 0} completed</p><small>Last seen: {dateKey(c.lastLoginAt) || '—'}</small></li>)}</ul>
  </section>;
}
