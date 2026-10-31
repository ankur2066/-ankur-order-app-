/**
 * Run only against an ephemeral FIRESTORE EMULATOR. NEVER production.
 * Verifies V1.0.29 notification-token rules for owner, staff, and guest devices.
 */
import test, { before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { initializeTestEnvironment, assertSucceeds, assertFails } from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';

const PROJECT_ID = 'demo-ankur-push-rules-test';
const DATABASE_ID = 'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673';
const TRACKING_TOKEN = 'ADI-20261031-ABCD_123456';
const OWNER_EMAIL = 'ankurdryicewholesalers@gmail.com';
const token = 'v129test_fcm_' + 'x'.repeat(105);
let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: {
      host: '127.0.0.1', port: 8080,
      rules: readFileSync('firestore.rules', 'utf8')
    }
  });
  await env.withSecurityRulesDisabled(async ctx => {
    const db = ctx.firestore(DATABASE_ID);
    await setDoc(doc(db, 'order_tracking', TRACKING_TOKEN), {
      orderId: 'ADI-20261031-ABCD', trackingToken: TRACKING_TOKEN,
      status: 'pending', paymentStatus: 'pending_verification',
      productName: 'Dry Ice', quantityKg: 10, district: 'Test district',
      dispatchTiming: 'Test slot', lastStatusUpdate: 'Order received',
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    });
    await setDoc(doc(db, 'users', 'permitted-staff'), {
      role:'staff', permissions: { viewOrders:true }
    });
    await setDoc(doc(db, 'users', 'blocked-staff'), {
      role:'staff', permissions: { viewOrders:false }
    });
    for (const [uid, profile] of Object.entries({
      'legacy-staff': { role: 'staff' },
      'partial-staff': { role: 'staff', permissions: { updateStatus: false } },
      'permitted-delivery': { role: 'delivery', permissions: { viewOrders: true } },
      'impostor-admin': { role: 'admin', permissions: { viewOrders: true } },
    })) await setDoc(doc(db, 'users', uid), profile);
    for (const [index, viewOrders] of [null, 0, 1, 'true', 'false', {}, []].entries()) {
      await setDoc(doc(db, 'users', 'malformed' + index), { role: 'staff', permissions: { viewOrders } });
    }
    for (const [index, permissions] of [null, 'bad', false, []].entries()) {
      await setDoc(doc(db, 'users', 'badmap' + index), { role: 'delivery', permissions });
    }
  });
});

after(async () => { await env?.cleanup(); });
function ownerDb() {
  return env.authenticatedContext('owner-uid', {
    email: OWNER_EMAIL, email_verified: true
  }).firestore(DATABASE_ID);
}
function staffDb(id) {
  return env.authenticatedContext(id, {
    email: id + '@example.test', email_verified: true
  }).firestore(DATABASE_ID);
}
function guestDb() { return env.unauthenticatedContext().firestore(DATABASE_ID); }
function entry(db, path, value = token) {
  return setDoc(doc(db, path), {
    token: value,
    platform: 'android',
    updatedAt: serverTimestamp()
  });
}

test('owner may register Android push; ordinary customer cannot impersonate owner', async () => {
  await assertSucceeds(entry(ownerDb(), 'push_owner_devices/ownerDeviceA1'));
  await assertFails(entry(staffDb('random-customer'), 'push_owner_devices/fakeOwner1'));
  await assertFails(entry(guestDb(), 'push_owner_devices/fakeOwner2'));
});
test('device tokens cannot be read or listed by owner, staff or guest', async () => {
  await assertFails(getDoc(doc(ownerDb(), 'push_owner_devices/ownerDeviceA1')));
  await assertFails(getDoc(doc(guestDb(), 'push_owner_devices/ownerDeviceA1')));
  await assertFails(getDocs(collection(ownerDb(), 'push_owner_devices')));
});
test('owner token can be removed on logout', async () => {
  await assertSucceeds(entry(ownerDb(), 'push_owner_devices/ownerDeviceRemove'));
  await assertSucceeds(deleteDoc(doc(ownerDb(), 'push_owner_devices/ownerDeviceRemove')));
});
test('permitted staff may register own token, not another staff token', async () => {
  await assertSucceeds(entry(staffDb('permitted-staff'), 'push_team_devices/permitted-staff/devices/staffDeviceA1'));
  await assertFails(entry(staffDb('permitted-staff'), 'push_team_devices/blocked-staff/devices/staffDeviceA2'));
});
test('staff denied order viewing cannot register token', async () => {
  await assertFails(entry(staffDb('blocked-staff'), 'push_team_devices/blocked-staff/devices/blockedDevice1'));
});
test('guest can subscribe ONLY with an existing private tracking token', async () => {
  await assertSucceeds(entry(guestDb(), 'order_push_subscriptions/' + TRACKING_TOKEN + '/devices/guestDeviceA1'));
  await assertFails(entry(guestDb(), 'order_push_subscriptions/ADI-20261031-FAKE_999999/devices/guestDeviceA2'));
  await assertFails(entry(guestDb(), 'order_push_subscriptions/bad/devices/guestDeviceA3'));
});
test('guest cannot read token registrations or delete other devices', async () => {
  await assertFails(getDoc(doc(guestDb(), 'order_push_subscriptions/' + TRACKING_TOKEN + '/devices/guestDeviceA1')));
  await assertFails(deleteDoc(doc(guestDb(), 'order_push_subscriptions/' + TRACKING_TOKEN + '/devices/guestDeviceA1')));
});
test('invalid platform and forged clock are rejected', async () => {
  const db=ownerDb();
  await assertFails(setDoc(doc(db, 'push_owner_devices/badPlatformA1'), {
    token, platform:'ios',updatedAt:serverTimestamp()
  }));
  await assertFails(setDoc(doc(db, 'push_owner_devices/badTimestamp1'), {
    token, platform:'android', updatedAt: new Date('2025-01-01')
  }));
});
test('customer still cannot list private orders', async () => {
  await assertFails(getDocs(collection(guestDb(), 'orders')));
});

