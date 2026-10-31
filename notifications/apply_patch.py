#!/usr/bin/env python3
"""v1.0.29: connect EXISTING live Firestore notification UI to native FCM.
Only patches the extracted working-copy after all v1.0.28 UI patches.
Firebase production rules/functions are packaged for review, NOT deployed by this script.
"""
from pathlib import Path
import re
import shutil

def replace_once(src, old, new, label):
    count = src.count(old)
    assert count == 1, f"{label}: expected 1 anchor, found {count}"
    return src.replace(old, new, 1)

# 1. Native push registration, no replacement of original order tracking.
destination = Path('src/services/orderPush.ts')
destination.parent.mkdir(parents=True, exist_ok=True)
assert not destination.exists()
shutil.copyfile('notifications/pushClient.ts', destination)

# 2. App-wide push lifecycle, existing in-app bell/notification panel preserved.
p = Path('src/App.tsx')
s = p.read_text(encoding='utf-8')
s = replace_once(s,
    "import { useOrderNotifications } from './hooks/useOrderNotifications';",
    "import { useOrderNotifications } from './hooks/useOrderNotifications';\n"
    "import { configureOrderPush, subscribeNewOrderPush, enableOrderPush } from './services/orderPush';",
    'push client import')
s = replace_once(s,
    'const notifications = useOrderNotifications(isFieldTeam ? null : currentUser);',
    "const notifications = useOrderNotifications(currentUser, role === 'admin' || (isFieldTeam && access.permissions.viewOrders));",
    'existing notices hook')
s = replace_once(s,
    """  useEffect(() => {
    const unsub = subscribeToRates((loaded) => setRates(loaded));
    return () => unsub();
  }, []);""",
    """  useEffect(() => {
    const unsub = subscribeToRates((loaded) => setRates(loaded));
    return () => unsub();
  }, []);

  // Add Android background push; Firebase onSnapshot remains the in-app source of truth.
  useEffect(() => {
    if (!ready) return;
    void configureOrderPush(currentUser, role, access.permissions.viewOrders);
  }, [ready, currentUser?.uid, role, access.permissions.viewOrders]);

  useEffect(() => {
    const openFromPush = () => setNoticesOpen(true);
    window.addEventListener('ankur-push-opened', openFromPush);
    return () => window.removeEventListener('ankur-push-opened', openFromPush);
  }, []);""",
    'native registration effect')
s = replace_once(s,
    """  const handleOrderSuccess = (orderId: string, trackingPin: string) => {
    setActiveTrackingId(orderId);
    setActiveTrackingPin(trackingPin);
  };""",
    """  const handleOrderSuccess = (orderId: string, trackingPin: string) => {
    setActiveTrackingId(orderId);
    setActiveTrackingPin(trackingPin);
    // The real Firestore commit completed before this callback; guest customers can subscribe.
    void subscribeNewOrderPush(orderId, trackingPin);
  };""",
    'subscribe after order success')
s = replace_once(s,
    'onOpenNotifications={() => setNoticesOpen(true)}',
    'onOpenNotifications={() => { setNoticesOpen(true); void enableOrderPush(); }}',
    'bell opens panel and requests permission')

# Staff previously had NO notification-sheet access due to early return.
staff_anchor = """        <Header currentTab="staff-dashboard" setCurrentTab={() => {}} currentUser={currentUser} userRole={role} />"""
assert staff_anchor in s
s = replace_once(s, staff_anchor,
    """        {notifications.toast && (
          <button type="button" role="status"
            onClick={() => { notifications.clearToast(); setNoticesOpen(true); }}
            className="fixed top-2 inset-x-3 z-[70] bg-sky-50 border border-sky-300 rounded-xl p-3 text-left shadow-lg">
            <strong className="block text-sm">{notifications.toast.title}</strong>
            <span className="text-xs">{notifications.toast.body}</span>
          </button>
        )}
""" + staff_anchor, 'staff notification toast')
staff_end = """          <StaffDashboard currentUser={currentUser} userRole={role} permissions={access.permissions} onLogoutSuccess={() => setCurrentTab('home')} />
        </main>"""
s = replace_once(s, staff_end,
    staff_end + """
        <NotificationSheet open={noticesOpen} notices={notifications.notices}
          onClose={() => setNoticesOpen(false)} onMarkAllRead={notifications.markAllRead} />""",
    'staff notification panel')
s = replace_once(s, """{notifications.toast && currentTab !== 'admin' && (""",
    """{notifications.toast && (""", 'owner notification toast')
p.write_text(s, encoding='utf-8')

# 3. Keep status tracking & bell untouched; add owner/staff realtime new-order alerts.
p = Path('src/hooks/useOrderNotifications.ts')
s = p.read_text(encoding='utf-8')
s = replace_once(s, ' * In-app order notifications.', ' * In-app order notifications + Android native-push message bridge.', 'existing hook doc')
s = replace_once(s,
    """ * closed. Real push needs Firebase Cloud Messaging + a server/Cloud Function.""",
    """ * closed. Native FCM is an additive optional backend in notifications/.""",
    'honest existing limitation')
s = replace_once(s,
    'export function useOrderNotifications(currentUser: User | null) {',
    'export function useOrderNotifications(currentUser: User | null, teamCanViewOrders = false) {',
    'team eligibility')
