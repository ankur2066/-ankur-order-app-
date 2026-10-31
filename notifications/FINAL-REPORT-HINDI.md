# Issue #11 — Ankur Dryice notification काम की एकत्र रिपोर्ट

मौजूदा Ankur Dryice Android app पर PR #9/#10 का notification code आगे बढ़ाया गया है। पुराने signed v1.0.29 APK को बदले बिना approved Firebase backend live है। Client की अलग समस्याओं के सुधार v1.0.30 के private review candidate में हैं; installed app को अपने-आप update नहीं किया गया है।

## Live backend और वास्तविक test

| काम | प्रमाणित स्थिति |
| --- | --- |
| सही Firebase project/database | `ankur-dryice-app`, named DB `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673`; `(default)` release सुरक्षित |
| Security/registration Rules | मालिक की मंजूरी के बाद live; profile role escalation बंद, private device registrations और existing staff permission semantics verify |
| तीन notification Functions | Singapore में `orderpush` codebase के तीनों ACTIVE; exact database filters, reviewed source ZIP, keyless सीमित IAM, no public Run invoker verify |
| Direct owner TEST | FCM accepted; मालिक ने फोन पर मिलने की पुष्टि की |
| असली Firestore → Function → FCM | New order, order status, payment, pickup completion, pickup reversal: **5/5 paths; हर बार sent 1, failed 0** |
| TEST cleanup | केवल मंजूर synthetic fixtures बनाए/हटाए; order, tracking और temporary subscription absent verify; पुराने business records पर writes/deletes 0 |
| Billing | मंजूर existing INR billing account से Blaze link; ₹500 monthly **alert**, खर्च की hard limit नहीं |

Runtime tests में एक logical TEST order ID था। Logging quota interruption के बाद उसी fixture को trash-marked करके केवल pickup undo फिर जाँचा गया; दोनों cycles के temporary records साफ हैं। पाँच अलग event IDs और पाँच send summaries मिले। Test के customer subscription में owner का वही device token इस्तेमाल हुआ; इसे अलग customer phone का प्रमाण नहीं माना गया है।

[Deployment/current live details](live-review/DEPLOYMENT-STATUS-HINDI.md), [Function verification](live-review/LIVE-PUSH-VERIFICATION.json), [owner phone confirmation](live-review/OWNER-PUSH-TEST-RECEIPT.json), [five event paths/cleanup](live-review/SYNTHETIC-ORDER-TEST-RECEIPT.json), [Rules receipt](live-review/RULES-DEPLOYMENT-RECEIPT.json), [billing receipt](live-review/BILLING-STAGE-RECEIPT.json)।

## Client fixes — अलग review build में

- Empty local cache के बाद आए पुराने server orders को नया order बताने वाले alerts रोके।
- Firestore/FCM foreground pair और repeated native receipt/tap की duplicate notice रोकने के लिए metadata/event IDs जोड़े; वास्तविक बाद का status transition बचा रहता है।
- Background notification tap का message existing notification sheet में जोड़ा।
- User और permission scope के अनुसार notification cache अलग; पुराने cache को disk से नहीं हटाया।
- नए guest order पर tracking तुरन्त शुरू; signed-in customer के recent orders का discovery; newest eight subscriptions चुनना और stale account query रोकना।
- Staff header में notification bell जोड़ी।

[Implementation/test details](client-fixes/README.md)। सुधार app source की disposable extraction पर लागू हैं। Forms, pricing, business workflow, source ZIP और live backend में इन client fixes से बदलाव नहीं होता।

## Build और release प्रमाण

- **90/90 checks पास:** existing backend/Rules/safeguards 75 + actual React/native client integration 15। Real Firebase SDK package/stage smoke, web build और Android native compilation भी सफल। [Verification run](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41250393668)।
- **v1.0.30, versionCode 30 signed review APK तैयार।** [सफल signed build](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41250393968) और [private APK ZIP download](https://github.com/ankur2066/-ankur-order-app-/actions/runs/41250393968/artifacts/13061042404)। ZIP में APK और checksum हैं; GitHub login आवश्यक हो सकता है। Artifact 14 नवंबर 2026 तक उपलब्ध है।
- Downloaded ZIP का SHA-256 GitHub artifact digest से और APK का SHA-256 CI checksum से मेल खाता है। APK खोलकर वास्तविक package `com.ankurdryice.events`, version `1.0.30`/30, पुराना signing certificate, native Push plugin, permission और सही Firebase project/sender/app resources verify किए। CI `apksigner` signature verification सफल है।
- New APK SHA-256: `ca3487390af9e1ed8d507d65d51dc7957357fe719a83db10cb5b92b6baa65d85`।
- Source commit `3b8fdc9b54dbbe7fb4b9691e055705f5acd7189d`; [candidate receipt](live-review/CLIENT-CANDIDATE-RECEIPT.json)। Installed v1.0.29 को update/reinstall नहीं किया गया। Candidate को publish या production deploy नहीं किया गया।
- [Draft PR #12](https://github.com/ankur2066/-ankur-order-app-/pull/12) में code और review evidence हैं; merge नहीं किया गया।

## जो physical/release प्रमाण अभी बाकी हैं

1. पाँच order-event alerts की अलग phone receipt confirmation अभी नहीं मिली है। सीधे TEST का receipt confirmed है।
2. अलग customer और permitted staff के Android फोन पर foreground/background/closed-app test शेष है। New candidate की no-duplicate UI और background-tap behavior integration tests में पास होने के बाद भी physical verification चाहिए।
3. Existing `changeSelfPickup` callable इस approved तीन-trigger deployment का हिस्सा नहीं था। Pickup observer पर synthetic event सफल होना वास्तविक pickup button/callable workflow live होने का प्रमाण नहीं है।
4. पुराने app की transport-total/schema सीमा notification scope में बदली नहीं गई; prices/business logic सुरक्षित रखे गए हैं।

इसलिए Issue #11/PR #12 को पूर्ण released/closed नहीं कहा गया है। Candidate publish/install, कोई चौथा Function या अगला production/billing बदलाव स्वतः नहीं किया गया।

## सुरक्षित रखी गई चीजें

पुरानी APK SHA-256 `8dfee1388083016dca29a280cf0f1e2bd484e53fc9c2f9ddca994d919999587f`।

Original source ZIP git blob `7e790aa79f80db6bd93fdf5d04db4209772047aa`। Android package `com.ankurdryice.events` और existing signing certificate सुरक्षित हैं। कोई existing customer/order record नहीं बदला या हटाया गया। Rules/billing/तीन Functions और synthetic fixture tests अलग-अलग मिली मंजूरी के अनुसार हुए हैं।

पहले metadata audit में official MCP ने Cloud Billing API अनचाहे enable किया था; उसे restore करके बताया गया था। बाद की billing/API activation और deployment अलग explicit approvals पर किए गए। Historical audit documents उस पहले चरण की snapshot हैं; वर्तमान receipts और यह रिपोर्ट बाद की स्थिति बताते हैं।
