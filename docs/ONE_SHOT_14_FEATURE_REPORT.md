# Combined private review — v1.0.49

Draft PR: https://github.com/ankur2066/-ankur-order-app-/pull/15

This status concerns private source and emulator tests. No item is represented as live or physically accepted on Android. New optional features remain off/unconfigured until separately approved deployment and owner-supplied values.

| # | Feature | Private source | Remaining condition |
|---|---|---|---|
| 1 | Ice Calculator | PASS | Estimate only; no automatic order. |
| 2 | Video Idea Builder | PASS | Prompt builder; external service determines whether it can generate video. |
| 3 | Loyalty | PASS | Owner must configure a real policy; verified delivered/paid orders award once; redemption is reserved and owner reviewed. No points or benefits seeded. |
| 4 | Application Catalogue | PASS | Seasonal Dry Ice/Pyro restrictions retained; other categories stay off. |
| 5 | Wholesale Partner | PASS | Real partner approval and owner quotes required. |
| 6 | Regular Supply | PASS | Owner approval and manual execution; no automatic charge. |
| 7 | Promotions | PASS | Inline standard Dry Ice preview and atomic trusted booking with replay protection. Real code/value and approved backend required; extra requests use normal owner quotation. |
| 8 | Inventory | PASS | Trusted once-only dispatch and optional candidate Rules; real SKU mapping, balances and compatible staff clients needed. |
| 9 | Reports Hub | PASS | Owner reports, protected CSV, expense cycles and commercial receipts retained. |
| 10 | FAQ / How-to | PASS | Guidance and support remain available. |
| 11 | Rate Card | PASS | Existing owner rates and calculations retained. |
| 12 | Support Hub | PASS | Call 95808 82066 and WhatsApp 88963 32066. |
| 13 | Service Area | PASS | Searchable list; actual availability confirmed per order. |
| 14 | Referral Share | PASS | Self/duplicate protection and owner review; no invented credit. |

Phase A source/tests PASS. Phase B source/tests PASS within the manual review and staged-runtime boundaries: inline promo, delivered receipt, referral review and notification preferences. Phase C source/tests PASS in optional configured/manual mode. Product Billing and Product Notifications source/tests PASS; new runtime and flags have not been deployed or activated.

Static English/Hindi UI coverage audit and actual reconstructed screen/switch tests PASS. The single persistent language setting remains in Profile, with no language prompt. Arbitrary stored customer/product/dispatch/status notes and existing WhatsApp prefill remain verbatim; static translation coverage is not a physical-device or comprehensive human wording review.

Original booking submission, rates, Rules and historic customer data remain unchanged. Existing owner/staff alerts remain enabled. A preference-aware legacy FCM worker is staged for review; the current live worker has not been changed. The new app's device opt-out and guest preferences require physical Android verification. The live Firebase read-only check could not authenticate in this session; current live Rules/Functions/FCM behavior is not freshly verified.

Local and same-commit CI: 257 checks PASS including 52 Firestore emulator tests; TypeScript lint/build and protected financial-path audit PASS. CI: https://github.com/ankur2066/-ankur-order-app-/actions/runs/42173175171.

Signed PRIVATE TEST APK: https://github.com/ankur2066/-ankur-order-app-/actions/runs/42173175171/artifacts/13482221812 (ZIP; expires 13 November 2026 UTC). Package `com.ankurdryice.events`, versionCode 49, versionName `1.0.49-combined-test`, source `f46ea3274b25805e603525ed4a1c94b152510dbf`. Original certificate pin passed; downloaded APK checksum `37a917c06f122cb22ba113dcbb5a87b4b441938b5cc3acf1ec62cf1f9696e9bb` and ZIP checksum `8cc073456723f289c1fe9bfa22259e86df36d49e3e297cd7daf71e78bd3e7b8c` matched. Machine-readable receipt: `docs/PRIVATE_TEST_V49_RECEIPT.json`.

No production Firebase deployment, billing change, real customer/order/stock write, feature activation, merge, public release, Play submission or phone installation occurred. A real policy/promo/stock configuration, live Rules/IAM verification, owner's separate production approval, and physical Android payment/FCM/PDF/update acceptance remain outstanding.
