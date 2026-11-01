# Product billing review status

The earlier product billing task remains in scope alongside the 14-feature assignment.

Implemented source: separate inactive-by-default catalog/order/tracking schema, owner editable units/rates/packing/delivery, integer-paise checkout, immutable snapshots and source-aware order history. Requested names remain unpriced local drafts. No live catalog or feature flag has been written.

Latest local verification: 15 money/quantity tests, 3 actual repository listener tests, 4 product push handler tests and 17 Firestore emulator rule-logic tests PASS. The combined extracted review source passes TypeScript lint and Vite build. Emulator assertions exercise isolated demo rule logic, not production named-database deployment.

The new isolated `productpush` package reuses the audited sender helper source without changing or deploying the existing three `orderpush` Functions. Only two new product exports are staged. Syntax and mocked-handler checks pass; real SDK discovery and package lock verification remain required.

Remaining gates: complete React checkout retry/auth/race tests, existing native client harness integration, full Phase A report integration, English/Hindi coverage, actual staged SDK smoke, combined CI and a newly signed combined APK. Existing v1.0.33-test APK does not include this billing overlay. No feature-complete or live claim is made.

Production Rules/Functions deployment, selling activation, billing settings and customer data writes require separate owner authorization after the exact rollout proposal is ready.
