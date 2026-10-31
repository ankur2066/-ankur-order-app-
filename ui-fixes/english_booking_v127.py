#!/usr/bin/env python3
"""v1.0.27: English customer booking home, single product picker, compact two-column form,
editable extra-amount request and reason, while retaining actual booking and Firebase.
Only customer-facing JSX/CSS and payment notes are changed; no owner permissions or auth changes.
"""
from pathlib import Path
import re

home = Path('src/components/customer/CustomerHome.tsx')
s = home.read_text(encoding='utf-8')
assert 'data-ui-build="1.0.26"' in s, 'Apply after the v126 patch'
s = s.replace("import React, { useMemo, useState } from 'react';", "import React, { useState } from 'react';", 1)
s = s.replace("import { Bell, Clock, MapPin, Search, User as UserIcon, X } from 'lucide-react';", "import { Bell, Clock, User as UserIcon } from 'lucide-react';", 1)
s = s.replace("import { categoryLabel } from '../../data/catalog';\n", "", 1)
s = s.replace("import { CategoryIcon } from './categoryIcons';\n", "", 1)
assert s.count('  bookingForm: (product: ProductItem | null) => React.ReactNode;') == 1
s = s.replace('  bookingForm: (product: ProductItem | null) => React.ReactNode;',
              '  bookingForm: (product: ProductItem | null) => React.ReactNode;\n  onOpenProducts: () => void;\n  onOpenAI: () => void;', 1)
assert s.count('  productsError,\n  currentUser,') == 1
s = s.replace('  productsError,\n  currentUser,', '  productsError,\n  rates,\n  currentUser,', 1)
assert s.count('  bookingForm,\n}) => {') == 1
s = s.replace('  bookingForm,\n}) => {', '  bookingForm,\n  onOpenProducts,\n  onOpenAI,\n}) => {', 1)
start = s.index("  const [query, setQuery]")
end = s.index("\n  return (", start)
s = s[:start] + """  const [productId, setProductId] = useState('');
  const selectedProduct = products.find(p => p.id === productId) || null;
  // Price line follows the owner's live rate settings; extra transport is explicit.
  const dryRate = rates.dryIceRate;
  const packingRate = rates.thermocolRate;
  const transportRate = rates.transportRate || 0;
  const combinedRate = dryRate + packingRate + transportRate;
""" + s[end:]
old = '<div className="aqp-brand-location"><MapPin className="w-3.5 h-3.5" /> लखनऊ से पूरे उत्तर प्रदेश में</div>'
assert s.count(old) == 1, 'brand/location anchor changed'
s = s.replace(old, '''<div className="aqp-brand-rate" aria-label="Price per kilogram">
                Dry Ice ₹{dryRate} + Thermocol ₹{packingRate} = <strong>₹{dryRate + packingRate}/kg</strong>
                {transportRate > 0 && <span> + Transport ₹{transportRate}/kg (Total ₹{combinedRate}/kg)</span>}
              </div>''', 1)
s = s.replace('aria-label={unreadCount > 0 ? unreadCount + \' नए ऑर्डर अपडेट\' : \'ऑर्डर अपडेट\'}',
              'aria-label={unreadCount > 0 ? unreadCount + \' new order updates\' : \'Order updates\'}', 1)
s = s.replace('aria-label="प्रोफ़ाइल"', 'aria-label="Profile"', 1)
start = s.index('        <div className="aqp-search-shell">')
end = s.index('      </header>', start)
s = s[:start] + '''        <div className="aqp-search-shell aqp-top-product-picker">
          <label htmlFor="aqp-top-product">Choose Product</label>
          <select
            id="aqp-top-product"
            className="aqp-booking-product-select"
            value={selectedProduct?.id || ''}
            onChange={(event) => setProductId(event.target.value)}
          >
            <option value="">Dry Ice (Standard Booking)</option>
            {products.map(product => (
              <option key={product.id} value={product.id}>{product.name}</option>
            ))}
          </select>
          {productsLoading && <span role="status">Loading products...</span>}
          {productsError && <span role="status">{productsError}</span>}
        </div>
        <div className="aqp-category-strip aqp-booking-shortcuts" aria-label="Booking shortcuts">
          <span className="aqp-category aqp-category-active" aria-current="page">Dry Ice Book</span>
          <button type="button" className="aqp-category" onClick={onOpenProducts}>Products</button>
          <button type="button" className="aqp-category" onClick={onOpenAI}>AI</button>
          <span className="aqp-category aqp-category-reserved" title="Reserved for future use" aria-label="Reserved empty slot"></span>
        </div>
''' + s[end:]
assert s.count('<h1 id="aqp-booking-title">ड्राई आइस ऑर्डर फॉर्म</h1>') == 1
s = s.replace('<h1 id="aqp-booking-title">ड्राई आइस ऑर्डर फॉर्म</h1>',
              '<h1 id="aqp-booking-title">Dry Ice Booking Form</h1>', 1)
