#!/usr/bin/env python3
"""Customer-facing premium quick-commerce visual treatment ONLY.

Applied AFTER the existing app-check, rate/report, UX and Booking v1.0.22 patches.
This deliberately makes no auth, Firestore, checkout, order, price, payment, or admin edits.
"""
from pathlib import Path

def checked_replace(s: str, old: str, new: str, label: str) -> str:
    found = s.count(old)
    assert found == 1, f'{label}: expected 1 match, found {found}'
    return s.replace(old, new, 1)

home = Path('src/components/customer/CustomerHome.tsx')
s = home.read_text(encoding='utf-8')

start_marker = '      {/* ===== Hero header ===== */}'
end_marker = '      <main className="pt-4 space-y-5">'
assert s.count(start_marker) == 1 and s.count(end_marker) == 1, "Home anchors changed"
a = s.index(start_marker)
b = s.index(end_marker, a)
header = '''      {/* Premium quick-commerce header; existing search/category/notification handlers retained. */}
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
              className="focus-ring aqp-icon-button" aria-label={unreadCount > 0 ? unreadCount + ' नए ऑर्डर अपडेट' : 'ऑर्डर अपडेट'}>
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

'''
s = s[:a] + header + s[b:]
s = checked_replace(s, '<div className="c-app min-h-screen page-with-bottom-nav">',
    '<div className="c-app aqp-home min-h-screen page-with-bottom-nav">', 'home root')
s = checked_replace(s, end_marker, '      <main className="aqp-main pt-4 space-y-5">', 'main')
open_fragment = '        {!searching && (\n          <>\n'
assert s.count(open_fragment) == 1, 'Conditional home sections anchor missing'
spotlight = '''            {/* Functional call-to-book action, no unverified instant-delivery claim. */}
            <section className="aqp-spotlight mx-4" aria-label="अंकुर ड्राई आइस बुकिंग">
              <div className="aqp-spotlight-content">
                <div className="aqp-spotlight-label"><span className="aqp-sparkle" /> PREMIUM DRY ICE SUPPLY</div>
                <h1>हर इवेंट को दें<br /><span>खास ठंडक</span></h1>
                <p>शादियों, इवेंट्स और बिज़नेस के लिए प्रोफेशनल ड्राई आइस सप्लाई।</p>
                <div className="aqp-spotlight-actions">
                  <button type="button" className="aqp-spotlight-cta focus-ring" onClick={() => onBook(null)}>
                    अभी बुक करें <span aria-hidden="true">→</span>
                  </button>
                  <span className="aqp-slot-caption"><Clock className="w-3.5 h-3.5" />
                    {nextSlot ? 'अगला स्लॉट: ' + nextSlot.label : 'अगले स्लॉट की जानकारी बुकिंग पर'}
                  </span>
                </div>
              </div>
              <div className="aqp-spotlight-art" aria-hidden="true">
                <span className="aqp-art-disc"><BrandMark className="w-20 h-20" /></span>
                <span className="aqp-art-shard aqp-shard-one">✧</span>
                <span className="aqp-art-shard aqp-shard-two">✦</span>
                <span className="aqp-art-shard aqp-shard-three">✧</span>
              </div>
            </section>

'''
s=s.replace(open_fragment,open_fragment+spotlight,1)
s = checked_replace(s,
    'className="focus-ring w-full c-card border b-line rounded-2xl px-1.5 py-3 flex flex-col items-center gap-2 cursor-pointer"',
    'className="focus-ring aqp-quick-tile w-full c-card border b-line rounded-2xl px-1.5 py-3 flex flex-col items-center gap-2 cursor-pointer"',
    'quick action')
s=s.replace('<section className="px-4" aria-label="प्रोडक्ट">',
    '<section className="aqp-products-section px-4" aria-label="प्रोडक्ट">', 1)
assert 'aqp-products-section' in s
home.write_text(s,encoding='utf-8')

card=Path('src/components/customer/ProductCard.tsx')
s=card.read_text(encoding='utf-8')
s=checked_replace(s, 'c-card border b-line rounded-2xl overflow-hidden flex flex-col',
    'aqp-product-card c-card border b-line rounded-2xl overflow-hidden flex flex-col',
    'product root')
s=checked_replace(s,'relative aspect-square c-soft flex items-center justify-center',
    'aqp-product-media relative aspect-square c-soft flex items-center justify-center','product image')
s=checked_replace(s,'className="p-2.5 flex flex-col flex-1"',
    'className="aqp-product-body p-2.5 flex flex-col flex-1"','product content')
s=checked_replace(s,'focus-ring shrink-0 min-h-9 px-3.5 rounded-lg border-2 b-brand t-brand',
    'focus-ring aqp-product-action shrink-0 min-h-9 px-3.5 rounded-lg border-2 b-brand t-brand','product CTA')
s=checked_replace(s,'className="text-[15px] font-black t-main leading-none"',
    'className="aqp-price text-[15px] font-black t-main leading-none"','product price')
card.write_text(s,encoding='utf-8')

nav=Path('src/components/customer/BottomNav.tsx')
s=nav.read_text(encoding='utf-8')
s=checked_replace(s, 'fixed bottom-0 inset-x-0 z-50 c-card border-t b-line bottom-nav-safe',
    'aqp-bottom-nav fixed bottom-0 inset-x-0 z-50 c-card border-t b-line bottom-nav-safe',
    'bottom navigation')
nav.write_text(s,encoding='utf-8')

app=Path('src/App.tsx')
s=app.read_text(encoding='utf-8')
s=checked_replace(s,'overflow-x-hidden c-app t-main font-sans relative',
    'overflow-x-hidden aqp-app c-app t-main font-sans relative','customer shell only')
app.write_text(s,encoding='utf-8')

css = Path('ui-fixes/blinkit-premium-v123.css')
assert css.is_file() and css.stat().st_size > 1000
sheet=Path('src/index.css')
current=sheet.read_text(encoding='utf-8')
assert 'ANKUR PREMIUM QUICK-COMMERCE V1.0.23' not in current, 'Patch already applied'
sheet.write_text(current + '\n' + css.read_text(encoding='utf-8'),encoding='utf-8')
print('PASS: premium storefront UI applied to existing dynamic React app; no booking, Firestore, payment or roles changed')
