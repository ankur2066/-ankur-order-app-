# Issue #11: notification source audit

> Update 2026-10-31 21:10 UTC: Rules are live; the separately owner-approved
> billing/API stage is complete with an INR 500 alert. v1/v2 Functions inventories
> are empty. Three Functions and runtime IAM are staged for separate approval.
> See [current deployment status](live-review/DEPLOYMENT-STATUS-HINDI.md).

Source audit of PR #9/#10 plus an authenticated live metadata audit on
2026-10-31. No APK, original source archive, customer document, deployed Rules or
Functions was changed. The official MCP unexpectedly enabled Cloud Billing API;
it was restored to DISABLED, with no billing account linked or Blaze activated.
See [live evidence and staged approval](live-review/APPROVAL-HINDI.md).

## Source evidence

The original `Ankur_Order_App_Upload_GitHub.zip` blob is
`7e790aa79f80db6bd93fdf5d04db4209772047aa`. Its configuration specifies:

- Project: `ankur-dryice-app`.
- Named database: `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`.
- Existing Android package: `com.ankurdryice.events`.

These identifiers now match live project/database/Android metadata. The database
is in asia-southeast1. The signed v1.0.29 artifact certificate hashes match live
registration. FCM is enabled, but Functions/Run/Eventarc APIs are disabled, so
function/trigger inventory remains unavailable, not proven empty. Billing is
unlinked. Current Rules differ materially from source Rules: they deny token
registrations and allow profile role escalation. Captured baseline, proposed
minimal Rules, deterministic diff and emulator comparisons are in `live-review/`.

| App source | Prepared notification code | Finding |
| --- | --- | --- |
| OrderForm creates `orders/{orderId}` and `order_tracking/{orderId}_{sixDigitPin}` in one batch | New-order trigger watches `orders/{orderId}` | Matching paths; token matches existing 14–48 character validation |
| AdminDashboard updates tracking `status` and `lastStatusUpdate` | Progress trigger watches `order_tracking/{trackingToken}` | Matching status values: pending, confirmed, in_packing, dispatched, delivered, cancelled |
| AdminDashboard payment toggle writes tracking `paymentStatus` | Progress trigger checks `paymentStatus` | Matching values: pending_verification, payment_verified, cash_on_delivery |
| Existing pickup callable updates `orders.selfPickup.status` | Pickup trigger watches `orders/{orderId}` | Matching pickup_pending / pickup_completed fields |
| Rules `hasPerm('viewOrders', true)` accepts absent legacy field or boolean true | Worker previously accepted anything except false | Fixed: malformed permission fields/maps now fail closed; legacy missing fields retain access |
| Native client creates `ankur_order_updates` | Worker sends with the same Android channel ID | Matching source values; runtime permission/channel receipt remains unverified |
| Existing pickup callable enforces App Check | Firestore token registrations depend on Firestore Rules and project-level enforcement | Callable enforcement does not prove Firestore App Check or FCM authorization is configured live |

## Changes in this branch

1. Align staff/delivery recipient selection with the existing Rules' boolean
   permission semantics. Re-read user roles at send time, as before.
2. Prune invalid registrations only if the stored token still equals the FCM
   rejected token, using a transaction. Previously a registration refreshed
   during the send could be deleted by a stale failure response.
3. Hash CloudEvent source/ID and notification kind into a stable Android tray
   tag and data `eventId`. Repeated delivery of the same event replaces its
   current tray entry. Independent events/kinds use different tags; missing
   event IDs do not silently collapse unrelated notifications.
4. Record fixed, allowlisted SDK error categories and failed cleanup counts in
   the worker's send summary without raw error details or device tokens. Whole
   request errors distinguish previously confirmed sends from the unconfirmed
   batch and tokens not yet attempted, then propagate a sanitized failure without raw SDK details, including at the
   platform uncaught-exception logging boundary.
5. Add offline tests of the actual worker with synthetic Firebase SDK modules;
   expand PR #10's emulator tests for legacy/delivery roles, malformed permissions,
   owner verification, private token paths, token validation and role revocation.
