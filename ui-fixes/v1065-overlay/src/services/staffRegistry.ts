import { arrayRemove, collection, doc, onSnapshot, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '../firebase';
import { customerDocId } from './customers';

export interface StaffMember { id: string; phone: string; name: string; email: string; active: boolean; role: 'STAFF'; /** v1.0.75 stock ledger switch */ stockAccess?: boolean }

export function subscribeStaffMembers(onChange: (rows: StaffMember[]) => void, onError?: (e: unknown) => void): () => void {
  return onSnapshot(collection(db, 'staffMembers'), (snap) => {
    onChange(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<StaffMember, 'id'>) })).sort((a, b) => a.name.localeCompare(b.name)));
  }, (error) => onError?.(error));
}

/**
 * Owner adds/updates a staff member by mobile. The Google email is the
 * identity Firebase Auth verifies; staffEmails/{email} lets rules check it on Spark.
 */
export async function saveStaffMember(input: { phone: string; name: string; email: string; active: boolean; stockAccess?: boolean }, previousEmail?: string): Promise<void> {
  const phone = customerDocId(input.phone);
  const email = input.email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Valid Google email required');
  const batch = writeBatch(db);
  batch.set(doc(db, 'staffMembers', phone), { phone, name: input.name.trim().slice(0, 100), email, active: input.active, role: 'STAFF', ...(typeof input.stockAccess === 'boolean' ? { stockAccess: input.stockAccess } : {}), updatedAt: serverTimestamp() });
  batch.set(doc(db, 'staffEmails', email), { phone, name: input.name.trim().slice(0, 100), active: input.active, role: 'STAFF', updatedAt: serverTimestamp() });
  if (previousEmail && previousEmail.toLowerCase() !== email) batch.delete(doc(db, 'staffEmails', previousEmail.toLowerCase()));
  await batch.commit();
}

export async function removeStaffMember(member: StaffMember): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(doc(db, 'staffMembers', member.id));
  if (member.email) batch.delete(doc(db, 'staffEmails', member.email.toLowerCase()));
  // v1.0.75: a removed staff member also leaves the stock ledger access list.
  if (member.email && member.stockAccess) batch.set(doc(db, 'stockAccess', 'members'), { emails: arrayRemove(member.email.toLowerCase()), updatedAt: serverTimestamp() }, { merge: true });
  await batch.commit();
}

