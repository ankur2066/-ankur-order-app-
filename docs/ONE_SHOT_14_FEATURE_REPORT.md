# Combined private review — 6 November 2026

Draft PR: https://github.com/ankur2066/-ankur-order-app-/pull/15
Branch: `codex/all-14-phase-bc-english`
Work Mode baseline preserved: `0d5e1403940a670c3f208efe44c5f1c50586eae8`, reconciled at `b67dc7b79529f1efbeb2db3b9650a366f94268cd`.

This replaces the obsolete v1.0.33 report. **PASS below means implemented/tested private-review source within the stated scope, not merged, installed or live.** No feature is claimed physically tested in this session. The whole assignment is not finished: legacy localization, inline legacy promo checkout, legacy notification preferences and rewards remain incomplete. Missing live configuration is listed separately from missing implementation.

## All 14 features

| # | Feature | Status | Implemented behavior and exact remaining limit |
|---|---|---|---|
| 1 | Ice Calculator | PASS | Bounded estimate with explicit quantity-fill action; no automatic booking or invented rate. Actual performance remains an estimate. |
| 2 | Video Idea Builder | PASS | Current Work Mode occasion selector, editable 30-second default, prompt/copy/external-tool actions retained. It builds a prompt; it does not falsely claim to render video. |
| 3 | Loyalty Rewards | BLOCKED | Own-only protected ledger read and honest unconfigured state exist. Earning/redemption policy, verified awarded balances and a reward issuance/redemption implementation are not supplied/completed. No arbitrary points or gifts are awarded. |
| 4 | Application Catalogue | PASS | Active product selection routes to the existing booking flow; current seasonal public Dry Ice/Pyro restrictions retained. Other categories stay private/off without deletion or automatic January activation. Actual extra-product rates/stock must be owner-entered. |
| 5 | Wholesale Partner | PASS | Immutable own application, verified-owner approval/revocation, approved-partner bulk request and owner-only quote; cross-role emulator checks. No invented wholesale price or automatic charge. |
| 6 | Regular Supply | PASS | Own request/list/pause/resume, owner approval and manual due execution; valid order + private PIN projection, real configured rates and transaction/period ledger. Resume resets approval and execution permission. Scheduler/auto-charge remain off; manual execution is the supported reviewed mode. |
| 7 | Promotions | BLOCKED | Separate real-promo booking screen and trusted guest-capable, cap-limited atomic transaction/retry work in review source. The requested optional inline code/discount interaction in the original legacy OrderForm has not been integrated; it must not be described as complete. No public promotion has been created/activated. |
| 8 | Inventory | PASS | Owner opening/mapping/audited adjustment/setup and live-list source; both real owner/staff Dispatch handlers delegate to a trusted transaction when optional inventory mode is enabled. Server derives SKU and atomically commits one movement + balance + private/projection status. All overlapping candidate Rules paths prevent bypass, direct delivery and rewind. Actual opening stock/SKU setup, approved deployment and updated operating clients are required before activation. Corrections are audited adjustments, not an automatic cancellation restock. |
| 9 | Reports Hub | PASS | Preserved Phase A real owner overview/escaped CSV/15th–14th expenses, product quantity units and delivered commercial receipts/PDF. Work Mode native attachment/cache safety retained. These are commercial receipts, not invented GST tax invoices. |
| 10 | FAQ / How-to | PASS | Real handling/ventilation and confirmation guidance, accessible through the feature route. No backend dependency or fabricated delivery guarantee. |
| 11 | Rate Card | PASS | Uses existing subscribed rates and conditional per-KG transport; product unit/packing bill remains separate. No new prices, GST or hidden charges. |
| 12 | Support Hub | PASS | Separate Call `95808 82066` and WhatsApp `88963 32066`; Profile/Home/Tracking links preserved or corrected. Physical Android link handling is still unverified. |
| 13 | Service Area | PASS | Searchable UP district list, 75 unique entries verified in reconstructed source. Availability/timing remains per-order confirmation; listing is not a delivery guarantee. |
| 14 | Referral Share | PASS | Real `?ref=` capture/share, own first-delivered-order attribution, self/duplicate protection and owner-only review; pending with zero automatic credit. No reward amount is invented. |

## Phase A / B / C and product billing

