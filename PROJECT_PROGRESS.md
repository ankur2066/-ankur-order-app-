# ANKUR DRYICE — PROJECT PROGRESS / CHAT HANDOFF

**Last checked:** 2026-11-02 16:48 IST (Asia/Kolkata)  
**Project:** Ankur Dryice customer / owner / staff Android app  
**Repository:** `ankur2066/-ankur-order-app-`  
**Active review branch:** `codex/all-14-phase-bc-english`  
**Draft PR:** https://github.com/ankur2066/-ankur-order-app-/pull/15  
**Verified PR base (Phase A):** `codex/phase-a-owner-reports-expenses`  
**Release safety:** review / private tests only; do **not** merge into `main`, change production Firebase, enable features, spend credits, or publish APK without owner approval.

## Why this file exists

The owner uses short ChatGPT conversations and Codex quotas run out. **Resume from this GitHub file, the PR and CI, rather than requiring old chat history.** On every meaningful change update this file with commit, tests, blockers and next action. Avoid asking the owner for technical decisions already present in the repository.

## Confirmed latest baseline

- App name for UI and promotions: **Ankur Dryice**.
- Primary Call: **95808 82066**; WhatsApp: **88963 32066**. Preserve distinct links.
- New install launches in **English** without a prompt; users switch English/Hindi only in Profile > Settings > Language and choice persists. Remaining legacy screen translations are incomplete.
- Preserve original five bottom tabs, existing working booking, tracking, notifications, staff/owner permissions, and protected rates. Keep real data safe.
- **Phase A** owner 30-day overview, actual orders CSV and 15th–14th expenses implemented and CI passed; no live deployment.
- **14 additional features** staged through `all-features`: calculator, video *prompt* generator, loyalty, catalogue, wholesale, recurring, promos, inventory, reports, FAQ, rate card, support, service area, referral. Basic route/UI is **not equal to a live completed feature**.
- **Billing extension:** `billing/` staged inactive unit-product catalog, safe integer-paise calculation, immutable order snapshots, isolated product notifications; no live settings or product catalog seeded.
- **Phase B/C trusted backend:** isolated Rules, transactions, receipt generation, promotions, stock, referral, partner, subscription flows in review code; require final integration, permissions/security, real settings and approved deployment.
- Existing legacy order notification system is protected, but new preference / localization coverage is not complete.
- Latest reviewed SHA before chat takeover: `7e6e4f4a51a5627317bfb177b758dbfbcf0a065a`.
- At that SHA GitHub Actions successes:
  - All-14 review: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41361555030
  - Security emulator: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41361554962
  - Product billing review: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41361554972
  - Signed combined **v1.0.34 private TEST APK**: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41361554903/artifacts/13105463180 (artifact expires ~2026-11-08 UTC). It was signed/verified by CI but has **not** been verified on an owner's physical Android device.
- Main detailed reports: `docs/ONE_SHOT_14_FEATURE_REPORT.md`, `docs/FEATURE_ROLLOUT_REVIEW.md`, `docs/PHASE_A_COMPLETE.md`, `billing/STATUS.md`. Some reports describe earlier v1.0.33; prefer the latest CI run for APK version.

## Remaining work — prioritized

1. Ensure complete English-default / optional Hindi language coverage, including new `billing/templates/` customer checkout / owner product editor and old booking/tracking/owner screens; preserve stored IDs and validation.
2. Test phone flows end-to-end on signed combined APK: booking -> owner -> packing -> dispatch -> completed -> customer tracking + FCM; guest/customer/owner/staff and real phone permission checks. Do not claim Android device tests from GitHub CI.
3. Fully wire product/wholesale/recurring/promo/referral/stock features behind safe disabled flags, complete Firebase Rules/Functions with emulator authorization tests, and give owner exact deployment proposal.
4. Fix inventory legacy dispatch integration / double-debit hazards and preference coverage for legacy notifications; no invented data, taxes, or rewards.
5. Validate PDF invoices (commercial receipt is not automatically GST tax invoice), product price snapshots, refund/payment verification, owner-controlled catalog/rates.
6. Final owner walkthrough, staged Firebase rollout with explicit owner approval, signed release APK and launch media.

## How to resume with minimal conversation

