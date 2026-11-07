#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PROJECT="ankur-dryice-app"
DATABASE="ai-studio-ankurdryiceorder-f4d89318-c640-47a5-a9f7-98543eff2673"
OUT="${FIREBASE_STAGE_DIR:-$ROOT/release-readiness/firebase-stage}"
MODE="${1:-prepare}"

command -v python3 >/dev/null
command -v firebase >/dev/null || { echo "Install Firebase CLI first: npm install --global firebase-tools"; exit 2; }
test "$MODE" = "prepare" || test "$MODE" = "deploy" || { echo "Usage: $0 [prepare|deploy]"; exit 2; }
test ! -e "$OUT" || { echo "Stage path already exists; choose FIREBASE_STAGE_DIR or remove it after review: $OUT"; exit 2; }

python3 "$ROOT/all-features/backend/stage.py" --output "$OUT"
python3 - "$OUT" "$DATABASE" <<'PY'
import json,sys
from pathlib import Path
out=Path(sys.argv[1]); database=sys.argv[2]
config=json.loads((out/'firebase.json').read_text())
assert config['firestore'][0]['database']==database
assert config['functions'][0]['source']=='functions'
assert (out/'functions'/'index.mjs').is_file()
assert (out/'firestore.rules').is_file()
(out/'REVIEW.json').write_text(json.dumps({
  'projectId':'ankur-dryice-app',
  'database':database,
  'deploymentApproved':False,
  'featureDefaults':'off until owner sets settings/featureSuite.features',
  'liveIndexesReadBack':False,
  'requiredIndexFile':'firestore.indexes.json from the owner-verified production index export'
},indent=2)+'\n')
PY

if [ "$MODE" = "prepare" ]; then
  echo "Prepared review-only Functions and Rules at $OUT"
  echo "Before deploy, add the complete verified production firestore.indexes.json to this stage."
  echo "Review $OUT/REVIEW.json and docs/FIREBASE_DEPLOY_HI.md."
  exit 0
fi

INDEXES="${FIREBASE_INDEXES_FILE:-}"
test -n "$INDEXES" && test -s "$INDEXES" || { echo "Set FIREBASE_INDEXES_FILE to the complete, reviewed Firebase firestore.indexes.json. No live index snapshot is included in this repository."; exit 2; }
python3 - "$OUT" "$INDEXES" <<'PY'
import json,sys
from pathlib import Path
out=Path(sys.argv[1]); source=Path(sys.argv[2])
data=json.loads(source.read_text())
assert isinstance(data.get('indexes'),list) and isinstance(data.get('fieldOverrides'),list)
(out/'firestore.indexes.json').write_text(json.dumps(data,indent=2)+'\n')
config=json.loads((out/'firebase.json').read_text())
config['firestore'][0]['indexes']='firestore.indexes.json'
(out/'firebase.json').write_text(json.dumps(config,indent=2)+'\n')
PY
(
  cd "$OUT/functions"
  npm install --no-audit --no-fund
)
firebase use "$PROJECT"
firebase deploy --project "$PROJECT" --config "$OUT/firebase.json" --only firestore:rules,firestore:indexes,functions
