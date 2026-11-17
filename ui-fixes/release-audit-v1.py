#!/usr/bin/env python3
"""Apply the 14-feature release audit changes to the reconstructed app."""
from pathlib import Path

ROOT = Path.cwd()

def edit(path, replacements):
    p = ROOT / path
    s = p.read_text(encoding='utf-8')
    for old, new in replacements:
        if new and new in s:
            continue
        if old not in s:
            raise SystemExit(f'PATCH BASELINE MISMATCH: {path}: {old[:100]!r}')
        s = s.replace(old, new, 1)
    p.write_text(s, encoding='utf-8')

edit('src/components/owner/FeatureSuiteSettings.tsx', [
    ('return <section className="c-card border b-line rounded-2xl p-4 space-y-3" aria-labelledby="feature-settings-title">', 'return <section className="c-card bg-white text-slate-900 border b-line rounded-2xl p-4 space-y-3" style={{ color: \'#0f172a\', backgroundColor: \'#ffffff\' }} aria-labelledby="feature-settings-title">'),
    ('className="flex min-h-12 items-center justify-between gap-3 rounded-xl border b-line p-3">', 'className="flex min-h-12 items-center justify-between gap-3 rounded-xl border b-line p-3 bg-white text-slate-900" style={{ color: \'#0f172a\', backgroundColor: \'#ffffff\' }}>'),
    ("  ['referral', 'Referral Share'],\n] as const;", "  ['referral', 'Referral Share'],\n  ['calculator', 'Ice Calculator'],\n  ['video', 'Video Idea Builder'],\n  ['reports', 'Reports Hub'],\n  ['faq', 'FAQ / How-to'],\n  ['rates', 'Rate Card'],\n  ['support', 'Support Hub'],\n  ['service-area', 'Service Area'],\n] as const;"),
    ("const OFF: FeatureFlags = { loyalty: false, catalog: false, partner: false, subscriptions: false, promotions: false, inventory: false, referral: false };", "const OFF: FeatureFlags = Object.fromEntries(FEATURES.map(([key]) => [key, false])) as FeatureFlags;"),
    ("All seven business features start off.", "All fourteen optional features start off."),
])

backend_service = ROOT / 'all-features/backend/featureService.mjs'
if backend_service.exists():
    edit('all-features/backend/featureService.mjs', [
        ("const keys=['loyalty','catalog','partner','subscriptions','promotions','inventory','referral'];", "const keys=['loyalty','catalog','partner','subscriptions','promotions','inventory','referral','calculator','video','reports','faq','rates','support','service-area'];"),
    ])

edit('src/components/customer/FeatureHub.tsx', [
    ("const OWNER_SWITCHED_FEATURES=new Set(['loyalty','catalog','partner','subscriptions','promotions','inventory','referral']);", "const OWNER_SWITCHED_FEATURES=new Set(['loyalty','catalog','partner','subscriptions','promotions','inventory','referral','calculator','video','reports','faq','rates','support','service-area']);"),
])

# Remove the unused pilot-manifest visibility path so switches are the only
# customer unlock for optional features.
p = ROOT / 'src/components/customer/FeatureHub.tsx'
s = p.read_text(encoding='utf-8')
s = s.replace("import {PILOT_FIRST_FIVE,fetchPilotFeatures} from '../../utils/pilotRollout';\n", '')
s = s.replace("import {ANDROID_VERSION_CODE} from '../../services/appUpdate';\n", '')
start = s.find('  const visible=useMemo(')
end = s.find('  const selected=visible.find', start)
if start < 0 or end < 0:
    raise SystemExit('PATCH BASELINE MISMATCH: could not install owner-switch-only visibility gate')
