# Task: Remaining backend-backed features (phased)

Base: branch where pure-UI packages already applied (calculator, video-idea, loyalty, app-catalog, partner-portal, subscriptions, promotions-ui, inventory-mock, reports-hub, faq-howto, rate-card, support-hub, service-area, referral-share) **or** equivalent main + those patches.

**Do not** redesign the customer booking flow. **Do not** break existing order create / track / notification behaviour. Prefer additive collections and optional fields. Every phase must end with `npm run lint` and `npm run build` green.

Work **one phase at a time**. Commit after each phase. Do not start Phase B until Phase A is done and verified.

---

## Shared conventions

### New Firestore collections (suggested)

| Collection | Purpose | Who writes |
|------------|---------|------------|
| `stock/{skuId}` | Inventory qty, reorderAt, unit | admin only |
| `promos/{code}` | Promo definition + usageCount | admin write; customers read active |
| `invoices/{invoiceId}` | Invoice snapshot linked to orderId | admin / Cloud Function on deliver |
| `subscriptions/{id}` | Recurring plan for a user | user create own; admin update |
| `bulkOrders/{id}` | Partner wholesale orders | partner + admin |
| `referrals/{id}` | refUid → newUserId once | server / careful client rules |
| `userPrefs/{uid}` | notification toggles | owner of uid only |

### Rules principles

- Customers read only what they need (own orders, active promos, own prefs, own subscriptions).
- Only `admin` (and existing staff roles where appropriate) write stock, promos, invoices.
- Never allow clients to set `totalAmount`, payment verification, or arbitrary points balance without server checks.
- Soft-fail: if a new collection is missing, UI shows empty/demo state — do not crash Home/OrderForm.

### Types

Extend `src/types.ts` with interfaces for StockItem, Promo, Invoice, Subscription, BulkOrder, UserPrefs. Keep fields optional where migration is gradual.

---

## Phase A — Read-only owner polish (minimal writes)

**Goal:** Real data on owner screens without new payment logic.

### A1. Owner overview widgets
- In `AdminDashboard`, add an Overview strip (or tab):
  - Orders last 30 days count
  - Pending / dispatched counts
  - Rough revenue sum from non-cancelled orders (existing `orders` reads admin already has)
- Reuse existing queries; no new collection required.
- Loading and empty states required.

### A2. Reports hub → real CSV
- Replace demo download in `ReportsHubPage` (or admin reports section) with client-side CSV built from orders the admin can already read.
- Columns: orderId, date, customerName, district, quantityKg, totalAmount, status.
- PDF can remain stub or simple text; CSV is required.

### A3. Expenses polish
- If `ExpensesView` exists, add monthly total + simple list grouping by month.
- Still admin-only. No change to customer app.

### A4. Verify Phase A
- Admin sees overview numbers that match order list.
- CSV downloads and opens in Excel/Sheets.
- Customer flows unchanged.
- lint + build.

---

## Phase B — Light writes

**Goal:** Promos, invoices, referral credit, notification prefs — small, explicit writes.

### B1. Promo engine (checkout)
- Collection `promos/{codeUpper}`:
  - `code`, `type: 'flat' | 'percent'`, `value`, `active`, `usageLimit`, `usageCount`, `validUntil` (optional)
- Admin UI: simple list create/deactivate (can live under AdminDashboard or extend PromotionsPage for admin role only).
- `OrderForm`: optional promo code field.
  - On blur/apply: read promo doc; if active and under limit, show discount line.
  - On successful order create: include `promoCode`, `discountAmount` on order; increment `usageCount` (transaction preferred).
- Pricing: `totalAmount = max(0, subtotal - discount)`. Do not change base rate formula for dry ice / thermocol lines.
- If promo missing/invalid: clear discount, show short Hindi error.

### B2. Invoice on deliver
- When order status becomes `delivered` (existing admin/staff status update path):
  - Create `invoices/{invoiceId}` with order snapshot, sequential or `INV-{orderId}`, amounts, customer, date.
- Admin Billing screen (new tab or section): list invoices, filter unpaid/paid if field exists; Download uses jspdf or existing `pdfGenerator` util.
- Do not block status update if invoice write fails — log and continue; show retry later if easy.

