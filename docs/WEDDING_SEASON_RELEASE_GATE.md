# Ankur Dryice — wedding season release gate (Nov 2026)

**Release scope:** Dry Ice plus active approved Pyro products only. First customer screen is booking. Other product catalogue entries remain saved privately for a separate owner-approved January 2027 release. Preserve original five bottom tabs, 14 feature definitions and user roles. No incomplete optional feature may claim to be live.

## Private review already automated
- [x] Project progress survives chat limits in `PROJECT_PROGRESS.md`.
- [x] Owner/customer login and legacy booking/tracking source protected by baseline audits.
- [x] English default, optional saved Hindi from Profile > Settings > Language; some legacy screens still need translation.
- [x] Seasonal public catalogue gate: no customer-facing other products.
- [x] No automatic January product activation.
- [x] An app-open secure update checker with allowlisted manifest destination and no install permissions.
- [x] Automated React checkout, money/billing, security and feature tests run in GitHub CI.
- [ ] Verify the **latest** signed APK and Play AAB completed successfully (see GitHub workflow runs; do not assume a file exists).
- [ ] Install/update test on an actual Android device.

## Android physical smoke test before distributing
- [ ] Update in-place from an existing older signed APK; no uninstall, saved order history retained.
- [ ] Open in English, with no language prompt. Switch Hindi in Profile; restart and confirm persistence.
- [ ] Home shows Dry Ice and real active Pyro choices ONLY; no other product category accidentally appears.
- [ ] Booking (10 KG and 20 KG), dispatch slot and accurate total/breakdown. Paytm/UPI must be verified manually by owner.
- [ ] Order creation (guest and signed-in) -> Owner Dashboard -> Packing -> Dispatch -> Completed.
- [ ] Customer My Orders / tracking PIN and live tracking status.
- [ ] Owner/staff/customer FCM: delivery, duplicate alert safety, tapping opens correct order; Android 13+ notification permission.
- [ ] Call button is 95808 82066; WhatsApp is 88963 32066.
- [ ] Verify low-contrast / white-on-white fields in Booking, Tracking and Profile across light/dark themes and 360–440 px screens.
- [ ] Check weak network/offline, rapid taps and retry; no duplicate order or double charge.
- [ ] Billing/inventory/promotions/referral/subscription/wholesale restricted or disabled unless separately approved and fully deployed.

## Google Play submission preparation — user account dependent
- [ ] Confirm Play Console account existence and eligibility. Do not infer account type or registration date.
- [ ] Confirm package `com.ankurdryice.events` and app signing / Play App Signing onboarding. **AAB is required for a new Play app**.
- [ ] Upload signed AAB first to **Internal Testing** with owner approval; verify app installation and App Check identity.
- [ ] Google Play app name Ankur Dryice, accurate short/full listing description, 512×512 icon, 1024×500 feature graphic, real phone screenshots and contact support.
- [ ] Publish accurate accessible privacy policy on an owner-controlled HTTPS URL. Audit actual personal data (name, phone, address, orders, device notification token), App Check, staff permissions and account deletion paths; complete Data Safety declarations honestly.
- [ ] Check ads declaration, content rating, app access/login review instructions, target audience, location permissions (if any), target SDK / Android requirements and signed AAB.
- [ ] **Only if** Play Console account is a new personal developer account created after 13 Nov 2023: closed test of at least 12 opted-in testers continuously for 14 days, followed by production access request/review. This cannot be bypassed by app code. Google Play production approval date is not guaranteed.
- [ ] Final owner sign-off before production release or any live Firebase deployment.

## Update distribution later
`updates/README.md` contains the strict JSON manifest schema. Publish a real new signed version, verify HTTPS link, then release manifest. Never claim automatic APK installation or background permission; Android requires user action. For Google Play builds prefer the official Play Core in-app updates API.

**Deployment status:** review source and CI only. No customer update, production Firebase change, Play Console upload, public store listing or manifest publication has been performed.

## Signing identity QA
- CI must verify the actual APK and AAB certificates match the prior installed release certificate, not merely that each file is independently signed. The expected SHA-256 fingerprint is pinned to the observed same certificate from private v1.0.35/v1.0.36 CI; any planned certificate rotation requires separate owner review.
