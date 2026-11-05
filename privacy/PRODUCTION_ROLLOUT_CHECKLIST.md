# v1.0.52 staged privacy cutover — operator checklist (not executed)

This is a **release gate**, not a production deployment instruction. GitHub CI has no permissions to inspect or modify the live named Firestore database; no production state is claimed by this document.

## Scope and authoritative targets

- Firebase project: `ankur-dryice-app`.
- Named Firestore database: `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`. Never substitute `(default)`.
- Function region: `asia-southeast1`.
- Staff operations: `staffOrderViews`, `staffOrderAssignments`, `staffProjectionWatermarks`, `staffContactRates`, `staffContactAudit`.
- Winner: `dailyWinners`, `dailyWinnerPrivate`, `dailyWinnerAudit`, `userPrefs`, `settings/dailyWinner`.
- Latest private QA source is the exact PR #22 SHA reported by GitHub, not simply a branch name.

## Preconditions — ALL required before touching production

1. Read **current live** named-DB Rules and confirm the intended source baseline/hash; fail closed on mismatches. Keep a timestamped backup of Rules, relevant indexes and service-account IAM bindings. The included staging Rules are proposals, not evidence of what is currently deployed.
2. Export/backup both original order collections and their tracking collections, plus `users`, `userPrefs` and new projection state if already present. Restrict backup access and plan deletion/retention; do not copy customer names/phones to GitHub Actions artefacts.
3. Verify Firebase billing/limits, runtime account and least-privilege policies, necessary indexes for winner consent lookup, App Check attestation on the signed Android package, Cloud Functions quotas, audit retention and FCM delivery paths.
4. Rehearse the entire sequence against a non-production emulator/dedicated sandbox: old staff APK raw order reads denied after rules, new APK safe staff list and per-order contact/status callables, owner dashboard full access, customer-only history, pickup, product and legacy orders, notifications.
5. Confirm explicit active staff status and `permissions.viewOrders`; grant `callCustomer` only to staff who need phone access. Status-only workers may get `updateStatus` without `callCustomer`. Owner must assign each authorized order separately. Do not default-enable legacy staff.
6. Confirm production function names are free and review target triggers. Functions must run under the proposed keyless service-account identity; don't overwrite unrelated existing codebases.

## Controlled sequence (approval required at the live stage)

A. Deploy only the new, audited named-database server functions with no public UI activation and no Rule overwrite. Verify App Check and owner identity. Keep Daily Winner `enabled:false` by default.

B. Run the read-only `privacy/backfill.mjs` dry run against the **explicit named DB**; compare order counts by collection. Resolve invalid statuses/IDs and any partial or anomalous data before continuing. The dry run does not list PII.

C. Only after owner approval, verified backups and the typed environment gates may the backfill `--apply` run. It now **removes stale staff-safe projections of soft-deleted orders**, retains transaction watermarks against old event replay and preserves `sourceCollection` for legacy product orders. Validate parity: every eligible order has exactly one sanitized view; no trashed/deleted order has a view, and no view contains phone/email/tracking PIN/full address. Never rely on a row-count match alone.

D. Roll out the private signed v1.0.52 APK to designated owner/staff testers. Verify same package/signing certificate and in-place upgrade without uninstall or local data loss. New staff APK must use the safe projection only; older staff APKs must not be left in an unrestricted state.

E. Activate the reviewed named-DB Rules **in a coordinated access window**: remove all legacy staff direct raw-order read and direct order/tracking write grants, grant projection read for active explicit staff, and keep owner/customer access. Confirm using a signed-in staff SDK/REST direct read/write probe on *both* raw order collections and tracking collections; all must be DENIED, including from an old APK. Verify customer own-order and admin privileges still work.

F. Revalidate on real Android devices, separate owner/staff/customer logins, slow/offline, pending/confirmed/packing/dispatched/delivered statuses, pickup, billing/report exports, v2 product order and legacy product order. Staff Call action may reveal **one** number for 15 s; dialer and WhatsApp still expose that chosen number, and external photography cannot be prevented. Never promise absolute concealment.

G. Test winner with **synthetic consenting customers only**: publication requires explicit customer opt-in, excludes discounted/wholesale orders, supports 3/4-day rule, one winner per India date, allows audited manual override, and immediately suppresses published names after consent withdrawal. Default remains disabled until owner explicitly enables. No gift type is fixed.

H. Read back deployed rules, function names/revisions, settings and test receipts. Publish the website update manifest / Play release ONLY after owner acceptance, working verified HTTPS APK URL, no security exceptions and real-device QA. Do not silently download/install.

## Failures and rollback

- If raw orders are still readable by staff: stop all distribution; first revoke staff access server-side, investigate overlapping Rules matches, then restore the restrictive policy. Do **not** blindly roll back to legacy permissive Rules.
- If any projection contains private information: disable projection reads or staff access immediately, delete the affected unsafe views using admin privileges, fix the server allowlist and rebuild safely; retain privacy incident evidence without copying PII to logs.
- If live status or customer tracking fails: pause rollout; verify paired tracking paths and customer access. Do not restore direct staff write permissions as a shortcut.
- If winner opt-out fails: disable winner display and selection, suppress the public record through audited server procedure, investigate before re-enabling.
- Restore only targeted Functions/IAM changes from the read-back inventory; never erase unrelated existing Firebase services, customer orders or billing settings.

## Evidence required to close this gate

- Production named-DB Rules version/hash before and after; successful backup/rollback test.
- Backfill dry-run/apply report with counts, no PII, plus live projection parity report.
- Raw read/write-denial attempts for staff across legacy and product orders, tracking paths.
- Functions IAM/App Check verification and owner/customer/staff real phone test receipts.
- Signed APK certificate/package/version QA and in-place upgrade test.
- Owner acceptance of production cutover, customer-facing release and winner activation.

**Until those receipts exist, status remains PRIVATE QA READY / PRODUCTION NOT VERIFIED.**