6. Extend the existing verification workflow to run these checks and compile the
   unchanged Android web bundle and native Java code without packaging an APK.
   It contains no Firebase deploy command, signing
   secret access, APK release step, or production credentials.

A minimal live-baseline Rules candidate is now proposed for separate approval.
The old APK remains unchanged; no-duplicate foreground behavior cannot be
guaranteed by this backend change alone. All existing extraction/UI patch scripts are
reused only in an isolated working copy and ephemeral CI runner.

An optional [Cloud Shell metadata helper](CLOUD-SHELL-HINDI.md) can collect initial
control-plane evidence in the owner's authenticated browser session without a
Codex desktop app. Eight offline safeguard tests cover scope, token redaction,
read-only requests, target mismatch, named Rules selection, partial results and
authentication failures. The helper has not been executed against live Firebase;
it neither connects the Firebase plugin nor completes the outstanding live audit.

The older signed-build artifact list omitted `pickupPolicy.js`, even though the
backend entry point imports it. The artifact list now includes that dependency.
The verification workflow also produces a separate **backend review** ZIP with
all three runtime modules, package.json, a dependency lock, review-only source
Rules/configuration and a SHA-256 manifest. An extracted copy is loaded with real
Firebase SDK packages while network access is blocked and no handlers are invoked.
Only a fully passing workflow uploads the review ZIP. No APK or production
deployment is produced. See [release status](RELEASE-STATUS-HINDI.md).

## Verification and limits

Locally, the 17 offline worker tests pass. The initial permission/refresh
regressions both failed against the original worker. Source extraction,
the complete existing patch chain, and generated backend syntax checks pass.
The expanded emulator suite, web and native compilation run in GitHub Actions; consult
the PR's checks for their outcome. Local emulator dependencies are now available; the captured baseline and
candidate suites also pass locally.

Offline tests cover named-database routing, role filtering, customer subscription
isolation, status/payment/pickup changes, FCM token deduplication and 500-token
batching, invalid-token cleanup, token refresh, repeated-event tag isolation,
redacted send summaries and transport failure propagation.
They do not prove live trigger invocation, IAM/FCM authorization, or phone receipt.
The CI native compile does not use the production Android Firebase configuration
or signing certificate and cannot validate them. The unchanged v1.0.29 signed Android build was
previously successful in run `41173720110`; no new APK is produced here.

Event delivery can be repeated or out of order. Token deduplication only
deduplicates recipients within one invocation; stable Android tags only replace
a notification that is still in the tray. As documented by the
[Firebase Admin SDK](https://firebase.google.com/docs/reference/admin/node/firebase-admin.messaging.androidnotification#androidnotificationtag),
tags identify existing tray notifications for replacement. They do not suppress
FCM requests or sounds, prevent reappearance after dismissal, order events, or
provide durable event idempotency. The existing foreground Firestore listener
and FCM bridge can both surface the same update. Exactly-once delivery and no-duplicate UI behavior are
not established. These remain explicit review/test items before production
activation, alongside current live Rules and trigger configuration.

## Production gate

The [approval packet](live-review/APPROVAL-HINDI.md) specifies a first Rules-only
release with no billing-plan change, its exact baseline/candidate hashes and named
release rollback. No deployment has been authorized. The Functions phase remains
blocked on explicit billing/API authorization, refreshed inventories, runtime IAM
and old-APK limitations. Existing source Rules are review-only and must never be
substituted for the captured live Rules. No `(default)` target is permitted.

The worker's three notification triggers now propose asia-southeast1 to match the
live database, with minInstances 0, maxInstances 1, concurrency 10, 256MiB, CPU 1,
60s timeout and retry false. The existing callable's region is unchanged. These
limits do not cap billing or guarantee exactly-once delivery.

The new CI adds 10 captured-baseline comparisons, 10 candidate comparisons and 15
candidate token tests to the previous 40 checks (75 total). These use demo emulator
data only. Business/customer documents were not read or modified during the live
audit; only users role/permission fields and the owner's verification state were
read. Real phone receipt and pickup readiness remain unverified; Issue #11 stays open.
