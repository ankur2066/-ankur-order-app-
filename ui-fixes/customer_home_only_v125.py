#!/usr/bin/env python3
"""v1.0.25: One complete customer booking form between the preserved top and bottom controls.

Replace the home body instead of just inserting a form *above* old content.
Use existing authenticated OrderForm with the same handlers and Firebase behavior.
No production backend, payment, staff, owner, or persisted data changes.
"""
from pathlib import Path

app=Path("src/App.tsx")
s=app.read_text(encoding="utf-8")
old="""          bookingForm={
            <OrderForm
              currentUser={currentUser}
              onOrderSuccess={handleOrderSuccess}
              onGoToTrack={handleGoToTrack}
              onGoToMyOrders={() => setCurrentTab('my-orders')}
            />
          }"""
new="""          bookingForm={(inlineProduct) => (
            <OrderForm
              currentUser={currentUser}
              onOrderSuccess={handleOrderSuccess}
              onGoToTrack={handleGoToTrack}
              onGoToMyOrders={() => setCurrentTab('my-orders')}
              selectedProduct={inlineProduct}
            />
          )}"""
assert s.count(old)==1, f"App bookingForm anchor mismatch: {s.count(old)}"
s=s.replace(old,new,1)
app.write_text(s,encoding="utf-8")

home=Path("src/components/customer/CustomerHome.tsx")
original=home.read_text(encoding="utf-8")
assert "aqp-spotlight" in original and "aqp-booking-form" in original
assert original.count("bookingForm: React.ReactNode;")==1

