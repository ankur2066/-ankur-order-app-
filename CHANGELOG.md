# Changelog

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
