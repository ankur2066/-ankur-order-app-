#!/usr/bin/env python3
"""v1.0.39 private Home cleanup, after reviewed v1.0.38 overlays.

Remove duplicate customer-facing controls only. The original Firebase OrderForm,
its rates, its quantity/dispatch controls and protected data are left alone.
"""
from pathlib import Path

home = Path("src/components/customer/CustomerHome.tsx")
s = home.read_text(encoding="utf-8")

def replace_once(before: str, after: str) -> None:
    global s
    assert s.count(before) == 1, f"Home markup changed: {before[:85]!r}"
    s = s.replace(before, after, 1)

replace_once("import React, { useState } from 'react';", "import React from 'react';")
replace_once("import { FeatureHub } from './FeatureHub';\n", "")
replace_once("  const [productId, setProductId] = useState('');\n  const selectedProduct = products.find(p => p.id === productId) || null;\n", "")
# Keep the props shape and real booking function for existing App integrations.
replace_once("  products,\n  productsLoading,\n  productsError,\n", "")
# The old picker is redundant: this screen is the regular Dry Ice booking.
start = "        <div className=\"aqp-search-shell aqp-top-product-picker\">"
assert s.count(start) == 1, "Unexpected Home product selector markup"
a = s.index(start)
b = s.index("      </header>", a)
picker = s[a:b]
assert 'id="aqp-top-product"' in picker and picker.count("</select>") == 1
assert "aqp-booking-shortcuts" not in picker, "Do not delete unrelated navigation"
s = s[:a] + s[b:]

# Ice Calculator remains a functioning feature, but no longer occupies Home.
summary = '        <details className="mx-4 mb-3"><summary className="font-bold p-3">Ice calculator and rate card</summary><FeatureHub currentUser={null} role={null} allowed={["calculator","rates"]}/></details>\n'
replace_once(summary, "")
replace_once("{bookingForm(selectedProduct)}", "{bookingForm(null)}")
replace_once('data-ui-build="1.0.32"', 'data-ui-build="1.0.39"')
assert "aqp-top-product" not in s
assert "Ice calculator and rate card" not in s
assert s.count("{bookingForm(null)}") == 1
home.write_text(s, encoding="utf-8")

# Keep Calculator reachable through the existing Profile tools until the
# approved 5-button AI Features navigation is implemented and tested.
profile = Path("src/components/customer/ProfileTab.tsx")
p = profile.read_text(encoding="utf-8")
before = 'allowed={["loyalty","partner","subscriptions","promotions","faq","support","service-area","referral"]}'
after = 'allowed={["calculator","loyalty","partner","subscriptions","promotions","faq","support","service-area","referral"]}'
assert p.count(before) == 1, "Profile tools changed"
profile.write_text(p.replace(before, after, 1), encoding="utf-8")

css = Path("src/index.css")
old = css.read_text(encoding="utf-8")
style = Path("ui-fixes/customer-home-clean-v139.css").read_text(encoding="utf-8")
assert "ANKUR CUSTOMER HOME CLEAN v1.0.39" not in old
css.write_text(old + "\n" + style, encoding="utf-8")

# Prove that this patch never rewrites the real OrderForm or any financial data.
assert 'onOpenNotifications' in s and 'bookingForm: (product: ProductItem | null)' in s
print("PASS: duplicate Home selector and calculator row removed, original booking component retained, calculator reachable via Profile")
