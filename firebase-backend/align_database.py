#!/usr/bin/env python3
"""Pre-deployment safety patch. Align the callable with the web app's named Firestore DB.

Run from extracted Phase 15 source root. This does NOT deploy Firebase.
"""
import json
import re
from pathlib import Path

config = json.loads(Path("firebase-applet-config.json").read_text(encoding="utf-8"))
database_id = config.get("firestoreDatabaseId")
assert isinstance(database_id, str) and re.fullmatch(r"[a-zA-Z0-9_-]{4,128}", database_id), (
    "Missing or invalid Firestore database ID; do not fall back to (default)"
)
source = Path("firebase-functions/index.js")
text = source.read_text(encoding="utf-8")
original = "initializeApp();\nconst db = getFirestore();"
replacement = (
    "const firebaseApp = initializeApp();\n"
    f"const db = getFirestore(firebaseApp, {json.dumps(database_id)});"
)
if original in text:
    text = text.replace(original, replacement, 1)
elif replacement not in text:
    raise SystemExit("Unexpected Firebase Functions source. Refusing unsafe automatic patch.")
assert "enforceAppCheck: true" in text, "App Check protection must not be weakened"
assert "runTransaction" in text and "pickup_audit" in text, "Pickup authorization/audit missing"
source.write_text(text, encoding="utf-8")

# Firebase CLI rules must use the SAME named database, not (default).
# This prepares files only; never deploy automatically.
cli_config_path = Path("firebase.json")
cli_config = json.loads(cli_config_path.read_text(encoding="utf-8"))
firestore = cli_config.get("firestore")
assert isinstance(firestore, dict) and firestore.get("rules") == "firestore.rules", (
    "Unexpected Firestore CLI configuration; refusing automatic modification"
)
firestore["database"] = database_id
cli_config_path.write_text(json.dumps(cli_config, indent=2) + "\n", encoding="utf-8")
assert cli_config["firestore"]["database"] == database_id
print(f"PASS: Firebase callable and rules config target named Firestore database: {database_id}")
print("NOTE: client App Check must be configured and verified before deployment.")
