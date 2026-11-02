# Ankur Dryice — staged Android update-on-open plan (NOT LIVE)

## What is now in the signed review app
- **App display:** nonblocking English/Hindi high-contrast “Update available” notice **only** on Android Capacitor app launch, only when a newer verified release manifest is served.
- **Source:** `src/services/appUpdate.ts` and `src/components/AppUpdateNotice.tsx` copied from `updates/*.template`.
- **Version:** new private v1.0.36 candidate, Android `versionCode=36` (build/device verification still required).
- **Manifest URL:** `https://ankurdryice.store/app-updates/android-stable.json`. This file does **not exist / is not confirmed live**. Network/invalid JSON/CORS failures fail closed: no popup, old booking still works.
- User can select Open update or Later. The app does **not** silently download or install APKs, request `REQUEST_INSTALL_PACKAGES`, access Firestore, or change booking and notification state.
- Only allowlisted destination: official HTTPS `https://ankurdryice.store/app-releases/*.apk` or exact official Google Play listing for package `com.ankurdryice.events`. No third-party redirects.
- This is **not yet** full native Play Core flexible in-app installation. Google Play-distributed builds should use Play Core when Play listing is available. Play's restricted install permission policy prohibits arbitrary self-update installers in this business app.
- Existing customers on v1.0.35 or earlier cannot see the new notice until they install the **first v1.0.36 update**. Reuse the same signing certificate, never uninstall/reinstall and erase customer data to update.

## Owner-approved publishing procedure, later (do not auto-run)
1. Build and device-test **v1.0.37 or higher** signed with the *existing* release certificate and increasing Android versionCode.
2. Verify archive hash, APK signature, install/update over v1.0.36, settings and order data retention, FCM and tracking.
3. Host the EXACT signed APK at the official website's `/app-releases/` directory; configure HTTPS/CORS. Customer must confirm install via Android; never sideload in background.
4. Only **after** verifying live URL and version numbers, publish the separate JSON manifest to the official website's `/app-updates/android-stable.json`.
5. Sample shape (**EXAMPLE ONLY; NOT A REAL RELEASE**):

```json
{
  "versionCode": 37,
  "versionName": "1.0.37",
  "channel": "signed_apk",
  "url": "https://ankurdryice.store/app-releases/Ankur-Dryice-v1.0.37-signed.apk",
  "notes": "Booking and tracking improvements"
}
```

For an approved Google Play rollout, set `channel:"play"` and `url:"https://play.google.com/store/apps/details?id=com.ankurdryice.events"`; only use when the listing actually exists and update is available to that customer. More advanced native Play Core immediate/flexible flows can be staged later.

## Security / QA
- Reject wrong hosts, HTTP, credentials, arbitrary path/query, unexpected version, malformed/oversized JSON.
- Respect user consent and show clear text, not colour alone.
- Do not use raw download or APK installer APIs in the app.
- Tests: `updates/appUpdate.test.mjs`, alongside normal app lint/build/security tests.
- **Publishing manifest, public APK or Google Play listing is a separate release action requiring owner approval.**

## 2026-11-02 follow-up security hardening
- Update discovery also rechecks when the Android WebView returns to the foreground (visibility/focus), with burst deduplication; no background installer or silent update.
- The APK release URL must now be one canonical `/app-releases/filename.apk` path with no encoded separators, nested folders, query strings or redirects; the checker rejects oversized response headers before reading a body.
- If the approved manifest becomes unavailable, invalid or withdrawn after a notification appeared, the prompt is cleared on the next check instead of continuing to promote a stale download link.
- These are review-only source changes. The existing signed v1.0.35 APK does not include later source commits until the private signed build completes; no manifest was published.
