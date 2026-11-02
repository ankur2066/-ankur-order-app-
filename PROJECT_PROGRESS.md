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