start = s.index('          <div className="aqp-booking-product-field">')
end = s.index('          <div className="aqp-booking-form">', start)
s = s[:start] + s[end:]
s = s.replace('data-ui-build="1.0.26"', 'data-ui-build="1.0.27"', 1)
assert 'aqp-search-input' not in s and s.count('id="aqp-top-product"') == 1
assert s.count('{bookingForm(selectedProduct)}') == 1
assert 'aqp-spotlight' not in s
home.write_text(s, encoding='utf-8')

app = Path('src/App.tsx')
s = app.read_text(encoding='utf-8')
anchor = '          bookingForm={(inlineProduct) => ('
assert s.count(anchor) == 1
s = s.replace(anchor, """          onOpenProducts={() => setCurrentTab('categories')}
          onOpenAI={() => setCurrentTab('ai-video')}
""" + anchor, 1)
app.write_text(s, encoding='utf-8')

# Translate the global bottom navigation: other tabs remain functionally unchanged.
nav = Path('src/components/customer/BottomNav.tsx')
s = nav.read_text(encoding='utf-8')
for old, new in [('होम','Home'), ('कैटेगरी','Categories'), ('मेरे ऑर्डर','My Orders'),
                 ('AI वीडियो','AI Video'), ('प्रोफ़ाइल','Profile'), ('मुख्य नेविगेशन','Main navigation')]:
    s = s.replace(old, new)
nav.write_text(s, encoding='utf-8')

order = Path('src/components/OrderForm.tsx')
s = order.read_text(encoding='utf-8')
# Keep the original slot identifiers and dispatchTiming values unchanged;
# only human-facing field labels, where unambiguous, are translated.
for old, new in [
  ('ग्राहक का नाम ', 'Customer Name '),
  ('मोबाइल नंबर (10 अंक)', 'Mobile (10 digits)'),
  ('शहर ', 'City '),
  ('मात्रा (KG)', 'Quantity (KG)'),
  ('न्यूनतम ऑर्डर 10 KG है।', 'Minimum 10 KG order.'),
  ('उदा. लखनऊ', 'e.g. Lucknow'),
  ('उदा. 10, 25', 'e.g. 10, 25'),
  ('डिस्पैच समय', 'Dispatch Time'),
  ('कुल कीमत', 'Price Breakdown'),
  ('कुल देय राशि:', 'Total Amount:'),
  ('विंडो समाप्त होने के बाद स्लॉट स्वतः बंद हो जाते हैं।',
   'Expired dispatch slots close automatically.'),
  ('ड्राई आइस बुकिंग फॉर्म', 'Dry Ice Booking Form'),
]:
    s = s.replace(old, new)

# Inject separate requested amount and explanatory note state in the original real OrderForm.
anchor = re.search(r'(?m)^(\s*)const currentQuantityKg\b', s)
assert anchor, 'OrderForm quantity computed value not found'
indent = anchor.group(1)
insert = (indent + "const [extraAmountText, setExtraAmountText] = useState('');\n" +
          indent + "const [extraAmountReason, setExtraAmountReason] = useState('');\n" +
          indent + "const approvedAmount = (base: number) => {\n" +
          indent + "  const request = Number(extraAmountText);\n" +
          indent + "  return extraAmountText.trim() !== '' && Number.isFinite(request) && request >= base && request <= 99000\n" +
          indent + "    ? Math.round(request * 100) / 100 : base;\n" +
          indent + "};\n" +
          indent + "const extraPriceNote = (normal: string) => {\n" +
          indent + "  const reason = extraAmountReason.trim().slice(0, 180);\n" +
          indent + "  return [normal, extraAmountText.trim() ? 'Customer requested total: ₹' + extraAmountText : '',\n" +
          indent + "    reason ? 'Additional request: ' + reason : ''].filter(Boolean).join(' | ');\n" +
          indent + "};\n")
