#!/usr/bin/env python3
"""Owner v1.0.48: visual-only balanced dashboard + staff call-only contact UX.

Preserve all 7 owner sections, all order handlers, Firestore rules, rate settings,
order/payment logic and customer data. Staff phone masking is PRESENTATION ONLY.
It does not solve Firestore staff read access to raw customer phone values.
"""
from pathlib import Path

def once(s, old, new, label):
    assert s.count(old)==1, f"{label}: expected one anchor; found {s.count(old)}"
    return s.replace(old,new,1)

p=Path('src/components/AdminDashboard.tsx')
s=p.read_text(encoding='utf-8')
s=once(s,
  '<div className="max-w-5xl mx-auto py-3 px-3 sm:px-6 bg-white text-slate-900 min-h-screen">',
  '<div className="ankur-owner-premium max-w-5xl mx-auto py-3 px-3 sm:px-6 bg-white text-slate-900 min-h-screen">',
  'owner root')
s=once(s,
  '<div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-200">',
  '<div className="ankur-owner-header flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-200">',
  'owner hero header')
s=once(s,
  '<span>अंकुर सिंह — मालिक डैशबोर्ड</span>',
  '<span>OWNER CONTROL CENTER · मालिक डैशबोर्ड</span>',
  'owner heading eyebrow')
s=once(s,
  '<div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 border-b border-slate-200 pb-2.5">',
  '<nav aria-label="Owner dashboard sections" className="ankur-owner-nav grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 border-b border-slate-200 pb-2.5">',
  'owner tab menu start')
# Close navigation using the next structural comment, no controls removed.
s=once(s,
  """        </button>
      </div>

      {/* Alerts */}""",
  """        </button>
      </nav>

      {/* Alerts */}""",
  'owner tab menu end')
for key in ('new-entry','orders','insights','expenses','users','storefront','ai-chat'):
    before=f"          onClick={{() => setActiveSection('{key}')}}"
    after=f"          aria-pressed={{activeSection === '{key}'}}\n"+before
    s=once(s,before,after,f'owner tab {key} selected')
s=once(s,
  '<section aria-label="पिछले 30 दिन का ऑर्डर सारांश" className="mb-4 border border-slate-200 rounded-2xl bg-sky-50/60 p-3 space-y-2">',
  '<section aria-label="पिछले 30 दिन का ऑर्डर सारांश" className="ankur-owner-overview mb-4 border border-slate-200 rounded-2xl bg-sky-50/60 p-3 space-y-2">',
  'owner summary')
s=once(s,
  '<div className="grid grid-cols-2 sm:grid-cols-4 gap-2">\n                {[\n                  [\'ऑर्डर\'',
  '<div className="ankur-owner-kpis grid grid-cols-2 sm:grid-cols-4 gap-2">\n                {[\n                  [\'ऑर्डर\'',
  'owner kpi grid')
for ident in ("'new-entry'","'orders'","'insights'","'expenses'","'users'","'storefront'","'ai-chat'"):
    assert "setActiveSection("+ident+")" in s, "Missing owner section "+ident
for section in ('<ExpensesView />','<UserManagement />','<OwnerStorefrontManager />','<AIChat'):
    assert section in s, "Existing owner functionality must stay: "+section
assert "downloadOrdersCsv(activeOrders)" in s and "setIsRateModalOpen(true)" in s
p.write_text(s,encoding='utf-8')

staff=Path('src/components/StaffDashboard.tsx')
s=staff.read_text(encoding='utf-8')
s=once(s,'  MessageCircle,\n','', 'remove staff WhatsApp icon: no static WhatsApp URL')
s=once(s,"        const phoneMatch = (ord.customerPhone || '').includes(q);\n",'','do not search by customer mobile')
s=once(s,
  'if (!idMatch && !nameMatch && !phoneMatch && !cityMatch) {',
  'if (!idMatch && !nameMatch && !cityMatch) {',
  'no phone search')
open_anchor='                    {ord.customerPhone && (\n'
start=s.index(open_anchor)
end=s.index('                    )}\n',start)+len('                    )}\n')
old=s[start:end]
assert 'href={`tel:' in old and 'href={`https://wa.me/' in old
assert '<span>कॉल: {ord.customerPhone}</span>' in old
new="""                    {ord.customerPhone && (
                      <div className="flex items-center gap-2 mt-2" aria-label="Customer contact restricted">
                        <button
                          type="button"
                          onClick={() => {
                            // One explicit tap opens the phone dialer for only this order.
                            // Phone data is NOT displayed in staff list or DOM attributes.
                            const digits = (ord.customerPhone || '').replace(/[^0-9]/g, '').slice(-10);
                            if (digits.length !== 10) {
                              setErrorMsg('इस ऑर्डर का संपर्क नंबर सही नहीं है।');
                              return;
                            }
                            window.location.href = `tel:+91${digits}`;
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white border border-emerald-700 text-xs font-bold hover:bg-emerald-700 transition-colors"
                          aria-label={`ऑर्डर ${shortId} के ग्राहक को कॉल करें`}
                        >
                          <Phone className="w-4 h-4" aria-hidden="true" />
                          <span>कॉल करें</span>
                        </button>
                        <span className="text-[11px] text-slate-500" aria-label="Customer number hidden">
                          ग्राहक नंबर छिपा है
                        </span>
                      </div>
                    )}
"""
s=s[:start]+new+s[end:]
assert "phoneMatch" not in s and "wa.me" not in s
assert "कॉल: {ord.customerPhone}" not in s
assert "window.location.href = `tel:+91${digits}`" in s
assert "subscribeOrderDocuments(" in s, "Do not break staff order listener"
assert "handleUpdateStatus" in s, "Do not break order status update"
staff.write_text(s,encoding='utf-8')
style=Path("ui-fixes/owner-premium-v148.css")
assert style.exists()
css=Path("src/index.css")
orig=css.read_text(encoding='utf-8')
assert 'ANKUR OWNER PREMIUM v1.0.48' not in orig
css.write_text(orig+'\n'+style.read_text(encoding='utf-8'),encoding='utf-8')
print("PASS: all seven owner sections retained, premium owner visual scope, staff phones hidden from UI and search; actual backend phone privacy is NOT implemented")
