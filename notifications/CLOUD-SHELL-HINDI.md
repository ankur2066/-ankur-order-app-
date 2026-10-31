# बिना Codex desktop के शुरुआती live metadata जाँच

यह छोटा Python helper आपके Google Cloud Shell में आपके मौजूदा खाते की पहुँच
से चलता है। यह Firebase plugin को connect नहीं करता और पूरी live FCM जाँच
का प्रमाण नहीं है। इसे अभी किसी live Firebase खाते पर चलाकर सत्यापित नहीं किया गया है।

## फोन के ब्राउज़र से चलाएँ

1. इसी folder का [`live_readonly_audit.py`](live_readonly_audit.py) खोलें और
   GitHub का **Download raw file** विकल्प इस्तेमाल करके फोन में डाउनलोड करें।
2. Chrome में [Google Cloud Shell](https://shell.cloud.google.com) खोलें।
   Ankur Firebase project वाले मौजूदा Google खाते से sign in करें। Cloud Shell
   आपके Google credentials इस्तेमाल करने की अनुमति माँगे तो उसी खाते को
   authorize करें। अगर छोटे पर्दे पर terminal ठीक न दिखे तो Chrome का
   **Desktop site** विकल्प आजमाएँ। मोबाइल पर browser UI काम करेगा, यह यहाँ
   सत्यापित नहीं है; किसी desktop app को install करने की जरूरत नहीं है।
3. Cloud Shell terminal के menu से **Upload file** चुनकर डाउनलोड किया हुआ
   `live_readonly_audit.py` अपलोड करें।
4. terminal में यह command चलाएँ:

   ```sh
   python3 live_readonly_audit.py > ankur-live-report.json
   cat ankur-live-report.json
   ```

`ankur-live-report.json` का text वापस chat में भेजें। रिपोर्ट केवल चुने हुए
metadata fields दिखाती है; token, API key, billing account number, raw Rules
source और Functions environment variables उसमें नहीं होते। किसी authentication
error का raw terminal dump या access token भेजने की जरूरत नहीं है।

यदि रिपोर्ट में `authorize_existing_account_in_cloud_shell` आए, तो Cloud Shell
में मौजूदा खाते का authorization पूरा करके दोबारा चलाएँ। यदि किसी section में
`unavailable`, `partial` या HTTP `403` आए, तो वह जाँच अधूरी है। उसे खाली Functions,
बंद billing या सफल FCM का प्रमाण न मानें। Script APIs enable नहीं करती और
permission errors अपने आप ठीक नहीं करती।

## क्या पढ़ा जाएगा

- Accessible Firebase projects की गिनती और उनमें source project का मिलना।
- Source project ID `ankur-dryice-app` और number `928793147689` का मिलान। गलत
  target मिलने पर आगे resource reads रोक दिए जाते हैं।
- केवल named database
  `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673` का metadata।
- v1/v2 Functions के चुने हुए deployment/trigger fields। Unreachable regions और
  अधूरी pagination को अधूरा ही दर्ज किया जाता है।
- उसी named database की exact Rules release और source का SHA-256। Push collection
  का नाम source में होना केवल उल्लेख है, authorization सही होने का प्रमाण नहीं।
- मौजूदा Android package `com.ankurdryice.events` से matching app की गिनती।
- Billing enabled होने का boolean और FCM API का service state। यह Spark/Blaze
  plan, लागत या FCM send permission की स्वतंत्र पुष्टि नहीं है।

Script सिर्फ तय Google API paths पर HTTPS **GET** भेजती है। Redirects follow
नहीं करती; orders/customer documents नहीं पढ़ती; कोई Functions call, FCM send,
deployment, API enablement, billing update, project/app creation या live write
नहीं करती। केवल stdout report बनती है; ऊपर का shell redirect उसे आपके Cloud
Shell में local file में रखता है।

## क्या अभी भी बाकी रहेगा

Firebase plugin connection, live Rules का पूरा diff/authorization audit,
IAM/App Check, delivery logs, वास्तविक Spark/Blaze plan और लागत, तथा फोन पर
foreground/background/closed-app receipt की जाँच। Production deployment और
billing बदलाव से पहले owner की स्पष्ट मंजूरी जरूरी रहेगी। पुरानी APK को
rebuild या reinstall करने का कोई कदम इस helper में नहीं है।

Official API references:
[Projects](https://firebase.google.com/docs/reference/firebase-management/rest/v1beta1/projects/list),
[Database](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases/get),
[Functions](https://docs.cloud.google.com/functions/docs/reference/rest/v2/projects.locations.functions/list),
[Rules releases](https://firebase.google.com/docs/reference/rules/rest/v1/projects.releases/list),
[Billing information](https://docs.cloud.google.com/billing/docs/reference/rest/v1/projects/getBillingInfo).
