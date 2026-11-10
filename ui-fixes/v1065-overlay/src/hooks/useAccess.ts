import { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db, accessFromUserDoc, type AccessInfo } from '../firebase';
import type { UserProfile } from '../types';

const NO_ACCESS: AccessInfo = {
  role: null,
  permissions: { viewOrders: false, updateStatus: false, toggleProducts: false },
};

/** Staff added by the owner by mobile (Tools aur Settings > Staff). */
const REGISTRY_STAFF: AccessInfo = {
  role: 'staff',
  permissions: { viewOrders: true, updateStatus: true, toggleProducts: false },
};

/**
 * Tracks the signed-in user AND their role live (OWNER / STAFF / customer).
 * Two sources are watched: the legacy users/{uid}.role document and the
 * owner-managed staff registry (staffEmails/{verified email}). Revoking either
 * switches the app back without a restart.
 */
export function useAccess() {
  const [user, setUser] = useState<User | null>(auth.currentUser);
  const [access, setAccess] = useState<AccessInfo>(NO_ACCESS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let unsubs: Array<() => void> = [];
    const clear = () => { unsubs.forEach((fn) => fn()); unsubs = []; };
    const unsubAuth = onAuthStateChanged(auth, (u) => {
      setUser(u);
      clear();
      if (!u) {
        setAccess(NO_ACCESS);
        setReady(true);
        return;
      }
      let docAccess: AccessInfo | null = null;
      let registryActive: boolean | null = u.email && u.emailVerified ? null : false;
      const publish = () => {
        if (!docAccess || registryActive === null) return;
        setAccess(docAccess.role === null && registryActive ? REGISTRY_STAFF : docAccess);
        setReady(true);
      };
      unsubs.push(onSnapshot(
        doc(db, 'users', u.uid),
        (snap) => { docAccess = accessFromUserDoc(u, snap.exists() ? (snap.data() as Partial<UserProfile>) : undefined); publish(); },
        (err) => { console.warn('Role listener error:', err?.message || err); docAccess = accessFromUserDoc(u, undefined); publish(); }
      ));
      if (u.email && u.emailVerified) {
        unsubs.push(onSnapshot(
          doc(db, 'staffEmails', u.email.toLowerCase()),
          (snap) => { registryActive = snap.exists() && snap.data()?.active === true && snap.data()?.role === 'STAFF'; publish(); },
          () => { registryActive = false; publish(); }
        ));
      }
    });
    return () => {
      unsubAuth();
      clear();
    };
  }, []);

  return { user, access, ready };
}
