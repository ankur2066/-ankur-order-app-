#!/usr/bin/env python3
"""Bilingual customer booking-shell UI only, after full review reconstruction.

The customer's saved language preference controls only labels/accessible names.
No change to Firestore order data, price math, product filter, submit, or role checks.
"""
from pathlib import Path

p = Path("src/components/customer/CustomerHome.tsx")
s = p.read_text(encoding="utf-8")

def once(old: str, new: str) -> None:
    global s
    count = s.count(old)
    assert count == 1, f"CustomerHome shell anchor expected once, found {count}: {old[:75]!r}"
    s = s.replace(old, new, 1)

once("import React, { useState } from 'react';",
     "import React, { useState } from 'react';\nimport { useLanguage } from '../../context/LanguageContext';")
once("  const [productId, setProductId] = useState('');",
     "  const { language } = useLanguage();\n  const hi = language === 'hi';\n  const [productId, setProductId] = useState('');")

once('aria-label="Price per kilogram"',
     "aria-label={hi ? 'प्रति किलो कीमत' : 'Price per kilogram'}")
once('Dry Ice ₹{dryRate} + Thermocol ₹{packingRate} =',
     "{hi ? 'ड्राई आइस' : 'Dry Ice'} ₹{dryRate} + {hi ? 'थर्मोकोल' : 'Thermocol'} ₹{packingRate} =")
once(' + Transport ₹{transportRate}/kg (Total ₹{combinedRate}/kg)',
     " + {hi ? 'परिवहन' : 'Transport'} ₹{transportRate}/kg ({hi ? 'कुल' : 'Total'} ₹{combinedRate}/kg)")
once("unreadCount + ' new order updates' : 'Order updates'",
     "unreadCount + (hi ? ' नए ऑर्डर अपडेट' : ' new order updates') : (hi ? 'ऑर्डर अपडेट' : 'Order updates')")
once('<label htmlFor="aqp-top-product">Choose Product</label>',
     '<label htmlFor="aqp-top-product">{hi ? "प्रोडक्ट चुनें" : "Choose Product"}</label>')
once('<option value="">Dry Ice (Standard Booking)</option>',
     '<option value="">{hi ? "ड्राई आइस (सामान्य बुकिंग)" : "Dry Ice (Standard Booking)"}</option>')
once('<option key={product.id} value={product.id}>{product.name}</option>',
     '<option key={product.id} value={product.id}>{hi ? product.hindiName || product.name : product.name}</option>')
once('<span role="status">Loading products...</span>',
     '<span role="status">{hi ? "प्रोडक्ट लोड हो रहे हैं…" : "Loading products..."}</span>')
once('<h1 id="aqp-booking-title">Dry Ice Booking Form</h1>',
     '<h1 id="aqp-booking-title">{hi ? "ड्राई आइस बुकिंग फॉर्म" : "Dry Ice Booking Form"}</h1>')

# This audit covers only shell labels, not legacy OrderForm or admin translation.
assert 'onOpenNotifications' in s and 'bookingForm(selectedProduct)' in s
assert "const { language } = useLanguage()" in s
assert 'data-ui-build="1.0.32"' in s
p.write_text(s, encoding="utf-8")
print("PASS: customer Home labels follow English/Hindi preference; booking data and handlers unchanged.")
