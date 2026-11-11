import React, {useEffect, useMemo, useState} from 'react';
import {doc, onSnapshot} from 'firebase/firestore';
import {Snowflake} from 'lucide-react';
import {db} from '../../firebase';
import {useLanguage} from '../../context/LanguageContext';
import {FEATURES, type FeatureId} from './FeatureHub';

export type HomeFeature = 'booking' | FeatureId;

/** Blinkit-style order (Ankur 2026-11-11): booking first, then calculator, AI video, then the rest. */
const ORDER: FeatureId[] = ['calculator', 'video', 'rates', 'catalog', 'support', 'faq', 'service-area', 'promotions', 'loyalty', 'partner', 'subscriptions', 'referral'];
const SHORT_HI: Partial<Record<FeatureId, string>> = {calculator: 'कैलकुलेटर', video: 'AI वीडियो', rates: 'रेट कार्ड', catalog: 'कैटलॉग', support: 'सहायता', faq: 'सवाल-जवाब', 'service-area': 'सेवा क्षेत्र', promotions: 'ऑफ़र', loyalty: 'रिवार्ड', partner: 'होलसेल', subscriptions: 'नियमित सप्लाई', referral: 'रेफ़रल'};
const SHORT_EN: Partial<Record<FeatureId, string>> = {calculator: 'Calculator', video: 'AI Video', rates: 'Rate Card', catalog: 'Catalogue', support: 'Support', faq: 'FAQ', 'service-area': 'Service Area', promotions: 'Offers', loyalty: 'Rewards', partner: 'Wholesale', subscriptions: 'Regular Supply', referral: 'Referral'};

/**
 * Horizontal scrolling feature tabs at the top of customer Home. Only features the
 * owner switched on (settings/featureSuite) appear; unconfigured ones stay hidden.
 */
export const HomeFeatureRow: React.FC<{active: HomeFeature; onSelect: (id: HomeFeature) => void; role: string | null}> = ({active, onSelect, role}) => {
  const {language} = useLanguage();
  const hi = language === 'hi';
  const [flags, setFlags] = useState<Record<string, boolean>>({});
  useEffect(() => onSnapshot(doc(db, 'settings', 'featureSuite'), snap => setFlags(snap.data()?.features || {}), () => setFlags({})), []);
  const items = useMemo(() => ORDER
    .map(id => FEATURES.find(f => f.id === id))
    .filter((f): f is (typeof FEATURES)[number] => !!f && flags[f.id] === true && (!f.owner || role === 'admin')), [flags, role]);
  useEffect(() => { if (active !== 'booking' && !items.some(f => f.id === active)) onSelect('booking'); }, [active, items, onSelect]);
  const tab = (id: HomeFeature, label: string, Icon: React.ComponentType<{className?: string}>) => {
    const on = active === id;
    return <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onSelect(id)}
      className={`ankur-home-feature-tab focus-ring shrink-0 snap-start flex flex-col items-center justify-center gap-1 rounded-2xl border px-2 py-2 min-w-[76px] max-w-[92px] ${on ? 'b-brand c-soft' : 'b-line c-card'}`}>
      <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${on ? 'c-brand' : 'c-soft'}`}><Icon className={`h-5 w-5 ${on ? '' : 't-brand'}`} /></span>
      <span className={`text-[11px] leading-tight text-center ${on ? 'font-extrabold t-main' : 'font-semibold t-sub'}`}>{label}</span>
    </button>;
  };
  return <nav aria-label={hi ? 'सेवाएँ और टूल' : 'Services and tools'} data-no-translate
    className="ankur-home-feature-row -mx-1 mb-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
    <div role="tablist" className="flex gap-2 px-1 pb-1 snap-x">
      {tab('booking', hi ? 'ड्राई आइस बुकिंग' : 'Dry Ice Booking', Snowflake)}
      {items.map(f => tab(f.id, (hi ? SHORT_HI[f.id] : SHORT_EN[f.id]) || (hi ? f.hi : f.en), f.icon))}
    </div>
  </nav>;
};
