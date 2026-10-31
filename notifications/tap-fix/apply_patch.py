"""Notification navigation only. Apply after the existing client review patch."""
from pathlib import Path
import shutil
root=Path('notifications/tap-fix')
for source,target in [('notificationDestination.template','src/services/notificationDestination.ts'),('useNotificationOpening.template','src/hooks/useNotificationOpening.ts'),('NotificationSheet.template','src/components/customer/NotificationSheet.tsx')]:
    shutil.copyfile(root/source,target)
def replace(path,a,b):
    p=Path(path);s=p.read_text();assert s.count(a)==1,(path,a[:80],s.count(a));p.write_text(s.replace(a,b,1))
app='src/App.tsx'
replace(app,"import { useOrderNotifications } from './hooks/useOrderNotifications';","import { useOrderNotifications } from './hooks/useOrderNotifications';\nimport { useNotificationOpening } from './hooks/useNotificationOpening';")
replace(app,'  const [noticesOpen, setNoticesOpen] = useState(false);','''  const [noticesOpen, setNoticesOpen] = useState(false);
  const [notificationMessage, setNotificationMessage] = useState('');
  const [notificationTarget, setNotificationTarget] = useState<{orderId:string} | null>(null);''')
replace(app,"  // Add Android background push;",'''  const openNotification = useNotificationOpening(ready,role,access.permissions.viewOrders,(destination) => {
    if (destination.kind === 'test') {
      setNotificationMessage('यह जाँच वाला TEST संदेश है। परीक्षण order साफ किया गया है या कोई वास्तविक order बनाया ही नहीं गया था।');
      setNoticesOpen(true);
    } else if (destination.kind === 'owner' || destination.kind === 'staff') {
      setNotificationMessage('');
      setNotificationTarget({orderId:destination.orderId});
      setNoticesOpen(false);
      if (destination.kind === 'owner') setCurrentTab('admin');
    } else if (destination.kind === 'tracking') {
      setNotificationMessage('');
      setActiveTrackingId(destination.orderId);
      setActiveTrackingPin(destination.pin);
      setTrackBackTab('my-orders');
      setCurrentTab('track');
      setNoticesOpen(false);
    } else {
      setNotificationMessage(destination.kind === 'denied' ? 'इस order को देखने की अनुमति नहीं है।' : 'इस संदेश में वैध order number नहीं है।');
      setNoticesOpen(true);
    }
  });

  // Add Android background push;''')
replace(app,'''  useEffect(() => {
    const openFromPush = () => setNoticesOpen(true);
    window.addEventListener('ankur-push-opened', openFromPush);
    return () => window.removeEventListener('ankur-push-opened', openFromPush);
  }, []);

''','')
replace(app,'<StaffDashboard currentUser={currentUser} userRole={role} permissions={access.permissions} onLogoutSuccess={() => setCurrentTab(\'home\')} />','<StaffDashboard currentUser={currentUser} userRole={role} permissions={access.permissions} notificationTarget={notificationTarget} onLogoutSuccess={() => setCurrentTab(\'home\')} />')
replace(app,'onClose={() => setNoticesOpen(false)} onMarkAllRead={notifications.markAllRead} />','onClose={() => setNoticesOpen(false)} onMarkAllRead={notifications.markAllRead} onOpenNotice={openNotification} message={notificationMessage} />')
replace(app,'        onMarkAllRead={notifications.markAllRead}\n','        onMarkAllRead={notifications.markAllRead}\n        onOpenNotice={openNotification}\n        message={notificationMessage}\n')
replace(app,'            initialOrderId={activeTrackingId}',"            key={activeTrackingId + '_' + activeTrackingPin}\n            initialOrderId={activeTrackingId}")
replace(app,'          <AdminDashboard\n            currentUser={currentUser}','          <AdminDashboard\n            notificationTarget={notificationTarget}\n            currentUser={currentUser}')
admin='src/components/AdminDashboard.tsx'
replace(admin,'interface AdminDashboardProps {','interface AdminDashboardProps {\n  notificationTarget?: {orderId:string} | null;')
replace(admin,'  onOpenRulesReview\n}) => {','  onOpenRulesReview,\n  notificationTarget\n}) => {')
replace(admin,"  const [dispatchTimeFilter, setDispatchTimeFilter] = useState<'all' | DispatchSlotKey>('all');",'''  const [dispatchTimeFilter, setDispatchTimeFilter] = useState<'all' | DispatchSlotKey>('all');
  useEffect(() => {
    if (!notificationTarget) return;
    setActiveSection('orders'); setOrderFilterTab('all'); setPaymentFilter('all');
    setDispatchTimeFilter('all'); setSelectedDistrict('all'); setSearchQuery(notificationTarget.orderId);
  }, [notificationTarget]);''')
staff='src/components/StaffDashboard.tsx'
replace(staff,'interface StaffDashboardProps {','interface StaffDashboardProps {\n  notificationTarget?: {orderId:string} | null;')
replace(staff,'  onLogoutSuccess \n}) => {','  onLogoutSuccess,\n  notificationTarget\n}) => {')
replace(staff,"  const [districtFilter, setDistrictFilter] = useState<string>('all');",'''  const [districtFilter, setDistrictFilter] = useState<string>('all');
  useEffect(() => {
    if (!notificationTarget) return;
    setSearchQuery(notificationTarget.orderId); setStatusFilter('all'); setSlotFilter('all'); setDistrictFilter('all');
  }, [notificationTarget]);''')
print('Notification card/native tap routing applied; no business fields, Rules or backend changed.')
