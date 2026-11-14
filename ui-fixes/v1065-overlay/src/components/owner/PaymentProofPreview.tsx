import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

export function PaymentProofPreview({ orderId }: { orderId: string }) {
  const [image, setImage] = useState('');
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);
  useEffect(() => {
    let active = true;
    void getDoc(doc(db, 'orders', orderId, 'paymentProof', 'latest')).then(snap => {
      if (active && snap.exists() && typeof snap.data().dataUrl === 'string') setImage(snap.data().dataUrl);
    }).catch(() => {}).finally(() => { if (active) setChecked(true); });
    return () => { active = false; };
  }, [orderId]);
  if (!checked || !image) return null;
  return <>
    <button type="button" className="soft-button secondary-button mt-1" onClick={() => setOpen(true)} aria-label={`View payment screenshot for ${orderId}`}>
      <img src={image} alt="Payment proof thumbnail" className="h-8 w-8 rounded object-cover" /> View payment proof
    </button>
    {open && <div className="fixed inset-0 z-[120] grid place-items-center bg-black/75 p-4" role="dialog" aria-modal="true" aria-label="Payment proof">
      <div className="soft-card max-h-[90vh] max-w-[min(92vw,680px)] overflow-auto p-4">
        <div className="mb-3 flex items-center justify-between gap-3"><strong>Payment proof · {orderId}</strong><button type="button" className="soft-button secondary-button" onClick={() => setOpen(false)}>Close</button></div>
        <img src={image} alt={`Full payment proof for order ${orderId}`} className="max-h-[75vh] max-w-full rounded-xl object-contain" />
      </div>
    </div>}
  </>;
}
