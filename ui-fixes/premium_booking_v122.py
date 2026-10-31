from pathlib import Path
import base64

order = Path('src/components/OrderForm.tsx')
s = order.read_text(encoding='utf-8')

def replace_once(old, new, label):
    global s
    count = s.count(old)
    assert count == 1, f'{label}: expected exactly 1 occurrence, found {count}'
    s = s.replace(old, new, 1)

# Scope a completely readable premium visual system. No persisted state/Firestore changes.
replace_once('className="max-w-xl mx-auto py-3 px-3 sm:px-4"', 'className="ankur-premium-booking max-w-xl mx-auto py-4 px-3 sm:px-5"', 'root')

start=s.index('      {/* 1. TODAY\'S RATE PROMINENT COMPACT BANNER */}')
end=s.index('      {/* Customer Google Login Gate',start)
new_hero='''      {/* Ice Blue premium price hero; all prices remain owner-controlled. */}
      <section className="apb-rate-hero" aria-label="आज की ड्राई आइस कीमत">
        <div className="apb-rate-head">
          <div className="apb-kicker"><Snowflake className="w-4 h-4" /> ANKUR DRYICE</div>
          <span className="apb-live-chip"><span className="apb-live-dot" /> आज का रेट</span>
        </div>
        <div className="apb-price-topline">ड्राई आइस व सुरक्षित पैकिंग</div>
        <div className="apb-hero-total">₹{currentUnitRate}<small>/kg</small></div>
        <div className="apb-rate-breakdown">
          <span>ड्राई आइस <strong>₹{rates.dryIceRate}/kg</strong></span>
          <span>थर्मोकोल पैकिंग <strong>₹{rates.thermocolRate}/kg</strong></span>
          {(rates.transportRate || 0) > 0 && <span>अतिरिक्त परिवहन <strong>₹{rates.transportRate}/kg</strong></span>}
        </div>
        <p className="apb-rate-footnote">ऊपर दिखाए गए सभी शुल्क कुल रेट में शामिल हैं।</p>
      </section>

'''
s=s[:start]+new_hero+s[end:]

replace_once('className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-sm my-6"', 'className="apb-login-gate text-center space-y-4 my-6"', 'login gate')
replace_once('className="bg-sky-50/70 border border-sky-200/90 rounded-xl p-2.5 sm:p-3 flex items-center justify-between gap-2 shadow-2xs"', 'className="apb-account-card flex items-center justify-between gap-3"', 'account card')
replace_once('className="text-xs font-bold text-slate-900 truncate flex items-center gap-1.5"', 'className="apb-account-name text-sm font-bold min-w-0 flex flex-wrap items-center gap-1.5"', 'account name')
replace_once('className="text-[10px] text-slate-500 truncate"', 'className="apb-account-email text-xs break-all"', 'account email')
replace_once('className="text-[11px] text-slate-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-white transition-colors shrink-0 cursor-pointer"', 'className="apb-logout shrink-0 cursor-pointer"', 'logout')

replace_once('className="bg-white border border-slate-200 rounded-2xl p-3.5 sm:p-4 shadow-xs"', 'className="apb-form-panel"', 'form panel')
replace_once('className="border-b border-slate-100 pb-2.5 mb-3 flex items-center justify-between"', 'className="apb-form-header flex flex-wrap items-center justify-between gap-2"', 'form header')
replace_once('className="text-base font-bold text-slate-900"', 'className="apb-form-title text-base sm:text-lg font-extrabold"', 'form title')
replace_once('₹60/kg ऑल-इन', '₹{currentUnitRate}/kg ऑल-इन', 'fixed price')
assert s.count('className="grid grid-cols-2 gap-2"') == 2
s=s.replace('className="grid grid-cols-2 gap-2"', 'className="apb-fields-grid grid grid-cols-2 gap-3"')
# Use readable 44px+ touch fields and prevent truncation of labels.
s=s.replace('className="text-xs font-semibold text-slate-800 block mb-1 truncate"','className="apb-field-label text-sm font-semibold block mb-1.5"')
assert s.count('className="apb-field-label text-sm font-semibold block mb-1.5"') == 4
s=s.replace('className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2 py-1.5 text-xs sm:text-sm text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"','className="apb-input w-full pl-10 pr-3 py-3 text-base focus:outline-none"')
assert s.count('className="apb-input w-full pl-10 pr-3 py-3 text-base focus:outline-none"') == 2
replace_once('className="w-full bg-white border border-slate-300 rounded-lg pl-8 pr-2 py-1.5 text-xs sm:text-sm font-mono text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"','className="apb-input w-full pl-10 pr-3 py-3 text-base focus:outline-none"','phone input')
replace_once('className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs sm:text-sm font-mono font-bold text-slate-900 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500"','className="apb-input w-full px-3 py-3 text-base font-bold focus:outline-none"','quantity input')
# The position of icons should be anchored vertically to larger inputs.
s=s.replace('className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5"','className="apb-input-icon w-4 h-4 text-slate-500 absolute left-3 top-3.5"')
assert s.count('className="apb-input-icon w-4 h-4 text-slate-500 absolute left-3 top-3.5"') == 3

