import React, { useEffect, useState } from 'react';
import { removeStaffMember, saveStaffMember, subscribeStaffMembers, type StaffMember } from '../../services/staffRegistry';
import { setStockAccess, subscribeStockAccess } from '../../services/stockLedger';
import { STOCK_MAX_ACCOUNTS } from '../../utils/stockLedger';

/**
 * Owner-only Staff screen (roles OWNER / STAFF). Staff are added by mobile;
 * the Google email is how Firebase verifies them when they sign in.
 * Staff only ever see the Packing screen (no rates, totals, payment or customers).
 */
export function StaffMembersManager() {
  const [rows, setRows] = useState<StaffMember[]>([]);
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => subscribeStaffMembers(setRows, () => setMessage('Staff list load nahi hui.')), []);
  // v1.0.75: stock ledger access list (owner login + up to 4 switched on = 5 accounts).
  const [stockEmails, setStockEmails] = useState<string[]>([]);
  useEffect(() => subscribeStockAccess(setStockEmails, () => setStockEmails([])), []);
  const toggleStock = async (row: StaffMember) => {
    const on = stockEmails.includes(row.email.toLowerCase());
    setBusy(true); setMessage('');
    try { await setStockAccess(row, !on, stockEmails); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Stock switch update nahi hua.'); }
    finally { setBusy(false); }
  };

  const add = async () => {
    setBusy(true); setMessage('');
    try { await saveStaffMember({ phone, name, email, active: true }); setPhone(''); setName(''); setEmail(''); setMessage('Staff add ho gaya.'); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Staff add nahi hua.'); }
    finally { setBusy(false); }
  };
  const toggle = async (row: StaffMember) => {
    setBusy(true);
    try { await saveStaffMember({ phone: row.phone, name: row.name, email: row.email, active: !row.active, stockAccess: row.stockAccess }, row.email); }
    catch { setMessage('Update nahi hua.'); }
    finally { setBusy(false); }
  };
  const remove = async (row: StaffMember) => {
    if (!window.confirm(`${row.name} ko staff se hatana hai?`)) return;
    setBusy(true);
    try { await removeStaffMember(row); } catch { setMessage('Remove nahi hua.'); } finally { setBusy(false); }
  };

  return <section className="soft-card space-y-3" aria-labelledby="staff-members-title">
    <h2 id="staff-members-title" className="text-lg font-black">Staff</h2>
    <p className="text-sm t-sub">Staff sirf Packing screen dekhega: rate, total, payment, UPI, customer list aur reports nahi.</p>
    <div className="grid gap-2 sm:grid-cols-3">
      <input aria-label="Staff mobile" inputMode="tel" className="delivery-select rounded-xl p-2" placeholder="Mobile (10 digit)" value={phone} onChange={(event) => setPhone(event.target.value)} />
      <input aria-label="Staff name" className="delivery-select rounded-xl p-2" placeholder="Naam" value={name} onChange={(event) => setName(event.target.value)} />
      <input aria-label="Staff Google email" type="email" className="delivery-select rounded-xl p-2" placeholder="Google email (login)" value={email} onChange={(event) => setEmail(event.target.value)} />
    </div>
    <button type="button" className="soft-button primary-button" disabled={busy || !phone || !name || !email} onClick={() => void add()}>Add staff</button>
    <p className="text-xs t-sub" data-stock-limit>Stock (स्टॉक): owner ID hamesha on; baaki max {STOCK_MAX_ACCOUNTS - 1} ID on kar sakte hain (kul {STOCK_MAX_ACCOUNTS}). On: {stockEmails.length}/{STOCK_MAX_ACCOUNTS - 1}. Entry koi edit/delete nahi kar sakta.</p>
    <ul className="space-y-2">{rows.map((row) => <li key={row.id} className="feature-toggle-row flex flex-wrap items-center justify-between gap-2 rounded-2xl p-3">
      <span><b className="block">{row.name}</b><small className="block">{row.phone} · {row.email}</small></span>
      <span className="flex items-center gap-2">
        <label className="flex items-center gap-2 text-sm font-bold">{row.active ? 'Active' : 'Inactive'}
          <input type="checkbox" role="switch" aria-label={`${row.name} active`} checked={row.active} disabled={busy} onChange={() => void toggle(row)} />
        </label>
        <label className="flex items-center gap-2 text-sm font-bold" data-stock-switch>Stock
          <input type="checkbox" role="switch" aria-label={`${row.name} stock access`} checked={stockEmails.includes(row.email.toLowerCase())} disabled={busy} onChange={() => void toggleStock(row)} />
        </label>
        <button type="button" className="soft-button secondary-button" disabled={busy} onClick={() => void remove(row)}>Remove</button>
      </span>
    </li>)}</ul>
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}

export default StaffMembersManager;
