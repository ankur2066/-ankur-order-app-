#!/usr/bin/env python3
"""Apply App Check overlay to extracted Phase 15 source. NO Firebase deployment.

The source ZIP is immutable in this workflow; overlay files in app-check/
are version controlled on the working branch and applied before npm ci.
"""
from pathlib import Path
import shutil

source = Path("src")
assert (source / "App.tsx").is_file(), "Source ZIP was not extracted"
overlay = Path("app-check/appCheck.ts")
assert overlay.is_file(), "Native App Check overlay is missing"
assert not (source / "appCheck.ts").exists(), "Refusing to overwrite existing App Check source"
shutil.copyfile(overlay, source / "appCheck.ts")

firebase = source / "firebase.ts"
text = firebase.read_text(encoding="utf-8")
old = "const app = initializeApp(firebaseConfig);"
assert text.count(old) == 1, "Unexpected Firebase initialization"
text = text.replace(old, "export const app = initializeApp(firebaseConfig);")
eager = """if (typeof window !== 'undefined') {
  testConnection();
}
"""
assert text.count(eager) == 1, "Unexpected eager Firebase network test"
text = text.replace(eager, "// Network requests start only after App Check bootstrap in main.tsx.\n")
firebase.write_text(text, encoding="utf-8")

entry = source / "main.tsx"
text = entry.read_text(encoding="utf-8")
assert "initializeAndroidAppCheck" not in text, "App Check already inserted"
text = text.replace("import App from './App.tsx';", 
                    "import App from './App.tsx';\n"
                    "import { app } from './firebase';\n"
                    "import { initializeAndroidAppCheck } from './appCheck';", 1)
old = "createRoot(document.getElementById('root')!).render(<App />);"
assert text.count(old) == 1, "Unexpected root render entrypoint"
new = """async function startApp() {
  try {
    await initializeAndroidAppCheck(app);
  } catch (error) {
    // Keep normal ordering/reading available, but fail closed for Self Pickup.
    // NEVER log or expose App Check tokens.
    console.warn('Android App Check unavailable; Self Pickup disabled:', error);
  }
  createRoot(document.getElementById('root')!).render(<App />);
}

void startApp();"""
text = text.replace(old, new)
entry.write_text(text, encoding="utf-8")

dashboard = source / "components/StaffDashboard.tsx"
text = dashboard.read_text(encoding="utf-8")
assert "isAndroidAppCheckReady" not in text, "App Check already inserted in StaffDashboard"
needle = "import { getApp } from 'firebase/app';"
assert text.count(needle) == 1
text = text.replace(needle, needle + "\nimport { isAndroidAppCheckReady } from '../appCheck';")
needle = "    if (!user || !canUpdate || updatingId) return;"
assert text.count(needle) == 1
text = text.replace(needle, needle + """
    // Web is not yet App Check-registered; native attestation is required
    // for this server-authoritative callable. This does not block other tasks.
    if (!isAndroidAppCheckReady()) {
      setErrorMsg('Self Pickup के लिए App Check सत्यापित Android ऐप चाहिए। बाकी काम जारी रख सकते हैं।');
      return;
    }""")
dashboard.write_text(text, encoding="utf-8")
print("PASS: Android App Check native-to-JS token bridge, safe startup and Self Pickup fail-closed guard applied")
