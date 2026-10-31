/** Load the extracted package with real SDK dependencies, without any network. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import net from 'node:net';
import http from 'node:http';
import https from 'node:https';
import { syncBuiltinESMExports } from 'node:module';

const root = resolve(process.argv[2]);
const manifest = JSON.parse(readFileSync(resolve(root, 'manifest.json'), 'utf8'));
assert.equal(manifest.artifactType, 'review-only-not-deployed');
assert.equal(manifest.deploymentApproved, false);
assert.equal(manifest.liveTargetVerified, true);
assert.equal(manifest.liveFunctionInventoryComplete, true);
for (const [name, expected] of Object.entries(manifest.files)) {
  assert.ok(!name.split('/').includes('..'));
  const bytes = readFileSync(resolve(root, name));
  assert.equal(bytes.length, expected.bytes);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), expected.sha256);
}
assert.ok(manifest.files['runtime/firebase-functions/pickupPolicy.js']);
assert.ok(manifest.files['runtime/firebase-functions/package-lock.json']);

const denyNetwork = () => { throw new Error('Network disabled during backend package smoke test'); };
net.Socket.prototype.connect = denyNetwork;
http.request = http.get = https.request = https.get = denyNetwork;
globalThis.fetch = denyNetwork;
syncBuiltinESMExports();

const entry = resolve(root, 'runtime/firebase-functions/index.js');
const backend = await import(pathToFileURL(entry).href);
assert.deepEqual(Object.keys(backend).sort(), [
  'changeSelfPickup', 'notifyAnkurOrderProgress', 'notifyAnkurSelfPickup', 'notifyNewAnkurOrder',
].sort());
for (const exported of Object.values(backend)) assert.equal(typeof exported, 'function');
console.log('PASS: complete extracted backend loads with real Firebase SDKs, without network or invocation.');

// The separately staged codebase must never include changeSelfPickup.
assert.ok(process.argv[3], 'notification-only stage path is required');
const stage = resolve(process.argv[3]);
const staged = await import(pathToFileURL(resolve(stage, 'functions/index.js')).href);
assert.deepEqual(Object.keys(staged).sort(), [
  'notifyNewAnkurOrder', 'notifyAnkurOrderProgress', 'notifyAnkurSelfPickup',
].sort());
const config = JSON.parse(readFileSync(resolve(stage, 'firebase.json'), 'utf8'));
assert.equal(config.firestore, undefined);
assert.equal(config.functions.length, 1);
assert.equal(config.functions[0].codebase, 'orderpush');
for (const fn of Object.values(staged)) {
  assert.equal(fn.__endpoint.serviceAccountEmail, 'ankur-order-push@ankur-dryice-app.iam.gserviceaccount.com');
  assert.deepEqual(fn.__endpoint.region, ['asia-southeast1']);
  assert.equal(fn.__endpoint.eventTrigger.eventFilters.database,
    'ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673');
}
console.log('PASS: isolated orderpush stage exports only three reviewed triggers with explicit runtime identity.');
