# Review-only rollout boundaries

No deployment, account creation, IAM write, billing change, data seed, app installation, PR merge or public release is authorized by this review.

The separate `featuresuite` codebase stages three new exports: `ankurFeatureAction` (App Check protected callable), `ankurDeliveredReceipt`, and `ankurProductDeliveredReceipt`. It targets Singapore and the established named database only. Its proposed dedicated account is `ankur-feature-suite@ankur-dryice-app.iam.gserviceaccount.com`. This account has NOT been created. Before deployment, a separate owner-approved IAM review must give it only named-database read/list/create/update access plus the required event delivery and function invocation permissions. Do not use an existing broadly privileged default account or grant Owner/Editor.

The isolated `productpush` codebase stages only `notifyNewAnkurProductOrder` and `notifyAnkurProductOrderProgress`, reusing the existing reviewed sender account and sender helper implementation. It does not redeploy the three existing `orderpush` exports. Both codebases use zero minimum instances and maximum one instance per function. Additional execution/Firestore/FCM usage may incur existing-plan usage charges after a future deployment; no paid service or billing setting was changed here.

Candidate Rules are composed from the previously approved notification Rules hash `53d1a6a73915269ccea759a835e5b39c87d216e589094e532c474e331f2a17fb`, adding unit product paths and server-authoritative feature collections. Before requesting production approval, read the current named-database release and regenerate/retest if its hash differs. Emulator tests prove local rule logic, not current production deployment.

New features fail closed unless `settings/featureSuite.enabled` is explicitly true after an approved rollout. Unit products separately require `settings/unitBilling.schemaVersion=2`; selling also requires `enabled=true`. Neither flag has been created or changed in production. No product, stock, promo, partner, subscription, reward or tax defaults have been seeded. Owner-entered stock, unit rates and promotional values require real business inputs.

Inventory remains a manual trusted dispatch path. Legacy direct dispatch controls do not automatically invoke the new stock ledger. Automatic inventory rollout is BLOCKED until all enabled dispatch paths and Rules enforce the same transactional movement. Do not advertise automatic stock deduction or activate it as complete.

Pause rollback: turn optional selling/execution switches off using an independently approved operation. Retain historical unit-order reads and private tracking; do not delete records or blindly restore old Rules that would hide newly accepted unit orders. Existing booking and `orderpush` functions remain in place. Function/Rules rollbacks need a separately reviewed exact artifact.

Existing legacy `orderpush` notification workers have not been rewritten for notification preferences or recipient language. The staged product worker honors an authenticated customer's stored order-update opt-out while retaining owner alerts. Marketing is not sent by any new worker. Do not claim preference-aware or translated delivery for the unchanged legacy workers.