replacement = "  const visible=useMemo(()=>FEATURES.filter(f=>(!f.owner||role==='admin')&&\n    (!allowed||allowed.includes(f.id))&&\n    (role==='admin'||featureFlags[f.id]===true)),[role,allowed,featureFlags]);\n"
s = s[:start] + replacement + s[end:]
if 'function usePilotFeatureIds(){' in s:
    start = s.index('// Pilot display gate:')
    end = s.index('\nexport const FeatureHub:', start)
    s = s[:start] + s[end+1:]
    s = s.replace('  const pilotIds=usePilotFeatureIds();\n', '')
    p.write_text(s, encoding='utf-8')

# The current home screen renders the daily winner strip; keep its import
# explicit when reconstructing from legacy ZIPs that already contain the JSX.
app_path = ROOT / 'src/App.tsx'
app_text = app_path.read_text(encoding='utf-8')
winner_component = ROOT / 'src/components/customer/DailyWinner.tsx'
winner_template = ROOT / 'ui-fixes/DailyWinner.tsx.template'
if not winner_component.exists() and winner_template.exists():
    winner_component.parent.mkdir(parents=True, exist_ok=True)
    winner_component.write_text(winner_template.read_text(encoding='utf-8'), encoding='utf-8')
if '<DailyWinnerBanner' in app_text and 'import { DailyWinnerBanner }' not in app_text:
    if winner_component.exists():
        app_text = app_text.replace("import { FeatureHub } from './components/customer/FeatureHub';", "import { DailyWinnerBanner } from './components/customer/DailyWinner';\nimport { FeatureHub } from './components/customer/FeatureHub';")
        if 'import { DailyWinnerBanner }' not in app_text:
            raise SystemExit('PATCH BASELINE MISMATCH: could not import DailyWinnerBanner')
    else:
        raise SystemExit('PATCH BASELINE MISMATCH: Daily Winner component template missing')
    app_path.write_text(app_text, encoding='utf-8')

edit('android/app/src/main/AndroidManifest.xml', [("android:allowBackup=\"true\"", "android:allowBackup=\"false\"")])
edit('src/components/FloatingContactButtons.tsx', [("tel:+918896332066", "tel:+919580882066")])
tracking_path = ROOT / 'src/components/OrderTrackingView.tsx'
tracking_source = tracking_path.read_text(encoding='utf-8')
tracking_source = tracking_source.replace('tel:+918896332066', 'tel:+919580882066')
tracking_source = tracking_source.replace('कॉल करें (+91 8896332066)', 'Call (95808 82066)')
qr_start = tracking_source.find('          {/* Barcode Display */}')
qr_end = tracking_source.find('          {/* Payment Status */}', qr_start)
if qr_start < 0 and 'QR is unavailable here.' in tracking_source:
    pass
elif qr_start < 0 or qr_end < 0:
    raise SystemExit('PATCH BASELINE MISMATCH: tracking payment panel markers missing')
else:
    tracking_source = tracking_source[:qr_start] + '''          {/* Payment instructions: no QR image is shipped in the app bundle. */}
          <div className="p-3 border rounded-xl bg-slate-50 text-center space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Scan to Pay (Paytm)</span>
            <p className="text-xs text-slate-600">QR is unavailable here. Pay using this UPI ID and verify the recipient in your UPI app.</p>
            <p className="text-xs text-slate-700 font-mono">UPI ID: 8896332066@paytm</p>
            <button type="button" onClick={() => { void navigator.clipboard?.writeText('8896332066@paytm'); }} className="px-3 py-1 rounded-lg bg-white text-slate-800 border border-slate-300 text-xs font-semibold">Copy UPI ID</button>
          </div>

''' + tracking_source[qr_end:]
if 'tel:+919580882066' not in tracking_source or '95808 82066' not in tracking_source:
    raise SystemExit('PATCH BASELINE MISMATCH: tracking call destination missing')
tracking_path.write_text(tracking_source, encoding='utf-8')

