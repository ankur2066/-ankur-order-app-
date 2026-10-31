import test from 'node:test';
import assert from 'node:assert/strict';
import { canUndoPickup, validatePickupAction, FIVE_MINUTES } from './pickupPolicy.js';

const now = Date.parse('2026-10-30T10:00:00Z');
const base = { isOwner: false, actorUid: 'staffA', completedBy: 'staffA',
  completedAt: new Date(now - FIVE_MINUTES).toISOString(), nowMs: now };
test('same staff may undo at exactly 5 minutes', () => assert.equal(canUndoPickup(base), true));
test('undo blocked after 5 minutes', () => assert.equal(canUndoPickup({...base, nowMs: now+1}), false));
test('different staff cannot undo', () => assert.equal(canUndoPickup({...base, actorUid:'staffB'}), false));
test('future completed timestamp rejected', () => assert.equal(canUndoPickup({...base, completedAt:new Date(now+1).toISOString()}), false));
test('invalid timestamp rejected', () => assert.equal(canUndoPickup({...base, completedAt:'bad'}), false));
test('owner may undo beyond window', () => assert.equal(canUndoPickup({...base, isOwner:true, nowMs:now+FIVE_MINUTES*10}), true));
test('unauthenticated actor rejected', () => assert.equal(canUndoPickup({...base, actorUid:''}), false));
test('confirm input valid', () => assert.equal(validatePickupAction({orderId:'ORD123',action:'confirm'}), null));
test('undo requires reason', () => assert.match(validatePickupAction({orderId:'ORD123',action:'undo',reason:'  '}), /reason/i));
test('invalid order id rejected', () => assert.match(validatePickupAction({orderId:'../foo',action:'confirm'}), /order/i));
test('undo reason accepted', () => assert.equal(validatePickupAction({orderId:'ORD123',action:'undo',reason:'Wrong handover'}), null));
