"""Build a review-only candidate from the exact captured live Rules. Never deploys."""
from pathlib import Path
import hashlib
import difflib

ROOT = Path(__file__).resolve().parent
BASE_SHA = '51a3dba894b2fb4e7c27c893e4dcf0044e48af97fd091d127895c323350006b4'
base = (ROOT / 'firestore.baseline.rules').read_text()
assert hashlib.sha256(base.encode()).hexdigest() == BASE_SHA
s = base
start = s.index('    // Admin privileges strictly')
end = s.index('    function incoming()', start)
s = s[:start] + '''    // Verified owner only. A profile role may never grant owner authority.
    function isOwner() {
      return isSignedIn() &&
        request.auth.token.email == 'ankurdryicewholesalers@gmail.com' &&
        request.auth.token.email_verified == true;
    }
    function isAdmin() { return isOwner(); }
    function teamData() {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
    }
    function isFieldTeam() {
      return isSignedIn() &&
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        teamData().get('role', '') in ['staff', 'delivery'];
    }
    // Missing maps/keys preserve legacy staff access; malformed values fail closed.
    function teamPermission(name) {
      return isFieldTeam() && teamData().get('permissions', {}) is map &&
        teamData().get('permissions', {}).get(name, true) == true;
    }
    function canViewOrders() { return teamPermission('viewOrders'); }
    function canUpdateStatus() { return teamPermission('updateStatus'); }

''' + s[end:]
s = s.replace('isAdmin() || isStaff() || isDelivery()', 'isAdmin() || canViewOrders()')
s = s.replace('(isStaff() || isDelivery())', 'canUpdateStatus()')
# Close forged paid-at-booking state, retaining owner manual entry behavior.
s = s.replace("incoming().status == 'pending' &&", "incoming().status == 'pending' &&\n        (isAdmin() || incoming().paymentStatus == 'pending_verification') &&")
old = '''    match /users/{userId} {
      allow read, write: if isSignedIn() && (request.auth.uid == userId || isAdmin());
    }'''
new = '''    function validCustomerProfile(data) {
      return (!('customerName' in data) || (data.customerName is string && data.customerName.size() <= 100)) &&
        (!('customerPhone' in data) || (data.customerPhone is string && data.customerPhone.size() <= 20)) &&
        (!('city' in data) || (data.city is string && data.city.size() <= 100)) &&
        (!('updatedAt' in data) || data.updatedAt == request.time);
    }
    match /users/{userId} {
      allow get: if isSignedIn() && (request.auth.uid == userId || isAdmin());
      allow list: if isAdmin();
      allow create: if isSignedIn() && request.auth.uid == userId &&
        incoming().keys().hasOnly(['customerName', 'customerPhone', 'city', 'updatedAt']) &&
        validCustomerProfile(incoming());
      allow update: if isSignedIn() && request.auth.uid == userId &&
        incoming().diff(existing()).affectedKeys().hasOnly(['customerName', 'customerPhone', 'city', 'updatedAt']) &&
        validCustomerProfile(incoming());
      allow create, update, delete: if isAdmin();
    }'''
assert s.count(old) == 1
s = s.replace(old, new)
fragment = (ROOT.parent / 'firestore-push-fragment.rules').read_text()
assert s.endswith('  }\n}\n')
s = s[:-6] + '\n' + fragment + '  }\n}\n'
(ROOT / 'firestore.candidate.rules').write_text(s)
(ROOT / 'firestore.proposed.diff').write_text(''.join(difflib.unified_diff(base.splitlines(True), s.splitlines(True), fromfile='captured-live.rules', tofile='proposed-review-only.rules')))
print('Built live-baseline candidate:', hashlib.sha256(s.encode()).hexdigest())
