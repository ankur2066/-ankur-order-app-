#!/usr/bin/env python3
"""v1.0.26: Compact real booking form on the home page.

Display only the original Firebase booking form between existing header and footer.
Keep the visible rate breakdown (no surprise fees) in a short, scan-friendly row.
Category tap selects a matching product in the existing booking form.
No Firestore, authentication, submit, payment, or role logic changes.
"""
from pathlib import Path

home=Path('src/components/customer/CustomerHome.tsx')
s=home.read_text(encoding='utf-8')
old="onClick={() => setActiveCat(id)}"
new="""onClick={() => {
                  setActiveCat(id);
                  // The category in the top bar must also select its actual product
                  // for the inline order form; no changes to checkout or rates.
                  setProductId(id === 'all' ? '' : (products.find((p) => p.category === id)?.id || ''));
                }}"""
assert s.count(old)==1, f'category onClick mismatch: {s.count(old)}'
s=s.replace(old,new,1)
# Avoid showing the owner's branding twice on the same viewport.
old='<span className="aqp-booking-eyebrow">ANKUR DRYICE · BOOKING</span>'
assert s.count(old)==1
s=s.replace(old,'',1)
assert s.count('data-ui-build="1.0.25"')==1
s=s.replace('data-ui-build="1.0.25"','data-ui-build="1.0.26"',1)
home.write_text(s, encoding='utf-8')

style=Path('src/index.css')
old=style.read_text(encoding='utf-8')
theme=Path('ui-fixes/compact-customer-form-v126.css')
assert theme.is_file() and theme.stat().st_size>2000
assert 'ANKUR CUSTOMER COMPACT FORM v1.0.26' not in old
style.write_text(old+'\n'+theme.read_text(encoding='utf-8'),encoding='utf-8')

# Safety guards for previous issue: old promo content must not reappear.
v=home.read_text(encoding='utf-8')
middle=v.split('<main ',1)[1].split('</main>',1)[0]
for forbidden in ('aqp-spotlight','PromoCarousel','ProductCard','LuckyWinnerCard',
                  'lastOrder','रीऑर्डर','चार शॉर्टकट','aqp-quick-tile'):
    assert forbidden not in middle, f'Legacy home marketing content found: {forbidden}'
assert middle.count('{bookingForm(selectedProduct)}')==1
assert 'setProductId(id ===' in v
assert 'aqp-search-shell' in v and 'aqp-category-strip' in v
assert '<header className="aqp-header"' in v
nav=Path('src/components/customer/BottomNav.tsx').read_text(encoding='utf-8')
assert "id: 'home'" in nav and "id: 'profile'" in nav and "id: 'my-orders'" in nav
order=Path('src/components/OrderForm.tsx').read_text(encoding='utf-8')
for required in ('apb-rate-hero','apb-account-card','apb-form-panel','apb-submit',
                 'onOrderSuccess','getDispatchSlots','signInWithGoogle'):
    assert required in order, f'Original booking handler removed: {required}'
print('PASS: compact customer form, live price breakdown, top product-category sync, no marketing content or backend changes')