s = s[:anchor.start()] + insert + s[anchor.start():]

# The customer requests only additional products/services, never self-applies a lower base price.
# Keep the existing Firestore order as pending_verification with owner approval.
amount = re.compile(r'<span\s+className="apb-payable-amount[^"]*"[^>]*>[\s\S]*?</span>')
assert len(amount.findall(s)) == 1, 'Payable amount JSX not found'
s = amount.sub('''<label className="apb-amount-editor" aria-label="Requested total amount">
                    <span>₹</span>
                    <input type="number" inputMode="decimal" min={totalAmount} max={99000}
                      step="0.01" value={extraAmountText} placeholder={String(totalAmount)}
                      onChange={(e) => setExtraAmountText(e.target.value)}
                      aria-label="Edit total amount for extras"
                      className="apb-extra-amount-input" />
                  </label>''', s, count=1)

# Notes are required whenever a customer enters a different amount.
marker = 'className="apb-total-card space-y-2"'
assert s.count(marker) == 1
# Insert amount justification just after the pricing card using a JSX wrapper adjacent to it.
# A safe anchor is the payment-note div that immediately follows that card.
marker = '<div className="apb-payment-note text-sm">'
assert s.count(marker) == 1
s = s.replace(marker, '''<div className="apb-special-request">
                  <label htmlFor="apb-extra-reason">Extra Product / Reason for Amount Change</label>
                  <textarea id="apb-extra-reason" rows={2} maxLength={180}
                    placeholder="e.g. Add Pyro, event supplies or other products"
                    value={extraAmountReason}
                    onChange={(e) => setExtraAmountReason(e.target.value)}
                    required={extraAmountText.trim() !== '' && Number(extraAmountText) !== totalAmount}
                    className="apb-extra-reason-input" />
                  <p>Base dry ice price cannot be reduced. Extra amounts need owner confirmation.</p>
                </div>
                ''' + marker, 1)

# Order persistence: use a requested higher amount, preserve owner verification status.
# The first object with totalAmount immediately followed by status is the normal customer order payload.
payload = re.compile(r'(totalAmount:\s*)([A-Za-z_][A-Za-z_0-9]*)(\s*,\s*status:\s*[\x27"]pending[\x27"])')
match = payload.search(s)
assert match, 'Expected normal customer order totalAmount/status payload not found'
s = s[:match.start()] + (match.group(1) + 'approvedAmount(' + match.group(2) + ')' + match.group(3)) + s[match.end():]

# Preserve the order paymentNotes field; attach the request reason and amount.
notes = re.compile(r'(paymentNotes:\s*)(["\x27])Paytm Business / UPI द्वारा ओनर वेरिफिकेशन प्रतीक्षित\2')
assert len(notes.findall(s)) == 1, 'Payment note anchor has changed'
s = notes.sub(lambda m: m.group(1) + 'extraPriceNote("Paytm Business / UPI - owner verification pending")', s, count=1)

# After saving, the receipt shown to the customer should also reflect the requested total.
# Do not change the selected KG or rate-based breakdown; the additional reason is stored in paymentNotes.
receipt = re.compile(r'(totalAmount:\s*)([A-Za-z_][A-Za-z_0-9]*)(\s*,\s*dispatchTiming:)')
s = receipt.sub(lambda m: m.group(1) + 'approvedAmount(' + m.group(2) + ')' + m.group(3), s, count=1)

order.write_text(s, encoding='utf-8')

css=Path('src/index.css')
overlay=Path('ui-fixes/english-booking-v127.css').read_text(encoding='utf-8')
assert 'ANKUR ENGLISH BOOKING V1.0.27' not in css.read_text(encoding='utf-8')
css.write_text(css.read_text(encoding='utf-8')+'\n'+overlay, encoding='utf-8')
assert "onOpenAI={() => setCurrentTab('ai-video')}" in app.read_text(encoding='utf-8')
assert "onOpenProducts={() => setCurrentTab('categories')}" in app.read_text(encoding='utf-8')
assert 'approvedAmount(' in order.read_text(encoding='utf-8')
assert 'extraPriceNote(' in order.read_text(encoding='utf-8')
assert 'paymentStatus: ' in order.read_text(encoding='utf-8')
print('PASS: v127 booking-only English home, one picker, four shortcuts, two-column form styling, editable safe extras with owner-verification note')
