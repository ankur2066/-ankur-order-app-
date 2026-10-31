#!/usr/bin/env python3
"""UX-only patch. Do not change Firebase, stored IDs, or saved dispatch labels."""
from pathlib import Path

products = Path('src/data/products.ts')
s = products.read_text(encoding='utf-8')
changes = {
    "timeWindow: '12:00 AM - 12:00 PM'": "timeWindow: 'रात 12:00 से दोपहर 12:00 बजे तक'",
    "timeWindow: '12:00 PM - 12:00 AM next day'": "timeWindow: 'दोपहर 12:00 से अगली रात 12:00 बजे तक'",
}
for old, new in changes.items():
    assert s.count(old) == 2, f'Unexpected original dispatch slot format: {old}'
    s = s.replace(old, new)
products.write_text(s, encoding='utf-8')

customer = Path('src/components/CustomerOrders.tsx')
s = customer.read_text(encoding='utf-8')
old = '#{ord.orderId}'
assert s.count(old) == 1, 'Customer order ID display changed upstream'
s = s.replace(old, "#{ord.orderId.split('-').pop() || ord.orderId}", 1)
old = 'title="ऑर्डर नंबर कॉपी करें"'
assert s.count(old) == 1
s = s.replace(old, 'title={`पूरा ऑर्डर नंबर कॉपी करें: ${ord.orderId}`}\n                      aria-label="पूरा ऑर्डर नंबर कॉपी करें"', 1)
customer.write_text(s, encoding='utf-8')
print('PASS: Readable dispatch slots and short customer order display; stored IDs intact')
