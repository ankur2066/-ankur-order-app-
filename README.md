# Ankur Order App — Signed Release

**Status: Source upload pending; APK not built yet.**

- Build signed Android release APK only (assembleRelease).
- Preserve applicationId com.ankurdryice.events and original signing key for updates.
- Never commit .jks/.keystore, passwords, .env secrets, or customer data.

## Prerequisites
1. Upload extracted full source, retaining src/, android/, package.json and package-lock.json. Uploading ZIP alone does not make source available to CI.
2. Verify Android release signing config and versionCode.
3. Configure Actions Secrets: ANKUR_RELEASE_KEYSTORE_BASE64, ANKUR_RELEASE_STORE_PASSWORD, ANKUR_RELEASE_KEY_ALIAS, ANKUR_RELEASE_KEY_PASSWORD.
4. Run signed release workflow and verify signature and update compatibility.

Current workflow setup is not proof of a successful build.