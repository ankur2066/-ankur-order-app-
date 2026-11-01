# Ankur Dryice — 14 Feature Packages: Codex handoff (review only)

**User-supplied archive:** `ankur-codex-features.zip` (14 package directories; original README `CODEX_FEATURES_README.md`). SHA256: `9d22e450ba76d92da0dde89578eb403bf3fb4b117fd84aa6aa221cb039e83cfb`. The archive was supplied in ChatGPT. **It is NOT committed or attached here yet**; Codex must first receive the archive from the owner or a verified trusted file source, and check SHA256. Do not claim source uploaded to GitHub.

**Existing repo:** `ankur2066/-ankur-order-app-`. Use branch `codex/issue-11-notification-audit` (v1.0.32 private candidate) as integration baseline, NOT `main`. PR #12 is notification + UI candidate; respect its latest changes.

## Original README run order (intended dependencies; DO NOT blindly execute as-is)

```bash
python3 calculator/apply_patch.py
python3 video-idea/apply_patch.py
python3 loyalty/apply_patch.py
python3 app-catalog/apply_patch.py
python3 partner-portal/apply_patch.py
python3 subscriptions/apply_patch.py
python3 promotions-ui/apply_patch.py
python3 inventory-mock/apply_patch.py
python3 reports-hub/apply_patch.py
python3 faq-howto/apply_patch.py
python3 rate-card/apply_patch.py
python3 support-hub/apply_patch.py
python3 service-area/apply_patch.py
python3 referral-share/apply_patch.py
```

Apply these ONLY after the full current v1.0.32 base extraction + existing patch sequence ending in `ui-fixes/declutter_v132.py`, and ONLY after adapting patch anchors. Source archive is held in `Ankur_Order_App_Upload_GitHub.zip`; do not replace it.

## Critical compatibility defects

1. v1.0.32 `declutter_v132.py` removes the old `ProfileTab` `onOpenRulesReview` prop and the `मेरे ऑर्डर और ट्रैकिंग` button. 12 feature patchers still depend on those anchors: raw sequential application will FAIL or partially mutate files. Adapt the original `apply_patch.py` files to a consolidated, accessible feature-section router; stage changes atomically and test.
2. `subscriptions/apply_patch.py` and `promotions-ui/apply_patch.py` have a Python string backreference `"\\1, ..."` that can introduce U+0001 instead of a legitimate component prop. Fix all substitutions and test generated TSX.
3. `subscriptions` contact URL is `https://wa.me/` (empty). Use established business WhatsApp destination without changing existing prefilled message patterns.
4. Current original app constants in `src/data/products.ts` have a legacy Call `tel:+918896332066`; business wants primary Call `tel:+919580882066` while WhatsApp remains `https://wa.me/918896332066`. Review and seek owner confirmation before app-wide modification.
5. `rate-card` displays `transportRate` as ₹/kg and calls a fallback price “live”, whereas real order `transportPrice` can be a per-order amount. Reuse the authoritative existing booking formula and never mislabel transport.
6. Avoid misleading content: `partner-portal` sample bulk prices/orders, `subscriptions` sample plans (including ₹20/kg), `promotions-ui` fake active codes, `inventory-mock` randomly changed pretend stock, `reports-hub` demo report downloads, `loyalty` guessed redeemable rewards, `referral-share` no unique code/link.
7. Do not show public product prices where the owner's product catalogue policy forbids them without explicit approval. External Gemini workflow is prompt-copy, not an in-app video generator.

## Where features belong — keep FIVE bottom tabs

- **Home:** Ice Calculator near quantity and an accurate Rate Card.
- **Categories:** Application-based catalogue filter, preserve existing real products.
- **My Orders:** Regular Supply (subscriptions, informational until scheduler/consent backend).
- **AI Video:** Gemini video-idea prompt/copy action.
- **Profile:** Compact grouped `Help` (support, FAQs, UP service areas); `Rewards & Share` (loyalty, referral, promotions only if approved); `Wholesale Partner` (restricted or clearly informational).
- **Owner Dashboard only:** Inventory and Reports; never expose sample business finance/stock as live and do not add public bottom tab buttons.

## Codex safe execution plan

1. Open separate branch from current v1.0.32 Codex branch. Verify source commit & archive hash.
2. Read every package's `apply_patch.py`, components and original README; rewrite/adapter for current TSX source anchors. Fix both Python substitution defects before any apply.
3. Add features progressively: low-risk customer info tools first, customer read-only views second, owner-only tools third, incentive/pricing/bulk workflows only after owner sign-off and verified backend.
4. Use named Firestore database `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`. Preserve live FCM functions, notification bell, token subscription, v1.0.32 tap/dedup work, staff role security and existing order history.
5. Run lint/TypeScript, calculator tests, CI web+native build, 104 existing notification/regression tests, user/admin authorization smoke tests and UX navigation checks. Ensure installed v1.0.29 remains unchanged.
6. Produce a private signed Android **TEST** APK only after passing checks; report source commit/artifact hash. No release, Firebase writes, billing, hardcoded discounts, inventory movements, subscriptions/mandates or promo redemptions without owner approval.

## Backend scope — future phases only

Original README lists real `stock/{sku}`/auto-reorder; GST invoice/PDF numbering; validated `promos/{code}` and server-side redemption; scheduled `subscriptions/{id}`; authorized `bulkOrders/`; opt-in driver location and ETA; authenticated `?ref=` referral ledger; role-protected owner aggregates; ExpensesView ledger; and user notification preferences. These **are not implemented** by the 14 UI packages.

**No ZIP has been committed to GitHub, no APK built here, and no live production updates made by this handoff.**
