# Staff phone privacy — private server review v1.0.49

**NOT DEPLOYED, NOT A SIGNED APK, NOT A PRODUCTION FIX.** This is an isolated implementation and test proposal based on a previously reviewed named-database Rules source baseline and the existing v1.0.48 UI overlay.

## Implemented on this review branch
- `staffSafeProjection()` copies a fixed operational allowlist from `orders` / `product_orders` into `staffOrderViews`. It excludes phone, email, tracking secret, full street address and private notes.
- Named-database Firebase v2 `onDocumentWritten` handlers for both order collections update/delete those views.
- `ankurGetOneOrderContact` only for an authenticated, App-Check-verified, **active** staff/delivery user with explicit `viewOrders` and `callCustomer` permissions, and a valid owner-managed `staffOrderAssignments/{source}_{id}_{uid}` record. No list/batch contact endpoint. Max 5 accesses per order per UTC hour, 50 per staff UID per UTC day. Audits omit phone.
- `ankurStaffUpdateOrderStatus` makes paired private order/tracking changes server-side without returning phone and requires a live assignment.
- `ankurOwnerAssignStaffOrder` is an owner-verified, App-Check-gated, per-order grant/revoke callable. The existing Owner Users section gains a separate `StaffOrderAccessManager` for active role permission and individual-order access. This is staged only.
- Staged least-privilege Rules remove staff raw `get/list` from **both** canonical order collections, keep owner and order-owning customers, require explicitly active staff and affirmative permissions, and make projections server-write-only.
- Staged synthetic tests cover explicit raw-read denial, revoked/unconfigured users, customer ownership, admin privileges, server projection redaction, per-order authorization/rate limits and paired status updates.

## Safety gates / remaining work before any production cutover

1. Confirm the exact deployed named-DB Rules by read-only inspection and compare; do not overwrite unexpected live changes.
2. Freeze and back up rules and database. Review IAM, function service account, App Check enforcement, FCM payloads, indexes, data retention and Cloud Functions costs.
3. A guarded **dry-run-first** historical backfill is staged in `privacy/backfill.mjs` for both collections, but has **not been executed** on the live database. Approve and test a safe backfill after backups and live Rules/Functions review; verify every existing order has a non-stale projection. New triggers alone do not populate historical orders.
4. Owner-managed grant/revoke source and tests are staged. Validate the exact owner UI on an Android device, and explicitly provision legacy staff accounts with `active:true` and permissions. Otherwise access fails closed.
5. **Client cutover source is staged:** the reconstructed `StaffDashboard.tsx` listens to `staffOrderViews` instead of raw `subscribeOrderDocuments({})`; contact is fetched only for the selected order on deliberate Call action, cached transiently for 15 seconds, and status writes use a callable. This does not protect already-installed old staff APKs or unreviewed FCM/other read paths. Production Rules must block old raw reads simultaneously with a tested staff APK migration and complete safe-view backfill.
6. Keep owner use of full canonical orders and verified customer-only order queries. Test staff statuses, delivery, packing, notifications, PDF reporting, order and product order lifecycles, permission revocation and new + old orders.
7. Emulator attack tests are not sufficient: verify on separate physical owner/staff handsets, using an authenticated staff Firebase SDK/REST raw read attempt. Confirm that no row contains a phone before the specific Call action.
8. Direct Android dialer and WhatsApp links still expose the number once used. To conceal phone even during a call requires a separate owner-approved business calling relay. Screen recording blockers cannot prevent external-camera photos.
9. Only **after** owner sign-off on exact database, verified rollback, backfill, Rules and Functions cutover, launch another private signed test candidate. No deployment, migrations, domain update, public APK or Play submission has been performed.

The review workflow emits `staff-privacy-review/REVIEW_ONLY.json` and intentionally emits **no `firebase.json`**. Its CI artefact is source and proposed Rules, never an APK.

## 4 November — direct status-write security gate (source only)

Staged Firestore rules now explicitly set `canUpdateStatus() { return false; }` for **all direct client writes**, not just raw contact reads. An older staff APK that knows an order ID must not bypass the new scoped callable by writing `orders`, `product_orders`, `order_tracking` or `product_order_tracking` directly. The staff status callable still uses Firebase Admin to update paired canonical/tracking state after checking active role, assignment and permission. The emulator regression in `privacy/rules.test.mjs` explicitly denies a fully active, update-authorized staff user's direct writes to both order types and both tracking types. This is not deployed. The latest workflow run for this change must be checked before claiming the new test passed.
