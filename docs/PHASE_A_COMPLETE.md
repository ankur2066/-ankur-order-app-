# Phase A complete — Ankur Dryice owner-only reporting

**Branch:** `codex/phase-a-owner-reports-expenses` (based on v1.0.32 private review branch `codex/issue-11-notification-audit`)

**Successful GitHub Actions verification:** https://github.com/ankur2066/-ankur-order-app-/actions/runs/41267098325

**Status:** Phase A code prepared and CI verified. **Not merged, installed or deployed.** No Phase B or C implementation.

## Implemented

- **A1 Owner Overview:** last rolling 30 days, count of non-trash orders, pending/dispatched counts and *estimated booked order value* (excludes cancelled orders, not a cash-received figure). Reuses `AdminDashboard`'s existing owner-authorized `orders` onSnapshot. Shows loading/error/empty state and a missing-date count. No new Firestore collections or queries.
- **A2 Real Orders CSV:** owner-only export on the Orders overview and existing Insights tab. Built from existing loaded, non-trash, admin-readable order records with required `orderId,date,customerName,district,quantityKg,totalAmount,status`. UTF-8 BOM for Excel Hindi; quoted commas/quotes and spreadsheet formula injection protection. Existing PDF functionality is not replaced.
- **A3 Expenses:** monthly totals and month-grouped list, using the owner's 15th–14th accounting period (India time). Existing admin-only `expenses` collection and add/delete functions preserved; error and empty states added.
- **A4 Safety:** automated hash comparison proves the Phase A patch does not modify `OrderForm.tsx`, `OrderTrackingView.tsx`, `useOrderNotifications.ts`, `rates.ts`, or `firestore.rules`. Existing owner access gate remains in `AdminDashboard`; no new Firestore rules needed because no new collections/permissions.

## Validation

- Node 22 `node --experimental-strip-types --test phase-a/phase-a.test.mjs`: **4/4 passing** (overview status/revenue, timestamp/missing data, CSV safety, accounting boundaries).
- CI executes the existing verified v1.0.32 patch chain before Phase A (including native notification/tap client patches and UI declutter).
- GitHub Actions runs `npm run lint && npm run build`: **SUCCESS**.
- No live Firestore writes, Firebase deployment, APK signing, APK installation or billing changes.

## Deliberate boundaries

- The 14 standalone UI packages have not yet been applied to the v1.0.32 branch. For A2 the task explicitly allows the **existing owner/admin reports area** instead of an unmerged `ReportsHubPage`. No demo reporting packages are shown as real exports.
- CI passing is not the same as manual Excel/Sheets or physical Android UI testing. Owner may test the review build after a separate approved APK build.
- Do not begin Phase B or Phase C until the owner explicitly says `continue Phase B` or `continue Phase C`.