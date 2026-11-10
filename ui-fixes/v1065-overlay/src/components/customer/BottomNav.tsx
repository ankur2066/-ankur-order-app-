import React from 'react';
import { House, ClipboardList, Clapperboard, User } from 'lucide-react';

export type CustomerTab = 'home' | 'categories' | 'my-orders' | 'ai-video' | 'profile';

interface BottomNavProps {
  active: CustomerTab | null;
  onChange: (tab: CustomerTab) => void;
  isOwner?: boolean;
}

export const BottomNav: React.FC<BottomNavProps> = ({ active, onChange, isOwner = false }) => {
  const items: { id: CustomerTab; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'home', label: 'Home', Icon: House },
    { id: 'ai-video', label: 'AI Video', Icon: Clapperboard },
    { id: 'my-orders', label: 'My Orders', Icon: ClipboardList },
    { id: 'profile', label: 'Profile', Icon: User },
  ];
  return (
  <nav
    aria-label="Main navigation"
    className="aqp-bottom-nav fixed bottom-0 inset-x-0 z-50 c-card border-t b-line bottom-nav-safe shadow-[0_-4px_18px_rgba(0,0,0,0.06)]"
  >
    <ul className="max-w-lg mx-auto grid grid-cols-4">
      {items.map(({ id, label, Icon }) => {
        const isActive = active === id;
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onChange(id)}
              aria-current={isActive ? 'page' : undefined}
              className="focus-ring relative w-full min-h-[58px] pt-2 pb-1.5 flex flex-col items-center justify-center gap-0.5 cursor-pointer"
            >
              {isActive && <span className="absolute top-0 h-[3px] w-9 rounded-b-full" style={{ background: 'var(--brand)' }} />}
              <Icon className={`w-[22px] h-[22px] ${isActive ? 't-brand' : 't-sub'}`} />
              <span className={`text-[11px] leading-none ${isActive ? 'font-extrabold t-main' : 'font-semibold t-sub'}`}>{label}</span>
            </button>
          </li>
        );
      })}
    </ul>
  </nav>
  );
};

export default BottomNav;