test('unverified owner email and a stored admin role do not grant owner push access', async () => {
  const unverified = env.authenticatedContext('unverified-owner', {
    email: OWNER_EMAIL, email_verified: false,
  }).firestore(DATABASE_ID);
  await assertFails(entry(unverified, 'push_owner_devices/unverifiedPhone'));
  await assertFails(entry(staffDb('impostor-admin'), 'push_owner_devices/impostorPhone'));
  await assertFails(entry(staffDb('impostor-admin'), 'push_team_devices/impostor-admin/devices/phoneDevice1'));
});

test('legacy staff defaults and permitted delivery remain eligible', async () => {
  for (const uid of ['legacy-staff', 'partial-staff', 'permitted-delivery']) {
    await assertSucceeds(entry(staffDb(uid), 'push_team_devices/' + uid + '/devices/phoneDevice1'));
  }
});

test('malformed permission values and maps deny registration, matching the worker', async () => {
  for (let index = 0; index < 7; index++) {
    const uid = 'malformed' + index;
    await assertFails(entry(staffDb(uid), 'push_team_devices/' + uid + '/devices/phoneDevice1'));
  }
  for (let index = 0; index < 4; index++) {
    const uid = 'badmap' + index;
    await assertFails(entry(staffDb(uid), 'push_team_devices/' + uid + '/devices/phoneDevice1'));
  }
});

test('staff and customer registrations cannot be read or listed even by the owner', async () => {
  for (const db of [ownerDb(), staffDb('permitted-staff'), guestDb()]) {
    for (const path of [
      'push_team_devices/permitted-staff/devices',
      'order_push_subscriptions/' + TRACKING_TOKEN + '/devices',
    ]) {
      await assertFails(getDocs(collection(db, path)));
      await assertFails(getDoc(doc(db, path, 'phoneDevice1')));
    }
  }
});

test('token length bounds and extra fields are rejected on every registration path', async () => {
  for (const path of [
    'push_owner_devices/boundaryPhone',
    'push_team_devices/permitted-staff/devices/boundaryPhone',
    'order_push_subscriptions/' + TRACKING_TOKEN + '/devices/boundaryPhone',
  ]) {
    const db = path.startsWith('push_owner') ? ownerDb() : staffDb('permitted-staff');
    for (const value of ['x'.repeat(29), 'x'.repeat(4097)]) await assertFails(entry(db, path, value));
    await assertFails(setDoc(doc(db, path), {
      token, platform: 'android', updatedAt: serverTimestamp(), customerPhone: 'not-allowed',
    }));
  }
});

test('revoking a role blocks further registrations without exposing another device', async () => {
  const uid = 'revoked-for-test';
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(DATABASE_ID), 'users', uid), { role: 'staff', permissions: { viewOrders: true } });
  });
  const db = staffDb(uid);
  await assertSucceeds(entry(db, 'push_team_devices/' + uid + '/devices/phoneDevice1'));
  await env.withSecurityRulesDisabled(async ctx => {
    await setDoc(doc(ctx.firestore(DATABASE_ID), 'users', uid), { role: 'staff', permissions: { viewOrders: false } });
  });
  await assertFails(entry(db, 'push_team_devices/' + uid + '/devices/phoneDevice2'));
  await assertFails(deleteDoc(doc(staffDb('permitted-staff'), 'push_team_devices/' + uid + '/devices/phoneDevice1')));
});