1. Fetch this file and PR #15 head SHA/CI/artifact; do not assume the chat contains latest work.
2. Pick **one** safest high-impact unfinished area. Inspect source, make targeted changes in the **review branch**, keep hashes of protected files unchanged.
3. Run/review automated checks; mark *unverified* if not possible. Save commits and update this file with exact evidence and next step.
4. Tell owner only key results, blockers, and a link. **Ask questions only when truly necessary** (credentials, payments, live deployment, final business rules). No production changes without approval.

## Current ChatGPT direct work

**2026-11-02 — first direct GitHub work completed; no owner questions required.**

- `9c33d0182`: created this durable progress/handoff document.
- `37e879dac`: customer `UnitProductForm` / `UnitOrderBreakdown` now use the existing persistent English/Hindi preference. English-first labels include booking, validation messages, order confirmation, bill totals, packing/delivery and correct editable input lengths. Existing Firestore order fields and fixed-point price calculation remain unchanged.
- `93191b5d4`: owner `UnitProductManager` now shows translated field labels, draft state, pricing/packing labels, product names and actions.
- `336a1f8bb` and `d2eadcc26`: added a three-test bilingual source/permission regression contract and wired it to all-features CI.
- `01cc1ac4b`: updated the existing checkout React test harness to supply the new language context and verify both English and Hindi form labels. Earlier intermediate CI failures were caused by the missing test mock and have been addressed.
- **Latest code revision checks at `01cc1ac4b`: PASS**
  - All 14 feature review CI: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41435548607 and https://github.com/ankur2066/-ankur-order-app-/actions/runs/41435540852
  - Product billing review: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41435540768
  - Security emulator: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41435540545
- **New combined signed private TEST APK** was successfully rebuilt from app-source revision `93191b5d4` (same application source as latest test commit), run https://github.com/ankur2066/-ankur-order-app-/actions/runs/41435216292, artifact `13135244610`: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41435216292/artifacts/13135244610. Version `1.0.34-combined-test`; artifact expires 2026-11-09 ~11:18 UTC. Not installed / device-smoke-tested / published.
- **Known language gap:** underlying pure-money validation exceptions, some native dispatch-slot text and the legacy booking/tracking/admin screens still have untranslated Hindi. This change covers the new unit-product customer/owner views only; do not claim full-app localization.

**Next safe development task:** inventory and finish remaining English-first screen localization (especially legacy Booking and Tracking) without changing booking IDs, money, Firestore rules or notification behavior. Then request device smoke testing of signed APK. Keep feature-suite backend disabled until owner-approved deployment.

## 2026-11-02 evening — owner final wedding-season scope / app updates

The owner wants maximum forward progress with **minimal questions**, frequent saved commits, and security preserved. **10 Nov** wedding season begins; the current season ends **12 Dec 2026**; other products are deferred to the season starting **15 Jan 2027**. Launch planning should prioritize the main booking / tracking / push / phone usability, not wait for unconfigured bonuses to go live. New launch scope:
- **One existing customer booking Home screen for active Dry Ice and Pyro items only.** No new customer Other Products page. Keep the five navigation tabs as before; the Categories tab can list only the permitted active products.
- **Never delete** historic other products, stock, pricing, invoices or orders. Other product categories are intentionally **disabled in public UI** using `seasonal/catalogPolicy.template`, with `PUBLIC_OTHER_PRODUCTS_ENABLED=false`. **Do not automatically activate** them on 15 Jan; owner release approval is required. Existing safe listing of actively priced Pyro products remains; if none are live, do not invent product price/availability.
- All 14 feature definitions/routes remain in `all-features/templates/FeatureHub.template`; a duplicate customer Application Catalogue panel was removed from Categories and its route was preserved for the owner-only feature hub. Incomplete backends remain off.
- Owner reports low-contrast / washed-out pages; **screen-level colour contrast and accessibility QA is deferred until the essential wedding-season booking/update flow is secure**.
- Owner wants **update-on-open** notifications in the installed app, so customers do not need a new WhatsApp APK link every release. `updates/appUpdate.template` validates a *future owner-hosted* HTTPS release manifest, rejects arbitrary APK hosts and old versions; `updates/AppUpdateNotice.template` displays bilingual high-contrast nonblocking notice on Android app open, directs the user to a trusted external update link. Version 1.0.35 uses Android versionCode 35. Installer permission / silent updates are prohibited; Google Play's native in-app flexible update flow remains a separate later integration.
- **The manifest at `https://ankurdryice.store/app-updates/android-stable.json` is NOT yet live/verified.** Until a real new version, same-certificate signed APK and HTTPS hosting are owner-approved and published, this checker intentionally shows nothing. Existing users require a one-time installation of the signed v1.0.35 review/release build before this UI exists on their device.
- Official safe publishing procedure: `updates/README.md`.
- New tests: `seasonal/catalogPolicy.test.mjs` and `updates/appUpdate.test.mjs`, added to `.github/workflows/all-features-review.yml`. `all-features/reconstruct.py` includes the templates. Source code checks passed through review run https://github.com/ankur2066/-ankur-order-app-/actions/runs/41458810127 and https://github.com/ankur2066/-ankur-order-app-/actions/runs/41458801842. Signed v1.0.35 test APK run https://github.com/ankur2066/-ankur-order-app-/actions/runs/41458658184 **was still building when this note was drafted**; check status before claiming success.
- **No production data changes, feature flags, release hosting, public Google Play submission, app installation or new billing changes were executed.**

