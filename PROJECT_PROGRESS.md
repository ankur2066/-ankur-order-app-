# ANKUR DRYICE — PROJECT PROGRESS / CHAT HANDOFF

## 6 November 2026 — v1.0.49 PRIVATE TEST verified

- App source `f46ea3274b25805e603525ed4a1c94b152510dbf`: same-commit review, security emulator, product billing and signed Android run https://github.com/ankur2066/-ankur-order-app-/actions/runs/42173175171 PASS; 257 checks, including 52 emulator tests, with lint/build and protected legacy audit.
- Private APK ZIP https://github.com/ankur2066/-ankur-order-app-/actions/runs/42173175171/artifacts/13482221812 expires 13 November 2026 UTC. Source and downloaded APK/ZIP checksums match; package/version and original signing certificate were verified in CI. Details: `docs/PRIVATE_TEST_V49_RECEIPT.json`. It has not been installed or tested on a physical phone.
- Loyalty with owner-configured policy, inline promo, customer notification preferences and bilingual UI source/tests are integrated. The live legacy Functions are unchanged; the preference-aware worker is review-only. Actual policy/promo/stock values, separately approved backend deployment, and current live Rules/IAM verification remain necessary. Firebase read-only CLI could not authenticate in this session.
- No production deployment, billing change, live customer/stock modification, feature activation, PR merge, public release or device installation occurred. Existing Work Mode changes and older APKs were preserved. Full 14-row report: `docs/ONE_SHOT_14_FEATURE_REPORT.md`.

## 6 November 2026 — v1.0.49 grouped candidate prepared

- New application/backend source committed as `acc0328da5a09b46bee3385d5773c3bd80d8d007`; latest Work Mode work and original v1.0.48 APK remain intact.
- One v1.0.49 private candidate is requested via `release-batches/v1.0.49-consolidated.txt`; same-commit review, security and product billing must succeed before signing. Check the run and artifact before claiming success. VersionCode 49, original package and certificate pin remain mandatory.
- The older 14-feature table and v1.0.48 artifact are historical; see the latest source entry below for the newly implemented loyalty, promo, preferences and UI localization. Live setup/deployment, actual owner values, wording/device acceptance remain separately gated. No production or customer-data changes.

## 6 November 2026 — remaining private-review implementation

- Continued from preserved Work Mode and v1.0.48 evidence head `aa1859ca85e7008cc973c8ead6aa3769d5a84396`. Added owner-configured, default-off loyalty earning and owner-reviewed redemption with transactional, idempotent ledgers; no points or rewards were seeded. Added inline standard Dry Ice promo preview and trusted booking, preserving the original no-code submission and rate calculations.
- Added customer device/account notification preferences, retaining owner/staff alerts. The existing live worker source is unchanged; a preference-aware existing-worker candidate is staged for a separately approved deployment. Guest choices are device-local. Current live cross-device behavior remains unverified.
- Added static English/Hindi UI copy, preserving business data and account values, with no automatic language prompt. Hash-bound overlays fail rather than overwrite later Work Mode changes. Coverage audit covers static UI and identified messages, not arbitrary stored business/server text; physical Android acceptance and wording review remain outstanding.
- Local combined checks: lint/build and protected legacy audit pass; 71 contract tests, 102 client tests and 52 security-emulator tests pass. Verify exact-head GitHub CI before relying on these changes. No production deployment, billing change, real customer-data write, feature activation, merge, public release or device installation was performed.
- Last signed APK is v1.0.48 from `113072a6d84e8d634c3e891aece9a95c09a8d979`; it does not contain these new changes. Create one grouped private candidate only after reviewing the current source and CI.

## 6 November 2026 — v1.0.48 private APK SIGNED / VERIFIED

