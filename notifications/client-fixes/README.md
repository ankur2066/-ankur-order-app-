# Notification client fixes for Issue #11

These files patch a disposable extraction of the existing PR #9/#10 source. The original ZIP, signed v1.0.29 APK, Firebase production code, customer/order records, forms and prices are unchanged. Apply after `notifications/apply_patch.py`.

Changes:
- Wait for the first server-confirmed orders snapshot before creating a new-order alert. Empty offline cache and pending local writes do not establish a baseline. Full snapshots handle metadata-only acknowledgements; trash/restore stays silent.
- Pass event ID, type, status and payment metadata through the Android bridge. A foreground Firestore/FCM pair creates one notice, and repeated FCM delivery/tap IDs are remembered for 24 hours. A later genuine transition still creates a notice. Pair matching expires after two minutes; it is not a replacement for backend idempotency.
- A background notification tap adds its notice before opening the existing sheet.
- Scope notice/event caches by UID and team/self permission mode. Existing legacy cache is retained on disk. Verified owner may migrate it; other scopes only migrate orders for which the device already holds the private tracking capability.
- Keep the newest eight private tracking tokens, discover signed-in customers' own recent orders, and attach guest tracking immediately after a successful booking. Stale account queries cannot restore a previous identity.
- Add a visible notification bell to the existing staff header; retain owner/customer bell behavior.

`client.test.mjs` exercises the actual TypeScript modules and React hook using real React 19. Firestore and Capacitor boundaries are mocked, with no production credentials or requests. Run after installing `react` and `react-test-renderer@19`:

```
node --experimental-vm-modules --test notifications/client-fixes/client.test.mjs
```

15 tests cover both arrival orders, repeated IDs/remount, repeated real transitions, empty cache/server baseline, pending-write acknowledgement, payment/pickup pairs, trash/restore, user/permission changes, guest listener refresh, latest-eight ordering, native taps/metadata, stale auth queries and logout cleanup.

The separate `android-notification-candidate.yml` builds a private signed v1.0.30 artifact. It enforces versionCode 30 and the existing v1.0.29 signing certificate. It never installs, publishes, merges or deploys. The original release workflow and APK remain unchanged. The Firebase verification workflow separately runs the existing backend/Rules suite and compiles web/native code.

Device validation still needs real foreground/background/closed-app behavior and separate permitted staff/customer phones. The five live synthetic backend events used the owner's one token; they do not establish those physical-device results. The existing production self-pickup callable was not deployed by this work.

The later [tap follow-up](../tap-fix/README.md) extends these tests to 17 native/client
cases plus 12 routing/toast/sheet cases, and builds the latest v1.0.31 candidate.
The original v1.0.30 build and its 15-test description above are historical.
