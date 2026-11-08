from pathlib import Path

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
if service_path.exists():
    assert all(f"'{key}'" in service for key in features), 'Server validation must accept all 14 feature keys'
assert 'role===\'admin\'||featureFlags[f.id]===true' in hub, 'Customer visibility must honor owner flags'
assert 'pilotIds.includes' not in hub, 'Pilot manifest must not bypass owner switches'
assert "collection(db, 'orders')" in staff and "collection(db, 'product_orders')" in staff
assert "collection(db, 'staffOrderViews')" not in staff
assert 'customerPhone:' not in staff[staff.index('const mapOrders'):staff.index('const onError')], 'Phone must remain hidden in staff order list'
assert 'tel:+919580882066' in tracking and '95808 82066' in tracking
assert 'tel:+918896332066' not in tracking
assert 'ankur.pending.order.v1.' in orders and 'pending.fingerprint !== fingerprint' in orders
assert 'Your order details are saved on this device' in orders
assert 'App.getInfo()' in update and 'validateUpdateManifest(json, installedVersionCode)' in update
assert 'android:allowBackup="false"' in manifest
print('PASS: release audit source contracts (14 switches, staff orders, contact, durable retry, native version, backup)')
