# Ankur Order App — Phase 15 (Working branch)

**Signed Android APK v1.0.17 built successfully. Firebase Self Pickup backend is NOT yet production-ready.**

## Verified
- Phase 15 source: `Ankur_Order_App_Upload_GitHub.zip`.
- Source validation: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41081319555 (success).
- Signed release: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41082078178 (success).
- APK from GitHub Actions artifact `Ankur-Order-Signed-Release`, signed and verified by GitHub runner.
- `main` branch and production Firebase have not been changed by this branch.

## Before rollout
- Correct callable backend to use the same named Firestore database as the app (see `firebase-backend/align_database.py`). Do **not** deploy the original default-database backend.
- Configure Android App Check tokens while retaining callable's `enforceAppCheck: true`.
- Verify deployed callable, rules, and handover receipt with test accounts.
- Notification outbox currently only queues records; delivery is not verified.
- Confirm on-phone in-place APK update. Do not uninstall old app.
- Firebase Functions deployment may require billing; do not enable/charge without owner authorization.

See [ANKUR_FILE_MAP.md](ANKUR_FILE_MAP.md) for file locations and current blockers.
