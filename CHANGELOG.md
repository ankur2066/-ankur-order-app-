# Changelog

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