**Immediate next priority:** record the finished signed v1.0.35 artifact and checksum; Android-device smoke test of a legacy v1.0.34→v1.0.35 in-place update, home Dry Ice/Pyro visibility, both language modes, booking/tracking/push, notification and high contrast. Then prepare Google Play listing and consent-safe update distribution. Play account testing/approval requirements may affect November launch timing. Do not use unverified Play Store dates.

## 2026-11-02 19:45 IST — signed APK and Play AAB confirmed

- **Both signed Android artifacts PASS** at code revision `e5c0a2509ba26573dcab19c1ebbcf137bda67020`; GitHub run https://github.com/ankur2066/-ankur-order-app-/actions/runs/41459341566 succeeded, including web build, Gradle `assembleRelease bundleRelease`, APK signature and AAB `jarsigner`/certificate check.
- **Signed private v1.0.35 APK:** artifact `13148698344`, link https://github.com/ankur2066/-ankur-order-app-/actions/runs/41459341566/artifacts/13148698344, expires around **2026-11-09 14:15 UTC**.
- **Signed private v1.0.35 Play AAB:** artifact `13147289558`, link https://github.com/ankur2066/-ankur-order-app-/actions/runs/41459341566/artifacts/13147289558, expires around **2026-11-16 14:15 UTC**.
- Store listing draft: `docs/PLAY_LISTING_DRAFT.md`. Release security checklist: `docs/WEDDING_SEASON_RELEASE_GATE.md`.
- Automated latest review pass: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41459551904 (prior to this documentation note).
- **None of these proves** device installation, real customer order round-trip, working live in-app update, published Play Store, or newly deployed Firestore backend. Do not state otherwise.

**Next action:** physical Android test (especially Pyro availability if correctly active), contrast QA, core booking/tracking/notifications. Confirm Play Console account/eligibility before planning public store launch; keep all production changes awaiting approval.

## 2026-11-02 — v1.0.36 private review follow-up

- Audited PR #15, signed v1.0.35 APK/AAB workflow and owner handoff. No main-branch merge, production deployment or live data change.
- Update checker: restrict release links to canonical first-party APK filenames; reject encoded paths, redirects and declared oversized payloads; remove stale update notification when the manifest is invalid/withdrawn at a foreground recheck.
- Scoped customer Booking high-contrast styling (fields, disabled/selected slots, price totals, focus); contrast-ratio test requires at least 4.5:1 on specified text/surface pairs. It changes CSS only.
- An intermediate contrast assertion wrongly rejected a word in a harmless script comment; corrected at `31927b290`. Superseded failed CI runs are not final verification.
- Bumped **private test candidate** Android versionCode to 36 and versionName to `1.0.36-season-test`, including aligned update-check version and contract tests so it can be tested as an in-place update from v1.0.35. **Do not call the new APK successful before CI reports it.**
- All feature services still on review branch; no website manifest, public APK/Play publishing, Firebase/Rules writes or billing changes.
- Next: review the newest Actions run and signed APK/AAB hashes, phone smoke test for Dry Ice/Pyro booking, language, tracking, real owner/staff/customer FCM and in-place upgrade.

- 2026-11-02 follow-up: fixed a local rebuild parity gap. `all-features/reconstruct.py` now applies the same final scoped booking-contrast overlay as review CI and signed APK CI. Added a reconstruction parity test; source builder remains offline/review-only. Corrected old-version update guidance: v1.0.35 already has the checker; v1.0.34 and earlier need a verified in-place update first. No production changes.

