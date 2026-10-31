# Ankur Order App — Native migration preparation (31 October 2026)

## Owner decision
- Keep existing, functioning **React + Capacitor Android APK** in service until a replacement has passed real-phone tests.
- Goal: Blinkit-class **native-feeling**, legible Android UX, not a copyrighted visual clone.
- When new PC and OpenCode are ready, migrate incrementally rather than discard the current production app.
- **No prices** on public product catalogue; product names/availability and 2–3 sharp legitimate photos per item, subject to verified asset sources and owner approval.
- Main owner account remains `ankurdryicewholesalers@gmail.com`. Do not promote another account automatically.
- No paid Firebase changes without owner authorization. Preserve historical customer orders.

## Current repo/code audit
- Source ZIP: `Ankur_Order_App_Upload_GitHub.zip` (159 entries), extracted by GitHub Actions; native Android project in `android/`.
- Firebase shared services: `src/firebase.ts`, `src/hooks/useAccess.ts`, `src/hooks/useProducts.ts`, `src/hooks/useOrderNotifications.ts`.
- Domain models: `src/types.ts`; products/availability: `src/data/catalog.ts`, `src/data/products.ts`, `src/data/rates.ts`.
- Screens: `src/components/customer/CustomerHome.tsx`, `CategoriesTab.tsx`, `ProductCard.tsx`, `CustomerOrders.tsx`, `OrderForm.tsx`, `StaffDashboard.tsx`, `AdminDashboard.tsx`, `OwnerStorefrontManager.tsx`.
- Specialized behavior: `src/utils/selfPickup.ts`, `src/utils/selfPickupReceipt.ts`, `src/services/selfPickupTransactions.ts`, backend `firebase-functions/`; reporting patch `ui-fixes/`; App Check bridge `app-check/`.
- Existing signed build CI uses package `com.ankurdryice.events`; signing credentials remain GitHub Secrets, not source files.

## Crucial distinction: no zoom vs responsive layout
- Current feature-branch `ci-fixes/MainActivity.java` already calls Android WebView settings: `setSupportZoom(false)`, `setBuiltInZoomControls(false)`, `setDisplayZoomControls(false)`.
- Existing `index.html` uses `width=device-width, initial-scale=1.0, viewport-fit=cover`.
- Zoom is not the same as responsive wrapping/reflow or accessibility font scaling. A page looking smaller/bigger can be CSS breakpoints, oversized elements, font scaling, keyboard/insets, or browser-text autosizing. Do **not** disable OS accessibility settings or force a fixed pixel viewport.
- Test Android font size 100% / 125% / 150%, system display-size small/normal/large, keyboard open/closed, 360–440 CSS-pixel viewports, long Hindi labels, portrait/landscape, and on-screen magnification.
- New optional v1.0.20 styling overlay exists; code/build success is not proof of UX or zoom behaviour on-device.

## Migration target and staged implementation
1. **Extract a written, versioned product and order specification.** Define current saved Firestore document names/fields, read/write scopes, old orders, staff roles, stock availability, booking IDs and Android deep links. Freeze public API contracts before changing UI.
2. **UI kit/prototype first** in React Native + TypeScript, preferably Expo prebuild with native modules only after verifying Firebase Auth/App Check support. Alternatively Kotlin + Jetpack Compose if Android-only native priority outweighs iOS support. Choose one after prototype, not both.
3. **Screens, small increments:** login/profile -> product catalogue (crisp images and stock label only) -> single-line quick order, + multi-line if needed -> order history/tracking -> staff/owner dashboard -> notifications -> receipts/reports -> advanced AI/video features.
4. **Data layer:** keep production Firebase project and existing document schema compatible; build against a test project/database first; verify Owner identity and Firebase security rules before live requests; keep Android App Check attestation (Play Integrity).
5. **App identity/signing:** if publishing as an in-place update, preserve package ID `com.ankurdryice.events`, original signing key and monotonic versionCode. On any signing/package mismatch, install side-by-side test build and DO NOT replace the old APK.
6. **Rollout:** smoke tests on Samsung S24 Ultra and F54 class phone, staff role test, request-permission denial handling, offline/slow network, PDF share/save, permission revocation, receipts, and real App Check token test. Only replace after backup, regression pass and rollback plan.

## Timeline estimates with local OpenCode/PC
- Audit + working clickable prototype: **2–5 working days**, assuming repo accessible and UX scope frozen.
- Core MVP (login, catalogue, orders, tracking, admin/staff): **2–4 weeks** of focused development + testing with code assistant; complex Firebase rules and product photo sourcing may add time.
- Feature-complete migration including notifications, receipts, uploads, AI/video, security validation, Play Integrity and production rollout: **4–8+ weeks**. PC speed affects build/test iteration but does not remove native UI and phone QA work.
- Dates are estimates, **not a promise** of automatic unattended completion. Time depends on real Firebase access, assets, testing and code quality.

## Immediate safe actions
- Keep v1.0.20 and the previous working APK as rollback options. Do not uninstall or replace production until tested.
- Verify zoom across two devices and document reproducible steps (pinch? text input focus? orientation?).
- Collect original-resolution legal product images from suppliers/owner; don't copy low-quality screenshot crops or invent stock levels. Availability should be owner-confirmed or explicitly labelled pending confirmation.
- Avoid HTML/WebView removal from the existing APK: this would break the Capacitor app. Replace it only as part of a tested React Native/Kotlin app migration.
