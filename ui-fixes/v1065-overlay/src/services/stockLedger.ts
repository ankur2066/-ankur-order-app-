/**
 * v1.0.75 stock ledger (Spark: client Firestore only, no Cloud Functions).
 *  stockLedger/{auto-id}: { type: 'in'|'out', kg, note?, createdBy (uid), createdByName, createdAt }
 *  stockAccess/members:   { emails: [up to 4 lower-case Google emails], updatedAt } (owner-written)
 * Rules allow create + read only; update/delete are denied for everyone (owner included).
 */
import { addDoc, collection, doc, onSnapshot, orderBy, query, serverTimestamp, writeBatch } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from '../firebase';
import { nextStockAccessEmails, normalizeStockEmail, validateStockEntry, type StockEntry } from '../utils/stockLedger';

export function subscribeStockLedger(onRows: (rows: StockEntry[]) => void, onError?: (e: any) => void): () => void {
  return onSnapshot(query(collection(db, 'stockLedger'), orderBy('createdAt', 'desc')), (snap) => {
    onRows(snap.docs.map((d) => ({ id: d.id, ...(d.data({ serverTimestamps: 'estimate' }) as Omit<StockEntry, 'id'>) })));
  }, (error) => onError?.(error));
}

export async function addStockEntry(user: User, type: string, kgText: string | number, note = ''): Promise<void> {
  const check = validateStockEntry(type, kgText, note);
  if (!check.ok) { const bad = check as { hi: string; en: string }; throw new Error(`${bad.hi} / ${bad.en}`); }
  const good = check as { type: string; kg: number; note: string };
  const name = (user.displayName || user.email || 'User').slice(0, 100);
  await addDoc(collection(db, 'stockLedger'), {
    type: good.type, kg: good.kg, ...(good.note ? { note: good.note } : {}),
    createdBy: user.uid, createdByName: name, createdAt: serverTimestamp(),
  });
}

export function subscribeStockAccess(onEmails: (emails: string[]) => void, onError?: (e: any) => void): () => void {
  return onSnapshot(doc(db, 'stockAccess', 'members'), (snap) => {
    const emails = snap.exists() ? snap.data()?.emails : [];
    onEmails(Array.isArray(emails) ? emails.map(normalizeStockEmail) : []);
  }, (error) => onError?.(error));
}

/** Owner switch: flag on the staff doc + the rules' access list, in one batch. */
export async function setStockAccess(member: { id: string; email: string }, enable: boolean, current: string[]): Promise<void> {
  const next = nextStockAccessEmails(current, member.email, enable);
  if (!next.ok) { const bad = next as { hi: string; en: string }; throw new Error(`${bad.hi} / ${bad.en}`); }
  const emails = (next as { emails: string[] }).emails;
  const batch = writeBatch(db);
  batch.set(doc(db, 'staffMembers', member.id), { stockAccess: enable, updatedAt: serverTimestamp() }, { merge: true });
  batch.set(doc(db, 'stockAccess', 'members'), { emails, updatedAt: serverTimestamp() });
  await batch.commit();
}
