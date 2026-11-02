# Ankur Dryice — v1.0.36 Android field acceptance (PRIVATE TEST)

**Status:** Test plan, NOT evidence of a physical phone test. Only the owner or an authorized tester can confirm on a real Android phone. Do not post customer contacts, tracking PINs, signing secrets or screenshots containing sensitive order data.

## Release identity and in-place update (no data deletion)

- Build: **1.0.36-season-test**, Android `versionCode=36`, package `com.ankurdryice.events`.
- Source of test APK: GitHub Actions run [41471582997](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41471582997), pinned-certificate-verified signed APK artifact [13156235587](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41471582997/artifacts/13156235587). Compare the included checksum and installed version.
- APK signer certificate SHA-256 expected from v1.0.35 and v1.0.36 CI:
  `ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e`.
- **Never uninstall the old app to update.** Save/verify account and record access first. Android package replacement must retain app data and auth; a signing mismatch must stop the test and be reported, never fixed by uninstalling.
- Phone: Settings → Apps → Ankur Dryice → App info/version. Record old/new version, phone Android version and install result. Do not change production order data just to inspect the app.
- Download the correct private artifact ZIP, extract `app-release.apk`, verify source, and install only if the owner's device trust checks pass.

## Read-only acceptance in sequence

1. Open directly on Home; verify no launch-language prompt. English is initially selected on fresh install; for existing users, a stored Hindi preference must persist.
2. Profile → Settings → Language: select Hindi and then English; navigate Home/My Orders/Tracking, close/reopen and verify persistent selection. **Known gap:** old legacy screens still have untranslated literals; log specific text and screenshot rather than mark the full app translated.
3. Home is one booking form with five original bottom tabs. Product chooser/Categories show only active permitted Dry Ice and Pyro products. Inactive Pyro must not appear; **do not create sample stock or price** to force it visible. Other categories must stay absent from public UI but historical orders remain accessible.
4. Test quantity entry and totals locally with 10 kg and 20 kg **without final Submit**. Compare base price + packaging + any owner-configured transport to displayed amount and the extra-amount reason validation. Never assume a fixed rate.
5. Verify dispatch Morning/Evening choices show the owner's existing time rules; expired slots should be disabled, not remapped to different stored keys.
6. Inspect My Orders and tracking for an **existing authorized order only**. Confirm customer account/PIN privacy; don't screenshot or disclose tracking credentials.
7. Foreground/background/reopen the app on reliable and poor internet; check no crash, duplicate toasts, or false 'new order' alerts for old server snapshot.
8. If there is **no published valid newer** first-party manifest at `https://ankurdryice.store/app-updates/android-stable.json`, there should be **no update popup**. Resume-only requests are deduplicated; a real future update must show a consent-required external link, never silently install.
9. Confirm Call `95808 82066` and WhatsApp `88963 32066` use different correct destinations. Verify the exact prefilled WhatsApp text on the device before sharing.
10. Inspect Booking, Tracking, Profile in light and dark themes at narrow display/text scaling. Record low contrast, cut-off labels, missing tap feedback; selected/disabled dispatch slots must remain legible.
11. Owner-only Monthly PDF: on a permitted real Android test device, open Insights/Monthly Report and initiate the existing export without changing orders. Android should show its native Save/Share chooser (not a browser Blob download); only after an authorized tester selects a target confirm a file was saved and can be opened. Verify that the accounting period is 15th–14th, all included orders appear, and verified payments are distinguished from booked value. **The old PDF-save bug is not certified fixed until this device step passes.**

## Authorized controlled live test (SEPARATE owner approval)

- Real booking submission, owner status transitions, staff changes, self-pickup completion and notification receipt **write to live data**. Perform only with explicit owner authorization, a single clearly marked TEST order, and a cleanup/rollback plan.
- With authorized separate customer/owner/staff Android phones: place one controlled test order; inspect dashboard, packing, dispatch, completed, tracking PIN and FCM in foreground, background, and fully closed states. Record sent message IDs and physical receipt separately; a server sent=1/failed=0 does **not** prove phone display.
- Reject double-charging assumptions, auto-GST, unverified Paytm/UPI payment, speculative Pyro prices, automatic stock debit or reward issuance.
- Scope production deployment (new functions/rules, release manifest, Play uploads or feature activation) for separately reviewed approval only.

## Suggested no-PII evidence fields

| Field | Value |
| --- | --- |
| Device model / Android version | Not tested |
| Existing installed version | Not tested |
| v1.0.36 in-place update / retained data | Not tested |
| English/Hindi / navigation | Not tested |
| Dry Ice/Pyro active-only / amount / time | Not tested |
| Tracking and protected history | Not tested |
| Update-on-open/resume / manifest state | Not tested |
| Accessibility light/dark screenshots | Not tested |
| Owner Monthly PDF native Save/Share and opened document | Not tested |
| Controlled live booking and FCM device delivery | Not authorized / not tested |

**Release gate:** Keep PR #15 private/draft until the owner approves its actual device evidence and production operations. CI web/native build success alone is insufficient for public rollout.