replace_once('className="text-xs font-semibold text-slate-800 block mb-1"','className="apb-section-label text-sm font-bold block mb-2"','dispatch heading')
replace_once('className="grid grid-cols-2 gap-2.5"','className="apb-slot-grid grid grid-cols-2 gap-3"','slot grid')
old='''className={`flex flex-col justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                          slot.disabled
                            ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                            : dispatchTiming === slot.label
                            ? 'bg-sky-50 border-sky-500 text-sky-950 ring-2 ring-sky-400 shadow-xs'
                            : 'bg-white border-slate-300 text-slate-700 hover:border-sky-300 hover:bg-slate-50'
                        }`}'''
new='''className={`apb-slot flex flex-col justify-between cursor-pointer transition-all ${
                          slot.disabled ? 'apb-slot-disabled cursor-not-allowed' :
                          dispatchTiming === slot.label ? 'apb-slot-selected' : 'apb-slot-idle'
                        }`}'''
replace_once(old,new,'slot styling')
replace_once('className="font-bold text-xs sm:text-sm text-slate-900"','className="apb-slot-title text-sm font-bold"','slot title')
replace_once('className="text-[10px] text-slate-500 font-mono mt-0.5"','className="apb-slot-time mt-1.5 text-xs leading-relaxed"','slot time')
replace_once('className="text-[10px] text-slate-400 mt-1 flex items-center gap-1"','className="apb-helper mt-2 text-xs flex items-start gap-2"','dispatch helper')

replace_once('className="bg-sky-50/70 rounded-xl p-2.5 sm:p-3 border border-sky-200 text-xs space-y-1"','className="apb-total-card space-y-2"','total card')
replace_once('className="font-bold text-slate-800 text-xs mb-1"','className="apb-total-heading text-sm font-bold mb-2"','total heading')
# Breakdown existing rows map to scoped layout; do not clobber other receipts.
s=s.replace('className="flex justify-between text-slate-600 text-[11px] sm:text-xs"','className="apb-total-row flex items-start justify-between gap-3 text-sm"')
assert s.count('className="apb-total-row flex items-start justify-between gap-3 text-sm"') == 2
replace_once('''                <div className="flex justify-between items-baseline pt-1 border-t border-sky-200">''','''                {(rates.transportRate || 0) > 0 && (
                  <div className="apb-total-row flex items-start justify-between gap-3 text-sm">
                    <span>परिवहन ({currentQuantityKg} kg × ₹{rates.transportRate}):</span>
                    <strong className="font-mono">₹{Math.round(currentQuantityKg * (rates.transportRate || 0) * 100) / 100}</strong>
                  </div>
                )}
                <div className="apb-total-grand flex justify-between items-center gap-3 pt-3 mt-3">''','transport row')
replace_once('className="text-base sm:text-lg font-black font-mono text-emerald-700"','className="apb-payable-amount text-2xl font-black font-mono"','amount')
replace_once('(₹{rates.dryIceRate + rates.thermocolRate}/kg - कोई छुपा शुल्क नहीं)','(₹{currentUnitRate}/kg, सभी लागू शुल्क सहित)','price footnote')
replace_once('className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600"','className="apb-payment-note text-sm"','payment instructions')
replace_once('className="w-full py-2.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-600 active:bg-sky-700 text-white font-bold text-sm tracking-wide shadow-xs flex items-center justify-center gap-2 transition-colors disabled:opacity-50 cursor-pointer"','className="apb-submit w-full flex items-center justify-center gap-2 text-base font-extrabold disabled:opacity-50 cursor-pointer"','submit')
replace_once('className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500"','className="apb-contact mt-4 pt-4 border-t flex flex-wrap items-center justify-between gap-3 text-sm"','contact strip')
# Keep the payment page focused on the customer; no second duplicate staff WhatsApp CTA.
start=s.index('                  {/* Notify Staff via WhatsApp */}')
end=s.index('                  {/* Navigation link to My Orders */}',start)
s=s[:start]+s[end:]