- 2026-11-02: added a **real React component integration test** for Android update-notice lifecycle (first launch, Later dismissal, foreground return, new version, withdrawn manifest, duplicate focus event and browser suppression), in `updates/notice.test.mjs`. It runs in the existing CI React test stage. This is emulated browser/render testing, **not** physical Android confirmation.

- 2026-11-02 signing identity hardening: GitHub Actions for v1.0.35 and v1.0.36 both reported the same APK certificate SHA-256 `ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e`. The review workflow now refuses to upload APK or AAB if their certificate changes unexpectedly. This guard is a future-build protection; the already successful v1.0.36 artifact remains valid. No key or password is stored in source.

## 2026-11-02 21:02 IST — v1.0.36 cert-guarded Android build PASS

- **Latest source-bearing APK commit:** `fc9a72a0b8081848f16693588b0decb9ffce0b7f`; GitHub signed run [41471582997](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41471582997) completed **SUCCESS**: web/native Gradle, APK signature + pinned certificate, AAB jarsigner + pinned certificate, both uploaded.
- **Private v1.0.36 signed APK:** [artifact 13156235587](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41471582997/artifacts/13156235587), expires 2026-11-09 15:31 UTC. Artifact includes `app-release.apk` and SHA-256 file.
- **Private v1.0.36 Play AAB:** [artifact 13155867278](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41471582997/artifacts/13155867278), expires 2026-11-16 15:31 UTC. Artifact includes signed AAB and SHA-256 file.
- **Signing certificate safeguard confirmed** at fingerprint `ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e`, same as previous v1.0.35 and v1.0.36 build. GitHub review CI on cert-guard head also passed [41471599950](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41471599950) and [41471582949](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41471582949).
- Added `docs/ANDROID_V136_DEVICE_QA.md`: no-PII, old-version upgrade, language/booking/tracking/FCM/security checks for an authorized physical Android test. **A real physical device test is still pending; no production order test performed.**
- An untrusted/absent manifest at `https://ankurdryice.store/app-updates/android-stable.json` must not show an update prompt; no manifest publication was performed.
- All code remains private draft PR #15. No main merge, public APK release, Play submission, new Firebase Functions/Rules deployment, billing change, or live customer data mutation.

- 2026-11-02 second work session: staged native Android appStateChange foreground wakeup for update manifest (in addition to existing focus/visibility), cleanup and React integration regression. Review and signed CI install the official Capacitor App 7 plugin. Prior v1.0.36 binary is unchanged until another signed build passes; no remote publication or production data changes.

- 2026-11-02 second session: staged bilingual selected-product label, product name, price line, alert accessibility text and Home booking heading from the persistent Profile language setting. This intentionally covers **customer Home shell only**, not the legacy OrderForm/Tracking/Admin screens. Price calculations and Firestore order persistence are unchanged. Local reconstruction, review CI and signed APK overlays are aligned and checked by `ui-fixes/customer-home-language.test.mjs`. Await CI before claiming build success.

- 2026-11-02 second session: added an actual React-render test of reconstructed CustomerHome, checking English default, selected Hindi labels and product names, one product selector and unchanged single booking form. Integrated in CI's existing React regression stage. It is a source/UI test, not a physical Android customer booking.

- 2026-11-02: integrated Android Monthly PDF `ui-fixes/mobileReport.test.mjs` in review CI, covering private-cache write, actual file-attachment share, web save fallback, missing data and receiver failures. Signed Android workflow now triggers whenever monthly/PDF source changes; previously modifying `mobileReport.ts` could leave an outdated APK artifact. Real on-device Save/Share still requires physical testing.

## 2026-11-02 22:03 IST — signed v1.0.37 private Android build verified

