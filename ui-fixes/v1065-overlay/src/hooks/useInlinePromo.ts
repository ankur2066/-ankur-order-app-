import { useEffect, useRef, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../firebase';

type Details = { customerName: string; customerPhone: string; address: string; quantityKg: number; dispatchTiming: string };
type Quote = { baseTotalPaise: number; discountPaise: number; totalPaise: number; intent: string };

/** The promo form stays completely hidden until the owner enables Promotions. */
export function useInlinePromo(details: Details, userId: string) {
  const [enabled, setEnabled] = useState(false);
  const [code, setCode] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [busy, setBusy] = useState(false);
  const request = useRef(crypto.randomUUID().replaceAll('-', ''));
  const locked = useRef<string | null>(null);
  const inFlight = useRef(false);
  const version = useRef('');
  const activeUser = useRef(userId);
  activeUser.current = userId;

  useEffect(() => onSnapshot(doc(db, 'settings', 'featureSuite'), snapshot => {
    const active = snapshot.data()?.features?.promotions === true;
    setEnabled(active);
    if (!active) { setCode(''); setQuote(null); }
  }, () => { setEnabled(false); setCode(''); setQuote(null); }), []);

  const intent = JSON.stringify({ details, userId, code: code.trim().toUpperCase() });
  version.current = intent;
  const valid = quote?.intent === intent && enabled ? quote : null;
  const call = async (action: string, data: unknown) =>
    (await httpsCallable(getFunctions(app, 'asia-southeast1'), 'ankurFeatureAction')({ action, data })).data as any;

  const apply = async () => {
    if (!enabled) throw Error('Promotions are disabled by the owner.');
    const current = intent;
    if (inFlight.current) throw Error('A request is already running.');
    setBusy(true);
    try {
      const q = await call('promoQuote', { code: code.trim().toUpperCase(), quantityKg: details.quantityKg });
      if (version.current !== current) return;
      for (const key of ['baseTotalPaise', 'discountPaise', 'totalPaise']) {
        if (!Number.isSafeInteger(q[key]) || q[key] < 0) throw Error('Invalid quote');
      }
      if (q.baseTotalPaise - q.discountPaise !== q.totalPaise || q.totalPaise <= 0) throw Error('Invalid quote');
      setQuote({ ...q, intent: current });
    } catch (error) {
      if (version.current === current) setQuote(null);
      throw error;
    } finally { setBusy(false); }
  };

  const book = async () => {
    if (!enabled) throw Error('Promotions are disabled by the owner.');
    if (inFlight.current) throw Error('A request is already running.');
    if (locked.current && locked.current !== intent) throw Error('Retry with the original booking details and code.');
    if (!valid) throw Error('Apply the promo code again and review the updated bill.');
    inFlight.current = true; locked.current = intent; setBusy(true);
    try {
      const expectedUser = userId;
      const result = await call('promoBooking', {
        ...details, code: code.trim().toUpperCase(), requestId: request.current,
        expectedTotalPaise: valid.totalPaise, expectedBaseTotalPaise: valid.baseTotalPaise,
      });
      if (activeUser.current !== expectedUser) throw Error('Account changed while booking.');
      if (!/^ADI-\d{8}-[A-F0-9]{8}$/.test(result.orderId) || !/^\d{6}$/.test(result.trackingPin) ||
          !Number.isSafeInteger(Math.round(result.totalAmount * 100)) || result.totalAmount <= 0 || result.totalAmount > 99000) {
        throw Error('Invalid booking response');
      }
      return result;
    } finally { inFlight.current = false; setBusy(false); }
  };
  return { enabled, code, setCode, quote: valid, busy, apply, book };
}
