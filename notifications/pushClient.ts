/**
 * Ankur Dryice Android push registration.
 * Existing Firestore in-app tracking continues unchanged. Android FCM is additive.
 * Push delivery requires separately deployed named-DB rules/functions.
 */
import { Capacitor } from '@capacitor/core';
import { PushNotifications } from '@capacitor/push-notifications';
import { collection, deleteDoc, doc, getDocs, query, serverTimestamp, setDoc, where } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { auth, db } from '../firebase';
import { readPlacedOrders } from '../hooks/useOrderNotifications';

type TeamRole = 'admin' | 'staff' | 'delivery' | null;
type PushIdentity = { uid: string | null; role: TeamRole; canView: boolean };
type PushState = 'unsupported' | 'permission_denied' | 'registered' | 'registering' | 'registration_failed';

const DEVICE_KEY = 'ankur_push_device_id_v1';
const MAX_ORDER_SUBSCRIPTIONS = 8;
let identity: PushIdentity = { uid: null, role: null, canView: false };
let currentFcmToken = '';
let initialising: Promise<void> | null = null;
let listenersReady = false;
let state: PushState = 'unsupported';
const trackingTokens = new Set<string>();

function setStatus(next: PushState) {
  state = next;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ankur-push-status', { detail: next }));
  }
}

export function pushRegistrationStatus(): PushState { return state; }

function deviceId(): string {
  const old = localStorage.getItem(DEVICE_KEY);
  if (old && /^[A-Za-z0-9_-]{12,64}$/.test(old)) return old;
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  const id = Array.from(bytes, x => x.toString(16).padStart(2, '0')).join('');
  localStorage.setItem(DEVICE_KEY, id);
  return id;
}

function collectPlacedTrackingTokens() {
  for (const order of readPlacedOrders().slice(0, MAX_ORDER_SUBSCRIPTIONS)) {
    if (typeof order?.trackingToken === 'string' &&
        /^[A-Za-z0-9_-]{14,48}$/.test(order.trackingToken)) {
      trackingTokens.add(order.trackingToken);
    }
  }
}

/** FCM device tokens go to private Firestore collections; no customer PII in payloads. */
async function syncToken(): Promise<void> {
  if (!currentFcmToken || !Capacitor.isNativePlatform()) return;
  const id = deviceId();
  const tokenPayload = {
    token: currentFcmToken,
    platform: 'android',
    updatedAt: serverTimestamp(),
  };
  const writes: Array<Promise<unknown>> = [];

  if (identity.uid && auth.currentUser?.uid === identity.uid && identity.role === 'admin') {
    writes.push(setDoc(doc(db, 'push_owner_devices', id), tokenPayload));
  } else if (identity.uid && auth.currentUser?.uid === identity.uid &&
    (identity.role === 'staff' || identity.role === 'delivery') && identity.canView) {
    writes.push(setDoc(doc(db, 'push_team_devices', identity.uid, 'devices', id), tokenPayload));
  }

  // Guest/customer subscriptions require possession of the secret tracking token.
  collectPlacedTrackingTokens();
  if (identity.uid && identity.role === null) {
    try {
      const own = await getDocs(query(collection(db, 'orders'), where('userId', '==', identity.uid)));
      own.docs.slice(0, MAX_ORDER_SUBSCRIPTIONS).forEach(snap => {
        const token = snap.data()?.trackingToken;
        if (typeof token === 'string' && /^[A-Za-z0-9_-]{14,48}$/.test(token)) trackingTokens.add(token);
      });
    } catch (error) {
      console.warn('Customer push order lookup unavailable:', error);
    }
  }
  for (const trackingToken of Array.from(trackingTokens).slice(0, MAX_ORDER_SUBSCRIPTIONS)) {
    writes.push(setDoc(doc(db, 'order_push_subscriptions', trackingToken, 'devices', id), tokenPayload));
  }
  if (!writes.length) return;
  const results = await Promise.allSettled(writes);
  const failed = results.filter(r => r.status === 'rejected');
  if (failed.length) {
    console.warn('Some push token subscriptions are not active. Server rules may be pending:', failed.length);
    setStatus('registration_failed');
  } else {
    setStatus('registered');
  }
}

