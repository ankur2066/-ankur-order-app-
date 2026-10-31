"""Client-only review patch after notifications/apply_patch.py. No APK/deployment."""
from pathlib import Path
import shutil
root=Path('notifications/client-fixes')
assert 'teamCanViewOrders' in Path('src/hooks/useOrderNotifications.ts').read_text()
assert 'ankur-push-arrived' in Path('src/services/orderPush.ts').read_text()
for source,target in [('notificationState.template','src/services/notificationState.ts'),('useOrderNotifications.template','src/hooks/useOrderNotifications.ts'),('pushClient.template','src/services/orderPush.ts')]:
    shutil.copyfile(root/source,target)
p=Path('src/components/Header.tsx');s=p.read_text()
s=s.replace('  LogOut\n','  LogOut,\n  BellRing\n',1)
s=s.replace('  onOpenRulesReview?: () => void;', '  onOpenRulesReview?: () => void;\n  onOpenNotifications?: () => void;\n  unreadCount?: number;',1)
s=s.replace('  userRole,\n}) => {','  userRole,\n  onOpenNotifications,\n  unreadCount = 0,\n}) => {',1)
a='''          <div className="flex items-center gap-2">
            <button'''
b='''          <div className="flex items-center gap-2">
            {onOpenNotifications && <button type="button" onClick={onOpenNotifications}
              className="relative p-2 rounded-xl bg-sky-50 text-sky-800" aria-label="ऑर्डर अपडेट">
              <BellRing className="w-4 h-4" />
              {unreadCount > 0 && <span className="absolute -top-1 -right-1 rounded-full bg-rose-600 text-white text-[9px] px-1">{Math.min(unreadCount,99)}</span>}
            </button>}
            <button'''
assert s.count(a)==1;s=s.replace(a,b,1);p.write_text(s)
p=Path('src/App.tsx');s=p.read_text();a='<Header currentTab="staff-dashboard" setCurrentTab={() => {}} currentUser={currentUser} userRole={role} />';assert s.count(a)==1
s=s.replace(a,'<Header currentTab="staff-dashboard" setCurrentTab={() => {}} currentUser={currentUser} userRole={role} unreadCount={notifications.unreadCount} onOpenNotifications={() => { setNoticesOpen(true); void enableOrderPush(); }} />',1);p.write_text(s)
print('Client review fixes prepared. No deployment or APK modification.')