# Checkout referenced a QR asset that is not in the repository. Keep payment
# transparent and use the same existing business UPI ID in the manual fallback.
order_form_path = ROOT / 'src/components/OrderForm.tsx'
form_source = order_form_path.read_text(encoding='utf-8')
form_marker = form_source.find('{/* Payment Barcode / QR Code */}')
form_start = form_source.rfind('\n', 0, form_marker) + 1 if form_marker >= 0 else -1
form_end = form_source.find('                  <div className="bg-white border border-sky-200', form_start)
if form_start < 0 and 'QR image is unavailable.' in form_source:
    pass
elif form_start < 0 or form_end < 0:
    raise SystemExit('PATCH BASELINE MISMATCH: checkout QR panel markers missing')
else:
    form_source = form_source[:form_start] + '''                  <div className="bg-white border border-sky-100 rounded-xl p-3 text-center text-xs text-slate-700">
                      QR image is unavailable. Use the UPI ID below and verify the recipient in your payment app.
                  </div>

''' + form_source[form_end:]
order_form_path.write_text(form_source, encoding='utf-8')

# Staff orders are read from the existing rules-authorized order collections.
# Customer phone numbers stay out of the UI projection and are fetched only by
# the existing one-order verified contact callable.
p = ROOT / 'src/components/StaffDashboard.tsx'
s = p.read_text(encoding='utf-8')
if 'subscribeOrderDocuments' not in s.split('interface StaffDashboardProps', 1)[0]:
    s = s.replace("import { quantityText } from '../billing/unitBilling';", "import { quantityText } from '../billing/unitBilling';\nimport { subscribeOrderDocuments } from '../services/productOrders';")
start = -1
for marker in [
    "    // Permission-checked listener combines standard and enabled unit orders.",
    "    // The existing deployed Rules",
    "    const unsubscribe = subscribeOrderDocuments({}, (snapshot) => {",
    "    const ordersCol = collection(db, 'staffOrderViews');",
    "    const bySource = new Map<string, Order[]>();",
    "    const ordersCol = collection(db, 'orders');",
]:
    candidate = s.find(marker)
    if candidate >= 0 and (start < 0 or candidate < start):
        start = candidate
end = s.find("\n  }, [canView]);", start)
if start < 0 or end < 0:
    raise SystemExit('PATCH BASELINE MISMATCH: staff order listener block missing')
new = '''    // Permission-checked listener combines standard and enabled unit orders.
    // The projection omits phone and address; contact is loaded one order at a time.
    const unsubscribe = subscribeOrderDocuments({}, (snapshot) => {
      const list: Order[] = snapshot.docs.map((docSnap: any) => {
        const value = docSnap.data();
        const sourceCollection = docSnap.ref?.parent?.id === 'product_orders' ? 'product_orders' : 'orders';
        return {
          orderId: value.orderId || docSnap.id, sourceCollection,
          customerName: value.customerName || '', city: value.city || value.district || '',
          district: value.city || value.district || '', address: '',
          productName: value.productName || 'Dry Ice', dispatchTiming: value.dispatchTiming || '',
          status: value.status, paymentStatus: value.paymentStatus || '',
          paymentNotes: value.paymentNotes || '', quantityKg: typeof value.quantityKg === 'number' ? value.quantityKg : 0,
          billingVersion: value.billingVersion === 2 ? 2 : undefined,
          billing: value.billingVersion === 2 ? {unit:value.billing?.unit || 'piece', quantityUnits:value.billing?.quantityUnits || 0} : undefined,
          createdAt: value.createdAt, updatedAt: value.updatedAt, selfPickup: value.selfPickup || undefined,
        } as unknown as Order;
      }).filter((order: Order) => !order.isTrash);
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return timeB - timeA;
      });
      setOrders(list);
      setLoading(false);
    }, (error) => {
      setLoading(false);
      try { handleFirestoreError(error, OperationType.LIST, 'orders'); }
      catch (e: any) { setErrorMsg('ऑर्डर लोड करने में समस्या: ' + (e?.message || 'Permission denied')); }
    });
    return () => unsubscribe();
'''
s = s[:start] + new + s[end:]
p.write_text(s, encoding='utf-8')

