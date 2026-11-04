# Staff phone privacy — private server review v1.0.49

**NOT DEPLOYED, NOT A SIGNED APK, NOT A PRODUCTION FIX.** This is an isolated implementation and test proposal based on the live named-database Rules baseline and the existing v1.0.48 UI overlay.

## Implemented on this review branch
- `staffSafeProjection()` copies a fixed operational allowlist from `orders` / `product_orders` into `staffOrderViews`. It excludes phone, email, tracking secret, full street address and private notes.
- Named-database Firebase v2 `onDocumentWritten` handlers for both order collections update/delete those views.
- `ankurGetOneOrderContact` only for an authenticated, App-Check-verified, **active** staff/delivery user with explicit `viewOrders` and `callCustomer` permissions, and a valid owner-managed `staffOrderAssignments/{source}_{id}_{uid}` record. No list/batch contact endpoint. Max 5 accesses per order per UTC hour, 50 per staff UID per UTC day. Audits omit phone.
- `ankurStaffUpdateOrderStatus` makes paired private order/tracking changes server-side without returning phone.
- Staged least-privilege Rules remove staff raw `get/list` from **both** canonical order collections, keep owner and order-owning customers, require explicitly active staff and affirmative permissions, and make projections server-write-only.
- Staged synthetic tests cover explicit raw-read denial, revoked/unconfigured users, customer ownership, admin privileges, server projection redaction, per-order authorization/rate limits and paired status updates.

## Safety gates / remaining work before any production cutover

1. Confirm the exact deployed named-DB Rules by read-only inspection and compare; do not overwrite unexpected live changes.
2. Freeze and back up rules and database. Review IAM, function service account, App Check enforcement, FCM payloads, indexes, data retention and Cloud Functions costs.
3. Add a **read-only dry-run**, approve a safe backfill for all existing `orders` and `product_orders`, and validate there are no missing or stale projection records. New triggers alone do not populate historical orders.
4. Build and test owner-managed assignment flows. Legacy staff accounts may lack `active:true` and explicit permissions and will be intentionally denied until provisioned.
5. **Client cutover is still required:** replace `StaffDashboard.tsx` raw `subscribeOrderDocuments({})` with a `staffOrderViews` subscription, use authenticated `ankurGetOneOrderContact` only on a single order's Call action and `ankurStaffUpdateOrderStatus` for permitted updates. Remove all other code paths, caches, exports, bulk APIs and FCM staff payloads that deliver raw customer phones. Existing v1.0.48 UI alone is not a security boundary.
6. Keep owner use of full canonical orders and verified customer-only order queries. Test staff statuses, delivery, packing, notifications, PDF reporting, order and product order lifecycles, permission revocation and new + old orders.
7. Emulator attack tests are not sufficient: verify on separate physical owner/staff handsets, using an authenticated staff Firebase SDK/REST raw read attempt. Confirm that no row contains a phone before the specific Call action.
8. Direct Android dialer and WhatsApp links still expose the number once used. To conceal phone even during a call requires a separate owner-approved business calling relay. Screen recording blockers cannot prevent external-camera photos.
9. Only **after** owner sign-off on exact database, verified rollback, backfill, Rules and Functions cutover, launch another private signed test candidate. No deployment, migrations, domain update, public APK or Play submission has been performed.

The review workflow emits `staff-privacy-review/REVIEW_ONLY.json` and intentionally emits **no `firebase.json`**. Its CI artefact is source and proposed Rules, never an APK.
