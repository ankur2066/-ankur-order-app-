import { useEffect, useState } from 'react';
import { doc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const FEATURES = [
  ['loyalty', 'Loyalty', 'Owner-managed rewards policy and points.'],
  ['catalog', 'Application Catalogue', 'Owner-approved dry ice and event catalogue.'],
  ['partner', 'Wholesale Partner', 'Wholesale pricing and partner access.'],
  ['subscriptions', 'Regular Supply', 'Recurring supply requests for owner approval.'],
  ['promotions', 'Promotions', 'Owner-approved promotional codes and offers.'],
  ['inventory', 'Inventory', 'Track owner-entered stock and SKUs.'],
  ['referral', 'Referral Share', 'Share a referral link; rewards need owner review.'],
  ['calculator', 'Ice Calculator', 'Estimate dry ice quantity for an event.'],
  ['video', 'Video Idea Builder', 'Create a prompt for a business video.'],
  ['reports', 'Reports Hub', 'View order and delivery summaries.'],
  ['faq', 'FAQ / How-to', 'Read order and dry ice handling guidance.'],
  ['rates', 'Rate Card', 'Show owner-entered rates to customers.'],
  ['support', 'Support Hub', 'Contact the owner for order support.'],
  ['service-area', 'Service Area', 'Show approved delivery and bus routes.'],
] as const;

type FeatureKey = (typeof FEATURES)[number][0];
type FeatureFlags = Record<FeatureKey, boolean>;
const OFF: FeatureFlags = Object.fromEntries(FEATURES.map(([key]) => [key, false])) as FeatureFlags;

export function FeatureSuiteSettings() {
  const [flags, setFlags] = useState<FeatureFlags>(OFF);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => onSnapshot(doc(db, 'settings', 'featureSuite'), snapshot => {
    const source = snapshot.data()?.features || {};
    setFlags(Object.fromEntries(FEATURES.map(([key]) => [key, source[key] === true])) as FeatureFlags);
    setLoaded(true);
  }, () => { setFlags(OFF); setLoaded(true); setMessage('Settings could not be read. Check Firebase Rules.'); }), []);

  // Optimistic toggle: flip at once, write only this one key, never lock the other switches.
  // Firestore keeps the write queued offline; we do not wait for the server ack (it can hang).
  const setFlag = (key: FeatureKey, checked: boolean) => {
    const label = FEATURES.find(([id]) => id === key)?.[1];
    setFlags(prev => ({ ...prev, [key]: checked }));
    setMessage(`${label} ${checked ? 'ON' : 'OFF'}`);
    setDoc(doc(db, 'settings', 'featureSuite'), { features: { [key]: checked }, updatedAt: serverTimestamp() }, { merge: true })
      .catch(() => {
        setFlags(prev => ({ ...prev, [key]: !checked }));
        setMessage(`${label}: save nahi hua. Owner access / Firestore rules check karein.`);
      });
  };

  return <section className="feature-controls soft-card space-y-3" aria-labelledby="feature-settings-title">
    <h2 id="feature-settings-title" className="font-black">Feature controls</h2>
    <p className="text-sm t-sub">All fourteen optional features start off. Enter approved rates, codes, stock, SKUs and policies in each feature panel before enabling it.</p>
    {!loaded ? <p role="status">Loading settings…</p> : <div className="space-y-2">{FEATURES.map(([key, label, description]) => <label key={key} className="feature-toggle-row flex min-h-14 items-center justify-between gap-3 rounded-2xl p-3">
      <span><b className="block">{label}</b><small className="block">{description}</small></span>
      <span className="flex items-center gap-2"><b className="text-sm" aria-hidden="true">{flags[key] ? 'ON' : 'OFF'}</b>
      <input aria-label={`Enable ${label}`} type="checkbox" role="switch" checked={flags[key]} onChange={event => setFlag(key, event.target.checked)} /></span>
    </label>)}</div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