async function prepareListeners() {
  if (listenersReady) return;
  await PushNotifications.addListener('registration', token => {
    currentFcmToken = token.value;
    void syncToken();
  });
  await PushNotifications.addListener('registrationError', error => {
    console.warn('Android FCM registration failed', error);
    setStatus('registration_failed');
  });
  await PushNotifications.addListener('pushNotificationReceived', msg => {
    window.dispatchEvent(new CustomEvent('ankur-push-arrived', {
      detail: {
        orderId: String(msg.data?.orderId || ''),
        title: String(msg.title || 'Order Update'),
        body: String(msg.body || 'Your order has an update'),
      },
    }));
  });
  await PushNotifications.addListener('pushNotificationActionPerformed', action => {
    window.dispatchEvent(new CustomEvent('ankur-push-opened', {
      detail: { orderId: String(action.notification.data?.orderId || '') },
    }));
  });
  await PushNotifications.createChannel({
    id: 'ankur_order_updates',
    name: 'Ankur Order Updates',
    description: 'New orders, packing, dispatch and payment updates',
    importance: 5,
    visibility: 1,
  });
  listenersReady = true;
}

async function startNativePush(askPermission: boolean) {
  if (!Capacitor.isNativePlatform()) { setStatus('unsupported'); return; }
  if (initialising) return initialising;
  initialising = (async () => {
    try {
      await prepareListeners();
      let permissions = await PushNotifications.checkPermissions();
      if (permissions.receive !== 'granted' && askPermission) {
        permissions = await PushNotifications.requestPermissions();
      }
      if (permissions.receive !== 'granted') {
        setStatus('permission_denied');
        return;
      }
      setStatus('registering');
      await PushNotifications.register();
      if (currentFcmToken) await syncToken();
    } catch (error) {
      console.warn('Unable to register Android push notifications:', error);
      setStatus('registration_failed');
    }
  })().finally(() => { initialising = null; });
  await initialising;
}

/** Called on sign-in, role change, and app start. No prompt for casual visitors. */
export async function configureOrderPush(user: User | null, role: TeamRole, canView: boolean) {
  identity = { uid: user?.uid ?? null, role, canView };
  collectPlacedTrackingTokens();
  if (role === 'admin' || ((role === 'staff' || role === 'delivery') && canView) ||
      trackingTokens.size > 0) {
    await startNativePush(true);
    if (currentFcmToken) await syncToken();
  }
}

/** Called only after the customer's Firestore order was committed. */
export async function subscribeNewOrderPush(orderId: string, trackingPin: string) {
  const trackingToken = orderId + '_' + trackingPin;
  if (!/^[A-Za-z0-9_-]{14,48}$/.test(trackingToken)) return;
  trackingTokens.add(trackingToken);
  await startNativePush(true);
  if (currentFcmToken) await syncToken();
}

/** Called when customer taps the existing bell icon. */
export async function enableOrderPush() {
  await startNativePush(true);
  if (currentFcmToken) await syncToken();
}

/** Remove privileged tokens before signout, to prevent alerts on shared phones. */
export async function unregisterTeamPushBeforeSignOut() {
  if (!Capacitor.isNativePlatform() || !currentFcmToken || !identity.uid) return;
  try {
    const id = deviceId();
    if (identity.role === 'admin') {
      await deleteDoc(doc(db, 'push_owner_devices', id));
    } else if (identity.role === 'staff' || identity.role === 'delivery') {
      await deleteDoc(doc(db, 'push_team_devices', identity.uid, 'devices', id));
    }
  } catch (error) {
    console.warn('Could not deregister push token on signout:', error);
  } finally {
    identity = { uid: null, role: null, canView: false };
  }
}