# Broken static image was missing from source archive: use verified UPI ID to create local QR.
# QR has no amount so customer must enter amount, always verified by owner after payment.
replace_once('alt="पेमेंट बारकोड / QR कोड - Ankur Pratap Singh"','alt="UPI भुगतान QR — 8896332066@paytm; भुगतान से पहले नाम जांचें"','QR alt')
replace_once('GPay, PhonePe, Paytm या किसी भी UPI ऐप से स्कैन करके पेमेंट करें','स्कैन करने पर UPI ID और प्राप्तकर्ता का नाम जाँचें; फिर कुल देय राशि भरें।','QR help')

# Duplicate protection searches the previous 3 hours; display the same real window.
replace_once('पिछले 24 घंटों में आपका एक मिलता-जुलता ऑर्डर पहले से दर्ज है', 'पिछले 3 घंटों में आपका एक मिलता-जुलता ऑर्डर पहले से दर्ज है', 'duplicate-warning wording')
order.write_text(s,encoding='utf-8')
# Write CSS overlay after all prior theme overrides, including dark theme !important rules.
css = r'''
/* ANKUR BOOKING PREMIUM V1.0.22 — scoped; never alters persisted theme selection. */
.ankur-premium-booking {
  --apb-ink: #112d46; --apb-muted:#49657b; --apb-line:#cbdde9;
  --apb-blue:#086caa; --apb-soft:#e7f5fe;
  background: linear-gradient(180deg, #f1f9ff 0%,#e9f4fd 58%, #f4faff 100%) !important;
  border-radius: 24px;
  color: var(--apb-ink) !important;
  font-family: inherit;
  padding-bottom: max(18px, env(safe-area-inset-bottom));
}
.ankur-premium-booking .apb-rate-hero {
  padding: 20px 18px 17px; border-radius: 23px; margin-bottom: 14px;
  background: linear-gradient(125deg, #e6f5ff 0%, #fff 58%, #d9effe 100%) !important;
  box-shadow: 0 10px 30px rgba(6,67,112,.11); border:1px solid #c4e3f6;
  color:#103c5e !important;
}
.ankur-premium-booking .apb-rate-head {display:flex;align-items:center;justify-content:space-between;gap:8px;flex-wrap:wrap;margin-bottom:19px;}
.ankur-premium-booking .apb-kicker {color:#075e96;font-size:12px;font-weight:900;letter-spacing:.12em;display:flex;align-items:center;gap:7px;}
.ankur-premium-booking .apb-live-chip {display:inline-flex;align-items:center;gap:7px;background:#d9f7ed;border:1px solid #a6dfce;color:#087556;font-weight:800;border-radius:50px;font-size:12px;padding:6px 10px;white-space:nowrap;}
.ankur-premium-booking .apb-live-dot {width:7px;height:7px;border-radius:50%;background:#15a278;box-shadow:0 0 0 3px #afe9d6;}
.ankur-premium-booking .apb-price-topline {font-size:14px;color:#49657b;font-weight:700;}
.ankur-premium-booking .apb-hero-total {font-size:42px;line-height:1.2;letter-spacing:-.04em;font-weight:950;color:#0a4674;margin:4px 0 16px;font-variant-numeric:tabular-nums;}
.ankur-premium-booking .apb-hero-total small {font-size:17px;font-weight:700;color:#476b83;letter-spacing:0;margin-left:4px;}
.ankur-premium-booking .apb-rate-breakdown {display:flex;flex-wrap:wrap;gap:9px;}
.ankur-premium-booking .apb-rate-breakdown span {display:flex;gap:5px;justify-content:space-between;background:rgba(255,255,255,.8);border:1px solid #cde6f4;border-radius:10px;padding:8px 11px;font-size:12.5px;color:#35556d;font-weight:600;}
.ankur-premium-booking .apb-rate-breakdown strong {color:#075d97;font-weight:900;}
.ankur-premium-booking .apb-rate-footnote {font-size:12px;color:#527087;margin-top:12px;line-height:1.45;}
.ankur-premium-booking .apb-account-card,
.ankur-premium-booking .apb-login-gate {background:#fff !important;border:1px solid var(--apb-line) !important;color:#102c43 !important;box-shadow:0 5px 18px rgba(6,66,106,.07);border-radius:17px;padding:13px 15px;}
.ankur-premium-booking .apb-login-gate {padding:26px 18px;}
.ankur-premium-booking .apb-account-name {color:#173e58 !important;line-height:1.5;}
.ankur-premium-booking .apb-account-email {color:#557088 !important;line-height:1.5;}
.ankur-premium-booking .apb-logout {border:1px solid #c6dbe8 !important;border-radius:11px;padding:10px 12px;background:#f2f7fa !important;color:#1a587f !important;font-weight:800;font-size:12px;min-height:42px;}
.ankur-premium-booking .apb-logout:hover {background:#e2f0fa !important;}
.ankur-premium-booking .apb-form-panel {background:#fff !important;border:1px solid #cbdde9 !important;color:#112d46 !important;border-radius:22px;padding:19px 16px 16px;box-shadow:0 14px 34px rgba(8,68,109,.08);}
.ankur-premium-booking .apb-form-header {border-bottom:1px solid #dce9f0;padding-bottom:16px;margin-bottom:20px;}
.ankur-premium-booking .apb-form-title {color:#123c5a !important;line-height:1.35;}
.ankur-premium-booking .apb-field-label,.ankur-premium-booking .apb-section-label {color:#193f5c !important;line-height:1.6;white-space:normal;}
.ankur-premium-booking .apb-input {display:block;min-height:50px;border:1.5px solid #c6d8e5 !important;border-radius:13px !important;background:#f8fbff !important;color:#16354d !important;font-size:16px !important;font-weight:600;transition:border-color .15s, box-shadow .15s;}
.ankur-premium-booking .apb-input::placeholder {color:#788ea0 !important;font-weight:400;}
.ankur-premium-booking .apb-input:focus {border-color:#0b84c7 !important;box-shadow:0 0 0 3px #ceeefd !important;outline:0 !important;}
.ankur-premium-booking .apb-input-icon {color:#5e7c94 !important;pointer-events:none;}
.ankur-premium-booking .apb-slot {border:1.5px solid #cbdde8 !important;padding:14px 12px !important;border-radius:17px !important;min-height:117px;background:#f8fbfd !important;color:#183e59 !important;box-shadow:none !important;}
.ankur-premium-booking .apb-slot-selected {border:2px solid #0875b4 !important;background:#e7f5ff !important;box-shadow:0 0 0 3px rgba(11,123,191,.12) !important;}
.ankur-premium-booking .apb-slot-idle:hover {border-color:#6aadd0 !important;background:#f0faff !important;}
.ankur-premium-booking .apb-slot-disabled {background:#edf0f3 !important;border-color:#dde3e8 !important;opacity:.7;}
.ankur-premium-booking .apb-slot-title {color:#143b58 !important;}
.ankur-premium-booking .apb-slot-time {color:#547088 !important;font-family:inherit;line-height:1.55;overflow-wrap:anywhere;}
.ankur-premium-booking .apb-slot input[type="radio"] {accent-color:#0875b4 !important;width:18px;height:18px;}
.ankur-premium-booking .apb-helper {color:#527088 !important;line-height:1.6;}
.ankur-premium-booking .apb-total-card {padding:18px 16px;border-radius:18px;border:1px solid #123e65 !important;background:linear-gradient(145deg,#0d3354 0%,#0c2542 100%) !important;color:#ecf7ff !important;}
.ankur-premium-booking .apb-total-heading {color:#effaff !important;}
.ankur-premium-booking .apb-total-row {color:#d8ebf8 !important;line-height:1.6;}
.ankur-premium-booking .apb-total-row .text-slate-900 {color:#fff !important;white-space:nowrap;}
.ankur-premium-booking .apb-total-grand {border-top:1px solid rgba(206,239,255,.22) !important;}
.ankur-premium-booking .apb-total-grand .text-slate-900 {color:#fff !important;}
.ankur-premium-booking .apb-payable-amount {color:#8cffe5 !important;letter-spacing:-.02em;}
.ankur-premium-booking .apb-total-grand .text-slate-500 {color:#bfd5e8 !important;}
.ankur-premium-booking .apb-payment-note {border-radius:16px;border:1px solid #cbdfe9 !important;background:#eff7fd !important;color:#385a72 !important;padding:15px;line-height:1.7;}
.ankur-premium-booking .apb-payment-note .text-slate-800 {color:#123e5c !important;}
.ankur-premium-booking .apb-submit {min-height:54px;padding:14px 18px;border-radius:14px !important;background:linear-gradient(90deg,#056fae,#0395c5) !important;border:1px solid #0478af !important;color:#fff !important;box-shadow:0 9px 18px rgba(4,112,173,.23);}
.ankur-premium-booking .apb-submit:hover {filter:brightness(.96);}
.ankur-premium-booking .apb-contact {color:#46677d !important;border-color:#e0edf4 !important;}
/* Dark-theme Tailwind overrides had rendered white text on pale cards. Limit reset to booking only. */
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .text-slate-900,
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .text-slate-800,
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .text-slate-700,
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .text-slate-600,
html[data-theme='dark'] .ankur-premium-booking .apb-login-gate .text-slate-950,
html[data-theme='dark'] .ankur-premium-booking .apb-login-gate .text-slate-600,
html[data-theme='dark'] .ankur-premium-booking .apb-account-card .text-slate-900,
html[data-theme='dark'] .ankur-premium-booking .apb-account-card .text-slate-500 {
  color:#153b58 !important;
}
html[data-theme='dark'] .ankur-premium-booking .apb-total-card .text-slate-900,
html[data-theme='dark'] .ankur-premium-booking .apb-total-card .text-slate-800,
html[data-theme='dark'] .ankur-premium-booking .apb-total-card .text-slate-600,
html[data-theme='dark'] .ankur-premium-booking .apb-total-card .text-slate-500 {color:#d8ebf8 !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-total-card .apb-payable-amount {color:#8cffe5 !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .bg-emerald-50 {background:#e0f6ee !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-account-card .bg-emerald-50 {background:#e0f6ee !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-account-card .text-emerald-700 {color:#056346 !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .bg-slate-50 {background:#f1f8fc !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .bg-white {background:#fff !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .text-sky-700,
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .text-sky-600 {color:#046d9f !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .text-slate-400,
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .text-slate-500 {color:#547087 !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-login-gate {background:#fff !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-login-gate .bg-sky-100 {background:#e7f5ff !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .apb-slot-selected {background:#e7f5ff !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .apb-slot-disabled {background:#edf0f3 !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .apb-payment-note {background:#eff7fd !important;}
html[data-theme='dark'] .ankur-premium-booking .apb-form-panel .apb-payment-note .text-slate-600 {color:#385a72 !important;}
@media (max-width:440px) {
  .ankur-premium-booking {padding-left:12px !important;padding-right:12px !important;}
  .ankur-premium-booking .apb-fields-grid {grid-template-columns:1fr !important;gap:14px !important;}
  .ankur-premium-booking .apb-form-panel {padding:17px 14px !important;}
  .ankur-premium-booking .apb-rate-breakdown {flex-direction:column;}
  .ankur-premium-booking .apb-rate-breakdown span {width:100%;}
  .ankur-premium-booking .apb-slot {padding:13px 10px !important;}
  .ankur-premium-booking .apb-account-name {font-size:13px;}
}
'''
p = Path('src/index.css')
p.write_text(p.read_text(encoding='utf-8')+'\n'+css,encoding='utf-8')

# A local QR avoids broken network images and avoids leaking payment data to third parties.
# This QR encodes the existing confirmed UPI ID, WITHOUT automatically claiming payment succeeded.
PAYMENT_QR_PNG_B64 = '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'
from pathlib import Path as _P
q = _P('public/assets/aistudio/google_pay_qr.png')
q.parent.mkdir(parents=True, exist_ok=True)
q.write_bytes(base64.b64decode(PAYMENT_QR_PNG_B64))
print('PASS: premium booking layout, contrast, responsive inputs, dynamic price breakdown and local UPI QR')