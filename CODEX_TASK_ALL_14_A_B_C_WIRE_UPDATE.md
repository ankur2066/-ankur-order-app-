# Grok Phase C Wire — Integration preflight (2026-11-01)

**Actual uploaded archives in the new owner-provided Codex ZIP:** Phase A, B, C, 14 UI, `phase-c-wire`, and `ankur-all-phases` with preserved checksums.

## Verified blocker

`phase-c-wire/files/ProfileTab.tsx` contains **8 JSX parser syntax diagnostics** and literal `PLACEHOLDER_REMOVE`. It cannot compile as provided; it also references legacy `onGoOrders` / `onOpenRulesReview` props removed by the verified v1.0.32 declutter patch. The attached Codex ZIP includes a **syntax-only fixed reference**, which still must be adapted, not copied over current Profile.

`phase-c-wire/apply.sh` overwrites **App.tsx** and **ProfileTab.tsx** wholesale; `phase-b/apply_phase_b.sh` and `phase-c/apply_phase_c.sh` overwrite full `firestore.rules`, without current named-database push token permissions. DO NOT execute them directly, do not deploy rules without consent.

### Merge approach

Use GitHub Phase A verified branch `codex/phase-a-owner-reports-expenses` (PR #14, CI successful), preserve 30-day overview, CSV, 15–14 expenses. Retain v1.0.32 bottom nav, booking, order tracking, signed APK and live notification client/backend. Integrate customer `SubscriptionsLivePage` and `PartnerBulkLivePage` as **signed-in-only routes via Profile**; enforce approved partner authorization on backend, not only button visibility. Check Subscriptions full order factory and real rates before enabling run-due. Never show fake inventory values, arbitrary promo discount, or promised GST invoices.

### Gate and final report

CI must run TypeScript lint/build, rules emulator (legacy push registration, admin/staff/customer/guest rules), promo atomic limits, invoice idempotency/PDF, subscription no duplicate, stock SKU one-time dispatch, approved partner-only bulk, ETA, 14 UI sections, guest booking/track/rates and FCM. Provide ONE draft PR, ONE private review APK (only if signing available), ONE 14-feature status matrix marking tested/blocked, and specific reasons for every blocked feature. No production/Billing/Rules/Functions or data modification without owner approval.

**Do not treat Grok’s release notes or successful ZIP extraction as proof the app is ready to ship.**
