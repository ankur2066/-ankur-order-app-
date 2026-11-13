import React, { useEffect, useState } from 'react';
import { House, ClipboardList, ShoppingBag, User } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';

export type CustomerTab = 'home' | 'categories' | 'my-orders' | 'ai-video' | 'profile';

interface BottomNavProps {
  active: CustomerTab | null;
  onChange: (tab: CustomerTab) => void;
  isOwner?: boolean;
}

/** v1.0.72 (Ankur, 13 Nov 2026): Products tile is a placeholder; it only shows this note. */
export const PRODUCTS_COMING_SOON = { hi: 'बहुत जल्द यह सुविधा शुरू होगी।', en: 'Coming very soon.' } as const;

export const BottomNav: React.FC<BottomNavProps> = ({ active, onChange, isOwner = false }) => {
  const { language } = useLanguage();
  const hi = language === 'hi';
  const [soon, setSoon] = useState(false);
  useEffect(() => { if (!soon) return; const t = window.setTimeout(() => setSoon(false), 2500); return () => window.clearTimeout(t); }, [soon]);
  // v1.0.72: the lower AI Video entry is replaced by Products (AI Video stays in the Home feature row).
  // 'products' is not a route: tapping it only shows the coming-soon note (no navigation, no Firestore).
  const items: { id: CustomerTab | 'products'; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', Icon: House },
    { id: 'products', label: 'Products', Icon: ShoppingBag },
    { id: 'my-orders', label: 'My Orders', Icon: ClipboardList },
    { id: 'profile', label: 'Profile', Icon: User },
  ];
  return (
  <>
  {soon && <div role="status" aria-live="polite" data-no-translate
    className="aqp-products-soon fixed inset-x-0 bottom-[70px] z-[60] mx-auto w-max max-w-[90vw] rounded-xl px-4 py-2.5 text-sm font-bold shadow-lg c-card t-main border b-line">
    {hi ? PRODUCTS_COMING_SOON.hi : PRODUCTS_COMING_SOON.en}
  </div>}
  <nav
    aria-label="Main navigation"
    className="aqp-bottom-nav fixed bottom-0 inset-x-0 z-50 c-card border-t b-line bottom-nav-safe shadow-[0_-4px_18px_rgba(0,0,0,0.06)]"
  >
    <ul className="max-w-lg mx-auto grid grid-cols-4">
      {items.map(({ id, label, Icon }) => {
        const isActive = active === id;
        const text = id === 'products' ? (hi ? 'प्रोडक्ट्स' : 'Products') : label;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => (id === 'products' ? setSoon(true) : onChange(id))}
              aria-current={isActive ? 'page' : undefined}
              className="focus-ring relative w-full min-h-[58px] pt-2 pb-1.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
            >
              {isActive && <span className="absolute top-0 h-[3px] w-9 rounded-b-full" style={{ background: 'var(--brand)' }} />}
              <Icon className={`w-[22px] h-[22px] ${isActive ? 't-brand' : 't-sub'}`} />
              <span data-no-translate={id === 'products' ? true : undefined} className={`text-[11px] leading-none ${isActive ? 'font-extrabold t-main' : 'font-semibold t-sub'}`}>{text}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
  </>
  );
};

export default BottomNav;
