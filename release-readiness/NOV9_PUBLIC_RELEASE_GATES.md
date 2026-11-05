# Ankur Dryice — November 9, 2026 public-release gate
**Candidate date:** Monday 9 Nov 2026. **Status:** staging, not public.
**Scope:** one signed Android build includes all 14 role-appropriate feature routes,
plus booking, tracking, AI Video, Owner Dashboard, staff phone protection and
customer-consent-controlled Daily Winner.

## 1. One-commit automated gate
- Real React/TypeScript build, 14-feature customer/owner/staff route tests, tap
  regressions, update-channel and original-signer tests.
- Signed Android APK/AAB waits for **three server security reviews**: named
  Firestore staff Rules/consent, optional feature-suite transactional emulator
  and FCM notification privacy. A failed suite blocks the signed build.
- The actual APK is checked for original signing identity, exact package and
  versionCode; broad installer permissions are rejected.
- These Actions are **PRIVATE**, not production deployment or Play publication.

## 2. Mandatory live production verification — NOT AUTOMATED
1. Current authorized Firebase project and exact named Firestore database Rules,
   deployed Functions revisions, App Check, IAM, billing, price settings.
   Compare to staged baseline; halt on unexpected drift.
2. Current protected database backup/export and Rules/index backup; tested
   recovery path. Keep credentials/PII out of GitHub Actions artifacts.
3. Review staged server Functions and rate limits; install only with explicit
   owner sign-off. Dry run and perform owner-authorized, controlled backfill.
   Read-only two-way projection audit must show no missing/unsafe/orphan views.
   Verify old APK staff raw reads/writes denied after production Rules change.
4. Verify active-staff-only FCM push worker and live-source hashes, separate
   owner/staff/customer identities, and App Check on actual Android devices.
5. Activate optional features **only** where owner has approved correct rate,
   inventory, promotions, subscriptions, reward and winner policies. No
   fictitious offers, invoices, rewards, charges or winners.
6. Physical in-place upgrade test without uninstall, booking, owner balances,
   shipping, self-pickup, tracking, phone-only-on-call, notification, offline,
   multi-role sign-in/out, reports export, 14 role-based feature routes and
   winner public name/consent withdrawal.
7. Owner accepts a channel. For direct APK, publish the verified signed APK
   on canonical HTTPS website, test CORS, signed update manifest and installs.
   For Play Store, finish production Console review and track approval. GitHub
   private Actions artifact ZIP is NOT a public distribution URL.

## 3. Release blockers, even if GitHub is green
- Any missing live Firebase backup, failing security Rules/permissions, broken
  customer booking or tracking, owner unaudited status writes, unconfigured
  business-dependent workflows, failed physical upgrade, or invalid APK URL
  prevents public launch.
- 'All 14 present' does NOT mean all optional server features already live.
  The feature-suite flag remains off until approved configuration.
- If live gates miss 9 Nov, use a demo/announcement instead of calling an
  unverified client publicly released.

Use exact GitHub run/SHA, live readback and real-device receipts. Never check
these boxes without concrete evidence.
