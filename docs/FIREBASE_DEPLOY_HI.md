# Firebase deployment — Hindi owner guide

यह repository live Firebase में deploy नहीं करती। Script पहले अलग staging directory बनाती है। Production deploy से पहले मौजूदा Firestore Rules और indexes का owner द्वारा सत्यापित backup रखें।

## आवश्यक तैयारी

1. Computer पर Node.js 22, Python 3, Firebase CLI और Google Cloud CLI लगाएँ:
   `npm install --global firebase-tools`
2. सही Google account से login करें:
   `firebase login`
   `gcloud auth login`
3. Firebase project name जाँचें:
   `firebase projects:list`
   `gcloud projects describe ankur-dryice-app`
4. Named Firestore database और project की पुष्टि करें:
   `gcloud firestore databases list --project=ankur-dryice-app`
   इसमें `ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673` मौजूद होना चाहिए।
5. Live composite indexes पढ़ें और सुरक्षित रखें:
   `gcloud firestore indexes composite list --project=ankur-dryice-app --database=ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673 --format=json > firestore-composite-indexes-live.json`
   Firebase Console में single-field overrides/TTL भी जाँचें। Deploy के लिए पूरा Firebase CLI format `firestore.indexes.json` चाहिए; केवल composite list पूरी index configuration का विकल्प नहीं है।
6. Google Cloud Console में service account `ankur-feature-suite@ankur-dryice-app.iam.gserviceaccount.com`, named-database access, billing और App Check enforcement जाँचें। Missing IAM/service account के लिए project owner/admin action जरूरी है। Script इन values को बनाती नहीं है।

## Stage बनाना और देखना

Repository root से:

```sh
bash release-readiness/prepare_firebase_deploy.sh prepare
```

यह `release-readiness/firebase-stage` में Functions/Rules source बनाता है और Firebase को नहीं बदलता। `REVIEW.json`, named database, Rules, feature gates और service account configuration की जाँच करें।

Production का मौजूदा पूर्ण `firestore.indexes.json` Firebase CLI format में उपलब्ध हो जाने पर:

```sh
FIREBASE_INDEXES_FILE=/absolute/path/firestore.indexes.json bash release-readiness/prepare_firebase_deploy.sh deploy
```

Deploy command Rules, indexes और staged optional functions deploy करती है। इसे तभी चलाएँ जब stage, Rules diff, index diff, App Check और IAM आप जाँच चुके हों। Functions से कोई real rate, partner amount, promo, loyalty policy, opening stock या SKU seed नहीं होता; नई featureSuite flags default OFF रहती हैं।

Deploy के बाद:
`firebase functions:list --project=ankur-dryice-app`
और Firebase Console में named database की Rules publish time, indexes state और `settings/featureSuite` जाँचें। पहले owner account smoke test करें। Android users को app update चाहिए; Functions deploy से APK अपने आप update नहीं होता।

## Rollback

पहले से ली गई Rules backup को Firebase Console से restore करें; Functions में पिछले verified revision पर rollback करें। Index deploy से पहले/बाद index list compare करें। Rules को कभी खुला `allow read, write: if true` न करें।

**ध्यान दें:** repository में deployable backend review source मौजूद है, पर live Rules/indexes, App Check, IAM और Android device QA यहाँ से सत्यापित नहीं किए जा सके। पूरा production index snapshot दें बिना script deploy mode से रुक जाएगी, ताकि मौजूदा indexes गलती से हटें नहीं।