- Final app source: `113072a6d84e8d634c3e891aece9a95c09a8d979`. Same-source review/security/product jobs and signed Android run https://github.com/ankur2066/-ankur-order-app-/actions/runs/42142670072 all PASS. Job logs confirm **215 unique checks, zero failures** (147 review + 44 security + 24 product).
- New combined private TEST APK: https://github.com/ankur2066/-ankur-order-app-/actions/runs/42142670072/artifacts/13469485603 (ZIP with APK, checksum, source receipt and grouped-release marker; expires 13 November UTC).
- Package `com.ankurdryice.events`, versionCode 48, versionName `1.0.48-combined-test`; original certificate pin verified by CI. Downloaded ZIP hash, extracted APK hash and source-SHA receipt independently matched. Full evidence: `docs/PRIVATE_TEST_V48_RECEIPT.json`.
- This includes latest Work Mode premium owner/staff/privacy/seasonal/navigation/AI/update/PDF code plus bilingual Tracking, optional trusted inventory dispatch and safe supply resume. Work Mode and existing APK files have not been replaced or rolled back.
- **Assignment remains incomplete:** loyalty issuance/redemption/policy, legacy inline promo checkout, legacy notification preference enforcement and complete legacy localization. Source/live distinction and all 14 PASS/BLOCKED rows are in `docs/ONE_SHOT_14_FEATURE_REPORT.md`. No physical-device acceptance is claimed.
- Optional backends/selling/inventory remain inactive without real configuration and owner-approved deployment. Current live Rules hash/IAM rollout and physical Android acceptance are still required. No production deployment, billing change, live customer-data mutation, merge, public release or device installation occurred.
- Subsequent documentation-only evidence commits are not different app binaries; the APK source remains the exact SHA above. Keep the one-APK-per-grouped-release marker and all three same-commit gates.

## 6 November 2026 — grouped v1.0.48 private candidate

- Inventory source `461f7767364bae4aeae24742d911606e490a70b2` passed exact-head review runs 42142009143 / 42142003623 and emulator run 42142003631.
- Added own Regular Supply resume, which resets approval/execution and therefore requires a fresh owner decision; no automatic charge or execution. Emulator covers pause/resume and cross-user denial.
- Added real installed Firebase SDK discovery tests for the staged three feature exports and two product exports. Signing now depends on same-commit source review + security emulator + product-billing review; certificate/package checks remain mandatory.
- Prepared ONE explicit `release-batches/v1.0.48-consolidated.txt` grouped private candidate, versionCode 48 / 1.0.48-combined-test, including all current Work Mode app source and this session's tracking/inventory/resume changes. APK artifact includes source SHA and checksum. This entry records preparation, not build/signature success: verify the release-marker commit's Actions results before distributing.
- Updated the stale 14-feature and billing reports with current source behavior and exact unfinished work. See `docs/ONE_SHOT_14_FEATURE_REPORT.md`; do not claim complete English/Hindi coverage or 14/14 live operation from CI.
- Local final checks: lint/build/protected legacy audit PASS; emulator 41/41; contracts 71; actual client/handler regressions 72; Phase A 4; billing/listener/push/receipt 25; real SDK discovery 2. Actual Android acceptance/live rollout remain unverified.
- No production Firebase deployment, billing change, live data write, feature activation, PR merge, public release or installation authorized/performed.

## 6 November 2026 — optional inventory integration completed in review source

