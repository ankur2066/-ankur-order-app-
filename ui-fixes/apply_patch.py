#!/usr/bin/env python3
"""Apply optional Ice Blue theme and Android monthly-report fix to extracted source.

Run after app-check/apply_patch.py; never edit live Firebase or the original ZIP.
"""
from pathlib import Path
import shutil

src = Path("src")
assert (src/"components/AdminDashboard.tsx").is_file(), "Source ZIP not extracted"
for filename in ("monthlyReport.ts", "mobileReport.ts"):
    target = src/"utils"/filename
    assert not target.exists(), "Refusing to overwrite existing " + filename
    shutil.copyfile(Path("ui-fixes")/filename, target)

# Replace legacy monthly PDF routine with tested import/function API.
p = src/"components/AdminDashboard.tsx"
s = p.read_text(encoding="utf-8")
legacy = s.index("function generateMonthlyPDF(")
following = s.index("// Format date into Asia/Kolkata", legacy)
assert s.count("function generateMonthlyPDF(") == 1
s = s[:legacy] + s[following:]
s = s.replace("import 'jspdf-autotable';", "import { generateMonthlyPDF } from '../utils/monthlyReport';", 1)
s = s.replace("import jsPDF from 'jspdf';", "", 1)
anchor = "  const [expenses, setExpenses] = useState<any[]>([]);"
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + "\n  const [monthlyReportBusy, setMonthlyReportBusy] = useState(false);\n  const [monthlyReportError, setMonthlyReportError] = useState('');", 1)
old = """            onClick={() => generateMonthlyPDF(activeOrders, expenses)}
            className="bg-emerald-600 text-white p-2 rounded"
          >
            मासिक रिपोर्ट डाउनलोड करें
          </button>"""
assert s.count(old) == 1, "Expected monthly download button not found"
new = """            onClick={async () => {
              setMonthlyReportBusy(true);
              setMonthlyReportError('');
              try {
                await generateMonthlyPDF(activeOrders, expenses);
              } catch (err) {
                const detail = err instanceof Error ? err.message : String(err);
                setMonthlyReportError('रिपोर्ट डाउनलोड नहीं हुई: ' + detail);
              } finally {
                setMonthlyReportBusy(false);
              }
            }}
            disabled={monthlyReportBusy}
            className="bg-emerald-700 text-white px-4 py-3 rounded-xl font-bold disabled:opacity-60"
          >
            {monthlyReportBusy ? 'मासिक रिपोर्ट बन रही है...' : 'मासिक रिपोर्ट PDF डाउनलोड / शेयर करें'}
          </button>
          <p className="text-xs text-slate-600">रिपोर्ट की अवधि: हर महीने 15 तारीख से अगले महीने की 14 तारीख। Android पर PDF सेव/शेयर का विकल्प खुलेगा।</p>
          {monthlyReportError && <p role="alert" className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg p-2">{monthlyReportError}</p>}"""
s = s.replace(old, new, 1)
p.write_text(s, encoding="utf-8")

# Add a choice, not a forced global switch: owners can select in Store / Theme.
p = src/"types.ts"
s = p.read_text(encoding="utf-8")
old = "'royal-blue' | 'purple' | 'dark'"
assert s.count(old) == 1
p.write_text(s.replace(old,"'royal-blue' | 'purple' | 'ice-blue' | 'dark'",1), encoding="utf-8")

p = src/"theme/themes.ts"
s = p.read_text(encoding="utf-8")
scale = "const ICE = ['#EFFBFF', '#DDF6FF', '#B6EAF8', '#84D5EA', '#4DB9D7', '#158DB6', '#08749B', '#085D7D', '#104A67', '#103A54', '#0A2639'];\n\n"
assert "const LIGHT_SURFACES" in s
s = s.replace("const LIGHT_SURFACES", scale + "const LIGHT_SURFACES",1)
theme = """  {
    id: 'ice-blue',
    label: 'Ice Blue Professional',
    hindi: 'आइस ब्लू',
    swatch: '#08749B',
    isDark: false,
    themeColor: '#08749B',
    vars: {
      ...accentScale(ICE),
      '--app-bg': '#F4FAFD',
      '--card-bg': '#FFFFFF',
      '--text-main': '#142C3D',
      '--text-sub': '#486274',
      '--line': '#D5E6ED',
      '--brand': '#08749B',
      '--brand-deep': '#085D7D',
      '--brand-soft': '#E5F6FC',
      '--brand-ink': '#104A67',
      '--on-brand': '#FFFFFF',
      '--hero-1': '#176F92',
      '--hero-2': '#10344C',
    },
  },
"""
needle = "  {\n    id: 'dark',"
assert s.count(needle) == 1
p.write_text(s.replace(needle,theme+needle,1),encoding="utf-8")

css = """
/* Ice Blue Professional (owner-selectable, never forced by a release). */
html[data-theme='ice-blue'] body { background-color: #F4FAFD; color: #142C3D; }
html[data-theme='ice-blue'] .bg-slate-50 { background-color: #F1F8FB; }
html[data-theme='ice-blue'] .bg-slate-100 { background-color: #E8F3F8; }
html[data-theme='ice-blue'] .border-slate-200 { border-color: #D5E6ED; }
html[data-theme='ice-blue'] .text-slate-500 { color: #506679; }
html[data-theme='ice-blue'] .text-slate-400 { color: #63798B; }
html[data-theme='ice-blue'] input::placeholder,
html[data-theme='ice-blue'] textarea::placeholder { color: #5C7183; }
html[data-theme='ice-blue'] .bg-orange-500,
html[data-theme='ice-blue'] .bg-orange-600 { background-color: #08749B; }
html[data-theme='ice-blue'] .border-orange-500 { border-color: #08749B; }
html[data-theme='ice-blue'] .text-orange-500,
html[data-theme='ice-blue'] .text-orange-600 { color: #08618A; }
"""
p=src/"index.css"
s=p.read_text(encoding="utf-8")
assert "Ice Blue Professional" not in s
p.write_text(s+"\n"+css,encoding="utf-8")
# Exclude repository-only patch templates (which are copied into src/utils/) from TS compilation.
# Without this, the original ui-fixes/monthlyReport.ts has imports relative to the wrong folder.
import json
tsconfig_path = Path("tsconfig.json")
tsconfig = json.loads(tsconfig_path.read_text(encoding="utf-8"))
excluded = tsconfig.setdefault("exclude", [])
assert isinstance(excluded, list)
if "ui-fixes/**/*" not in excluded:
    excluded.append("ui-fixes/**/*")
tsconfig_path.write_text(json.dumps(tsconfig, indent=2), encoding="utf-8")
print("PASS: Mobile PDF share flow and optional Ice Blue theme applied; no Firestore settings changed")
