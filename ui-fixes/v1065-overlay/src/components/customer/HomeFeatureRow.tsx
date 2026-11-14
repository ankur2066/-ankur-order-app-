import React, {useEffect, useMemo, useState} from 'react';
import {doc, onSnapshot} from 'firebase/firestore';
import {db} from '../../firebase';
import {useLanguage} from '../../context/LanguageContext';
import {FEATURES, type FeatureId} from './FeatureHub';

export type HomeFeature = 'booking' | FeatureId;

/** Blinkit-style order (Ankur 2026-11-11): booking first, then calculator, AI video, then the rest. */
const ORDER: FeatureId[] = ['calculator', 'video', 'rates', 'catalog', 'support', 'faq', 'service-area', 'promotions', 'loyalty', 'partner', 'subscriptions', 'referral'];
/** Colourful pictures per tab (Ankur 2026-11-12 reference: grocery-app style row). */
const PIC: Partial<Record<FeatureId, string>> = {calculator: '🧮', video: '🎬', rates: '📋', catalog: '📦', support: '🎧', faq: '❓', 'service-area': '📍', promotions: '🎁', loyalty: '⭐', partner: '🏪', subscriptions: '🔁', referral: '🤝'};
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
  // v1.0.76 (Ankur, 14 Nov 2026): "3D like Blinkit" — each picture sits on its own soft,
  // raised pastel tile (gradient + shadow), picture large and slightly overflowing the tile,
  // label below; four equal-width tiles fill the row, aligned with the banner above.
  const tab = (id: HomeFeature, label: string, pic: string, index: number) => {
    const on = active === id;
    return <button key={id} type="button" role="tab" aria-selected={on} onClick={() => onSelect(id)}
      className={`ankur-home-feature-tab ankur-cat-tile focus-ring snap-start ${on ? 'is-active' : ''}`}>
      <span aria-hidden="true" className={`ankur-cat-tile-card ankur-cat-tone-${index % 6}`}>
        <span className="ankur-cat-tile-pic">{pic}</span>
      </span>
      <span className={`ankur-cat-tile-label ${on ? 'font-extrabold t-main' : 'font-semibold t-sub'}`}>{label}</span>
    </button>;
  };
  return <nav aria-label={hi ? 'सेवाएँ और टूल' : 'Services and tools'} data-no-translate
    className="ankur-home-feature-row ankur-cat-row mb-3 overflow-x-auto overscroll-x-contain [scrollbar-width:none]">
    <div role="tablist" className="ankur-cat-track snap-x">
      {tab('booking', hi ? 'ड्राई आइस बुकिंग' : 'Dry Ice Booking', '🧊', 0)}
      {items.map((f, i) => tab(f.id, (hi ? SHORT_HI[f.id] : SHORT_EN[f.id]) || (hi ? f.hi : f.en), PIC[f.id] || '⭐', i + 1))}
    </div>
  </nav>;
};
