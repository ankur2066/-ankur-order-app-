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
print(f"PASS: Firebase callable targets configured named Firestore database: {database_id}")
print("NOTE: client App Check must be configured and verified before deployment.")
