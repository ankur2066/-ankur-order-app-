# Ankur Order App — Verified File & Release Map (30 October 2026)

## GitHub location
- Repo: https://github.com/ankur2066/-ankur-order-app-
- Work branch: `feature/self-pickup-security-tests`
- Draft PR #2: https://github.com/ankur2066/-ankur-order-app-/pull/2
- Production branch `main`: unchanged by Phase 15 work. Do not merge or deploy until Firebase live tests are complete.

## What is where
- `Ankur_Order_App_Upload_GitHub.zip`: **Phase 15 source** uploaded from phone. Not an APK.
- `Ankur_Order_GitHub_Source_Upload.zip`: older source ZIP; do not use it for Phase 15.
- `.github/workflows/validate-phase15.yml`: unpacks Phase 15, validates TypeScript, Vite build, pickup policy tests and backend syntax.
- `.github/workflows/android-signed-release.yml`: unpacks **Phase 15 source** and builds a signed release APK.
- `firebase-backend/align_database.py`: local/CI preflight patch for the backend's named Firestore database; NOT an automatic Firebase deployment.
- `firebase-applet-config.json` (inside source ZIP): web app's configured named Firestore database.
- `firebase-functions/index.js` (inside source ZIP): original callable Self Pickup backend; **still targets default Firestore until patched**.
- `firestore.rules` (inside source ZIP): candidate rules; do NOT deploy without emulator validation.
- `src/components/StaffDashboard.tsx` (inside ZIP): calls Self Pickup backend.
- `src/components/CustomerOrders.tsx` and `src/utils/selfPickupReceipt.ts`: customer handover receipt.
- `ci-fixes/`: GitHub-hosted Android UI/native Firebase compatibility overlays.
- Signing credentials (keystore, passwords, Google services JSON): **GitHub Actions Secrets**, NOT in the repository.
- Original installed v1.0.15 APK: known as `Ankur_Order_v1.0.15_Release.apk` in earlier conversation working files. This filename is not a GitHub source archive.

## Confirmed build evidence
- GitHub Phase 15 cloud validation run #41081319555: SUCCESS (dependency install, TypeScript, Vite build, pickup policy tests, backend syntax).
- GitHub signed Android run #41082078178: SUCCESS (Firebase config, release build, APK signature verification, artifact upload).
  https://github.com/ankur2066/-ankur-order-app-/actions/runs/41082078178
- Artifact name: `Ankur-Order-Signed-Release`, artifact ID `12988829965`. ZIP contains `app-release.apk` version 1.0.17 (versionCode 17).
- Earlier assistant also checked v1.0.15 and v1.0.17 signing certificates matched. Actual device installation/upgrade is **not** yet verified.
- The GitHub CI patch introduced after this build is for backend database alignment and must separately pass.

## Not yet proven / production blockers
1. The source ZIP backend uses `getFirestore()` (default); the app uses a **named** database. The CI script aligns the backend with the named database, but the source ZIP is still unchanged.
2. `enforceAppCheck: true` is present on the callable, while the source app has no configured App Check initialization. Do not weaken enforcement or deploy before Android App Check integration and tests.
3. Self Pickup callable not confirmed deployed; no real-user transaction test against the target database.
4. Pickup notification outbox is written but has no confirmed dispatch worker; it does not prove push/WhatsApp delivery.
5. Firestore emulator/production rules migration not confirmed. Do not overwrite existing production rules without safe review.
6. Functions deployment may require Blaze/billing; no billing authorization has been given.

## Next safe sequence
- CI preflight/patch of named database -> complete backend validation.
- Inspect Firebase project and App Check settings with explicit account connection; do not alter billing.
- Emulator tests on a throwaway database; verify roles, undo, receipt, outbox.
- After approval: deploy callable/rules carefully and test one non-customer test order.
- Only then distribute the signed APK more widely. Do not uninstall the current working app.

## Planned future UX, NOT delivered in v1.0.17
- New Order defaults to one Dry Ice line (kg, 1 box). `+` adds another line and `×` removes it; sums kg/boxes/amount. Optional notes.
- Pyro deferred by owner. Admin-editable staff, items, rates, and optional images require separate implementation and verification.