# The signed workflow injects the exact Gradle version into the web bundle, so
# the checker and installed APK compare the same build number.
edit('src/services/appUpdate.ts', [
    ("export async function checkForUpdate(fetcher: typeof fetch = fetch): Promise<UpdateRelease | null> {", "export async function checkForUpdate(fetcher: typeof fetch = fetch, currentVersionCode = ANDROID_VERSION_CODE): Promise<UpdateRelease | null> {"),
    ("return validateUpdateManifest(json);", "return validateUpdateManifest(json, currentVersionCode);"),
])
app_update = ROOT / 'src/services/appUpdate.ts'
app_text = app_update.read_text(encoding='utf-8')
app_text, version_matches = __import__('re').subn(
    r"export const ANDROID_VERSION_CODE = [^;]+;\r?\nexport const ANDROID_VERSION_NAME = [^;]+;",
    "export const ANDROID_VERSION_CODE = Number(import.meta.env?.VITE_ANDROID_VERSION_CODE || 65);\nexport const ANDROID_VERSION_NAME = import.meta.env?.VITE_ANDROID_VERSION_NAME || '1.0.65';",
    app_text, count=1
)
if version_matches != 1:
    raise SystemExit('PATCH BASELINE MISMATCH: app update version constant is not recognized')
app_update.write_text(app_text, encoding='utf-8')
update_template = ROOT / 'updates/appUpdate.template'
if update_template.exists():
    edit('updates/appUpdate.template', [
        ("export const ANDROID_VERSION_CODE = 65;\nexport const ANDROID_VERSION_NAME = '1.0.65';", "export const ANDROID_VERSION_CODE = Number(import.meta.env?.VITE_ANDROID_VERSION_CODE || 65);\nexport const ANDROID_VERSION_NAME = import.meta.env?.VITE_ANDROID_VERSION_NAME || '1.0.65';"),
        ("export const ANDROID_VERSION_CODE = 47;\nexport const ANDROID_VERSION_NAME = '1.0.47';", "export const ANDROID_VERSION_CODE = Number(import.meta.env?.VITE_ANDROID_VERSION_CODE || 65);\nexport const ANDROID_VERSION_NAME = import.meta.env?.VITE_ANDROID_VERSION_NAME || '1.0.65';"),
        ("export async function checkForUpdate(fetcher: typeof fetch = fetch): Promise<UpdateRelease | null> {", "export async function checkForUpdate(fetcher: typeof fetch = fetch, currentVersionCode = ANDROID_VERSION_CODE): Promise<UpdateRelease | null> {"),
        ("return validateUpdateManifest(json);", "return validateUpdateManifest(json, currentVersionCode);"),
    ])

# Persist the unsent booking and stable id/pin before the network write. A retry
# after timeout/offline uses the same Firestore document ids and cannot create a
# duplicate order; submitting again is the explicit retry action.
p = ROOT / 'src/components/OrderForm.tsx'
s = p.read_text(encoding='utf-8')
anchor = "  // Form fields\n"
if 'ankur.pending.order.v1.' not in s:
    s = s.replace(anchor, anchor + "  const pendingOrderStorageKey = 'ankur.pending.order.v1.' + (currentUser?.uid || 'guest');\n", 1)
