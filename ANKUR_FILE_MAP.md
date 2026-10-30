# Ankur Order App — File Map (30 October 2026)

## Repository
- GitHub: https://github.com/ankur2066/-ankur-order-app-
- Working branch: `feature/self-pickup-security-tests`
- Review only: https://github.com/ankur2066/-ankur-order-app-/pull/2 (draft, do not merge before tests)

## Main files
- `Ankur_Order_App_Upload_GitHub.zip`: Phase 15 app source archive uploaded from phone; **not an installable APK**.
- `.github/workflows/validate-phase15.yml`: Phase 15 CI tests. It extracts the ZIP above, then checks TypeScript, web build, backend tests and syntax.
- `.github/workflows/android-signed-release.yml`: signed Android release workflow. **Currently points to `Ankur_Order_GitHub_Source_Upload.zip`, not the Phase 15 archive. Do not assume it builds Phase 15 yet.**
- `Ankur_Order_GitHub_Source_Upload.zip`: older app source archive; not the current Phase 15 archive.

## Inside Phase 15 ZIP
- `package.json`, `package-lock.json`: JS dependencies/build scripts.
- `android/`: Android project.
- `firebase-functions/`: backend and pickup policy tests.
- `PHASE15_FIX_NOTES.md`: Phase 15 changes.
- `firestore.rules`: Firebase security rules.

## Release safety
- APK must use the same Android application ID and signing key as the installed app; increase versionCode.
- GitHub Secrets hold signing credentials; do not commit keystore or passwords.
- Self Pickup unit tests are not equivalent to full Android/Firebase integration verification.
- Keep production Firebase data and `main` unchanged until validation and approval.
- Source archive, signed APK, and keystore are different files.

## Current status
- Phase 15 archive exists on working branch.
- Local backend policy tests reportedly 11/11 passed; local dependency install incomplete, so local TypeScript/web build remains unverified.
- No completed GitHub Actions run for this PR has been confirmed via the connector.
- No new Phase 15 signed release APK has been confirmed.
