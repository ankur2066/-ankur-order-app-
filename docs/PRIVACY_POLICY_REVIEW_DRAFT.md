# Ankur Dryice — Privacy Policy / Play Data Safety review draft

**Internal pre-publication draft only — NOT a published privacy policy, legal certification, or finalized Data Safety declaration.**

**App:** Ankur Dryice (Android package `com.ankurdryice.events`)
**Service:** Dry Ice booking and available approved event/Pyro product inquiries, order management and tracking in Lucknow and eligible Uttar Pradesh areas.
**Operator:** Ankur Dryice and Events
**Customer support:** Call **95808 82066**; WhatsApp **88963 32066**.

## 1. Data processed by the current app (review before publication)

| Category | Where/why it appears in app | Owner must verify |
| --- | --- | --- |
| Contact and booking identity | Customer name, telephone, city/district and booking request/notes | Exact required fields and validation in latest signed APK |
| Sign-in identity | Google/Firebase account UID, name, email and possibly avatar where user signs in | Whether any other sign-in provider is enabled |
| Orders and delivery | Product choice, quantity, calculated/requested price, dispatch slot, order status, payment-confirmation status, tracking token/PIN | Which of these fields can be seen by guest, customer, owner and staff |
| Notifications | Device registration/FCM token and eligible order/pickup/payment status alerts | Permission prompts, token retention, revocation and opt-outs in all flows |
| Owner/staff operations | Role and assigned permission data for internal booking, packing, dispatch, expense/report operations | Audit role checks and staff access before any wider release |

The app must **not** describe a pending booking as proof of payment, confirmed delivery or payment capture. Commercial receipts are not automatically GST tax invoices. Optional loyalty, inventory, recurring ordering, unit-product billing and referral features remain disabled or review-only unless separately approved and deployed.

## 2. Purposes and access

Use the information above for account access, booking requests, customer communication, owner/staff order fulfillment, tracking, payment verification and operational notifications. Access should be limited to the authenticated customer and legitimately authorized business staff/owner as enforced by Firebase Rules and services. This draft does not assert that every live security rule or account-deletion path has been verified on physical Android devices.

## 3. Service providers and sharing

The application uses Firebase/Google services for authentication, Firestore records and push messaging. User-approved Android share actions may transfer a chosen report or other content to the receiving app selected by the user. The business may contact the customer regarding a booking through the phone or messaging details they provided. **Verify exact SDK inventory, Google Play disclosure requirements, processing location and any additional sharing before publishing this section.**

Do not claim that data is never shared, never processed outside India or never retained unless production service configurations have been independently verified. No automatic marketing uses or data sales are authorized by this draft.

## 4. Storage, retention and security — decisions still needed

- Account records, bookings, tracking and device registrations require a defined retention schedule and deletion procedure. **No verified retention period is currently available in the project evidence; owner must decide and implement it.**
- Production Firestore Rules, staff permissions, App Check and Functions must be reviewed against the final app version.
- Retired tokens and obsolete test fixtures should be cleaned only through approved access-controlled procedures; never bulk-delete real customer orders during a test.
- Do not collect passwords or payment-card credentials in the booking form. Any future payment-gateway integration requires its own data-flow and disclosure review.

## 5. Customer requests and contact

A customer should be able to request correction, access or deletion of personal information using the published business support channel. Before release, document the actual identity-verification and request-handling process, including any order records retained for legitimate business/accounting requirements.

**Open blocker:** if customers create accounts in the released app, verify the account deletion pathway required for Google Play and supply the correct in-app and web deletion request URLs where required. A support phone number alone should not be represented as a completed in-app account deletion function.

## 6. User choice and permissions

Order notifications should request Android notification permission as required. Customers may decline notifications while retaining normal booking access, subject to verified application behavior. The in-app update checker only reads a first-party release manifest and opens a user-approved update link; it does not silently install APKs or request broad installation/storage privileges.

## 7. Publication checklist (do not publish yet)

- [ ] Review every statement above against the final v1.0.37+ installed Android app, Firebase rules and SDK inventory.
- [ ] Set and document real data retention/deletion procedures and identity verification for privacy requests.
- [ ] Verify customer account deletion workflow and any required public URL.
- [ ] Verify company/operator legal contact details and a privacy contact channel.
- [ ] Review data collection/sharing/permissions with the appropriate legal/privacy advisor; fill Google Play Data Safety truthfully.
- [ ] Publish final policy on an owner-controlled public HTTPS page only after approval; confirm it is accessible without login.
- [ ] Add final policy link to Google Play listing and app as appropriate.
- [ ] Date and version final approved policy, then retain review evidence in the release record.

**Current status: source draft only. No app settings, production Firebase, customer records, public website, Play Console or billing were changed by creating this file.**
