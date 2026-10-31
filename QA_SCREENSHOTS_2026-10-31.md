# Customer App screenshot QA — 31 Oct 2026

Reviewed seven owner-provided Android screenshots (customer home, category, booking form, orders, AI Video tabs and profile). The visible screenshots do NOT establish the installed APK version.

## Priority P0 — Permissions, identity and sensitive actions
1. **Staff-access request fails** on Profile with `Missing or insufficient permissions`. Source `src/components/customer/ProfileTab.tsx` writes `staffRequests/{uid}`; candidate `firestore.rules` permits signed-in users to create validated self-requests, but the live rules may differ or the app may point to a different named Firestore DB. Do not loosen all rules or grant admin in the client to mask this.
2. **Owner-account mismatch**: the screenshot shows a Google account different from the hardcoded verified owner account `ankurdryicewholesalers@gmail.com` used by `src/firebase.ts` and `firestore.rules`. Therefore this session will be treated as a customer unless separately granted staff rights. Confirm intended owner email before any secured change. Do not unilaterally add an email to privileged rules.
3. App Check has been registered for Android via Firebase Play Integrity, but a real-device issuance test and Self Pickup callable deployment have not been confirmed. Keep API enforcement OFF and do not deploy production backend before verifying.

## Priority P1 — Readability / correctness
4. Dry Ice booking pricing header + signed-in block and summary box contain pale text on pale backgrounds; contrast is poor. Fix theme-specific semantic contrast rather than adding general white text globally. Recheck on 360px–440px Android screens, dark and light modes. The visible ₹60/kg formula = ₹50/kg dry ice + ₹10/kg thermocol is internally consistent.
5. Dispatch labels currently use `12 AM–12 PM` and `12 PM–12 AM next day` in `src/data/products.ts`. This is technically a 12-hour window but easy to misread as actual pickup/delivery time. Make Hindi labels clearer: `आज सुबह (रात 12 से दोपहर 12 बजे तक)` and `आज शाम (दोपहर 12 से रात 12 बजे तक)`; preserve stored slot IDs/semantics and avoid modifying previously persisted labels until migration is verified.
6. Order history renders long IDs (e.g. `ADI-20261024-...`) without truncation. Present short visually copyable identifier but keep the full immutable ID in database and tracking links.

## Priority P2 — Products and multimedia
7. Product image tiles show snowflake placeholder because product image URL is absent/fails (`src/components/customer/ProductCard.tsx`). Optional owner-managed product images planned; prefer free/no-billing workflow. Do not invent/upload images or enable Firebase billing.
8. AI Video Server explicitly reports unavailable; stage video maker is a separate on-device feature. Server integration requires a real working endpoint and a secure budget decision; UI should show concise disabled states. See `src/services/videoApi.ts`.
9. Phone floating picture-in-picture video windows overlap screenshots; they appear external to app. Recheck screenshots after dismissing PiP before attributing overlays to the app.

## Release policy
- Existing signed v1.0.17 / v1.0.18 builds have passed CI, but on-device update compatibility and App Check token still need verification. These QA notes are NOT a release or proof that any screenshot issue is fixed.
- Apply fixes to the feature branch, run TypeScript, Vite, security tests, Android signed build and device smoke test before distribution. Keep `main` and customer data unchanged.
