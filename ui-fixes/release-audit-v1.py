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

edit('android/app/src/main/AndroidManifest.xml', [("android:allowBackup=\"true\"", "android:allowBackup=\"false\"")])
edit('src/components/FloatingContactButtons.tsx', [("tel:+918896332066", "tel:+919580882066")])
edit('src/components/OrderTrackingView.tsx', [
    ("import type { OrderTracking, OrderStatus } from '../types';", "import type { OrderTracking, OrderStatus } from '../types';\nimport { useLanguage } from '../context/LanguageContext';"),
    ("  const [searchId, setSearchId] = useState(initialOrderId || '');", "  const { language } = useLanguage();\n  const isHindi = language === 'hi';\n  const [searchId, setSearchId] = useState(initialOrderId || '');"),
    ("href=\"tel:+918896332066\"", "href=\"tel:+919580882066\""),
    ("title=\"कॉल करें (+91 8896332066)\"", "title={isHindi ? 'कॉल करें (95808 82066)' : 'Call (95808 82066)'}"),
    ("<span>कॉल</span>", "<span>{isHindi ? 'कॉल' : 'Call'}</span>"),
])

# Staff orders are read from the existing rules-authorized order collections.
# Customer phone numbers stay out of the UI projection and are fetched only by
# the existing one-order verified contact callable.
p = ROOT / 'src/components/StaffDashboard.tsx'
s = p.read_text(encoding='utf-8')
start = s.index('    // Strictly staff-safe projection documents; never listen to raw orders.')
end = s.index('\n  }, [canView]);', start)
new = '''    // The existing deployed Rules grant viewOrders users read access to these
    // collections. Keep the displayed projection PII-safe; phone is retrieved
    // only by the one-order verified contact callable above.
    const bySource = new Map<string, Order[]>();
    const publish = () => {
      const list = [...bySource.values()].flat();
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
        const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
        return timeB - timeA;
      });
      setOrders(list);
      setLoading(false);
    };
    const mapOrders = (sourceCollection: 'orders' | 'product_orders', snapshot: any) => {
      bySource.set(sourceCollection, snapshot.docs.map((docSnap: any) => {
        const value = docSnap.data();
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
      }));
      publish();
    };
    const onError = (error: unknown, source: string) => {
      setLoading(false);
      try { handleFirestoreError(error, OperationType.LIST, source); }
      catch { setErrorMsg('अभी स्टाफ ऑर्डर लोड नहीं हो सके। मालिक से संपर्क करें।'); }
    };
    const stopOrders = onSnapshot(collection(db, 'orders'), snap => mapOrders('orders', snap), err => onError(err, 'orders'));
    const stopProducts = onSnapshot(collection(db, 'product_orders'), snap => mapOrders('product_orders', snap), err => onError(err, 'product_orders'));
    return () => { stopOrders(); stopProducts(); };
'''
s = s[:start] + new + s[end:]
p.write_text(s, encoding='utf-8')

# The signed workflow injects the exact Gradle version into the web bundle, so
# the checker and installed APK compare the same build number.
edit('src/services/appUpdate.ts', [
    ("export const ANDROID_VERSION_CODE = 63;\nexport const ANDROID_VERSION_NAME = '10.0.63';", "export const ANDROID_VERSION_CODE = Number(import.meta.env?.VITE_ANDROID_VERSION_CODE || 64);\nexport const ANDROID_VERSION_NAME = import.meta.env?.VITE_ANDROID_VERSION_NAME || '10.0.64';"),
    ("export async function checkForUpdate(fetcher: typeof fetch = fetch): Promise<UpdateRelease | null> {", "export async function checkForUpdate(fetcher: typeof fetch = fetch, currentVersionCode = ANDROID_VERSION_CODE): Promise<UpdateRelease | null> {"),
    ("return validateUpdateManifest(json);", "return validateUpdateManifest(json, currentVersionCode);"),
])
update_template = ROOT / 'updates/appUpdate.template'
if update_template.exists():
    edit('updates/appUpdate.template', [
        ("export const ANDROID_VERSION_CODE = 47;\nexport const ANDROID_VERSION_NAME = '1.0.47';", "export const ANDROID_VERSION_CODE = Number(import.meta.env?.VITE_ANDROID_VERSION_CODE || 64);\nexport const ANDROID_VERSION_NAME = import.meta.env?.VITE_ANDROID_VERSION_NAME || '10.0.64';"),
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
restore_new = restore + "\n  useEffect(() => {\n    try {\n      const raw = localStorage.getItem(pendingOrderStorageKey);\n      if (!raw) return;\n      const draft = JSON.parse(raw);\n      if (!draft || draft.state !== 'pending' || !draft.form) return;\n      setCustomerName(typeof draft.form.customerName === 'string' ? draft.form.customerName : '');\n      setCustomerPhone(typeof draft.form.customerPhone === 'string' ? draft.form.customerPhone : '');\n      setAddress(typeof draft.form.address === 'string' ? draft.form.address : '');\n      setQuantityInput(typeof draft.form.quantityInput === 'string' ? draft.form.quantityInput : '10');\n      if (typeof draft.form.dispatchTiming === 'string') setDispatchTiming(draft.form.dispatchTiming);\n      setErrorMsg('A saved order is waiting for connection. Review the details and tap Place Order to retry.');\n    } catch { /* Ignore invalid or unavailable local storage. */ }\n  // Restore only once for this account.\n  // eslint-disable-next-line react-hooks/exhaustive-deps\n  }, []);"
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
    s = s.replace(old_msg, "setErrorMsg('Connection failed. Your order details are saved on this device. Check the connection and tap Place Order to retry.');", 1)
p.write_text(s, encoding='utf-8')

print('PASS: 14 feature switches, staff order listeners, tracking contact, offline retry, native version, and backup policy patched')
