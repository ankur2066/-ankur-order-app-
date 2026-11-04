#!/usr/bin/env python3
"""v1.0.45: correct only the Profile's public contact number label.

Call and WhatsApp destinations are already separate and correct. Keep
booking/tracking/rates, owner permissions and the underlying WhatsApp display
constant unchanged, since other screens use it as a WhatsApp contact.
"""
from pathlib import Path
p=Path("src/components/customer/ProfileTab.tsx")
s=p.read_text(encoding="utf-8")
old="import { BUSINESS_CALL_HREF, BUSINESS_PHONE_DISPLAY, BUSINESS_WHATSAPP_BASE } from '../../data/products';"
new="import { BUSINESS_CALL_HREF, BUSINESS_WHATSAPP_BASE } from '../../data/products';"
assert s.count(old)==1, "Profile phone import has changed"
s=s.replace(old,new,1)
old="Ankur Dry Ice and Events, Lucknow · {BUSINESS_PHONE_DISPLAY}"
new="Ankur Dry Ice and Events, Lucknow · Call: 95808 82066 · WhatsApp: 88963 32066"
assert s.count(old)==1, "Profile contact text changed"
s=s.replace(old,new,1)
assert "href={BUSINESS_CALL_HREF}" in s and "href={BUSINESS_WHATSAPP_BASE}" in s
assert "staffRequests" in s and "Notification preferences" in s
p.write_text(s,encoding="utf-8")
print("PASS: Profile Contact us identifies Call 95808 82066 and WhatsApp 88963 32066 separately")
