from pathlib import Path
import re

root = Path.cwd()
owner = (root / 'src/components/owner/FeatureSuiteSettings.tsx').read_text()
hub = (root / 'src/components/customer/FeatureHub.tsx').read_text()
service_path = root / 'all-features/backend/featureService.mjs'
service = service_path.read_text() if service_path.exists() else ''
staff = (root / 'src/components/StaffDashboard.tsx').read_text()
tracking = (root / 'src/components/OrderTrackingView.tsx').read_text()
orders = (root / 'src/components/OrderForm.tsx').read_text()
update = (root / 'src/services/appUpdate.ts').read_text()
manifest = (root / 'android/app/src/main/AndroidManifest.xml').read_text()

features = ['loyalty', 'catalog', 'partner', 'subscriptions', 'promotions', 'inventory', 'referral',
            'calculator', 'video', 'reports', 'faq', 'rates', 'support', 'service-area']
assert all(f"['{key}'" in owner for key in features), 'Owner Dashboard must expose all 14 feature switches'
assert 'Object.fromEntries(FEATURES.map(([key]) => [key, false]))' in owner, 'All switches default OFF'
assert 'backgroundColor: \'#ffffff\'' in owner and 'text-slate-900' in owner, 'Feature controls must remain readable in light and dark themes'
if service_path.exists():
    assert all(f"'{key}'" in service for key in features), 'Server validation must accept all 14 feature keys'
assert re.search(r'featureFlags\s*\[\s*f\.id\s*\]\s*===\s*true', hub), 'Customer visibility must honor owner flags'
assert 'pilotIds.includes' not in hub, 'Pilot manifest must not bypass owner switches'
assert 'subscribeOrderDocuments(' in staff and 'product_orders' in staff
assert 'sourceCollection' in staff
assert "collection(db, 'staffOrderViews')" not in staff
assert 'tel:+919580882066' in tracking and '95808 82066' in tracking
assert 'tel:+918896332066' not in tracking
assert 'UPI ID: 8896332066@paytm' in tracking and 'paytm.s26ykus@pty' not in tracking
assert '/assets/paytm-upi-qr.svg' in tracking and 'Copy UPI ID' in tracking
assert 'ankur.pending.order.v1.' in orders and 'pending.fingerprint !== fingerprint' in orders
assert 'Your order details are saved on this device' in orders
assert '/assets/paytm-upi-qr.svg' in orders and '8896332066@paytm' in orders
assert 'VITE_ANDROID_VERSION_CODE' in update and 'validateUpdateManifest(json, currentVersionCode)' in update
assert 'android:allowBackup="false"' in manifest
print('PASS: release audit source contracts (14 switches, staff orders, contact, durable retry, native version, backup)')
