import React, { useEffect, useState } from 'react';
import primaryUpiQr from '../assets/primary-upi.svg';
import { BACKUP_UPI_ID, OTHER_UPI_ID, PRIMARY_UPI_ID } from '../config/businessConfig';
import { backupUpiUri, makePrimaryUpiQr, otherUpiUri, primaryUpiUri } from '../utils/upi';

export function PaymentOptions({ amount, orderId, isHindi = true }: { amount: number; orderId?: string; isHindi?: boolean }) {
  const [qrFallback, setQrFallback] = useState('');
  const [qrImageFailed, setQrImageFailed] = useState(false);
  const [copied, setCopied] = useState<'primary' | 'backup' | 'other' | ''>('');
  useEffect(() => { let live = true; void makePrimaryUpiQr(amount, orderId).then(value => { if (live) setQrFallback(value); }).catch(() => {}); return () => { live = false; }; }, [amount, orderId]);
  const copy = async (value: string, which: 'primary' | 'backup' | 'other') => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(which);
      window.setTimeout(() => setCopied(''), 1800);
    } catch {
      setCopied('');
    }
  };
  const openPay = (uri: string) => { window.location.href = uri; };

  return <section aria-label={isHindi ? 'UPI भुगतान' : 'UPI payment'} className="payment-options space-y-3 rounded-2xl p-4">
    <h3 className="font-bold">{isHindi ? 'UPI से भुगतान' : 'Pay by UPI'}</h3>
    {/* v1.0.69 (Ankur, 12 Nov 2026): always show the owner's own Paytm QR (same payload as his printed Paytm code); the generated amount QR is only a fallback if the image fails to load. */}
    <img
      src={qrImageFailed && qrFallback ? qrFallback : primaryUpiQr}
      alt={`UPI QR for ${PRIMARY_UPI_ID}`}
      className="mx-auto h-36 w-36 rounded-xl bg-white p-2"
      onError={() => { setQrImageFailed(true); if (!qrFallback) void makePrimaryUpiQr(amount, orderId).then(setQrFallback).catch(() => {}); }}
    />
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button type="button" className="soft-button primary-button" onClick={() => openPay(primaryUpiUri(amount, orderId))}>
        {isHindi ? 'UPI ऐप से भुगतान करें' : 'Pay with UPI app'}
      </button>
      <span className="font-mono text-sm">{PRIMARY_UPI_ID}</span>
      <button type="button" className="soft-button secondary-button" aria-label="Copy UPI ID" onClick={() => void copy(PRIMARY_UPI_ID, 'primary')}>
        {copied === 'primary' ? (isHindi ? 'कॉपी हुआ' : 'Copied') : 'Copy UPI ID'}
      </button>
    </div>
    {/* v1.0.75 (Ankur, 13 Nov 2026): if payment on the primary UPI fails, pay the same amount on the second UPI. */}
    <div className="other-upi rounded-xl p-3" data-other-upi>
      <p className="text-sm">{isHindi ? 'ऊपर वाली UPI पर भुगतान न हो तो:' : 'If payment on the UPI above fails:'}</p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
        <button type="button" className="soft-button primary-button" onClick={() => openPay(otherUpiUri(amount, orderId))}>
          {isHindi ? 'दूसरी UPI से भरें' : 'Pay with other UPI'}
        </button>
        <span className="font-mono text-sm">{OTHER_UPI_ID}</span>
        <button type="button" className="soft-button secondary-button" aria-label={isHindi ? 'दूसरी UPI ID कॉपी करें' : 'Copy other UPI ID'} onClick={() => void copy(OTHER_UPI_ID, 'other')}>
          {copied === 'other' ? (isHindi ? 'कॉपी हुआ' : 'Copied') : (isHindi ? 'कॉपी' : 'Copy')}
        </button>
      </div>
    </div>
    <div className="backup-upi rounded-xl p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">QR se payment na ho to is UPI ID par bhejein: <strong className="font-mono">{BACKUP_UPI_ID}</strong></p>
        <button type="button" className="soft-button secondary-button" onClick={() => void copy(BACKUP_UPI_ID, 'backup')}>
          {copied === 'backup' ? 'कॉपी हुआ' : 'Copy'}
        </button>
      </div>
      <button type="button" className="soft-button secondary-button mt-2" onClick={() => openPay(backupUpiUri(amount, orderId))}>
        Dusre UPI se pay karein
      </button>
    </div>
    <p className="payment-pending-note text-xs">{isHindi ? 'भुगतान की पुष्टि मालिक बैंक/UPI देखकर ही करेगा। पुष्टि तक स्थिति Verification pending रहेगी।' : 'Payment remains verification pending until the owner verifies it.'}</p>
  </section>;
}