- Tracking follow-up committed at `5fd60d298f9b539c7b75f78e2652525729e3c6b6`; exact-head review CI PASS: https://github.com/ankur2066/-ankur-order-app-/actions/runs/42140935406 and https://github.com/ankur2066/-ankur-order-app-/actions/runs/42140929252. Security emulator PASS: https://github.com/ankur2066/-ankur-order-app-/actions/runs/42140929310.
- Closed the previous inventory integration gap in staged source: both real owner/staff status handlers delegate Dispatch to `ankurFeatureAction` only when optional inventory mode is explicitly enabled. Read/call failures never fall back to the direct batch. Disabled/missing settings preserve the existing paired status update path.
- Trusted dispatch resolves SKU from the stored order, validates staff permissions using the same missing-key defaults as Rules, balance/unit and zero-PII tracking consistency; transaction commits stock, immutable movement, private status and projection together. Retry/races cannot double-debit. New candidate Rules guard every overlapping allow branch, prevent direct dispatch/delivery and prevent status rewind while mode is on. ETA uses the same staff permission predicate.
- Owner setup includes a separately saved off-by-default inventory switch, real opening stock, mapping and audited adjustment; no actual quantities, prices or switch values were invented or seeded. All current seasonal/Home/premium owner/staff/privacy/AI/update changes remain in the reconstruction chain.
- Local verification of combined source: lint/build PASS; optional feature + product Rules and actual Firestore transaction emulator 41/41 PASS; UI/contracts 71/71 (phone-link test rerun from generated source cwd); actual client/checkout/tap/language/update/tracking + inventory helper/real dashboard handlers 72/72 PASS; Phase A 4/4; billing/listener/product push/receipt 25/25. Protected legacy booking submit, rates and original Rules hashes unchanged. No physical-device test is implied.
- Remaining rollout gates: actual verified SKU/balances and owner-approved runtime/Rules/IAM rollout; every owner/staff client must use the reviewed app before inventory activation. Older APK files are untouched. Whole-app legacy localization, legacy push preference enforcement, real reward policy and physical acceptance remain incomplete.
- No production deployment, feature activation, customer-data write, billing change, merge, installation or public release was performed. The next grouped private build may include this source only after successful same-commit review/security checks.

## 6 November 2026 — tracking language and contact follow-up

- Continued from exact Work Mode-preserving head `b67dc7b79529f1efbeb2db3b9650a366f94268cd`, reconstructed the complete current chain, and kept the latest seasonal policy, five tabs, premium owner/staff screens and grouped-release gate.
- Added `ui-fixes/tracking-language.py` last in local, review and signed reconstruction. Tracking labels, validation/errors, statuses, payment state, ETA and contact accessibility text now use the existing English/Hindi preference. English has no language prompt; switching does not reread the order or discard its PIN.
- Corrected Tracking Call to 95808 82066; WhatsApp remains 88963 32066. Stored product/location/dispatch/status notes are preserved verbatim. Secret capability lookup, Firestore reads and payment state data are unchanged.
- Local checks: TypeScript lint and Vite build PASS; actual tracking React tests 3/3; existing combined client/tap/Home regressions 30/30; latest owner/staff/five-tab/dispatch contracts 13/13; reconstruction/release-gate contracts 3/3. Protected audit confirms original legacy booking submission, rates and Rules unchanged. CI for this follow-up must be checked at its resulting commit before claiming remote PASS.
- This completes the tracking UI language gap only. Remaining legacy owner/staff/order screens, backend rollout/inventory integration and physical-device verification still need work; the historical 14-feature report does not describe all later Work Mode changes.
- No release marker, version bump, new APK, production deployment, feature activation, live customer-data write, merge or billing change was made in this batch.

## 6 November 2026 — Codex reconnect / Work Mode reconciliation

- Reconnected using the existing GitHub connection and verified Draft PR #15 is open on codex/all-14-phase-bc-english.
- Reconciled the previous Codex implementation baseline 7e6e4f4a with the much newer Work Mode head 0d5e1403940a670c3f208efe44c5f1c50586eae8. Do not restore the old v1.0.34 files or overwrite later overlays.
- Latest exact-head review CI PASS: https://github.com/ankur2066/-ankur-order-app-/actions/runs/41860599072 and https://github.com/ankur2066/-ankur-order-app-/actions/runs/41860588684.
- Preserve subsequent seasonal Dry Ice/Pyro restrictions, bilingual unit checkout/editor and Home changes, native update/PDF safety fixes, current navigation and AI Video/Profile cleanup, compact dispatch/Rules-viewer removal, and the latest premium owner/staff contact overlays.
- The latest owner/staff premium source is reviewed source; these CI results alone do not prove it is contained in a newly signed APK or physically tested.
- Keep the explicit grouped-release marker and same-commit review gate. Do not create an APK for every edit. Preserve original signing identity, booking/rates/tracking/payment/FCM, existing APKs and live customer data.
- Next development must reconstruct the current workflow chain and verify remaining backend/localization gaps against this new head. Older reports and version headings below are historical; do not treat them as the latest app state.
- No production deployment, billing-setting change, customer-data mutation, merge, public release or installation was performed during this reconnect check.


