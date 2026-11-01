# One-shot private review report

Source branch: `codex/all-14-phase-bc-english`  
Verified base: `codex/phase-a-owner-reports-expenses` at `68d12b6a36a350e598653d7f323b942d6c436e54`  
Review commit: `2e8d324b70683fc7bba0408e7eada6bf2a18a405`  
Draft PR: #15  
Web CI: run 41357006991 — PASS  
Signed APK CI: run 41357119428 — PASS

## Safety result

The overlay leaves `OrderForm.tsx`, `OrderTrackingView.tsx`, `useOrderNotifications.ts`, `rates.ts`, and `firestore.rules` byte-for-byte unchanged. It does not deploy Firebase, seed production data, change billing, activate a promotion, install an APK, or publish an app.

## Language

- New/unset storage defaults to English and shows no language prompt.
- Profile > Settings > Language offers English and हिंदी (Hindi), switches immediately, works for guests, and persists in localStorage across reload/logout.
- New 14-feature navigation and core subpage headers use the selector.
- Full legacy screen string migration is not complete. Existing Hindi-only strings in legacy booking/admin/tracking components remain a review blocker. Live Cloud Functions were deliberately not rewritten for recipient-language push text.

## Feature status

| # | Feature | Code/build | Security/backend | Device/live status |
|---|---|---|---|---|
| 1 | Ice Calculator | PASS: bounded planning estimate UI | No backend required; it does not overwrite booking quantity | APK built; not physically tested or live |
| 2 | Video Idea | PASS: prompt builder route | External-tool flow; no client API key or fake generated video | APK built; not physically tested |
| 3 | Loyalty | REVIEW UI; signed-in gate | BLOCKED: reward policy/verified ledger and Rules not implemented | Unconfigured; not live |
| 4 | Application Catalogue | REVIEW UI linked to active catalogue concept | BLOCKED: final real-product filter/select wiring | Not live |
| 5 | Wholesale Partner | REVIEW UI; sign-in gate | Trusted approval/bulk validator unit-tested; Rules/Functions and screens incomplete | Approval required; not live |
| 6 | Regular Supply | REVIEW UI; sign-in and no-auto-charge copy | Approved, idempotent order+tracking operation unit-tested; scheduler/Rules/UI incomplete | Disabled; not live |
| 7 | Promotions | REVIEW UI; zero active promo default | Cap/expiry/minimum/discount operation unit-tested; checkout callable/Rules/admin CRUD incomplete | Disabled; not live |
| 8 | Inventory | Owner-only REVIEW UI; no fake seed | Exactly-once stock movement unit-tested; trusted Function/ledger/owner setup incomplete | Opening balance required; not live |
| 9 | Reports Hub | Phase A remains PASS and reachable to owner | Existing CSV and 15th–14th expense tests retained | Private review only |
| 10 | FAQ / How-to | PASS route with safety/confirmation language | No backend required | APK built; content still needs owner review |
| 11 | Rate Card | PASS route using existing ₹50 + ₹10 labels and conditional transport note | Protected pricing source unchanged | APK built; not physically tested |
| 12 | Support Hub | PASS: Call 95808 82066 and WhatsApp 88963 32066 | No backend required | Links need physical-device tap test |
| 13 | Service Area | REVIEW UI with search field and conditional availability wording | BLOCKED: complete UP district data/search integration | Not live |
| 14 | Referral Share | REVIEW UI; signed-in gate | Self-referral/duplicate/pending-review operation unit-tested; capture/share/Rules/Function incomplete | Credit policy required; not live |

## Phase B/C backend status

The repository contains tested pure trusted-operation contracts for promo redemption, commercial receipts, referral attribution, stock dispatch idempotency, recurring execution, and approved-partner bulk requests. These are not deployed Functions and are not wired to production Firestore. B1–B4 and C1–C4 therefore remain **REVIEW STARTED / LIVE BLOCKED**, with additive Rules, Functions, emulator cross-role tests, complete admin/customer screens, PDF generation, notification preferences, ETA projection, and rollout review still required.

## Tests and APK

- New contract/backend unit tests: 10/10 PASS.
- Existing notification regression selection: 34 PASS; one local tap suite initially lacked its `esbuild` QA dependency, while the unchanged notification/tap source remained protected and the reconstructed CI build passed.
- Phase A tests run in GitHub CI and PASS.
- TypeScript lint and Vite production build PASS on exact reconstructed Phase A chain.
- Signed private TEST APK artifact: `Ankur-Dryice-v1.0.33-PRIVATE-TEST`, artifact ID `13103204852`.
- Artifact ZIP SHA-256: `6b36bf29b2f26be224dc63735040cf7545365f0581704c13989a10dbafdd7405`.
- APK SHA-256: `88d8957fd1202a329d4d8702b8f4937e229713e51f638eb39af1870ec4308395`.
- Package/version: `com.ankurdryice.events`, versionCode 33, versionName `1.0.33-test`.
- Certificate SHA-256: `ebb60e0b13f7b5bfa814a619d5e4acc0ee65f0e12835ad5a282c072bc9976a6e` (matches the original app).

This APK is a private review artifact. It has not been installed, published, or connected to new production backend behavior.