s = replace_once(s, '.slice(-MAX_WATCHED)', '.slice(0, MAX_WATCHED)', 'newest locally placed orders')
anchor = """  const markAllRead = useCallback(() => {"""
assert s.count(anchor) == 1
hook = """  // Reuse the same notification bell for owner and staff; never alert for initial
  // snapshot or for orders already on the device. Permissions are checked server-side.
  useEffect(() => {
    if (!teamCanViewOrders || !currentUser) return;
    let readyForChanges = false;
    const statusByOrder = new Map<string, string>();
    const unsub = onSnapshot(collection(db, 'orders'), snapshot => {
      for (const change of snapshot.docChanges()) {
        const order = change.doc.data() as any;
        const id = String(order.orderId || change.doc.id);
        if (order.isTrash) continue;
        const prior = statusByOrder.get(id);
        if (readyForChanges && change.type === 'added') {
          pushNotice({
            orderId: id, title: 'New Order Received',
            body: id + ' · ' + String(order.quantityKg || '') + ' KG · ' + String(order.city || order.district || ''),
          });
        } else if (readyForChanges && change.type === 'modified' && prior && prior !== order.status) {
          pushNotice({
            orderId: id, title: STATUS_TEXT[order.status as OrderStatus] || 'Order Update',
            body: id + ' status changed.',
          });
        }
        statusByOrder.set(id, String(order.status));
      }
      readyForChanges = true;
    }, err => console.warn('Team order alerts unavailable:', err));
    return () => unsub();
  }, [currentUser?.uid, teamCanViewOrders, pushNotice]);

  // Android foreground FCM messages reach the same established in-app notice list.
  useEffect(() => {
    const receivePush = (event: Event) => {
      const payload = (event as CustomEvent).detail || {};
      pushNotice({
        orderId: String(payload.orderId || '').slice(0, 64),
        title: String(payload.title || 'Order Update').slice(0, 90),
        body: String(payload.body || '').slice(0, 180),
      });
    };
    window.addEventListener('ankur-push-arrived', receivePush);
    return () => window.removeEventListener('ankur-push-arrived', receivePush);
  }, [pushNotice]);

"""
s = s.replace(anchor, hook + anchor, 1)
p.write_text(s, encoding='utf-8')

# 4. Do not leave the old incorrect blanket claim that push can NEVER work.
p = Path('src/components/customer/NotificationSheet.tsx')
s = p.read_text(encoding='utf-8')
s = replace_once(s,
    'ऐप बंद होने पर सूचना नहीं आती।',
    'फोन पर Push Notifications के लिए अनुमति और सर्वर का सक्रिय होना जरूरी है।',
    'notification empty-state accuracy')
p.write_text(s, encoding='utf-8')

# 5. Explicit Android 13+ runtime permission. Capacitor Push Notifications
# automatically registers FirebaseMessagingService through plugin manifest.
manifest = Path('android/app/src/main/AndroidManifest.xml')
s = manifest.read_text(encoding='utf-8')
s = replace_once(s,
    '<uses-permission android:name="android.permission.INTERNET" />',
    '<uses-permission android:name="android.permission.INTERNET" />\n'
    '    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />',
    'Android permission')
manifest.write_text(s, encoding='utf-8')

# 6. Prepare the Firebase backend in working copy, align named Firestore DB.
backend = Path('firebase-functions/index.js')
s = backend.read_text(encoding='utf-8')
s = replace_once(s,
    "import { initializeApp } from 'firebase-admin/app';",
    "import { initializeApp, getApp } from 'firebase-admin/app';",
    'backend admin init import')
s = replace_once(s,
    'const db = getFirestore();',
    "const db = getFirestore(getApp(), 'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673');",
    'backend named Firestore')
s += """\n// Prepared FCM functions: deploy only after rules/security/provider review.
export { notifyNewAnkurOrder, notifyAnkurOrderProgress, notifyAnkurSelfPickup } from './notificationPush.js';\n"""
backend.write_text(s, encoding='utf-8')
shutil.copyfile('notifications/notificationPush.js', 'firebase-functions/notificationPush.js')

# 7. Add only new collection rules, retain all existing order/auth/PII access rules.
rules = Path('firestore.rules')
s = rules.read_text(encoding='utf-8')
assert 'match /push_owner_devices/{deviceId}' not in s
ending = '\n  }\n}'
assert s.endswith(ending) or s.endswith(ending + '\n'), 'Unknown Firestore rules footer'
position = s.rfind(ending)
s = s[:position] + '\n' + Path('notifications/firestore-push-fragment.rules').read_text(encoding='utf-8') + s[position:]
rules.write_text(s, encoding='utf-8')

# Core order save logic, payment maths and existing Firestore listeners must remain intact.
app = Path('src/App.tsx').read_text(encoding='utf-8')
form = Path('src/components/OrderForm.tsx').read_text(encoding='utf-8')
assert 'onOrderSuccess={handleOrderSuccess}' in app
assert 'await batch.commit()' in form
assert 'approvedAmount(' in form  # v127 pricing extension retained
assert 'notifyAnkurOrderProgress' in backend.read_text(encoding='utf-8')
print('PASS v1.0.29: existing in-app alerts retained; Android push registration, scoped tokens, customer/owner/staff events prepared.')
print('NOT DEPLOYED: New Firestore rules + Firebase functions must be separately tested and activated.')
