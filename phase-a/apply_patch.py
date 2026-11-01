#!/usr/bin/env python3
"""Apply additive Phase A owner-only widgets/CSV/expense grouping after v1.0.32 patch chain.

No changes to OrderForm, OrderTrackingView, notification workers, rules or pricing.
Use on ephemeral extracted source before npm run lint && npm run build.
"""
from pathlib import Path
import shutil

ROOT = Path.cwd()
HERE = Path(__file__).resolve().parent

def add_file(src: str, dst: str):
    target = ROOT / dst
    assert not target.exists(), f"Phase A target already exists: {dst}"
    target.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(HERE / src, target)

add_file('ownerReports.template', 'src/utils/ownerReports.ts')
add_file('expenseCycles.template', 'src/utils/expenseCycles.ts')

# A1 + A2: Reuse already-authorized owner orders snapshot. No new Firestore reads.
path = ROOT / 'src/components/AdminDashboard.tsx'
s = path.read_text()
anchor = "import { ExpensesView } from './ExpensesView';\n"
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + "import { calculateOwnerOverview, downloadOrdersCsv } from '../utils/ownerReports';\n", 1)
anchor = '  const trashedOrders = useMemo(() => orders.filter((o) => !!o.isTrash), [orders]);\n'
assert s.count(anchor) == 1
s = s.replace(anchor, anchor + '''  // Rolling 30-day overview from the same Firestore snapshot as the order list.
  const ownerOverview = useMemo(() => calculateOwnerOverview(activeOrders), [activeOrders]);
''', 1)
anchor = '''      {/* ========================================================================= */}
      {/* SECTION A: नई एंट्री (OWNER-ONLY ORDER ENTRY FORM) */}
'''
assert s.count(anchor) == 1
snippet = '''      {/* PHASE A: read-only 30-day owner overview. No extra Firestore queries. */}
      {activeSection === 'orders' && (
        <section aria-label="पिछले 30 दिन का ऑर्डर सारांश" className="mb-4 border border-slate-200 rounded-2xl bg-sky-50/60 p-3 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-slate-900">पिछले 30 दिन · ओनर ओवरव्यू</h3>
            <button type="button" onClick={() => downloadOrdersCsv(activeOrders)} disabled={loading || !!errorMsg || activeOrders.length === 0}
              className="px-3 py-1.5 rounded-lg bg-sky-700 text-white text-xs font-bold disabled:opacity-50">
              सभी ऑर्डर CSV
            </button>
          </div>
          {loading ? (
            <p className="text-sm text-slate-600" role="status">ऑर्डर का सारांश लोड हो रहा है…</p>
          ) : errorMsg ? (
            <p className="text-sm text-rose-700" role="alert">ऑर्डर लोड नहीं हुए, सारांश उपलब्ध नहीं है।</p>
          ) : (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  ['ऑर्डर', ownerOverview.recentOrders.toLocaleString('en-IN')],
                  ['पेंडिंग', ownerOverview.pendingOrders.toLocaleString('en-IN')],
                  ['भेजे गए', ownerOverview.dispatchedOrders.toLocaleString('en-IN')],
                  ['अनुमानित ऑर्डर मूल्य', `₹${ownerOverview.estimatedOrderValue.toLocaleString('en-IN')}`],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-xl bg-white border border-slate-200 p-2.5">
                    <p className="text-[11px] text-slate-500 font-semibold">{label}</p>
                    <p className="text-base font-black text-slate-900 tabular-nums">{value}</p>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-600">सिर्फ पिछले 30 दिन के गैर-ट्रैश ऑर्डर। अनुमानित मूल्य में रद्द ऑर्डर शामिल नहीं; यह प्राप्त भुगतान नहीं है।
                {ownerOverview.undatedOrders > 0 ? ` ${ownerOverview.undatedOrders} बिना तारीख वाले ऑर्डर इस सारांश में नहीं जोड़े गए।` : ''}
              </p>
              {ownerOverview.recentOrders === 0 && <p className="text-xs text-slate-600">इस अवधि में कोई ऑर्डर नहीं मिला।</p>}
            </>
          )}
        </section>
      )}

'''
s = s.replace(anchor, snippet + anchor, 1)
# Use the existing PDF click handler as a stable anchor; labels can vary by UI version.
pdf_click = 'onClick={() => generateMonthlyPDF(activeOrders, expenses)}'
assert s.count(pdf_click) == 1, 'Existing insights PDF button not found'
end_button = s.index('</button>', s.index(pdf_click)) + len('</button>')
s = s[:end_button] + '''
          <button type="button" onClick={() => downloadOrdersCsv(activeOrders)} disabled={loading || !!errorMsg || activeOrders.length === 0}
            className="ml-2 bg-sky-700 text-white p-2 rounded disabled:opacity-50">
            ऑर्डर CSV (Excel / Sheets)
          </button>''' + s[end_button:]
path.write_text(s)

# A3: preserve existing owner-only expenses writes and add monthly view.
path = ROOT / 'src/components/ExpensesView.tsx'
assert 'export const ExpensesView' in path.read_text()
path.write_text((HERE / 'ExpensesView.template').read_text())

# A4: defensive checks that no customer flow or price source was touched.
for protected in ['src/components/OrderForm.tsx', 'src/components/OrderTrackingView.tsx', 'src/hooks/useOrderNotifications.ts', 'firestore.rules', 'src/data/rates.ts']:
    assert (ROOT / protected).exists(), f"Protected app file missing: {protected}"
print('PASS Phase A only: owner overview + real CSV + monthly expenses. No new collections/rules, no customer/price changes.')