**Last checked:** 2026-11-03, private v1.0.38 work session (Asia/Kolkata)  
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
- Current customer navigation is Home / My Orders / AI Video / Profile (four tabs), per the 3 November cleanup. Preserve existing booking, tracking, notifications, staff/owner permissions and protected rates.
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


## 3 November 2026 — source-only customer screen cleanup (before signing)

- Previous review baseline head `104a0f8c6ad` has successful review CI [#41551620650](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41551620650).
- **Categories page now also disabled as a customer render target** in `ui-fixes/customer_nav_v138.py`, beyond merely removing its bottom-tab button. A stale `categories` promo action routes to Home. The old component stays compiled for internal compatibility; no product records, rates, order histories, Firestore Rules, owner or staff data were deleted.
- Scoped CSS for Profile / AI Video / FeatureHub now explicitly includes readable accent text, Settings choices, focus outlines, buttons and link contrast in Dark Mode. No global theme choice or customer booking pricing changed.
- New regression assertions in `ui-fixes/customer-nav-v138.test.mjs` and `ui-fixes/customer-dark-contrast-v138.test.mjs`. **Success / failure of the final new source CI must be confirmed from the final branch head; do not infer from older runs.**
- **Signing is deliberately on hold** while the owner reviews visual edits. Existing signed Android workflow is still v1.0.37 and does **not yet reconstruct v1.0.38 nav/color patches**. It must be aligned and version-bumped only after safe review/test, with explicit permission before any private signed build.
- Physical Android screenshot/color inspection, owner PDF recipient Save/Share, controlled booking/tracking/FCM and approved public release remain pending.


## 3 November 2026 — resumed work: private v1.0.38 build preparation

The owner requested continued implementation, holding device-dependent questions together for later. Continue private review/test work only; public rollout and production data/backend changes remain out of scope.

- Aligned signed reconstruction with the reviewed four-tab navigation and scoped dark-theme overlays. New UI overlay changes now trigger a fresh private binary.
- Added a same-commit reusable review prerequisite to signing; signing secrets are used only after the full review job succeeds. Added full reconstruction-chain parity and review-gate regression tests.
- Android candidate and in-app update checker both advance to versionCode 38 / 1.0.38; APK/AAB keep the existing pinned signer and package/permission checks.
- Local targeted verification: 8/8 update, signing and reconstruction contracts passed. Full reconstructed CI and signed APK/AAB are pending at time of this entry; do not label an artifact successful without its completed run.
- Physical handset installation, visual inspection, actual PDF receiver Save/Share, real push receipt and live update hosting remain unverified. No main merge, public release, production Firebase write or customer order mutation.


## 7 November 2026 — 14-feature completion/release attempt (current handoff)

- Read `PROJECT_PROGRESS.md`, `docs/ONE_SHOT_14_FEATURE_REPORT.md`, `docs/FEATURE_ROLLOUT_REVIEW.md`, `docs/WEDDING_SEASON_RELEASE_GATE.md`, and `CODEX_TASK_REMAINING_FEATURES.md` before continuing.
- On `codex/all-14-phase-bc-english`, owner-controlled Feature Suite settings UI and callable backend `featureSettings` action were staged for Loyalty, Application Catalogue, Wholesale Partner, Regular Supply, Promotions, Inventory and Referral Share. Defaults are off; per-feature server handlers enforce their flag. Test fixtures were changed to isolate owner-switch setup.
- Customer shell was changed to Home / My Orders / AI Video / Profile, English-first with Profile language selection, and feature hub content gated by Owner settings. Wedding-season customer catalog is limited to Dry Ice and owner-approved Pyro. Call/WhatsApp links are set to the owner-requested dedicated numbers.
- Release docs added: bilingual Play listing + Data Safety/content-rating drafts, HTML privacy policy, 15-step Hindi phone checklist, and staged Firebase deploy script + Hindi exact-command guide. The script only prepares local deploy inputs; it did not deploy anything. Real stock, SKUs, loyalty policy, partner rates and promo rules stay unset until the owner fills them.
- Local source check: `npm run lint` passed; `NODE_OPTIONS=--max-old-space-size=1536 npm run build` passed (2623 modules; Vite warns about dynamic imports and a >500 kB main chunk). This is local source verification only.
- GitHub review workflow at head `5bfdd7450bc51b9282e948b2d1c0a18894f017b5` (runs [42367807832](https://github.com/ankur2066/-ankur-order-app-/actions/runs/42367807832) and [42367811975](https://github.com/ankur2066/-ankur-order-app-/actions/runs/42367811975)) reported failure. The GitHub job endpoint returned a completed failure with no step detail, and the job-log endpoint returned 404; root cause is not diagnosable from the connected GitHub interface. Do not treat CI as passing.
- PR #22 remains open, Draft, and non-mergeable; its base is `codex/all-14-phase-bc-english`, head is `codex/staff-phone-server-privacy-v149`, and latest fetched metadata still describes the older v1.0.56 first-five pilot. No main merge or signed v1.0.63 APK/AAB run has been completed in this work session. Do not merge or publish until review is green and a fresh signed run verifies package, version and existing certificate.
- The extracted source tree is assembled locally at the workspace `full-app/` but has **not** yet been committed at repository root. The working copy intentionally excludes its nested `node_modules`/build output from any source submission; no keystore or signing secrets are included.
- Firebase project configuration, deployed Rules/Functions, indexes, App Check and physical Android QA were not live-verified. No Firebase deploy, Play Console action or production/customer-data mutation occurred.

**Next action:** inspect the failing review run in GitHub Actions (using a browser if necessary to retrieve job logs), fix any source/test failures, publish root source extraction and complete Phase 1–3 commits, rerun all CI and the existing signed APK/AAB workflow with incremented versionCode. Retarget/merge PR #22 into main only after all required checks pass. Owner must deploy Firebase from the prepared guide, enter real values in Owner Dashboard, run the phone checklist, and upload to Play Console.


## 7 November 2026 — confirmed GitHub Actions blocker

- Signed-in GitHub Actions page for run [42367807832](https://github.com/ankur2066/-ankur-order-app-/actions/runs/42367807832) shows the exact annotation: “The job was not started because recent account payments have failed or your spending limit needs to be increased.” Run duration was 4 seconds; no runner steps or tests executed.
- Therefore this is an account billing/spending-limit block, not a code/test failure. No billing method or spending limit was changed. Required paid/account setting must be handled by the owner before CI, a fresh signed APK/AAB workflow, PR merge or release can proceed. No signed build artifact was created for versionCode 63 in this session.


## 8 November 2026 — release audit source overlay

- Created release branch `codex/release-audit-14features-20261108` from `codex/all-14-phase-bc-english` and committed the release audit overlay plus regression contract. The overlay fixes the identified staff list source (permission-gated existing order collections, PII-safe projection), tracking call link, locally saved/idempotent retry identity for failed bookings, native installed-version comparison, and Android `allowBackup=false`.
- Expanded Owner Dashboard + server validation to all 14 feature keys; missing settings resolve OFF, and customer visibility now requires an owner flag instead of a pilot-manifest bypass. No Firebase deploy, Play Console action, billing change, or feature activation.
- Local reconstructed-source checks: TypeScript lint PASS; Vite production build PASS (existing large-chunk and dynamic-import warnings); release audit contract PASS. Next step is to wire this overlay into review/sign workflows, then run branch CI before requesting any signing job.


## 8 November 2026 — review/sign workflow wiring

- Connected the release overlay and regression contracts to review CI and signed-test workflow. Review now runs on this release branch and on PRs targeting main. The signed workflow is set to versionCode 64 / versionName 10.0.64-combined-test and builds both APK and AAB with the existing key; source web build receives the same version values.
- First Actions attempts reached the hosted runner and failed during overlay application because upstream localization changed the exact FeatureHub source pattern. The patch was made tolerant of those overlays and pushed. Run 42435383963 is queued at this checkpoint; earlier failures are implementation failures, not billing annotations. No billing settings were changed.
- No signed artifact has been produced yet. I will create the release marker only after the exact release-branch review/security/product checks pass.


## 8 November 2026 — release audit CI green

- Completed the release audit fixes on `codex/release-audit-14features-20261108`: staff order listing uses the permission-checked shared listener and a PII-minimized projection; tracking calls `95808 82066`; offline bookings keep a local pending draft and reuse the stable order identity on retry; update checks compare the installed version with build versionCode 64; Android backup is disabled.
- All 14 customer feature entries are controlled by Owner Dashboard switches and default OFF. The source validation accepts the same 14 keys. English is the default and Hindi is selected from Profile settings; the customer language, screen, tap, and contrast regression suites pass. Existing Daily Winner controls and banner were restored into reconstructed source with language-aware copy.
- Hosted review run [42438243576](https://github.com/ankur2066/-ankur-order-app-/actions/runs/42438243576) passed all steps, including unit/regression contracts, release audit contracts, lint/build, React tap regressions, language screens, and safety boundary. Local `npm run lint` and `npm run build` also pass; Vite reports only the existing large-chunk/dynamic-import warnings.
- No billing settings, Firebase deployment/live data, or Play Console state was changed. Next: run the gated existing-key signed versionCode 64 APK/AAB workflow and verify both signatures/artifacts.


## 8 November 2026 — signed v1.0.64 candidate built

- Release marker commit `5b52eef98ae3a6f3694d8c0898ac0043f9b17edb` passed the exact-head review run [42438402136](https://github.com/ankur2066/-ankur-order-app-/actions/runs/42438402136) and signed workflow [42438402172](https://github.com/ankur2066/-ankur-order-app-/actions/runs/42438402172). Review, security emulator, product-billing code checks, signing, APK/AAB build, package/version validation and certificate checks all passed.
- Signed package is `com.ankurdryice.events`, versionCode 64, versionName `10.0.64-combined-test`. APK and AAB both match the existing release certificate SHA-256 `ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e`.
- APK artifact [Ankur-Dryice-v1.0.64-SEASON-PRIVATE-TEST](https://github.com/ankur2066/-ankur-order-app-/actions/runs/42438402172/artifacts/13600184382) expires 15 November 2026 UTC. AAB artifact [Ankur-Dryice-v1.0.64-PRIVATE-PLAY-AAB](https://github.com/ankur2066/-ankur-order-app-/actions/runs/42438402172/artifacts/13600602821) expires 22 November 2026 UTC. No Play Console upload, Firebase deploy, feature activation or billing setting change was made.
- Remaining owner actions: perform the approved Firebase deploy from the prepared instructions, enter real feature values and turn on only selected Owner Dashboard switches, run the Android phone checklist, and upload the AAB to Play Console when ready.


## Visual QA follow-up — 8 November 2026

- Fixed owner feature controls with explicit dark text on white panels so all 14 switch labels stay readable in light and dark themes.
- Removed the tracking and checkout references to QR images that are not shipped in the app bundle. Both screens now explain the manual payment fallback; tracking uses the same existing UPI ID shown at checkout, `8896332066@paytm`.
- Added release regression assertions for both fixes. Local reconstructed-source checks passed: release-audit contract, TypeScript lint, and Vite production build. CI and a new signed build are pending for this follow-up.
- No Firebase, Play Console, or billing changes.


- CI follow-up: run 42463311578 reached release-audit contract tests; an exact-string check for FeatureHub spacing failed despite the owner-switch expression being present. Replaced it with a whitespace-tolerant expression check. Re-running CI on the corrected test; no app-build error was reported in that run.


## 8 November 2026 — v1.0.65 customer feedback branch

- Branch `codex/fix-v1065-test-feedback` is based on `codex/release-audit-14features-20261108` (v1.0.64 private test). Owner-requested scope is implemented in the v1.0.65 overlay and mapped item-by-item in its PR description.
- Booking/rules: owner-controlled retail/wholesale customer type; retail total is fixed; wholesale total edits require a reason; calculated/customer totals are stored; totals are checked in Firestore rules. Wholesale rate remains unset until the owner enters it. Thermocol is itemized and optional.
- Orders: local Paytm QR; UPI copy button; IST dispatch date and slot with legacy-date migration; overdue bucket; IST slot cutoffs; resilient pending-order retry; test-order reporting exclusion; city suggestions and validation.
- UI: high-contrast feature settings/order cards/status tiles, system inset handling, owner labels and paid/unpaid confirmation, status-consistent order tracking, customer Categories navigation, promo controls hidden until the Promotions switch is on.
- Version defaults: Android versionCode 65 and versionName 1.0.65. `allowBackup=false` retained.
- Local verification: `npm run lint`, `npm run build`, and v1.0.65 feedback contracts PASS. GitHub Actions/PR CI is pending after push. No Firebase deploy, Play upload, merge, signing-key change, or paid service was performed.

- Follow-up in the same v1.0.65 phase: both owner order-list modes now share one call/WhatsApp action component with matching tap targets. CSV, monthly, insight and AI summary sources omit flagged test orders while those orders remain visible for operations. Local lint/build remain green.

- CI run 42466358708 failed at overlay installation because the first commit staged source snapshots at app-root paths instead of the runner's `ui-fixes/v1065-overlay/` source path. The overlay copy error is corrected in the next commit; no build/test failure was reached in that run. This is being rerun before review completion.


- CI follow-up: hosted review applied all 22 app overlays, then the legacy financial guard rejected the intended wholesale-rate / customer-type Firestore changes. Updated `all-features/protected_audit.py` to assert the v1.0.65 safeguards directly (owner-set wholesale rate, retail lock, reason-required amount override, persisted totals) rather than freezing the old retail-only hashes. No backend deployment was run.

- CI follow-up: the updated guard reached the post-overlay assertions but scoped persisted fields to the extracted function range; the payload sits in a nested object. Broadened the guard to verify those persisted fields in the OrderForm source while retaining assertions for owner-set wholesale rate and retail restrictions.

- CI follow-up: the v1.0.65 financial guard initially expected `customerTotal:` although the TypeScript payload uses valid shorthand `customerTotal`. Adjusted the source assertion to check the property name without requiring a colon; re-running hosted CI.

- CI feedback uncovered stale assertions requiring the old customer AI Video tab and disabled Categories page. Updated nav contracts to the requested role-specific behavior (AI Video for owner, Categories for customers), synchronized the local/review/signed reconstruction chains, and set the existing manual signed workflow defaults to versionCode 65 / 1.0.65. This does not trigger a signed build.

- Updated existing release contracts to versionCode 65 / versionName 1.0.65 and changed stale customer-nav expectations to AI Video for owner, Categories for customers. CI tests previously stopped on those v1.0.64 / old-tab assumptions before build.

- The next CI pass reached release contracts; legacy checks still pinned versionName 10.0.64 and the update fixture still defaulted to versionCode 47. Updated those regression fixtures to v1.0.65 while preserving the existing signature/package checks.

- The version-65 update fixture was being upgraded before the existing v1.0.64 reconstruction patch, causing its base-pattern check to fail. Kept the baseline fixture intact until the existing patch runs, then apply the v1.0.65 template from the release overlay. This preserves ordered reconstruction and tests the final version.

- Update-checker regression cases now treat 65 as installed and 66 as the newer candidate; earlier fixture used an older APK code and code 65 (equal to installed), so correct rejection was reported as a failure. No live manifest or APK was published.

- Release audit contract now imports the `re` module required for its whitespace-tolerant Owner FeatureHub assertion; all 71 preceding unit/regression contracts passed in hosted CI.
