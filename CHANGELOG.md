# Changelog

## v1.0.72 — bus number on customer tracking + staff WhatsApp, Products (coming soon) tile

Android **versionCode 72 / versionName 1.0.72**, same applicationId `com.ankurdryice.events` and keystore. Firebase Spark: no deploy by Hark. **New Firestore field `busNumber`; `firestore.rules` changed and must be published by the owner** (orders + order_tracking only; staff paths unchanged, no role change, no data deleted).

- **Bus number is now saved**: the owner's WhatsApp prompt (pre-filled with the saved number) and a new "बस नंबर" box in the delivery editor (BUS orders) save `busNumber` on the order, then copy it to the customer tracking doc and the staff view. Each copy is a separate best-effort write, so with the old published rules nothing else breaks — only the bus number is not saved. Helpers: `src/utils/busDispatch.ts`, `src/services/busDispatch.ts` (+ tests).
- **Customer tracking page** shows, once dispatched/delivered: mode, bus stop name and "बस नंबर: XXXX" (large mono, select-all, Copy button). Nothing before dispatch; no bus line when no number is saved. Mode/stop are copied to tracking when the owner marks dispatched (or the owner app syncs a staff "Dispatched").
- **Staff "Customer ko WhatsApp"** dispatched text adds the bus number: "…रवाना हो गया है, बस से (Alambagh बस स्टॉप) — बस नंबर 6965।". `busNumber` added to the staff projection and `DELIVERY_SYNC_FIELDS`; still no phone/price/PIN for staff.
- **Rules**: `busNumber` allowed on orders (string 1–20, BUS only) and `deliveryMode`/`busStopId`/`busNumber` on order_tracking (same delivery validation); customers cannot create an order/tracking doc with `busNumber`. Staff status-only rules untouched.
- **Customer bottom bar**: the lower "AI Video" tab is replaced by **Products / प्रोडक्ट्स** (shopping-bag icon). Tap shows "बहुत जल्द यह सुविधा शुरू होगी।" (English: "Coming very soon."); no navigation, no Firestore. AI Video in the upper Home feature row is unchanged.
- Owner's own customer WhatsApp message keeps its behaviour (bus number line as before).

## v1.0.71 — AI chat microphone in the APK, status-aware staff WhatsApp text

Android **versionCode 71 / versionName 1.0.71**, same applicationId `com.ankurdryice.events` and keystore. Firebase Spark: no deploy, no new Firestore field, no rules or role change.

- **AI chat mic works inside the Android app**: in the APK (Capacitor native) the mic uses `@capacitor-community/speech-recognition` 7.0.1 — asks microphone permission, listens in `hi-IN` (falls back to `en-IN`), live partial text fills the chat box, second tap stops. Clear Hindi message when permission is denied or speech recognition is not available on the phone. Browser (web) keeps the Web Speech path. Helper: `src/utils/voiceInput.ts` (+ tests).
- Android manifest: `RECORD_AUDIO` permission and the `android.speech.RecognitionService` query (added by `ui-fixes/release-audit-v1065.py`; the plugin also merges them).
- **Staff "Customer ko WhatsApp"** prefill now follows the order's current status (pending, confirmed, packing, packed, dispatched with bus stop / mode, delivered, cancelled); unknown status keeps the old greeting. Uses only staff-view fields. Helper: `src/utils/staffWhatsApp.ts` (+ tests).
- **Packing boxes = Alambagh, Kaiserbagh, Porter, Local** (+ "Mode not set" only when such orders exist). Porter is its own box with its own count; Local = local delivery + godown/shop pickup (sub-tags Local delivery / Dukan pickup). "Bus Stop 3" removed from defaults; if it is stored in `settings/delivery` it is kept (never deleted) but always read as inactive, hidden from pickers and from the owner bus-stop list; old orders on it show as "Bus Stop 3 (Inactive)".
- **Customer Home sliding banner at the very top** (CustomerHome `topSlot`, patched by `release-audit-v1065.py`). With an empty `settings/homeSlides` it shows 3 built-in rotating slides; any owner winner/offer/poll replaces them. No Firestore writes.
- **"संपर्क करें" footer** at the bottom of customer Home (above bottom nav): packing (Vikas Gautam) 9151416323, delivery 9532844538, complaints 8896332066 — tel + WhatsApp links, Hindi/English labels. Numbers live only in `src/data/customerContacts.ts`.

