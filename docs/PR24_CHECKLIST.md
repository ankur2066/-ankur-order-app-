# PR #24 checklist — v1.0.66 (branch `codex/fix-v1065-test-feedback`)

Constraints kept: Firebase **Spark only** (no new Cloud Function / Blaze / paid service), versionCode **66** / versionName **1.0.66**, payments never auto-marked paid, owner-only checks kept, no signing/keystore/secrets changes.

Legend: **Done** = implemented in this pass · **Verified** = already present, checked against code · **Partial** = works with a stated limit · **Blocked** = needs Blaze/paid/real payment.

| Item | Status | Where | How to test |
|---|---|---|---|
| 1–24 (v1.0.65 feedback) | Verified (carried) | earlier commits | Existing CI contracts (`all-features-review.yml`) stay green |
| 25 UPI config | Verified + Done | `src/config/businessConfig.ts`, `PaymentOptions.tsx`, `OrderForm.tsx`; removed unused `8896332066@paytm` i18n key | Order → success screen shows primary UPI, Copy, backup text "QR se payment na ho to is UPI ID par bhejein: ankur.singh332066@okhdfcbank", Copy, "Dusre UPI se pay karein" opens UPI app with backup ID. `grep 8896332066@paytm dist/` → nothing |
| 26 QR | Verified + Done | `src/assets/primary-upi.svg`, `src/utils/upi.ts` (now `pn=Ankur%20Dryice`) | `npm run test:unit` (upi tests); QR renders offline |
| 27 Customers | Verified + Done | `customers/{+91mobile}`, `owner/CustomersView.tsx`, rules | Owner › Customers: counts, Today/7/30/Custom, search; mark order Delivered → tag Old. Rules tests |
| 28 Website policies | Done | `docs/website-policies/*.html` | Address now **MLIG 4/5, Sector H, Jankipuram, Lucknow, Uttar Pradesh 226021** (owner confirmed); refund: full refund before dispatch, after dispatch only wrong/short supply; shipping: Lucknow local, UP by bus, customer collects from bus; contact 8896332066, info@ankurdryice.store |
| 29 Rates in config | Verified | `businessConfig.ts` (TODO owner confirm retail ₹35 vs ₹50), `data/rates.ts` | Rate Card shows config defaults until owner saves rates |
| 31 Dispatch IST | Verified + test added | `utils/dispatchSchedule.ts` | `dispatchSchedule.test.ts` (today/tomorrow/past/missing + IST-midnight boundary) |
| 32–34 Readable strip + status colours | Verified | `theme/designTokens.ts` status palette → `--status-*` vars → `.status-*` classes on tiles, buttons, chips | `contrast.test.ts` (all status pairs ≥ 4.5:1 light and dark) |
| 35 Feature controls | Done | `owner/FeatureSuiteSettings.tsx` | Light rows, dark text, one-line description, visible ON/OFF + switch |
| 36 Tools aur Settings | Done | `AdminDashboard.tsx` sheet: New Entry, Reports, Expenses, Users, Store/Theme, AI Chat, Bus stops, Staff + Feature controls | Owner home → "Tools aur Settings" opens one sheet with 8 tiles |
| 37 Soft 3D theme | Done (partial migration) | tokens: colours, radius, raised/pressed shadows, spacing, stop palette, chart colours; `.pill-tab/.stop-pill/.raised-card` in `index.css` use vars only | `node scripts/check-theme-colors.mjs` passes. Honest strictness: the guard only blocks **new** hex lines in `src/` relative to `origin/codex/release-audit-14features-20261108`; lines that already exist in the archive zip or any patch script are treated as legacy, and `src/theme/*` + `src/assets/*.svg` are exempt. ~470 legacy hex values remain in `src/index.css` (patch-generated owner navy theme) and Google-logo SVG paths keep brand colours |
| 38 Delivery mode + bus stops + packing | Done | `utils/delivery.ts`, `PackingBoard.tsx`, `DeliveryModePicker.tsx`, `owner/BusStopSettings.tsx`, `settings/delivery` | Tools › Bus stops: add/rename/colour/Active-Inactive, district→stop map, Save. New order shows only active stops. Packing board: stop pills + Local with KG total, Share (WhatsApp text, no prices) |
| 38b Customer default | Done | `resolveDeliveryDefault`, `owner/OrderDeliveryEditor.tsx` | Order card › "Delivery badlein" › Save → choose "Sirf is order ke liye" or "Hamesha ke liye". Make a customer's default stop Inactive → warning, no auto-switch |
| 38c Roles + Spark staff path | Done | `hooks/useAccess.ts`, `owner/StaffMembersManager.tsx`, `services/staffRegistry.ts`, `services/staffSync.ts`, `StaffDashboard.tsx`, rules | Tools › Staff: add mobile + name + Google email. Staff signs in with that Google account → Packing screen only. Packing done / Dispatched / Handed over update the order; owner app copies status to tracking. **Removed `ankurStaffUpdateOrderStatus` (Blaze) call** |
| E 23 Payment proof | Verified | `services/paymentProof.ts` (target 150 KB, max 230 KB), `owner/PaymentProofPreview.tsx`, rules | Upload screenshot → owner sees thumbnail + full view; staff read denied (rules test) |
| E 24 UPI app link | Verified + Done | `utils/upi.ts`, `PaymentOptions.tsx` | Link `upi://pay?pa=paytm.s26ykus@pty&pn=Ankur%20Dryice&cu=INR&am=<total>&tn=Order%20<id>` |
| F Rules tests | Done (not run locally) | `tests/firestore.rules.test.mjs` | Runs in `pr-verification-artifacts.yml` (`npm run test:rules:emulator`). Could not run here: emulator jar download blocked in this sandbox |
| F Unit tests | Done | `src/utils/{delivery,staffProjection,contrast,upi,dispatchSchedule}.test.ts` | `npm run test:unit` → 31 pass locally |
| F Screenshots | Done (not run locally) | `tests/playwright-screenshots.mjs` | 11 PNGs (owner-home, all-orders, feature-controls, staff-packing-{alambagh,kaiserbagh,bus-stop-3,local}, bus-stop-settings, payment) uploaded as artifact `pr-24-ui-screenshots`. Chromium download blocked in this sandbox |
| CHANGELOG | Done | `CHANGELOG.md` v1.0.66 | — |