restore = "  // Custom-only quantity input allowing positive decimals (e.g. 2, 7, 10, 27.5); default 10\n  const [quantityInput, setQuantityInput] = useState<string>('10');"
restore_new = restore + "\n  useEffect(() => {\n    try {\n      const raw = localStorage.getItem(pendingOrderStorageKey);\n      if (!raw) return;\n      const draft = JSON.parse(raw);\n      if (!draft || draft.state !== 'pending' || !draft.form) return;\n      setCustomerName(typeof draft.form.customerName === 'string' ? draft.form.customerName : '');\n      setCustomerPhone(typeof draft.form.customerPhone === 'string' ? draft.form.customerPhone : '');\n      setAddress(typeof draft.form.address === 'string' ? draft.form.address : '');\n      setQuantityInput(typeof draft.form.quantityInput === 'string' ? draft.form.quantityInput : '10');\n      if (typeof draft.form.dispatchTiming === 'string') setDispatchTiming(draft.form.dispatchTiming);\n      setErrorMsg(document.documentElement.dataset.appLanguage === 'hi' ? 'ऑर्डर सेव है, लेकिन भेजने के लिए इंटरनेट चाहिए। जानकारी जाँचें और दोबारा प्रयास करें।' : 'A saved order is waiting for connection. Review the details and tap Place Order to retry.');\n    } catch { /* Ignore invalid or unavailable local storage. */ }\n  // Restore only once for this account.\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);"
if "Restore only once for this account." not in s:
    assert restore in s
    s = s.replace(restore, restore_new, 1)
old_id = "      // Standardized Order ID: ADI-YYYYMMDD-XXXX\n      const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');\n      const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();\n      const generatedOrderId = `ADI-${dateSegment}-${randomSuffix}`;\n      \n      // 6-digit Secret Tracking PIN\n      const generatedPin = Math.floor(100000 + Math.random() * 900000).toString();"
new_id = "      // Reuse a saved order identity if the form still matches the pending draft.\n      const fingerprint = JSON.stringify([customerName.trim(), cleanPhone, cleanAddress, parsedQty, dispatchTiming, selectedProduct?.id || 'dry-ice']);\n      let pending: any = null;\n      try { pending = JSON.parse(localStorage.getItem(pendingOrderStorageKey) || 'null'); } catch { pending = null; }\n      if (!pending || pending.fingerprint !== fingerprint || typeof pending.orderId !== 'string' || typeof pending.trackingPin !== 'string') {\n        const dateSegment = new Date().toISOString().slice(0, 10).replace(/-/g, '');\n        const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();\n        pending = { state: 'pending', fingerprint, orderId: `ADI-${dateSegment}-${randomSuffix}`, trackingPin: Math.floor(100000 + Math.random() * 900000).toString() };\n      }\n      pending.state = 'pending';\n      pending.form = { customerName, customerPhone, address, quantityInput, dispatchTiming };\n      try { localStorage.setItem(pendingOrderStorageKey, JSON.stringify(pending)); } catch { /* In-memory retry remains available. */ }\n      const generatedOrderId = pending.orderId;\n      const generatedPin = pending.trackingPin;"
if new_id not in s:
    assert old_id in s
    s = s.replace(old_id, new_id, 1)
s = s.replace("      onOrderSuccess(generatedOrderId, generatedPin);", "      try { localStorage.removeItem(pendingOrderStorageKey); } catch {}\n      onOrderSuccess(generatedOrderId, generatedPin);", 1)
s = s.replace("        setErrorMsg('डेटाबेस में ऑर्डर सेव करने में त्रुटि आई। कृपया दोबारा प्रयास करें या कॉल करें.');", "        setErrorMsg('Connection failed. Your order details are saved on this device. Check the connection and tap Place Order to retry.');") if "कृपया दोबारा प्रयास करें या कॉल करें." in s else s
if "Your order details are saved on this device" not in s:
    old_msg = "setErrorMsg('डेटाबेस में ऑर्डर सेव करने में त्रुटि आई। कृपया दोबारा प्रयास करें या कॉल करें।');"
    assert old_msg in s
    s = s.replace(old_msg, "setErrorMsg(document.documentElement.dataset.appLanguage === 'hi' ? 'इंटरनेट कनेक्शन नहीं है। ऑर्डर की जानकारी इस फोन में सेव है। इंटरनेट आने पर दोबारा प्रयास करें।' : 'Connection failed. Your order details are saved on this device. Check the connection and tap Place Order to retry.');", 1)
p.write_text(s, encoding='utf-8')

print('PASS: 14 feature switches, staff order listeners, tracking contact, offline retry, native version, and backup policy patched')
