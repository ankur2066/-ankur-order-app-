import { doc, getDoc, increment, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function customerDocId(phone: string): string {
  const digits = phone.replace(/\D/g, '').slice(-10);
  if (digits.length !== 10) throw new Error('A valid 10-digit mobile number is required');
  return `+91${digits}`;
}

/**
 * Rules allow a customer to read only their OWN customers/{+91mobile} document;
 * a read of a document that does not exist yet is refused (resource == null),
 * so a refused read is treated as "no record yet" and the create path is used.
 */
async function ownRecordExists(ref: ReturnType<typeof doc>): Promise<boolean> {
  try { return (await getDoc(ref)).exists(); } catch { return false; }
}

/** No customer writes happen until the order itself has been acknowledged. */
export async function upsertCustomerLogin(uid: string, name: string, phone: string): Promise<void> {
  const id = customerDocId(phone); const ref = doc(db, 'customers', id); const exists = await ownRecordExists(ref);
  await setDoc(ref, { uid, name: name.trim().slice(0, 100), phone: id, ...(exists ? {} : { firstLoginAt: serverTimestamp(), orderCount: 0, completedOrders: 0, tag: 'New' }), lastLoginAt: serverTimestamp() }, { merge: true });
}

export async function upsertCustomerForOrder(uid: string, name: string, phone: string): Promise<void> {
  const id = customerDocId(phone);
  const ref = doc(db, 'customers', id);
  const exists = await ownRecordExists(ref);
  await setDoc(ref, {
    uid, name: name.trim().slice(0, 100), phone: id,
    ...(exists ? {} : { firstLoginAt: serverTimestamp(), completedOrders: 0, tag: 'New' }),
    lastLoginAt: serverTimestamp(), orderCount: increment(1),
  }, { merge: true });
}