| Workstream | Private-review status | Remaining gate |
|---|---|---|
| Phase A | PASS | Existing overview/CSV/expense behavior preserved; device review pending. |
| B1 Promotions | BLOCKED | Separate callable-backed promo booking is tested; legacy inline promo field/discount interaction still missing. |
| B2 Delivered receipt | PASS | Idempotent trusted snapshot and genuine Unicode-capable PDF; proposed receipt triggers are not deployed. |
| B3 Referral | PASS within approved manual-review default | No automatic reward credit; business policy and future issuance code would be needed for real rewards. |
| B4 Preferences | BLOCKED for complete coverage | Own preference UI/trusted write and product-worker opt-out exist. Unchanged legacy `orderpush` workers and all legacy in-app notification displays do not yet enforce these preferences; recipient-language coverage is incomplete. |
| C1 Inventory | PASS in optional review mode | Genuine balances/mappings and owner-approved runtime/Rules/IAM rollout needed. Every operating owner/staff client must be updated before activation; older direct-dispatch clients will be rejected once enabled. |
| C2 Recurring | PASS in manual-execution mode | Owner approval/real rates and runtime required. Resume requires renewed approval; no scheduler or charge enabled. |
| C3 Partner bulk | PASS | Real applicant approvals and owner quotes required; source does not grant partner access automatically. |
| C4 ETA | PASS | Authorized manual staff/owner ETA with zero-PII projection; no fabricated GPS/map. |
| Product Billing | PASS in private source, selling inactive | Owner units/rates/packing/delivery, integer-paise calculation, immutable snapshots, retry/repricing/auth checks and protected Rules are present. No real catalog was seeded; actual unit selling needs approved schema/config/Rules. |
| Product Notifications | PASS as staged package | Two isolated `productpush` exports, named database, audited sender helper, customer opt-out and SDK-discovery tests. No new product Functions deployed; original three `orderpush` exports unchanged. |

## Language and preservation

English is the persisted default without any launch popup; the single selector remains Profile → Settings → Language. Work Mode bilingual Home and unit-product checkout/editor remain intact. Tracking now translates validation/errors, statuses, payment/ETA/contact labels with no PIN loss or refetch on language switch. Its Call link now uses the dedicated call number.

**Whole-app English/Hindi coverage is BLOCKED by unfinished legacy string migration**, including portions of Booking confirmation/errors, My Orders, owner/staff screens and notification copy. Tracking preserves stored district/dispatch/product/status notes verbatim. The source audit (`docs/LANGUAGE_COVERAGE_AUDIT.json`) finds 43 files / 1,037 Hindi-containing lines, including already-bilingual code and comments; this is a review signal, not a count of untranslated labels. Do not confuse a successful language-context test with full localization. Currently live notification text/delivery was not rewritten solely for language; recipient-specific server language support still requires a reviewed implementation and separately approved rollout.

Preserved: current five customer tabs, owner premium seven-section layout, staff contact masking, seasonal restrictions, one Video Idea Builder, Profile cleanup, compact dispatch slots, removal of bundled Rules viewer, native update/PDF safety and explicit grouped-release marker. Legacy booking submission, rates and original Rules hashes passed the protected audit. Existing APKs and live customer data were untouched.

## Verification

- Combined reconstructed TypeScript lint and Vite build PASS (only existing bundle-size/import warnings).
- Optional feature transaction + cross-role Rules + product Rules emulator: **41/41 PASS**, including race/replay, SKU/balance/projection failures, every legacy/product/annotated bypass path, stock rewind protection and recurring pause/resume approval reset.
- UI/feature/update/contrast/reconstruction/signing contracts: **71 PASS**; phone-link test run with generated app cwd.
- Actual React/client/checkout/tap/language/update/tracking + inventory helper and extracted real dashboard handlers: **72 PASS**.
- Phase A regression: **4/4 PASS**.
- Billing arithmetic/listeners/product push/receipt: **25/25 PASS**.
- Real installed Firebase SDK discovery: **2/2 PASS** (three feature exports and two isolated product exports, correct database/region/accounts/instance limits). Discovery creates no documents and is not a live delivery test.
- Inventory source commit `461f7767364bae4aeae24742d911606e490a70b2`: review CI https://github.com/ankur2066/-ankur-order-app-/actions/runs/42142009143 and https://github.com/ankur2066/-ankur-order-app-/actions/runs/42142003623 PASS; security emulator https://github.com/ankur2066/-ankur-order-app-/actions/runs/42142003631 PASS.
- Final grouped v1.0.48 candidate adds safe recurring resume + SDK gates. Its exact-source CI/signature/artifact results must be checked after the release-marker commit; earlier source CI does not prove the final APK build succeeded. The private APK includes a source-SHA receipt.

## Production/device boundaries

No production Firebase deploy, billing setting, live order/customer/stock write, feature activation, PR merge, public release or phone install occurred. The live named-database Rules were not re-read in this reconnect session; their current hash and least-privilege service-account/runtime permissions must be reviewed before requesting any production rollout. All live behavior, current Rules compatibility and actual Android notification/UPI/share/update acceptance remain unverified here. The owner has not authorized production release through this assignment.