# Intentionally replace complete home module. No promo/offer/tiles/product grid
# can remain hidden below the form. Keep original header and bottom navigation.
replacement=r'''import React, { useMemo, useState } from 'react';
import { Bell, Clock, MapPin, Search, User as UserIcon, X } from 'lucide-react';
import type { User } from 'firebase/auth';
import type { LuckyWinner, Order, ProductItem, PromoAction, PromoBanner, RateSettings } from '../../types';
import { categoryLabel } from '../../data/catalog';
import { BrandMark } from './BrandMark';
import { CategoryIcon } from './categoryIcons';

interface CustomerHomeProps {
  products: ProductItem[];
  productsLoading: boolean;
  productsError: string | null;
  rates: RateSettings;
  banners: PromoBanner[];
  winner: LuckyWinner | null;
  currentUser: User | null;
  unreadCount: number;
  onOpenNotifications: () => void;
  onOpenProfile: () => void;
  onBook: (product: ProductItem | null) => void;
  onReorder: (order: Order) => void;
  onPromoAction: (action: PromoAction) => void;
  /** The existing Firebase-enabled OrderForm, rendered here with a selected product. */
  bookingForm: (product: ProductItem | null) => React.ReactNode;
}

/** Header and footer stay untouched; entire middle is only the real order form. */
export const CustomerHome: React.FC<CustomerHomeProps> = ({
  products,
  productsLoading,
  productsError,
  currentUser,
  unreadCount,
  onOpenNotifications,
  onOpenProfile,
  bookingForm,
}) => {
  const [query, setQuery] = useState('');
  const [activeCat, setActiveCat] = useState('all');
  const [productId, setProductId] = useState('');

  const categories = useMemo(() => {
    const ids: string[] = [];
    for (const product of products) {
      if (product.category && !ids.includes(product.category)) ids.push(product.category);
    }
    return ids;
  }, [products]);

  const effectiveCat = activeCat === 'all' || categories.includes(activeCat) ? activeCat : 'all';

  const visible = useMemo(() => {
    const term = query.trim().toLowerCase();
    return products.filter((p) => {
      if (effectiveCat !== 'all' && p.category !== effectiveCat) return false;
      if (!term) return true;
      return [p.name, p.hindiName, p.description || '', categoryLabel(p.category)]
        .join(' ').toLowerCase().includes(term);
    });
  }, [products, effectiveCat, query]);

  // Filtering always affects the selectable product and therefore the live rate.
  // If no product is picked, the pre-existing generic Dry Ice form is used.
  const selectedProduct = visible.find((p) => p.id === productId) || null;

  return (
    <div className="c-app aqp-home aqp-form-only-home min-h-screen page-with-bottom-nav" data-ui-build="1.0.25">
      <header className="aqp-header" style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}>
        <div className="aqp-topbar">
          <div className="aqp-brand">
            <span className="aqp-brand-symbol"><BrandMark className="w-7 h-7" /></span>
            <div className="min-w-0">
              <div className="aqp-brand-name">ANKUR <span>DRYICE</span></div>
              <div className="aqp-brand-location"><MapPin className="w-3.5 h-3.5" /> लखनऊ से पूरे उत्तर प्रदेश में</div>
            </div>
          </div>
          <div className="aqp-top-actions">
            <button type="button" onClick={onOpenNotifications}
              className="focus-ring aqp-icon-button"
              aria-label={unreadCount > 0 ? unreadCount + ' नए ऑर्डर अपडेट' : 'ऑर्डर अपडेट'}>
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="aqp-unread">{unreadCount > 9 ? '9+' : unreadCount}</span>
              )}
            </button>
            <button type="button" onClick={onOpenProfile}
              className="focus-ring aqp-icon-button aqp-profile-button" aria-label="प्रोफ़ाइल">
              {currentUser?.photoURL ? (
                <img src={currentUser.photoURL} alt="" className="w-full h-full object-cover rounded-full" referrerPolicy="no-referrer" />
              ) : <UserIcon className="w-5 h-5" />}
            </button>
          </div>
        </div>
        <div className="aqp-search-shell">
          <label className="aqp-search-box">
            <Search className="w-5 h-5 shrink-0" />
            <input type="search" value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ड्राई आइस, पेलेट्स, ब्लॉक खोजें..."
              className="aqp-search-input"
              aria-label="प्रोडक्ट खोजें" />
            {query && (
              <button type="button" onClick={() => setQuery('')}
                className="focus-ring aqp-search-clear" aria-label="खोज साफ़ करें">
                <X className="w-4 h-4" />
              </button>
            )}
          </label>
        </div>
        <div className="aqp-category-strip no-scrollbar" role="tablist" aria-label="प्रोडक्ट कैटेगरी">
          {['all', ...categories].map((id) => {
            const selected = effectiveCat === id;
            return (
              <button key={id} type="button" role="tab" aria-selected={selected}
                onClick={() => setActiveCat(id)}
                className={selected ? 'focus-ring aqp-category aqp-category-active' : 'focus-ring aqp-category'}>
                <CategoryIcon id={id} className="w-5 h-5" />
                <span>{id === 'all' ? 'सभी' : categoryLabel(id)}</span>
              </button>
            );
          })}
        </div>
      </header>

      {/* No promotional hero, quick action tiles, carousel, reorder, or product grid.
          Customer fills the real booking form directly on the first screen. */}
      <main className="aqp-main aqp-form-only-main">
        <section id="ankur-customer-booking" className="aqp-booking-section mx-3 sm:mx-4"
          aria-labelledby="aqp-booking-title">
          <div className="aqp-booking-heading">
            <div>
              <span className="aqp-booking-eyebrow">ANKUR DRYICE · BOOKING</span>
              <h1 id="aqp-booking-title">ड्राई आइस ऑर्डर फॉर्म</h1>
            </div>
            <span className="aqp-booking-icon" aria-hidden="true"><Clock className="w-6 h-6" /></span>
          </div>
          <div className="aqp-booking-product-field">
            <label htmlFor="aqp-booking-product">प्रोडक्ट चुनें</label>
            <select
              id="aqp-booking-product"
              value={selectedProduct?.id || ''}
              onChange={(e) => setProductId(e.target.value)}
              className="aqp-booking-product-select"
            >
              <option value="">ड्राई आइस (सामान्य बुकिंग)</option>
              {visible.map((p) => (
                <option key={p.id} value={p.id}>{p.hindiName}</option>
              ))}
            </select>
            {productsLoading && <p role="status">प्रोडक्ट लोड हो रहे हैं…</p>}
            {!productsLoading && visible.length === 0 && (
              <p role="status">{productsError || 'इस खोज या कैटेगरी में कोई प्रोडक्ट नहीं मिला। सामान्य बुकिंग कर सकते हैं।'}</p>
            )}
          </div>
          <div className="aqp-booking-form">{bookingForm(selectedProduct)}</div>
        </section>
      </main>
    </div>
  );
};

export default CustomerHome;
'''
home.write_text(replacement,encoding="utf-8")
css=Path("ui-fixes/customer-home-only-v125.css")
assert css.is_file()
style=Path("src/index.css")
text=style.read_text(encoding="utf-8")
assert "ANKUR HOME FORM ONLY v1.0.25" not in text
style.write_text(text+"\n"+css.read_text(encoding="utf-8"),encoding="utf-8")

result=home.read_text(encoding="utf-8")
body=result[result.index('<main className='):result.index('</main>')+7]
prohibited=['<PromoCarousel', '<ProductCard', '<LuckyWinnerCard', 'aqp-spotlight',
            'aqp-quick-tile', 'lastOrder', 'सभी प्रोडक्ट', 'रीऑर्डर', 'अभी बुक करें',
            'शादी / इवेंट', 'बस पार्सल']
for item in prohibited:
    assert item not in body, f"Unexpected old home content: {item}"
assert result.count('<main ')==1 and result.count('</main>')==1
assert result.count('{bookingForm(selectedProduct)}')==1
assert result.count('aqp-header')==1
assert 'bookingForm={(inlineProduct)' in app.read_text(encoding="utf-8")
print("PASS: customer homepage only contains the live fillable booking form between retained header and bottom nav; old promotional content removed")
