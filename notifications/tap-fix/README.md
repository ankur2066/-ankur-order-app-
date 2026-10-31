# Notification tap follow-up

The owner's screenshot `1000985886.jpg` shows the exact synthetic `TEST-FCM-20261031-98EE1A` in-app toast. Code comparison matches the Firestore toast title/body, while the deployed FCM title is different. This establishes a visible in-app TEST alert, not a separate FCM receipt, tap behavior, installed APK version or a separate staff/customer phone. The approved cleanup had already removed the synthetic business fixture. No screenshot/customer-form contents are uploaded to GitHub.

Source investigation also found independent tap-path defects: the notification sheet's cards were static list items, its native action only opened the sheet, and Android's actual data-only cold-start action can omit title/body unlike the original client test fixture.

The private v1.0.31 candidate fixes these source issues:
- The exact screenshot-style toast, staff toast and sheet cards all invoke the same opening action. Close/X only dismisses. Sheet cards are real, labeled buttons. Native and in-app taps use one routing hook; early taps wait for role readiness.
- Owner and permitted staff/delivery go to their existing dashboard with order ID search selected and old status/payment/slot/district filters reset. Existing data listeners and Rules still enforce access. Revoked staff cannot use an old event to regain access.
- Customer/guest opens the existing tracking view with the matching device-local six-digit PIN when available. If the device does not hold it, the existing PIN prompt remains. No PIN is accepted from, or added to, push payloads. Tracking view is remounted when the selected order changes.
- TEST/connection messages show an explicit explanation instead of looking up a removed or fabricated business order. Invalid order IDs do not become paths/links.
- Reconstruct readable titles/body from event type/status when a real Android cold-start tap provides only data. Forward full event metadata to the routing hook.

Seventeen existing client/native tests (including two new data-only action regressions) plus twelve routing/hook/real-sheet/toast tests cover this behavior. The previous backend/Rules/safeguard suite remains 75 checks: 104 total, plus package smoke and web/native compilation in CI. Passing source/CI tests do not prove the owner's physical tap is fixed; installed version and device validation remain unconfirmed.

Apply `apply_patch.py` after `notifications/client-fixes/apply_patch.py`. No business fields, prices, production code, Rules, billing, original signed APK or original source archive are changed. The candidate build is private and never installs/publishes/deploys itself.
