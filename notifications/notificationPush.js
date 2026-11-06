/**
 * Firebase Cloud Messaging delivery worker for Ankur Order App.
 * IMPORTANT: This file is prepared only, NOT deployed to live Firebase by APK CI.
 * Deploy with reviewed named-Firestore rules and authorized Firebase credentials.
 */
import { onDocumentCreated, onDocumentUpdated } from 'firebase-functions/v2/firestore';
import { getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import { createHash } from 'node:crypto';

const DATABASE_ID = 'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
// Match the independently verified Singapore database; no warm idle instances.
const TRIGGER = {
  region: 'asia-southeast1', database: DATABASE_ID,
  serviceAccount: 'ankur-order-push@ankur-dryice-app.iam.gserviceaccount.com',
  minInstances: 0, maxInstances: 1, concurrency: 10,
  memory: '256MiB', cpu: 1, timeoutSeconds: 60, retry: false,
};
const STATUS_LABELS = Object.freeze({
  pending: 'Order Received',
  confirmed: 'Order Confirmed',
  in_packing: 'Packing Your Order',
  dispatched: 'Order Dispatched',
  delivered: 'Order Delivered',
  cancelled: 'Order Cancelled',
});
const INVALID_FCM_CODES = new Set([
  'messaging/invalid-registration-token',
  'messaging/registration-token-not-registered',
]);
// Only fixed SDK categories enter logs; never forward error messages or tokens.
const SAFE_ERROR_CODES = new Set([
  ...INVALID_FCM_CODES,
  'messaging/invalid-argument', 'messaging/invalid-payload',
  'messaging/mismatched-credential', 'messaging/authentication-error',
  'messaging/message-rate-exceeded', 'messaging/device-message-rate-exceeded',
  'messaging/server-unavailable', 'messaging/internal-error', 'messaging/unknown-error',
  'app/invalid-credential', 'app/no-app',
]);

function errorCode(error) {
  return SAFE_ERROR_CODES.has(error?.code) ? error.code : 'unknown';
}

function eventIdentifier(event, kind) {
  if (typeof event?.id !== 'string' || !event.id) return undefined;
  return createHash('sha256').update(JSON.stringify([event.source || '', event.id, kind])).digest('hex');
}

function store() {
  // The customer app uses a named database: never send against (default).
  return getFirestore(getApp(), DATABASE_ID);
}

function stringify(value, max = 150) {
  return String(value ?? '').slice(0, max);
}

async function ownerDevices() {
  const snap = await store().collection('push_owner_devices').get();
  return snap.docs;
}

async function teamDevices() {
  const team = await store().collection('users').where('role', 'in', ['staff', 'delivery']).get();
  // Match the new least-privilege rules: revoked or legacy users never
  // receive order metadata through an old FCM token.
  const eligible = team.docs.filter(d =>
    d.data()?.active === true && d.data()?.permissions?.viewOrders === true
  );
  const snapshots = await Promise.all(eligible.map(u =>
    store().collection('push_team_devices').doc(u.id).collection('devices').get()
  ));
  return snapshots.flatMap(s => s.docs);
}

async function customerDevices(trackingToken) {
  if (!trackingToken || !/^[A-Za-z0-9_-]{14,48}$/.test(trackingToken)) return [];
  const snap = await store().collection('order_push_subscriptions')
    .doc(trackingToken).collection('devices').limit(200).get();
  return snap.docs;
}

async function pruneInvalidToken(ref, rejectedToken) {
  // Registration may refresh while FCM is sending. Only remove the token that
  // FCM actually rejected; a transaction also protects concurrent refreshes.
  await store().runTransaction(async tx => {
    const current = await tx.get(ref);
    if (current.exists && current.data()?.token === rejectedToken) tx.delete(ref);
  });
}

async function sendNotification(deviceDocs, title, body, data, event) {
  const eventId = eventIdentifier(event, data.type);
  const payloadData = eventId ? { ...data, eventId } : data;
  // Deduplicate FCM tokens across owner/team and customer lists.
  const unique = new Map();
  for (const doc of deviceDocs) {
    const token = doc.data()?.token;
    if (typeof token === 'string' && token.length >= 30 && token.length <= 4096) {
      if (!unique.has(token)) unique.set(token, []);
      unique.get(token).push(doc.ref);
    }
  }
  const tokens = [...unique.keys()];
  let sent = 0;
  let failed = 0;
  let pruneFailed = 0;
  const errorsByCode = {};
  const logSummary = extra => console.info('Ankur push send', {
    kind: data.type, orderId: data.orderId, ...(eventId ? { eventId } : {}),
    attempted: tokens.length, sent, failed, errorsByCode, pruneFailed, ...extra,
  });
  for (let offset = 0; offset < tokens.length; offset += 500) {
    const group = tokens.slice(offset, offset + 500);
    let report;
    try {
      report = await getMessaging(getApp()).sendEachForMulticast({
        tokens: group,
        notification: { title: stringify(title, 90), body: stringify(body, 180) },
        data: Object.fromEntries(Object.entries(payloadData).map(([k, v]) => [k, stringify(v, 180)])),
        android: {
          priority: 'high',
          notification: {
            channelId: 'ankur_order_updates', sound: 'default',
            // Same event replaces its current Android tray entry. This does not
            // guarantee exactly-once delivery, sound, or foreground deduplication.
            ...(eventId ? { tag: 'ankur_' + eventId } : {}),
          },
        },
      });
    } catch (error) {
      // A transport error does not prove FCM rejected every token in this batch.
      logSummary({ attempted: offset + group.length, unconfirmed: group.length,
        pending: tokens.length - offset - group.length, requestError: errorCode(error) });
      // Uncaught exceptions may be logged by the Functions platform too. Never
      // let SDK messages/details (which can contain a token) cross that boundary.
      throw Object.assign(new Error('FCM transport failed: ' + errorCode(error)), {
        code: errorCode(error),
      });
    }
    sent += report.successCount;
    failed += report.failureCount;
    const pruning = [];
    report.responses.forEach((response, index) => {
      if (!response.success) {
        const code = errorCode(response.error);
        errorsByCode[code] = (errorsByCode[code] || 0) + 1;
      }
      if (!response.success && INVALID_FCM_CODES.has(response.error?.code)) {
        for (const ref of unique.get(group[index]) || []) {
          pruning.push(pruneInvalidToken(ref, group[index]).catch(() => { pruneFailed++; }));
        }
      }
    });
    if (pruning.length) await Promise.all(pruning);
  }
  logSummary({});
  return { attempted: tokens.length, sent, failed };
}

/**
 * New customer/owner-created order -> signed-in owner and permitted team.
 * Trigger uses the same *named Firestore database* as the Android app.
 */
export const notifyNewAnkurOrder = onDocumentCreated(
  { ...TRIGGER, document: 'orders/{orderId}' },
  async event => {
    const order = event.data?.data();
    if (!order || order.isTrash === true) return;
    const orderId = stringify(event.params.orderId, 64);
    if(!/^[A-Za-z0-9_-]{4,64}$/.test(orderId))return;
    const recipients = [...await ownerDevices(), ...await teamDevices()];
    await sendNotification(
      recipients,
      'New Ankur Dryice Order',
      'New Dry Ice booking received. Open the app for assigned details.',
      { type: 'new_order', orderId }, event
    );
  }
);

/**
 * Customer's private tracking-token subscription -> status + payment changes.
 * Owner also receives status updates; never include tracking PIN or phone in FCM.
 */
export const notifyAnkurOrderProgress = onDocumentUpdated(
  { ...TRIGGER, document: 'order_tracking/{trackingToken}' },
  async event => {
    const previous = event.data?.before?.data();
    const current = event.data?.after?.data();
    if (!previous || !current) return;
    const statusChanged = previous.status !== current.status;
    const paymentChanged = previous.paymentStatus !== current.paymentStatus;
    if (!statusChanged && !paymentChanged) return;

    const orderId = stringify(current.orderId, 64);
    let title;
    let body;
    if (statusChanged) {
      title = STATUS_LABELS[current.status] || 'Order Updated';
      // lastStatusUpdate is user-controlled legacy text: never echo it into FCM.
      body = 'Your Ankur Dryice order status was updated.';
    } else {
      title = current.paymentStatus === 'payment_verified' ? 'Payment Verified' : 'Payment Update';
      body = current.paymentStatus === 'payment_verified'
        ? 'Payment for order ' + orderId + ' is verified.'
        : 'The payment status of order ' + orderId + ' has changed.';
    }
    const recipients = [
      ...await customerDevices(event.params.trackingToken),
      ...await ownerDevices(),
    ];
    await sendNotification(recipients, title, body, {
      type: statusChanged ? 'order_status' : 'payment_status',
      orderId,
      status: current.status || '',
      paymentStatus: current.paymentStatus || '',
    }, event);
  }
);

/** The existing Self Pickup callable writes pickup status to orders, not tracking. */
export const notifyAnkurSelfPickup = onDocumentUpdated(
  { ...TRIGGER, document: 'orders/{orderId}' },
  async event => {
    const previous = event.data?.before?.data();
    const current = event.data?.after?.data();
    if (!previous || !current || previous.selfPickup?.status === current.selfPickup?.status ||
        !current.selfPickup?.status) return;
    const completed = current.selfPickup.status === 'pickup_completed';
    if (!completed && current.selfPickup.status !== 'pickup_pending') return;
    const orderId = stringify(current.orderId || event.params.orderId, 64);
    const recipients = [
      ...await customerDevices(current.trackingToken),
      ...await ownerDevices(),
    ];
    await sendNotification(recipients,
      completed ? 'Pickup Completed' : 'Pickup Updated',
      completed ? 'Your Self Pickup order ' + orderId + ' has been handed over.'
        : 'Pickup confirmation for order ' + orderId + ' was reversed.',
      { type: 'self_pickup', orderId, status: current.selfPickup.status }, event
    );
  }
);

