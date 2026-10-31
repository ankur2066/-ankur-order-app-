#!/usr/bin/env python3
"""Scoped v1.0.28 customer booking type-scale and smoothness pass.
Do not modify Firebase, JavaScript order pricing, payments, login or dispatch state.
"""
from pathlib import Path

home = Path("src/components/customer/CustomerHome.tsx")
form = Path("src/components/OrderForm.tsx")
css = Path("src/index.css")
overlay = Path("ui-fixes/readable-smooth-v128.css")
h = home.read_text(encoding="utf8")
f = form.read_text(encoding="utf8")
c = css.read_text(encoding="utf8")
assert h.count('data-ui-build="1.0.27"') == 1, "Expected v127 customer home"
assert 'apb-fields-grid' in f and 'apb-slot-grid' in f and 'apb-total-card' in f
assert 'apb-extra-amount-input' in f and 'apb-special-request' in f
assert 'onOrderSuccess' not in h, "Do not change booking callback"
assert 'ANKUR READABLE + SMOOTH BOOKING v1.0.28' not in c
assert overlay.is_file() and overlay.stat().st_size > 6500
h = h.replace('data-ui-build="1.0.27"', 'data-ui-build="1.0.28"', 1)
c = c + "\n" + overlay.read_text(encoding="utf8")
home.write_text(h,encoding="utf8")
css.write_text(c,encoding="utf8")
assert "grid-template-columns: minmax(0,1fr) minmax(0,1fr)" in c
assert "font-size: 16px !important" in c
assert "font-size: 14px !important" in c
assert '₹{dryRate}' in h and '₹{packingRate}' in h
assert 'onOpenProducts' in h and 'onOpenAI' in h
assert 'apb-payment-note' in c
print("PASS v128: more legible labels + amounts, reduced blank space, cheaper animations.")
print("PASS: order submission, price settings, authentication and dispatch handlers unchanged.")