## v1.0.70 — owner: New orders tab, loading ticks by stop, today alert, overdue fix

Android **versionCode 70 / versionName 1.0.70**, same applicationId `com.ankurdryice.events` and keystore. Firebase Spark: no deploy, no new Firestore field, no rules change for the app itself.

- **New orders tab** (Today's work, first tile, red count badge): only `status == 'pending'` orders, earliest dispatch date first, old dates flagged. One-tap **Confirm order** (existing status handler -> `confirmed`, tracking + staff view updated as before).
- Owner **Packing by stop** and the dispatch slots count only confirmed-onwards orders, so Alambagh/Kaiserbagh counts never include an unseen order. All Orders still lists everything (Pending filter tab unchanged).
- **Loading tick list** per stop (owner): checkbox per order = existing `in_packing` status (same as staff "Packing done"); untick goes back to `confirmed`; dispatched/delivered count as loaded and cannot be unticked. Stop pills show `2/3 loaded`, header `Alambagh: 3 orders, 2 loaded` (Hindi: `3 में से 2 लोड`).
- **Red alert** on Today's work while any order dispatching today is unconfirmed or not loaded, with buttons to open New orders / packing.
- **Old / Overdue** now = past dispatch date and still not dispatched (confirmed/in_packing). Dates after tomorrow move to a new **Upcoming dates** slot instead of "overdue".
- "पेंडिंग" shows as "Pending" in English. All new labels in Hindi + English (messagesV1066.json).
- Tests: `src/utils/orderWorkflow.test.ts` (new), upcoming bucket case in `dispatchSchedule.test.ts`, real-render owner New orders/Confirm/overdue test in `ui-fixes/i18n/screens.test.mjs` (real orderWorkflow loaded), homePollVotes allow/deny emulator cases in `tests/firestore.rules.test.mjs`. No test removed or weakened.

## v1.0.66 — delivery modes, bus stops, Spark staff packing, soft 3D tokens

Android stays **versionCode 66 / versionName 1.0.66** (owner has 65/66 installed). Firebase **Spark only**: no new Cloud Function, no Blaze, no paid service. Payments are never auto-marked paid.

- **Items 1–24** (v1.0.65 feedback) carried unchanged: wholesale-only amount edits, owner customer type, QR fallback, IST dispatch scheduling/overdue grouping, slot cutoffs, contrast/insets, shared order actions, owner-controlled rates, optional thermocol, city/test-order handling, payment confirmation, language-aware notes, feature visibility, customer navigation, consistent tracking status.
- **25 UPI config** — `src/config/businessConfig.ts` is the single source (primary `paytm.s26ykus@pty`, backup `ankur.singh332066@okhdfcbank`); used by order form, tracking, QR and deep links. Removed the last `8896332066@paytm` string (unused i18n key). Backup line + Copy + smaller "Dusre UPI se pay karein". Cashfree noted as later.
- **26 QR** — bundled `src/assets/primary-upi.svg` with in-app `qrcode` fallback. UPI links now percent-encode (`pn=Ankur%20Dryice`, `tn=Order%20<id>`) instead of `+`.
- **27 Customers** — `customers/{+91mobile}` directory, New→Old after first delivered order (owner status change and staff sync), owner-only screen with counts, today/7/30/custom filters, search; owner may now create a directory entry (phone orders) and save delivery defaults.
- **28 Policies** — Privacy, Terms, Refund/Cancellation, Shipping/Delivery, Contact pages; address corrected to **MLIG 4/5, Sector H, Jankipuram, Lucknow, UP 226021** (owner confirmed; all 4/6 removed).
- **29 Rates** — retail/wholesale defaults in config with owner-confirm TODO.
- **31 Dispatch IST** — Aaj/Kal only by IST date comparison, "Date not set" group, counts for today IST + slot; added IST-midnight boundary test.
- **32–34 Readable strips and status colours** — one status palette (`src/theme/designTokens.ts`): Pending amber, Confirm purple, Packing blue, Dispatch indigo, Delivered green, Total neutral, used by tiles, buttons, chips and the new packing screens.
- **35 Feature controls** — dark readable text on light rows, one-line description, ON/OFF label beside each switch.
- **36 Tools aur Settings** — one sheet with 8 tools (New Entry, Reports, Expenses, Users, Store/Theme, AI Chat, **Bus stops**, **Staff**) + Feature controls; owner home keeps summary + today's orders first.
- **37 Soft 3D tokens** — raised/pressed shadows, inset radius, pill spacing, stop palette and chart colours added to the token file; new `.pill-tab`, `.stop-pill`, `.stop-chip`, `.raised-card` classes use CSS variables only. Contrast unit test checks every token pair ≥ 4.5:1 and CSS fallbacks match tokens.
- **38 Delivery mode** — `deliveryMode` BUS | SHOP_PICKUP | PORTER | LOCAL per order (BUS stores `busStopId`). Owner manages bus stops (add, rename, colour, Active/Inactive; defaults Alambagh, Kaiserbagh, Bus Stop 3) and district → stop mapping in `settings/delivery`. Packing list grouped by stop + Local with KG totals and WhatsApp share (no prices).
- **38b Customer defaults** — new order uses customer default → district mapping → ask. Owner delivery change asks "Sirf is order ke liye" / "Hamesha ke liye". Inactive default stop shows a warning and is never silently replaced.
- **38c Roles OWNER / STAFF** — owner adds/removes staff by mobile (+ Google email used for sign-in verification) in Tools aur Settings › Staff. Staff home is the Packing screen (big stop pills + Local with Porter / Dukan pickup / Local delivery sub-tags, date default today IST, total KG, buttons Packing done / Dispatched / Handed over). **Replaced the Blaze callable `ankurStaffUpdateOrderStatus`** with a rules-enforced Spark batch (orders: status + updatedAt only; staffOrderViews: status/packing fields + `statusSyncPending`); the owner app copies staff status changes to the public tracking doc. Owner home and All Orders get the same stop filters.
- **E (23/24) Payment** — screenshot compressed to ~150 KB at `orders/{id}/paymentProof/latest`, owner thumbnail + full view, staff blocked by rules, verification pending until the owner marks paid; "Pay with UPI app" link with order ID memo, QR fallback and backup UPI copy.
- **F Tests** — emulator rules tests for registry staff, status-only staff writes, staff registry, bus stop settings, customer delivery defaults and order delivery validation; unit tests for delivery default priority, inactive stop warning, stop grouping + KG totals, staff projection, UPI link builder and token contrast; Playwright mock screenshots for Owner home, All Orders, Feature controls, Staff Packing (each stop + Local), Bus stop settings, Payment (uploaded as `pr-24-ui-screenshots`).

### Known limits

- Staff status reaches the customer tracking page when the owner app next runs (Spark has no server trigger).
- `ankurGetOneOrderContact` (staff call button) and `changeSelfPickup` remain Cloud Function features and only work if those functions are already deployed; they fail gracefully otherwise.
- The promo-code booking path (server callable) does not yet carry `deliveryMode`.

### v1.0.66 hotfix — "Connection failed" on Place Order, owner screenshot fixes (versionCode stays 66)

- **Cause of "Connection failed"** — the live named database (`ai-studio-ankurdryiceorder-…`, ruleset deployed 2026-11-01 from `notifications/live-review/firestore.candidate.rules`) still runs the pre-v1.0.65 schema. Its `keys().hasOnly(...)` rejects the new order fields (`dispatchDate`, `slot`, `dispatchSlot`, `customerType`, `calculatedTotal`, `customerTotal`, `amountChanged`, `amountChangeReason`, `thermocolIncluded`, `testOrder`, `deliveryMode`, `busStopId`) and tracking fields (`totalAmount`, `dispatchDate`, `slot`, `dispatchSlot`), and has no `staffOrderViews` rule, so the whole batch fails with `permission-denied`. OrderForm showed that as "Connection failed". Fix = publish the new `firestore.rules` to that named database (Console steps in `docs/PR24_CHECKLIST.md`).
- **Signed-in customers** — the pre-submit duplicate check read `orders/{newId}`; Firestore refuses a customer read of a not-yet-existing order (`resource == null`), which also surfaced as "Connection failed" for every signed-in customer. A refused pre-check now means "not saved yet". A users-profile save failure after a committed order no longer shows an order error. `customers/{+91mobile}` first-record create no longer aborts on the refused existence read.
- **Error copy** — `permission-denied` now shows "ऑर्डर सर्वर ने मना कर दिया (permission)। ऑर्डर नहीं बना। कृपया मालिक को बताएं — कॉल 95808 82066 या WhatsApp 88963 32066।" (English in English mode); real network errors keep the offline-retry message and the saved draft (`src/utils/orderFormCopy.ts`).
- **Rules (old + new apps both place orders)** — v1.0.64 / v1.0.65 payloads (no `staffOrderViews`, no `deliveryMode`) are accepted unchanged. Fixed: a first-time signed-in customer with no `users/{uid}` doc errored on `profile` lookup (now `profileCustomerType()` → `'retail'`); a wholesale changed amount (`amountChanged: true`) could never pass (`!isAmountChanged && …` was always false) and owner status updates on such orders checked the owner's own profile; `calculatedTotal` compares with ±0.05. Restored from the live ruleset: customers/guests must create orders and tracking with `paymentStatus == 'pending_verification'`, and the push device paths (`push_owner_devices`, `push_team_devices`, `order_push_subscriptions`) so publishing does not break FCM registration.
- **AI Video tab** — no longer blank when `settings/featureSuite.features.video` is off: shows "Video Idea Builder अभी बंद है" with where the owner turns it on (Owner Dashboard → Tools aur Settings → Feature controls), plus loading and load-error states (Hindi/English).
- **Call number** — order-form help line now shows "कॉल (+91 95808 82066)" (`tel:+919580882066`); WhatsApp stays 88963 32066. Floating Call button tooltip copy fixed in `messages.json`.
- **Price note** — "(₹60/kg, सभी लागू शुल्क सहित)" replaced by "(औसत ₹60/kg, पैकिंग सहित)" / "(average ₹60/kg, incl. packing)"; says "केवल ड्राई आइस" without thermocol, adds transport when set, hidden for a custom wholesale total. Price logic unchanged.
- **Notification preferences (Hindi)** — "इस फ़ोन पर ऑर्डर की जानकारी पाएँ", "ऑफ़र और छूट के मैसेज", plain explanation, "सेव करें", "सूचना सेटिंग", and simpler save notices.
- **Tests** — emulator blocks for v1.0.64 / v1.0.65 / v1.0.66 order batches, first-time signed-in buyer, self-verify/owner-field/forged-view rejections, wholesale changed amount, push paths, signed-in proof upload; unit tests `src/utils/orderFormCopy.test.ts`; static contracts updated for the corrected rule text.

**Staff note:** the new rules intentionally stop staff from reading `orders` directly (they read `staffOrderViews`). Staff phones on v1.0.64/65 must update to v1.0.66 after the rules are published.

## v1.0.65 — customer test feedback and soft 3D UI

Items 1–24 from the earlier v1.0.65 feedback remain in the same open PR: wholesale-only amount edits with owner customer type, payment QR fallback, IST dispatch scheduling and overdue grouping, slot cutoffs, contrast and insets, shared order actions, owner-controlled rates, optional thermocol, city/test-order handling, clearer dispatch windows, payment confirmation, language-aware notes, feature visibility, customer navigation and consistent tracking status.

- Centralized the primary/backup UPI IDs, retail/wholesale rate defaults and merchant name. Bundled the primary QR, added app deep links and copy actions, kept payment pending until owner verification, and documented Cashfree as a later item.
- Added owner-only Firestore customer directory with +91 mobile document IDs, New/Old tags, counts, date filters, search, and self-only customer document access rules.
- Added offline website policy HTML pages for Privacy, Terms, Refund/Cancellation, Shipping/Delivery and Contact; the website itself is unchanged.
- Added explicit `dispatchSlot` storage, date-not-set grouping, and IST date/slot unit coverage for today, tomorrow, past and missing dates.
- Added shared soft 3D design tokens, status palette, compact owner navigation and one Tools aur Settings sheet. Feature controls now use owner-authorized Firestore settings directly; no new Cloud Function or paid service was added.
- Retained Android versionCode 65 / versionName 1.0.65 and `allowBackup=false`.

### Verification

- `npm run lint` — pass.
- `npm run test:unit` — 2 dispatch date tests pass.
- `npm run test:rules` — 3 static Firestore rules contract tests pass; emulator rules execution remains unverified.
- `npm run build` — pass (Vite reports existing chunk-size and mixed static/dynamic import warnings).
- Before/after app screenshots are not attached: the available customer screenshots contain identifying order/customer information, and the isolated UI browser could not reach the local preview. No production data was added to the PR.