### B3. Referral credit
- Share links already exist on ReferralSharePage; extend text to include `?ref={currentUser.uid}` when signed in (app origin or documented deep link).
- On **first** successful order by a new user:
  - If `ref` present in profile/localStorage from landing, write `referrals/{newUid}` once and add points to referrer (e.g. +500) on `users/{refUid}` or a `points/{uid}` doc.
- Rules: user cannot write another user’s points; prefer Admin SDK / callable function. If only client rules are available, document limitation and implement admin-only manual credit UI instead of insecure client credit.

### B4. Notification preferences
- `userPrefs/{uid}`: `{ orderUpdates: boolean, promos: boolean, updatedAt }`
- Profile or Support section: toggles; default all on.
- Wire read into existing notification display only if easy; do not break FCM pipeline.

### B5. Verify Phase B
- Valid promo reduces total on order; invalid does not.
- Deliver creates invoice row.
- Referral: either secure credit path or explicit admin-only fallback documented in code comment.
- lint + build; existing tests still pass.

---

## Phase C — Heavier systems

**Goal:** Inventory machine, subscriptions, partner bulk, logistics hooks.

### C1. Real inventory
- `stock/{skuId}`: `name`, `qty`, `unit`, `reorderAt`, `updatedAt`
- Admin Inventory page: replace mock with live onSnapshot; edit qty / reorderAt.
- On order `dispatched` or `delivered` (pick one and document): decrement dry-ice-related sku by `quantityKg` (transaction).
- Optional: when `qty <= reorderAt`, set flag or write `stockAlerts/{id}` for admin home banner.
- Customer app does not write stock.

### C2. Subscriptions (recurring)
- `subscriptions/{id}`: `userId`, `planId`, `quantityKg`, `cadence: 'weekly'|'monthly'`, `nextRun`, `active`, `address fields`, `paused`
- Customer Subscriptions page: create from existing plan cards; list own subscriptions; pause/resume.
- **Scheduler:** document required Cloud Function or external cron that:
  - queries `nextRun <= now && active`
  - creates order draft or full order per business rules
  - advances `nextRun`
- Without Functions, implement **manual “Run due subscriptions”** admin button that creates orders for due rows (admin-only) so the feature is testable.

### C3. Partner bulk orders
- Role or claim `partner` (reuse staff request pattern or admin-assigned flag on user doc).
- `bulkOrders/{id}`: partnerId, eventDate, city, quantityKg, status, amount estimate.
- Partner Portal: form writes bulkOrders; list own rows.
- Admin sees all bulk orders; can confirm → optionally create normal `orders` linked by `bulkOrderId`.

### C4. Logistics / ETA (minimal viable)
- On order: optional `driverId`, `etaMinutes`, `lastLocation` (staff write).
- Tracking view: show ETA text if present.
- Full map is optional; do not require Google Maps key to compile — gate map UI behind config.

### C5. Verify Phase C
- Stock decrements once per order status transition (no double decrement).
- Subscription create/pause works; admin run-due or Function documented.
- Partner can create bulk order; admin lists it.
- lint + build.

---

## Explicit non-goals (unless a later task says so)

- Changing core dry-ice / thermocol rate formula
- Redesigning BottomNav IA
- Rewriting notification Cloud Functions from scratch
- Payment gateway / UPI auto-verify
- Multi-language full i18n framework

---

## Workflow / CI

If workflows run `ui-fixes/declutter_v132.py` and pure-UI `apply_patch.py` scripts, keep those first. Phase A–C are source changes, not necessarily new apply_patch folders — implement in `src/` directly.

Suggested commit messages:
- `feat(admin): overview widgets + reports CSV (phase A)`
- `feat: promos, invoices, prefs (phase B)`
- `feat: stock, subscriptions, bulk orders (phase C)`

---

## Acceptance checklist (all phases)

- [ ] Customer can still place order and track without new required fields
- [ ] Admin-only features hidden from customers
- [ ] Firestore rules updated and reviewed for each new collection
- [ ] No secret keys in client
- [ ] `npm run lint` and `npm run build` pass
- [ ] Hindi labels consistent with existing app tone where UI is user-facing

---

## Order of implementation for Codex

1. Phase A complete + commit  
2. Phase B complete + commit  
3. Phase C complete + commit  

If time-boxed, **stop after Phase A** and report what was done. If continuing, say which phase is next before coding.