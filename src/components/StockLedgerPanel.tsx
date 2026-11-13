import React, { useEffect, useMemo, useState } from 'react';
import type { User } from 'firebase/auth';
import { useLanguage } from '../context/LanguageContext';
import { addStockEntry, subscribeStockLedger } from '../services/stockLedger';
import { reverseStockEntry, stockTotals, validateStockEntry, withRunningBalance, type StockEntry, type StockEntryType } from '../utils/stockLedger';

/**
 * v1.0.75 (Ankur, 13 Nov 2026): simple stock ledger in KG (Godown / staff).
 * Add IN or OUT; nobody can edit or delete. Corrections = a reverse entry.
 * hideWhenDenied: staff not switched on by the owner see nothing.
 */
export function StockLedgerPanel({ user, hideWhenDenied = false }: { user: User | null; hideWhenDenied?: boolean }) {
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [rows, setRows] = useState<StockEntry[]>([]);
  const [denied, setDenied] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [type, setType] = useState<StockEntryType>('in');
  const [kg, setKg] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    return subscribeStockLedger((list) => { setRows(list); setDenied(false); setLoadError(''); }, (e) => {
      if (String(e?.code || '').includes('permission')) setDenied(true);
      else setLoadError(hi ? 'स्टॉक लोड नहीं हुआ।' : 'Stock could not load.');
    });
  }, [user?.uid]);

  const ledger = useMemo(() => withRunningBalance(rows), [rows]);
  const totals = useMemo(() => stockTotals(rows), [rows]);

  if (!user || (denied && hideWhenDenied)) return null;
  if (denied) return <section className="soft-card p-3 text-sm" aria-label="Stock">{hi ? 'स्टॉक की अनुमति नहीं है (Firebase rules publish करें)।' : 'No stock permission (publish the Firebase rules).'}</section>;

  const save = async (entryType: StockEntryType, entryKg: string | number, entryNote: string) => {
    const check = validateStockEntry(entryType, entryKg, entryNote);
    if (!check.ok) { const bad = check as { hi: string; en: string }; setMessage(hi ? bad.hi : bad.en); return; }
    const good = check as { type: StockEntryType; kg: number; note: string };
    setBusy(true); setMessage('');
    try {
      await addStockEntry(user!, good.type, good.kg, good.note);
      setKg(''); setNote('');
      setMessage(hi ? 'एंट्री सेव हुई।' : 'Entry saved.');
    } catch (e: any) {
      setMessage(String(e?.code || '').includes('permission') ? (hi ? 'अनुमति नहीं (permission-denied)।' : 'Not allowed (permission-denied).') : (hi ? 'एंट्री सेव नहीं हुई।' : 'Entry not saved.'));
    } finally { setBusy(false); }
  };
  const reverse = (entry: StockEntry) => {
    const fix = reverseStockEntry(entry);
    const ok = window.confirm(hi ? `गलत एंट्री ठीक करने के लिए ${fix.kg} KG ${fix.type.toUpperCase()} की उल्टी एंट्री जोड़ें?` : `Add a reverse ${fix.type.toUpperCase()} entry of ${fix.kg} KG to correct this?`);
    if (ok) void save(fix.type, fix.kg, fix.note);
  };
  const when = (t: any) => {
    const ms = t?.toMillis ? t.toMillis() : (typeof t?.seconds === 'number' ? t.seconds * 1000 : NaN);
    return Number.isFinite(ms) ? new Date(ms).toLocaleString(hi ? 'hi-IN' : 'en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '…';
  };

  return <section className="soft-card space-y-3 p-3" aria-label="Stock ledger" data-stock-ledger>
    <div className="flex items-center justify-between gap-2">
      <h2 className="text-lg font-black">{hi ? 'स्टॉक (KG)' : 'Stock (KG)'}</h2>
      <span className="text-2xl font-black tabular-nums" data-stock-balance>{totals.balance} KG</span>
    </div>
    <p className="text-xs t-sub">{hi ? `कुल IN ${totals.inKg} KG · कुल OUT ${totals.outKg} KG · एंट्री बदली या हटाई नहीं जा सकती; गलती हो तो उल्टी एंट्री करें।` : `Total IN ${totals.inKg} KG · Total OUT ${totals.outKg} KG · Entries cannot be edited or deleted; fix a mistake with a reverse entry.`}</p>
    <div className="flex flex-wrap items-center gap-2">
      <div role="radiogroup" aria-label="IN / OUT" className="flex gap-1">
        {(['in', 'out'] as StockEntryType[]).map((t) => <button key={t} type="button" role="radio" aria-checked={type === t}
          className={`soft-button ${type === t ? 'primary-button' : 'secondary-button'}`} onClick={() => setType(t)}>
          {t === 'in' ? (hi ? 'IN (आया)' : 'IN') : (hi ? 'OUT (गया)' : 'OUT')}</button>)}
      </div>
      <input aria-label="KG" inputMode="decimal" className="delivery-select w-24 rounded-xl p-2" placeholder="KG" value={kg} onChange={(e) => setKg(e.target.value)} />
      <input aria-label={hi ? 'नोट' : 'Note'} maxLength={200} className="delivery-select min-w-[8rem] flex-1 rounded-xl p-2" placeholder={hi ? 'नोट (वैकल्पिक)' : 'Note (optional)'} value={note} onChange={(e) => setNote(e.target.value)} />
      <button type="button" className="soft-button primary-button" disabled={busy || !kg} onClick={() => void save(type, kg, note)}>{busy ? '…' : (hi ? 'जोड़ें' : 'Add')}</button>
    </div>
    {message && <p role="status" className="text-sm font-bold">{message}</p>}
    {loadError && <p role="alert" className="text-sm">{loadError}</p>}
    {ledger.length === 0 ? <p className="soft-card-inset p-3 text-center text-sm">{hi ? 'अभी कोई एंट्री नहीं।' : 'No entries yet.'}</p> :
      <ul className="space-y-1">{ledger.map((e) => <li key={e.id} className="feature-toggle-row flex flex-wrap items-center justify-between gap-2 rounded-xl p-2 text-sm">
        <span><b className={e.type === 'in' ? 'text-emerald-700' : 'text-rose-700'}>{e.type === 'in' ? '+' : '−'}{e.kg} KG {e.type.toUpperCase()}</b>
          <small className="block">{when(e.createdAt)} · {e.createdByName || '—'}{e.note ? ` · ${e.note}` : ''}</small></span>
        <span className="flex items-center gap-2"><span className="tabular-nums font-bold">= {e.balanceAfter} KG</span>
          <button type="button" className="soft-button secondary-button text-xs" disabled={busy} onClick={() => reverse(e)}>{hi ? 'उल्टी एंट्री' : 'Reverse'}</button></span>
      </li>)}</ul>}
  </section>;
}

export default StockLedgerPanel;
