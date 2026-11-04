# Ankur Dryice — v1.0.50 private combined candidate

**Status: SOURCE STAGED / PRIVATE TEST ONLY. Do not publish as a live production security solution.**

This batch unifies the previously staged 14-feature Phase A/B/C client, booking UI cleanup, video prompt builder, customer AI Features page, premium Owner Dashboard and staff contact privacy with the new Daily Winner service. Exact repository review: draft PR #22, based on draft PR #15. Nothing has been merged to main.

## What works in staged source

- Home remains the real Dry Ice booking form; AI Features occupies a dedicated fifth customer tab. Product browsing/Categories is not restored. No price formula, customer order history, owner payment verification or notification routine intentionally removed.
- AI Video includes the working occasion grid and prompt copy/Open Gemini. Length is a prompt request, not a promise that Gemini will produce that duration.
- Owner dashboard keeps 7 work sections; per-order staff access controls are added in Users.
- Staff subscribes to server-generated allowlisted `staffOrderViews`, not customer-PII collections. Direct Firestore order/tracking writes are denied by proposed Rules; an authenticated server callable handles one assigned order's status. Call reveals one authorized number transiently. Bulk extraction and phone search are not supported.
- Optional feature suite code includes promotions, invoicing, stock, partner bulk, subscriptions, ETA, loyalty review, referral and reporting. **These optional features remain disabled until separately authorized production Rules, Functions, IAM, seed/config and business-input setup.**
- Daily Winner: no result is fabricated; one signed-in opt-in retailer per India date may be published. A confirmed order at or above the verified standard retail total qualifies; wholesale flags, discounted/under-retail and guest profiles without consent do not. Candidate history is ranked by eligible retail order **count**, not kilograms. Monday–Wednesday `all3_top4` uses all retail buyers; Thursday–Sunday uses top 3, or the owner can reverse the schedule. Manual owner override keeps one published document and an audit revision. Default disabled; no gift is automatically granted. Owner decides the gift separately. Schedule proposed at 21:00 IST, undeployed.
- Name and city may only be published after `userPrefs/{uid}.winnerPublicConsent === true`. Consent is controlled from Profile notification preferences. No phone/address is published.

## Mandatory release gates

1. Confirm actual live Rules version for the **exact named Firestore database**; compare code-generated Rules before any writes. Do not blindly replace live rules.
2. Back up records and Rules, review least-privilege IAM/App Check, test safe-view backfill on a synthetic database and obtain a rollback plan. Existing historical orders do not gain staff-safe projections without a reviewed backfill.
3. Confirm current deployed push Functions and FCM payloads do not expose phone PII; do not break already-installed older staff APK flows without staged rollout.
4. Independently enable and verify optional feature-suite and winner Functions, settings, permissions and consent in a restricted production pilot, only with appropriate authorization. Cost-bearing Functions/scheduler have not been deployed.
5. Test APK in-place upgrade on a real Android device with existing signing certificate and correct package, customer booking/tracking, two staff roles and owner role, notification receipts, monthly PDF Save/Share, AI Features and winner banner.
6. The signed private candidate can be built only when same-commit source review succeeds; retain signing certificate pin, Android package audit and no broad installer permission. A private candidate APK **does not prove** live delivery or data security.

## Clarifications

- WhatsApp and normal phone dialer inherently reveal the single selected customer number when opened. Hiding even that number requires a separately approved call-relay/telephony service.
- The owner can see full order records. Staff visibility of sanitized operational fields does not mean all sensitive data is inaccessible through *every other old app pathway*: audit old API clients and FCM before claiming full protection.
- No customer should receive a gift merely because a large or underpriced wholesale order appears in rankings.
- No public Play listing, signed APK public hosting, web update manifest publication, Firebase production write or migration is part of this source commit.