## Known limits / follow-ups

1. Staff status changes reach the public tracking page when the owner app next runs (no server trigger on Spark).
2. Staff "Call" (`ankurGetOneOrderContact`) and Self Pickup (`changeSelfPickup`) are still Cloud Functions; they work only where already deployed and fail gracefully otherwise. Making them Spark-only needs an owner decision (phone numbers would have to be exposed to staff in a projection).
3. Promo-code booking (callable `ankurFeatureAction`) does not yet send `deliveryMode`.
4. A customer doc first created by the owner ("Hamesha ke liye" for a phone order) has no `uid`; that customer's later self-login cannot claim it under current rules.
5. `packCount` (boxes) is stored/shown when present but there is no owner input for it yet.
6. Firestore indexes: the owner sync query `staffOrderViews where statusSyncPending == true` is a single-field equality (automatic index, no deploy step needed).

## Deploy notes (owner)

- Deploy only `firestore.rules` (Spark), **to the named database** `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673` — see "v1.0.66 hotfix: publish rules from Firebase Console" below. Do **not** run plain `firebase deploy --only firestore:rules`: `firebase.json` has no `database` key, so the CLI would update the unused `(default)` database. No functions deploy.
- After deploy: Tools › Bus stops › Save once (creates `settings/delivery` with Alambagh, Kaiserbagh, Bus Stop 3).

## v1.0.66 hotfix — "Connection failed" + owner screenshot items

| Item | Status | Where | How to check |
|---|---|---|---|
| H1 Order "Connection failed" cause | Confirmed by rules analysis | live named-DB ruleset (2026-11-01, `notifications/live-review/firestore.candidate.rules`) | Old `hasOnly` rejects new order/tracking keys; no `staffOrderViews` match → batch `permission-denied` |
| H2 Signed-in pre-check | Fixed | `OrderForm.tsx` | Refused read of not-yet-created `orders/{id}` treated as absent; profile save after commit cannot show an order error |
| H3 Permission message | Done | `utils/orderFormCopy.ts`, `OrderForm.tsx` | Unpublished rules → "ऑर्डर सर्वर ने मना कर दिया (permission)…"; airplane mode → offline-retry message |
| H4 Rules compat old + new apps | Done | `firestore.rules` (root = overlay) | `tests/firestore.rules.test.mjs` › "Order create compatibility across installed app versions" (CI emulator) |
| H5 Push paths kept | Done | `firestore.rules` | push_owner_devices / push_team_devices / order_push_subscriptions copied from the live ruleset |
| H6 AI Video empty state | Done | `customer/FeatureHub.tsx` | Feature controls › Video Idea Builder OFF → AI Video tab shows "… अभी बंद है" message, ON → builder |
| H7 Call number | Done | `OrderForm.tsx`, `data/products.ts`, `i18n/messages.json` | Order form bottom: "कॉल (+91 95808 82066)" dials 9580882066; WhatsApp opens 88963 32066 |
| H8 Price note | Done | `OrderForm.tsx`, `utils/orderFormCopy.ts` | 10 kg retail → "(औसत ₹60/kg, पैकिंग सहित)" |
| H9 Notification Hindi | Done | `ui-fixes/i18n/messages.json` | Profile › सूचना सेटिंग (Hindi mode) |

### v1.0.66 hotfix: publish rules from Firebase Console (Spark, no CLI)

1. Open https://console.firebase.google.com → project **ankur-dryice-app** → Build → **Firestore Database**.
2. At the top, open the database dropdown and pick **ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673** (not `(default)`).
3. Open the **Rules** tab. Optional backup: copy the current text into a note first.
4. Select all, delete, paste the full contents of `firestore.rules` from this branch (starts `rules_version = '2';`, ends with the `order_push_subscriptions` block).
5. Click **Publish**. If the editor shows a red error, do not publish; send a screenshot.
6. Wait 1–2 minutes, then test:
   - Guest (signed out) order, 10 kg, any delivery mode → success screen with Order ID + PIN.
   - Signed-in customer order → success; then My Orders shows it.
   - Owner app: the new order appears (and the new-order push arrives, where push is already working).
   - Track page with Order ID + PIN shows status.
   - Upload a payment screenshot on the success screen → owner sees thumbnail.
   - Staff phone (v1.0.66, registered in Tools › Staff): Packing screen lists the order; "Packing done" works.
   - An old v1.0.65 phone (if still installed) can still place an order.
7. If anything fails, Rules tab → history (clock icon) → restore the previous ruleset.
