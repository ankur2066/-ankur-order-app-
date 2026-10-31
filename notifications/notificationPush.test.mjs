/** Offline worker tests. Synthetic SDK modules never contact Firebase or FCM. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { createContext, SourceTextModule, SyntheticModule } from 'node:vm';

const DATABASE_ID = 'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
const ORDER_ID = 'ADI-20261031-ABCD';
const TRACKING_TOKEN = ORDER_ID + '_123456';
const fcm = suffix => 'test_fcm_' + suffix.padEnd(40, 'x');
const copy = value => JSON.parse(JSON.stringify(value));

async function worker({ records = {}, send, transactionError } = {}) {
  const documents = new Map(Object.entries(records));
  const messages = [];
  const logs = [];
  const deletions = [];
  const context = createContext({ console: { info: (...args) => logs.push(copy(args)) } });
  const ref = path => ({
    path,
    delete: async () => { documents.delete(path); deletions.push(path); },
    collection: name => collection(path + '/' + name),
  });
  const snapshot = path => ({
    id: path.split('/').at(-1), ref: ref(path),
    exists: documents.has(path), data: () => documents.get(path),
  });
  function collection(path, predicate = () => true, limit = Infinity) {
    return {
      doc: id => ref(path + '/' + id),
      where: (field, operator, values) => {
        assert.equal(operator, 'in');
        return collection(path, data => values.includes(data[field]), limit);
      },
      limit: count => collection(path, predicate, count),
      get: async () => ({ docs: [...documents.keys()]
        .filter(key => key.startsWith(path + '/') && !key.slice(path.length + 1).includes('/'))
        .filter(key => predicate(documents.get(key))).slice(0, limit).map(snapshot) }),
    };
  }
  const db = {
    collection,
    runTransaction: async operation => {
      if (transactionError) throw transactionError;
      return operation({
        get: async reference => snapshot(reference.path),
        delete: reference => { documents.delete(reference.path); deletions.push(reference.path); },
      });
    },
  };
  const sdk = {
    'node:crypto': { createHash },
    'firebase-functions/v2/firestore': {
      onDocumentCreated: (options, handler) => Object.assign(handler, { options }),
      onDocumentUpdated: (options, handler) => Object.assign(handler, { options }),
    },
    'firebase-admin/app': { getApp: () => ({}) },
    'firebase-admin/firestore': { getFirestore: (_app, database) => {
      assert.equal(database, DATABASE_ID, 'worker must never use (default)');
      return db;
    } },
    'firebase-admin/messaging': { getMessaging: () => ({ sendEachForMulticast: async message => {
      messages.push(copy(message));
      if (send) return send(message, documents);
      return { successCount: message.tokens.length, failureCount: 0,
        responses: message.tokens.map(() => ({ success: true })) };
    } }) },
  };
  const module = new SourceTextModule(readFileSync(new URL('notificationPush.js', import.meta.url), 'utf8'), { context });
  await module.link(specifier => {
    assert.ok(sdk[specifier], 'unexpected dependency: ' + specifier);
    return new SyntheticModule(Object.keys(sdk[specifier]), function () {
      for (const [name, value] of Object.entries(sdk[specifier])) this.setExport(name, value);
    }, { context });
  });
  await module.evaluate();
  return { api: module.namespace, messages, logs, documents, deletions };
}

const order = { orderId: ORDER_ID, trackingToken: TRACKING_TOKEN, quantityKg: 10, city: 'Test city' };
const tracking = { orderId: ORDER_ID, trackingToken: TRACKING_TOKEN, status: 'pending',
  paymentStatus: 'pending_verification', lastStatusUpdate: 'Order received' };
const created = data => ({ params: { orderId: ORDER_ID }, data: { data: () => data } });
const updated = (before, after, params = { trackingToken: TRACKING_TOKEN, orderId: ORDER_ID }) => ({
  params, data: { before: { data: () => before }, after: { data: () => after } },
});
const device = token => ({ token, platform: 'android' });

test('all three triggers target the existing named database and expected paths', async () => {
  const { api } = await worker();
  for (const name of Object.keys(api)) {
    assert.equal(api[name].options.database, DATABASE_ID);
    assert.equal(api[name].options.region, 'asia-southeast1');
    assert.equal(api[name].options.minInstances, 0);
    assert.equal(api[name].options.maxInstances, 1);
    assert.equal(api[name].options.concurrency, 10);
    assert.equal(api[name].options.retry, false);
  }
  assert.equal(api.notifyNewAnkurOrder.options.document, 'orders/{orderId}');
  assert.equal(api.notifyAnkurSelfPickup.options.document, 'orders/{orderId}');
  assert.equal(api.notifyAnkurOrderProgress.options.document, 'order_tracking/{trackingToken}');
});

test('new orders reach owner, permitted staff, delivery and legacy staff; revoked roles are excluded', async () => {
  const records = { 'push_owner_devices/owner': device(fcm('owner')) };
  for (const [id, data] of Object.entries({
    allowed: { role: 'staff', permissions: { viewOrders: true } },
    delivery: { role: 'delivery', permissions: { viewOrders: true } },
    legacy: { role: 'staff' },
    partial: { role: 'staff', permissions: { updateStatus: false } },
    denied: { role: 'staff', permissions: { viewOrders: false } },
    revoked: { role: 'customer', permissions: { viewOrders: true } },
    impostor: { role: 'admin' },
  })) {
    records['users/' + id] = data;
    records['push_team_devices/' + id + '/devices/phone'] = device(fcm(id));
  }
  const w = await worker({ records });
  await w.api.notifyNewAnkurOrder(created(order));
  assert.deepEqual(w.messages[0].tokens.sort(), ['owner', 'allowed', 'delivery', 'legacy', 'partial'].map(fcm).sort());
});

test('malformed permission values fail closed exactly like Firestore Rules', async () => {
  const records = {};
  for (const [index, value] of [null, 0, 1, 'true', 'false', {}, []].entries()) {
    const id = 'malformed' + index;
    records['users/' + id] = { role: 'staff', permissions: { viewOrders: value } };
    records['push_team_devices/' + id + '/devices/phone'] = device(fcm(id));
  }
  for (const [index, permissions] of [null, 'bad', false, []].entries()) {
    const id = 'badmap' + index;
    records['users/' + id] = { role: 'delivery', permissions };
    records['push_team_devices/' + id + '/devices/phone'] = device(fcm(id));
  }
  const w = await worker({ records });
  await w.api.notifyNewAnkurOrder(created(order));
  assert.equal(w.messages.length, 0);
});

test('missing and trashed new orders produce no push', async () => {
  const w = await worker({ records: { 'push_owner_devices/phone': device(fcm('owner')) } });
  await w.api.notifyNewAnkurOrder(created(undefined));
  await w.api.notifyNewAnkurOrder(created({ ...order, isTrash: true }));
  assert.equal(w.messages.length, 0);
});

test('status update reaches only that tracking token and owner, with no private identifiers', async () => {
  const w = await worker({ records: {
    ['order_push_subscriptions/' + TRACKING_TOKEN + '/devices/customer']: device(fcm('customer')),
    'order_push_subscriptions/ADI-20261031-OTHER_999999/devices/other': device(fcm('other')),
    'push_owner_devices/owner': device(fcm('owner')),
  } });
  await w.api.notifyAnkurOrderProgress(updated(tracking, {
    ...tracking, status: 'dispatched', lastStatusUpdate: 'Handed to transport',
    trackingPin: '123456', customerPhone: '9999999999',
  }));
  assert.deepEqual(w.messages[0].tokens.sort(), ['customer', 'owner'].map(fcm).sort());
  assert.equal(w.messages[0].notification.title, 'Order Dispatched');
  assert.equal(w.messages[0].android.notification.channelId, 'ankur_order_updates');
  assert.equal(w.messages[0].data.type, 'order_status');
  const visible = JSON.stringify({ notification: w.messages[0].notification, data: w.messages[0].data });
  for (const secret of [TRACKING_TOKEN, '123456', '9999999999']) assert.ok(!visible.includes(secret));
});

test('payment-only change produces Payment Verified and metadata-only updates stay silent', async () => {
  const w = await worker({ records: { 'push_owner_devices/owner': device(fcm('owner')) } });
  await w.api.notifyAnkurOrderProgress(updated(tracking, { ...tracking, updatedAt: 'later' }));
  assert.equal(w.messages.length, 0);
  await w.api.notifyAnkurOrderProgress(updated(tracking, { ...tracking, paymentStatus: 'payment_verified' }));
  assert.equal(w.messages[0].notification.title, 'Payment Verified');
  assert.equal(w.messages[0].data.type, 'payment_status');
  await w.api.notifyAnkurOrderProgress(updated({ ...tracking, paymentStatus: 'payment_verified' }, tracking));
  assert.equal(w.messages[1].notification.title, 'Payment Update');
});

test('invalid tracking ID cannot route to customer subscriptions', async () => {
  const w = await worker({ records: { 'order_push_subscriptions/bad/devices/customer': device(fcm('customer')) } });
  await w.api.notifyAnkurOrderProgress(updated(tracking, { ...tracking, status: 'confirmed' }, { trackingToken: 'bad' }));
  assert.equal(w.messages.length, 0);
});

test('pickup completion and reversal use orders.selfPickup, unrelated changes stay silent', async () => {
  const w = await worker({ records: {
    ['order_push_subscriptions/' + TRACKING_TOKEN + '/devices/customer']: device(fcm('customer')),
  } });
  const pending = { ...order, selfPickup: { status: 'pickup_pending' } };
  const complete = { ...order, selfPickup: { status: 'pickup_completed' } };
  await w.api.notifyAnkurSelfPickup(updated(pending, complete));
  await w.api.notifyAnkurSelfPickup(updated(complete, pending));
  await w.api.notifyAnkurSelfPickup(updated(pending, { ...pending, updatedAt: 'later' }));
  assert.deepEqual(w.messages.map(x => x.notification.title), ['Pickup Completed', 'Pickup Updated']);
});

test('multicast deduplicates tokens, ignores invalid tokens and splits at 500', async () => {
  const records = {};
  for (let i = 0; i < 501; i++) records['push_owner_devices/phone' + i] = device(fcm(String(i)));
  records['push_owner_devices/duplicate'] = device(fcm('0'));
  records['push_owner_devices/short'] = device('short');
  records['push_owner_devices/long'] = device('x'.repeat(4097));
  const w = await worker({ records });
  await w.api.notifyNewAnkurOrder(created(order));
  assert.deepEqual(w.messages.map(x => x.tokens.length), [500, 1]);
  assert.equal(w.logs[0][1].sent, 501);
});

test('invalid tokens are pruned from every duplicate path, transient failures are retained', async () => {
  const stale = fcm('invalid');
  const records = {
    'push_owner_devices/stale': device(stale), 'push_owner_devices/duplicate': device(stale),
    'push_owner_devices/transient': device(fcm('transient')),
  };
  const w = await worker({ records, send: async () => ({ successCount: 0, failureCount: 2, responses: [
    { success: false, error: { code: 'messaging/registration-token-not-registered' } },
    { success: false, error: { code: 'messaging/server-unavailable' } },
  ] }) });
  await w.api.notifyNewAnkurOrder(created(order));
  assert.deepEqual(w.deletions.sort(), ['push_owner_devices/duplicate', 'push_owner_devices/stale']);
  assert.ok(w.documents.has('push_owner_devices/transient'));
  assert.equal(w.logs[0][1].failed, 2);
  assert.deepEqual(w.logs[0][1].errorsByCode, {
    'messaging/registration-token-not-registered': 1,
    'messaging/server-unavailable': 1,
  });
  assert.ok(!JSON.stringify(w.logs).includes(stale));
});

test('FCM response for an old token cannot delete a refreshed registration', async () => {
  const path = 'push_owner_devices/phone';
  const fresh = fcm('fresh');
  const w = await worker({ records: { [path]: device(fcm('old')) }, send: async (_message, documents) => {
    documents.set(path, device(fresh));
    return { successCount: 0, failureCount: 1, responses: [
      { success: false, error: { code: 'messaging/invalid-registration-token' } },
    ] };
  } });
  await w.api.notifyNewAnkurOrder(created(order));
  assert.equal(w.documents.get(path)?.token, fresh);
  assert.deepEqual(w.deletions, []);
});

test('FCM transport errors propagate and do not prune registrations', async () => {
  const w = await worker({ records: { 'push_owner_devices/phone': device(fcm('owner')) },
    send: async () => { throw new Error('transport unavailable'); } });
  await assert.rejects(w.api.notifyNewAnkurOrder(created(order)), /transport unavailable/);
  assert.deepEqual(w.deletions, []);
  assert.equal(w.logs[0][1].requestError, 'unknown');
  assert.equal(w.logs[0][1].unconfirmed, 1);
  assert.equal(w.logs[0][1].sent, 0);
});

test('repeated CloudEvent uses the same Android tray tag without claiming send deduplication', async () => {
  const w = await worker({ records: { 'push_owner_devices/phone': device(fcm('owner')) } });
  const event = { ...created(order), id: 'event-1', source: 'test-source' };
  await w.api.notifyNewAnkurOrder(event);
  await w.api.notifyNewAnkurOrder(event);
  assert.equal(w.messages.length, 2, 'tray replacement does not suppress FCM requests');
  assert.match(w.messages[0].android.notification.tag, /^ankur_[a-f0-9]{64}$/);
  assert.equal(w.messages[0].android.notification.tag, w.messages[1].android.notification.tag);
  assert.equal(w.messages[0].data.eventId, w.messages[1].data.eventId);
});

test('separate events, sources and trigger kinds get independent tags; missing IDs do not collapse', async () => {
  const w = await worker({ records: { 'push_owner_devices/phone': device(fcm('owner')) } });
  for (const [id, source] of [['event-1', 'source-1'], ['event-2', 'source-1'], ['event-1', 'source-2']]) {
    await w.api.notifyNewAnkurOrder({ ...created(order), id, source });
  }
  await w.api.notifyAnkurOrderProgress({
    ...updated(tracking, { ...tracking, status: 'confirmed' }), id: 'event-1', source: 'source-1',
  });
  await w.api.notifyAnkurSelfPickup({
    ...updated({ ...order, selfPickup: { status: 'pickup_pending' } },
      { ...order, selfPickup: { status: 'pickup_completed' } }), id: 'event-1', source: 'source-1',
  });
  assert.equal(new Set(w.messages.map(message => message.android.notification.tag)).size, 5);
  await w.api.notifyNewAnkurOrder(created(order));
  assert.equal(w.messages[5].android.notification.tag, undefined);
  assert.equal(w.messages[5].data.eventId, undefined);
});

test('event identifiers are hashed; token errors log categories without raw details', async () => {
  const secretToken = fcm('private');
  const rawEventId = 'private-event/' + TRACKING_TOKEN;
  const w = await worker({ records: { 'push_owner_devices/phone': device(secretToken) },
    send: async () => ({ successCount: 0, failureCount: 1, responses: [{ success: false,
      error: { code: 'unsafe/' + secretToken, message: secretToken + ' ' + TRACKING_TOKEN } }] }) });
  await w.api.notifyNewAnkurOrder({ ...created(order), id: rawEventId, source: TRACKING_TOKEN });
  assert.deepEqual(w.logs[0][1].errorsByCode, { unknown: 1 });
  const visible = JSON.stringify({ logs: w.logs, data: w.messages[0].data, android: w.messages[0].android });
  for (const secret of [secretToken, TRACKING_TOKEN, rawEventId]) assert.ok(!visible.includes(secret));
});

test('failed invalid-token cleanup is counted without failing an acknowledged FCM send', async () => {
  const w = await worker({ records: { 'push_owner_devices/phone': device(fcm('invalid')) },
    transactionError: new Error('private transaction details'),
    send: async () => ({ successCount: 0, failureCount: 1, responses: [{ success: false,
      error: { code: 'messaging/registration-token-not-registered' } }] }) });
  await w.api.notifyNewAnkurOrder(created(order));
  assert.equal(w.logs[0][1].pruneFailed, 1);
  assert.equal(w.documents.size, 1);
  assert.ok(!JSON.stringify(w.logs).includes('private transaction details'));
});

test('failure in a later batch reports confirmed sends separately from unconfirmed and pending tokens', async () => {
  const records = {};
  for (let i = 0; i < 1001; i++) records['push_owner_devices/phone' + i] = device(fcm(String(i)));
  let calls = 0;
  const w = await worker({ records, send: async message => {
    if (++calls === 2) throw Object.assign(new Error('private transport details'), { code: 'messaging/server-unavailable' });
    return { successCount: message.tokens.length, failureCount: 0,
      responses: message.tokens.map(() => ({ success: true })) };
  } });
  await assert.rejects(w.api.notifyNewAnkurOrder(created(order)), /private transport details/);
  const summary = w.logs[0][1];
  assert.equal(summary.sent, 500);
  assert.equal(summary.failed, 0);
  assert.equal(summary.unconfirmed, 500);
  assert.equal(summary.pending, 1);
  assert.equal(summary.requestError, 'messaging/server-unavailable');
  assert.ok(!JSON.stringify(w.logs).includes('private transport details'));
});
