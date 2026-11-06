"""Localize tracking UI after the current overlay chain; keep stored data and PIN lookup intact."""
from pathlib import Path
p=Path('src/components/OrderTrackingView.tsx');s=p.read_text()
def once(old,new):
    global s
    assert s.count(old)==1,(old[:90],s.count(old))
    s=s.replace(old,new,1)
once("import React, { useState, useEffect } from 'react';","import React, { useState, useEffect } from 'react';\nimport { useLanguage } from '../context/LanguageContext';")
once("import { quantityText } from '../billing/unitBilling';","import { quantityText, quantityTextEnglish } from '../billing/unitBilling';")
once("  const [searchId, setSearchId]", "  const {language}=useLanguage();\n  const hi=language==='hi';\n  const tr=(en:string,hindi:string)=>hi?hindi:en;\n  const errors={id:tr('Enter your order ID (for example ADI-20261017-XXXX).','कृपया अपना ऑर्डर नंबर दर्ज करें (उदा. ADI-20261017-XXXX)।'),pin:tr('Enter your 6-digit secret tracking PIN.','कृपया अपना 6 अंकों का सीक्रेट ट्रैकिंग पिन दर्ज करें।'),missing:tr('Order not found. Check your order ID and secret PIN.','ऑर्डर नहीं मिला: कृपया अपना ऑर्डर नंबर और सीक्रेट पिन जांचें।'),failed:tr('Tracking could not be loaded. Please try again.','ट्रैकिंग जानकारी प्राप्त करने में त्रुटि आई। कृपया दोबारा प्रयास करें।')};\n  const [searchId, setSearchId]")
once('useState<string | null>(null)',"useState<'id'|'pin'|'missing'|'failed'|null>(null)")
for old,key in [('कृपया अपना ऑर्डर नंबर दर्ज करें (उदा. ADI-20261017-XXXX)।','id'),('कृपया अपना 6 अंकों का सीक्रेट ट्रैकिंग पिन दर्ज करें।','pin'),('ऑर्डर नहीं मिला: कृपया अपना ऑर्डर नंबर और सीक्रेट पिन जांचें।','missing'),('ट्रैकिंग जानकारी प्राप्त करने में त्रुटि आई। कृपया दोबारा प्रयास करें।','failed')]:
    once("setErrorMsg('"+old+"');","setErrorMsg('"+key+"');")
once('<span>{errorMsg}</span>','<span role="alert">{errors[errorMsg]}</span>')
for hindi,en in [('ऑर्डर प्राप्त हुआ','Order Received'),('ऑर्डर कन्फर्म हुआ','Order Confirmed'),('थर्मोकोल पैकिंग में','Packing Your Order'),('डिस्पैच / रास्ते में','Dispatched / In Transit'),('डिलीवर हो गया','Delivered'),('ऑर्डर रद्द','Order Cancelled')]:
    once("label: '"+hindi+"'","label: tr('"+en+"','"+hindi+"')")
for hindi,en in [('ऑर्डर ट्रैक करें (Track Order)','Track Order'),('ऑर्डर नंबर और सीक्रेट पिन दर्ज करके अपनी ड्राई आइस की स्थिति देखें।','Enter your order ID and secret PIN to check your order status.'),('ऑर्डर नंबर (Order ID)','Order ID'),('6-अंकों का सीक्रेट पिन (Secret PIN)','6-digit Secret PIN'),('यह ऑर्डर सफलतापूर्वक डिलीवर हो चुका है!','Your order has been delivered!'),('ताज़ा अपडेट','Latest Update')]:
    once('\n          '+hindi+'\n','\n          {tr('+repr(en)+','+repr(hindi)+')}\n') if '\n          '+hindi+'\n' in s else once(hindi+'\n', '{tr('+repr(en)+','+repr(hindi)+')}\n')
for hindi,en in [('ट्रैक करें','Track'),('ऑर्डर नंबर','Order ID'),('पुनः ऑर्डर करें (Quick Reorder)','Quick Reorder'),('मात्रा (Quantity)','Quantity'),('स्थान / पता','Location'),('डिस्पैच स्लॉट','Dispatch Slot'),('पेमेंट के लिए स्कैन करें (Paytm)','Scan to Pay (Paytm)'),('पेमेंट स्थिति:','Payment Status:'),('ओनर से बात करें:','Contact owner:'),('कॉल','Call'),('व्हाट्सएप','WhatsApp')]:
    once('>'+hindi+'</','>{tr('+repr(en)+','+repr(hindi)+')}</')
once('placeholder="उदा. ADI-20261017-W82K"', 'placeholder={tr("Example: ADI-20261017-W82K","उदा. ADI-20261017-W82K")}')
once('placeholder="उदा. 482910"','placeholder={tr("Example: 482910","उदा. 482910")}')
once("'वेरीफाइड (सफल)' : 'वेरिफिकेशन प्रतीक्षित'", "tr('Payment Verified','वेरीफाइड (सफल)') : tr('Awaiting Verification','वेरिफिकेशन प्रतीक्षित')")
once('क्या आपको दोबारा <strong',"{tr('Need another order of','क्या आपको दोबारा')} <strong")
once("trackingData.productName:'ड्राई आइस'} की आवश्यकता है?", "trackingData.productName:tr('Dry Ice','ड्राई आइस')} {tr('?','की आवश्यकता है?')}")
s=s.replace('{quantityText(trackingData)}',"{hi?quantityText(trackingData):quantityTextEnglish(trackingData)}")
once('href="tel:+918896332066"','href="tel:+919580882066"')
once('title="कॉल करें (+91 8896332066)"','title={tr("Call (+91 95808 82066)","कॉल करें (+91 95808 82066)")}')
once('title="व्हाट्सएप (+91 8896332066)"','title={tr("WhatsApp (+91 8896332066)","व्हाट्सएप (+91 8896332066)")}')
once('alt="Paytm Barcode"','alt={tr("Paytm payment QR code","Paytm भुगतान QR कोड")}')
once('Estimated arrival: {new Date((trackingData as any).etaMs).toLocaleString()} · Manual estimate; last updated {String((trackingData as any).etaUpdatedAt?.toDate?.().toLocaleString()||\'recently\')}', '{tr("Estimated arrival:","अनुमानित आगमन:")} {new Date((trackingData as any).etaMs).toLocaleString(hi?"hi-IN":"en-IN")} · {tr("Manual estimate; last updated","मैन्युअल अनुमान; अंतिम अपडेट")} {String((trackingData as any).etaUpdatedAt?.toDate?.().toLocaleString(hi?"hi-IN":"en-IN")||tr("recently","हाल में"))}')
# Existing business-owned district, dispatch timing and status note remain verbatim.
assert 'const compoundToken = `${cleanId}_${cleanPin}`;' in s
assert 'const trackingDocRef = resolvedTrackingRef(compoundToken);' in s
p.write_text(s)
print('PASS: tracking labels/validation/payment states bilingual; lookup, PIN and stored order fields retained.')
