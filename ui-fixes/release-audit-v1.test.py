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
payment = (root / 'src/components/PaymentOptions.tsx').read_text()
config = (root / 'src/config/businessConfig.ts').read_text()
update = (root / 'src/services/appUpdate.ts').read_text()
manifest = (root / 'android/app/src/main/AndroidManifest.xml').read_text()

features = ['loyalty', 'catalog', 'partner', 'subscriptions', 'promotions', 'inventory', 'referral',
            'calculator', 'video', 'reports', 'faq', 'rates', 'support', 'service-area']
assert all(f"['{key}'" in owner for key in features), 'Owner Dashboard must expose all 14 feature switches'
assert 'Object.fromEntries(FEATURES.map(([key]) => [key, false]))' in owner, 'All switches default OFF'
assert 'feature-toggle-row' in owner and 'role="switch"' in owner, 'Feature controls must use readable switch rows'
assert 'featureSuite' in owner and 'httpsCallable' not in owner, 'Feature settings must use owner-authorized Firestore writes on Spark'
if service_path.exists():
    assert all(f"'{key}'" in service for key in features), 'Server validation must accept all 14 feature keys'
assert re.search(r'featureFlags\s*\[\s*f\.id\s*\]\s*===\s*true', hub), 'Customer visibility must honor owner flags'
assert 'pilotIds.includes' not in hub, 'Pilot manifest must not bypass owner switches'
assert 'subscribeOrderDocuments(' in staff and 'product_orders' in staff
assert 'sourceCollection' in staff
assert "collection(db, 'staffOrderViews')" not in staff
assert 'tel:+919580882066' in tracking and '95808 82066' in tracking
assert 'tel:+918896332066' not in tracking
assert 'PaymentOptions' in tracking and '8896332066@paytm' not in tracking
assert 'PaymentOptions' in orders and '8896332066@paytm' not in orders
assert 'ankur.pending.order.v1.' in orders and 'pending.fingerprint !== fingerprint' in orders
assert 'Your order details are saved on this device' in orders
assert 'primaryUpiQr' in payment and 'makePrimaryUpiQr' in payment and 'Copy UPI ID' in payment
assert 'backupUpiUri' in payment and 'Dusre UPI se pay karein' in payment
assert 'paytm.s26ykus@pty' in config and 'ankur.singh332066@okhdfcbank' in config
assert 'Cashfree' in config and '8896332066@paytm' not in orders
assert 'VITE_ANDROID_VERSION_CODE' in update and 'validateUpdateManifest(json, currentVersionCode)' in update
assert 'android:allowBackup="false"' in manifest
print('PASS: release audit source contracts (14 switches, staff orders, contact, durable retry, UPI, native version, backup)')
