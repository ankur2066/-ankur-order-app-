# Ankur Dryice — Android v1.0.38 customer visual acceptance (PRE-SIGNING)

**Status:** Draft review source only, **not an APK build**. The owner requested screenshot-based cleanup and test completion before signing. No live Firebase, public Play release or customer record changes are permitted.

## Expected navigation

- Customer bottom navigation has exactly **four** visible tabs in this order: **Home, My Orders, AI Video, Profile**. No separate Categories/Products tab.
- The retired customer Categories screen must not render, even when a stale internal Categories action is invoked. That action returns to Home.
- Home must retain exactly one Dry Ice booking flow, quantity, rates, real dispatch-slot rules, owner-managed total and confirmation. Do not delete historical product records, authorized owner inventory administration, or real order records.

## Screens requiring an actual Android screenshot review

1. **Profile in Dark Mode** — owner/staff access request, Settings, English/Hindi choices, notification preferences and service tool tiles must have readable labels and selected states. No nearly invisible blue text on black backgrounds.
2. **AI Video / Video Idea Builder in Dark Mode** — page heading, Occasion, Length, generated prompt, Copy button, external Gemini link and error/help text must remain clearly readable.
3. **Home in Light and Dark Mode** — booking form, input labels, entered customer data, minimum KG note, inactive/selected slots and ₹ totals must remain legible without changing the user's saved theme. Home is the source of the real Dry Ice booking.
4. **My Orders / Tracking** — guest/customer and staff/owner roles should only see their authorized records. No exposing tracking PIN, private phone data or other customer orders.
5. **Unavailable feature state** — `Feature setup is pending` must be readable with consistent contrast; no blank-looking screen, frozen overlay or fake feature promise.

## Acceptance and evidence

- Capture Android screenshots **after** a new private APK version **greater than 37** is correctly signed, installed **over** the existing app without uninstalling, and tested. Screenshots from prior v1.0.37 do not prove the new source CSS fixed the issue.
- Verify in both English and Hindi with a non-sensitive test profile; do not upload raw contact lists, login tokens or real order details.
- A screenshot is only UI evidence; record a separate result for booking → owner → dispatch → tracking, actual push arrival, and real monthly PDF Save/Share recipient. Use a controlled order only after explicit owner approval.
- If any of the above fails, fix source and rerun review CI before considering a new signed private test candidate.
- Required before build: the **signed workflow still reconstructs v1.0.37**. Update its overlay chain to include `ui-fixes/customer_nav_v138.py` and `ui-fixes/customer_dark_contrast_v138.py`, update VersionCode to 38, keep existing signer fingerprint checks and require completed review CI. Do not silently sign/publish v1.0.38 in this source review session.

## Evidence now

- [Reviewed v1.0.38 source, commit `7073b3e564`](https://github.com/ankur2066/-ankur-order-app-/commit/7073b3e5645a3d5b49e2479a6a583f6025a85fea)
- [Passed review CI: 104/104 tests, lint and build](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41552635483)
- [Draft PR #15](https://github.com/ankur2066/-ankur-order-app-/pull/15)

**Still unverified:** user Android device contrast, physical installation, live booking/tracking, FCM receipt, real PDF recipient and public release.
