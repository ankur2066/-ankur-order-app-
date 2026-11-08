import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, db } from '../../firebase';

const FEATURES = [
  ['loyalty', 'Loyalty'],
  ['catalog', 'Application Catalogue'],
  ['partner', 'Wholesale Partner'],
  ['subscriptions', 'Regular Supply'],
  ['promotions', 'Promotions'],
  ['inventory', 'Inventory'],
  ['referral', 'Referral Share'],
  ['calculator', 'Ice Calculator'],
  ['video', 'Video Idea Builder'],
  ['reports', 'Reports Hub'],
  ['faq', 'FAQ / How-to'],
  ['rates', 'Rate Card'],
  ['support', 'Support Hub'],
  ['service-area', 'Service Area'],
] as const;

type FeatureKey = (typeof FEATURES)[number][0];
type FeatureFlags = Record<FeatureKey, boolean>;
const OFF: FeatureFlags = Object.fromEntries(FEATURES.map(([key]) => [key, false])) as FeatureFlags;

export function FeatureSuiteSettings() {
  const [flags, setFlags] = useState<FeatureFlags>(OFF);
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => onSnapshot(doc(db, 'settings', 'featureSuite'), snapshot => {
    const source = snapshot.data()?.features || {};
    setFlags(Object.fromEntries(FEATURES.map(([key]) => [key, source[key] === true])) as FeatureFlags);
    setLoaded(true);
  }, () => { setFlags(OFF); setLoaded(true); setMessage('Settings could not be read. Check Firebase Rules.'); }), []);

  const setFlag = async (key: FeatureKey, checked: boolean) => {
    const next = { ...flags, [key]: checked };
    setSaving(true); setMessage('');
    try {
      await httpsCallable(getFunctions(app, 'asia-southeast1'), 'ankurFeatureAction')({ action: 'featureSettings', data: { features: next } });
      setFlags(next);
      setMessage(`${FEATURES.find(([id]) => id === key)?.[1]} ${checked ? 'enabled' : 'disabled'}.`);
    } catch {
      setMessage('Could not save. Confirm the Functions deployment and owner access.');
    } finally { setSaving(false); }
  };

  return <section className="c-card bg-white text-slate-900 border b-line rounded-2xl p-4 space-y-3" style={{ color: '#0f172a', backgroundColor: '#ffffff' }} aria-labelledby="feature-settings-title">
    <h2 id="feature-settings-title" className="font-black">Feature controls</h2>
    <p className="text-sm t-sub">All fourteen optional features start off. Enter approved rates, codes, stock, SKUs and policies in each feature panel before enabling it.</p>
    {!loaded ? <p role="status">Loading settings…</p> : <div className="space-y-2">{FEATURES.map(([key, label]) => <label key={key} className="flex min-h-12 items-center justify-between gap-3 rounded-xl border b-line p-3 bg-white text-slate-900" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
      <span className="font-bold">{label}</span>
      <input aria-label={`Enable ${label}`} type="checkbox" checked={flags[key]} disabled={saving} onChange={event => void setFlag(key, event.target.checked)} />
    </label>)}</div>}
    {message && <p role="status" className="text-sm">{message}</p>}
  </section>;
}