- **Code-bearing signed build** [GitHub Actions #41481537453](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41481537453), source SHA `5a8d479276be8ea61d617968f493ab1b208efb0d`, SUCCESS. Native Android `versionCode=37` with original certificate SHA-256 `ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e`. AAB `jarsigner` verification passed.
- **Signed private v1.0.37 APK ZIP:** [artifact #13159639062](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41481537453/artifacts/13159639062), expires 2026-11-09 16:31 UTC. ZIP has `app-release.apk` and `apk-sha256.txt`.
- **Signed private v1.0.37 Play AAB ZIP:** [artifact #13159798626](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41481537453/artifacts/13159798626), expires 2026-11-16 16:31 UTC.
- The signed application includes Android App native foreground recheck, Home language-switch overlay, and Monthly PDF share-as-attached-file fix. Later commits only adjusted tests/CI/documents, not those application sources. Latest review CI should be checked separately.
- Core Firebase/rates/order data/main branch were not changed. App has **not** been installed/tested on a physical phone or published to website/Play. Manifest is still not verified live.
- Next gate: owner-approved **in-place** upgrade and real-device QA per `docs/ANDROID_V137_DEVICE_QA.md`; then release decision, Play account/app-policy checks and owner-controlled website manifest only after actual hosting.

## 2026-11-02 second session — review gate status

- Latest PR #15 remains **Draft**, source remains in private review branch. Latest safe v1.0.37 signed APK/AAB links are recorded above; no release manifest or production deployment.
- Review CI [#41482833393](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482833393) passed all applicable checks: 34 source/unit checks + 4 Phase A + 59 actual React/component tests = **97 passed, zero failed**. Separate security emulator also passed [#41482808455](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482808455).
- Added a customer call-link contract to preserve dedicated `tel:+919580882066` instead of accidentally routing calls to the WhatsApp-only number. This is source-level validation, not proof of a real dialer action.
- The Android signed workflow now also checks `aapt dump badging` for exact package `com.ankurdryice.events` and `versionCode 37`, and rejects broad installer/file-management/package-query permissions. Its **new** guarded artifact run must be observed separately before calling those new binary checks passed.
- Android physical sign-in, update-over-old-version, customer booking/tracking, FCM and PDF Save/Share remain **untested on a real handset**. Manifest HTTPS hosting and public Google Play rollout remain owner-approval gates.

## 2026-11-02 22:09 IST — final hardened v1.0.37 private build PASS

- **Signed APK/AAB job [#41482732286](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482732286) SUCCESS**, source SHA `4876ef575f4f1538fa0b1b9e6788856b0f20f225` and Android versionCode **37**. New gate checks actual `aapt dump badging` package/version, rejects broad install/file/query permissions, and verifies APK plus AAB original signing certificate.
- **Latest verified private APK:** [artifact #13160417227](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482732286/artifacts/13160417227), expires 9 Nov 2026 16:38 UTC.
- **Latest verified private AAB:** [artifact #13159509265](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482732286/artifacts/13159509265), expires 16 Nov 2026 16:38 UTC.
- The application code matches the prior v1.0.37 candidate; this run **adds actual built-binary security verification** and supersedes the earlier signed link. APK/AAB are private test artifacts, not released to users.
- All 97 source/React/Phase A checks passed in [review #41482833393](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41482833393), with security emulator pass. **Physical phone and live manifest tests remain pending.**


## 3 November 2026 — customer navigation + dark theme before next signed APK

**Owner request:** Finish private tests and screen cleanup first; do not publish a new signed APK or make production changes yet. Existing live Dry Ice booking on Home replaces the redundant customer Categories/Products browsing tab.

- Customer bottom navigation is **Home / My Orders / AI Video / Profile**. `ui-fixes/customer_nav_v138.py` removes only the Categories button and updates the old catalogue-promo navigation to open Home. The legacy internal catalogue implementation and all real product/order data are preserved.
- `ui-fixes/customer_dark_contrast_v138.py` + `customer-dark-contrast-v138.css` scope readable dark-mode colors to Profile, AI Video Studio and the Video Idea Builder/FeatureHub. Customer Home booking, owner/staff dashboards, backend, stored theme preference and light mode are not recolored.
- Static regression tests `ui-fixes/customer-nav-v138.test.mjs` and `ui-fixes/customer-dark-contrast-v138.test.mjs` assert 4-tab navigation, protected Home booking anchors and >= 4.5:1 sample foreground/background contrast.
- Changes were applied to the **draft review branch only**. The completed GitHub review **PASS** includes reconstruction, node contracts, npm lint/build and actual React client/tap regressions: [run #41551346193](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41551346193), head `8cc3dee3dcd65e7f6ee742f08a8e32d74a4bc561`. A prior failed attempt was fixed (English-translated `Categories` label in reconstructed BottomNav).
- **Not done yet:** new signed v1.0.38 private build, device-side screenshots/contrast inspection, in-place installation, customer booking/tracking/notifications, Monthly PDF recipient Save/Share, published HTTPS update manifest. The existing **v1.0.37** signed private APK is not a build of these new v1.0.38 review changes.
- Before any signed candidate, update the private signed workflow to reconstruct *both* new UI patches, re-run all release checks, pin the correct version code/certificate, and only then produce an explicitly **private TEST** artifact. Public release and production Firebase changes require separate approval.
