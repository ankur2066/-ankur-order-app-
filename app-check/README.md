# App Check integration (Android, v1.0.18)

This overlay applies to `Ankur_Order_App_Upload_GitHub.zip` in CI, **without changing the archive**.
It is applied by `python3 app-check/apply_patch.py`.

## Verified source design

- Existing app: Capacitor **7**, Firebase **JS** SDK for Auth, Firestore and callable Functions.
- New native dependency: `@capacitor-firebase/app-check@7.5.0` (Capacitor 7-compatible).
- Native Android Firebase App Check: **Play Integrity**, production provider; **no debug provider**.
- Native token -> `CustomProvider` -> Firebase JS `initializeAppCheck`; Firebase JS SDK can attach token to `httpsCallable`.
- Initialize before React renders and remove eager Firestore network test.
- If attestation fails, keep normal app available, disable the Self Pickup confirm/undo function (fail closed).
- The owner registered Android app `com.ankurdryice.events` for Play Integrity via Firebase Console, on Oct 30, 2026.
- The owner has **not** registered Web apps for App Check; Self Pickup on the web is deliberately disabled.
- APK `versionCode` 18, `versionName` 1.0.18; uses same signing secrets as v1.0.17.

## Cloud test coverage

- `validate-phase15.yml`: apply overlay, download dependency, TS check, Vite build, backend unit tests.
- `android-signed-release.yml`: apply overlay, npm install, Capacitor sync, assert App Check plugin discovered + Gradle project, assemble signed APK, `apksigner verify`.
- Unit tests and compilation alone cannot prove actual Play Integrity token issuance on a phone.

## Remaining manual verification (do not simulate)

1. Install v1.0.18 **over** the existing same-package app (never uninstall first).
2. Confirm owner/staff Google login, orders, notifications and customer screens still work.
3. Verify Android App Check requests appear as verified in Firebase Console (without enabling enforcement on Firestore/Auth globally).
4. Do not deploy `changeSelfPickup` callable or Firestore rules to production until named database and App Check have been safely reviewed.
5. The project was observed on Spark free plan; Cloud Functions deployment may require Blaze, **which has not been authorized**.
6. Self Pickup callable and real notifications have **not** been live-verified.

Do not add App Check secrets, Android signing keys, customer records or an App Check debug token to git.
