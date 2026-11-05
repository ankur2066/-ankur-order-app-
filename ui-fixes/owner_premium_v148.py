#!/usr/bin/env python3
"""v1.0.48: owner-only premium layout refinement; existing functionality stays.

No routes, actions, order financial calculations, Firestore security or
owner/staff permission wiring is removed or changed.
"""
from pathlib import Path
p=Path("src/components/AdminDashboard.tsx")
s=p.read_text(encoding="utf-8")
changes=[
 ('<div className="max-w-5xl mx-auto py-3 px-3 sm:px-6 bg-white text-slate-900 min-h-screen">',
  '<div className="ankur-owner-dashboard max-w-5xl mx-auto py-3 px-3 sm:px-6 text-slate-900 min-h-screen">'),
 ('<div className="flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-200">',
  '<div className="ankur-owner-masthead flex flex-wrap items-center justify-between gap-2.5 pb-3 mb-3 border-b border-slate-200">'),
 ('          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">\n            Ankur Dryice and Events',
  '          <span className="ankur-owner-kicker">BUSINESS COMMAND CENTER</span>\n          <h2 className="text-lg sm:text-2xl font-black text-slate-900 leading-tight">\n            Ankur Dryice and Events'),
 ('<div className="grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 border-b border-slate-200 pb-2.5">',
  '<nav aria-label="मालिक डैशबोर्ड के सभी सेक्शन" className="ankur-owner-nav grid grid-cols-3 gap-1.5 sm:gap-2 mb-4 border-b border-slate-200 pb-2.5">'),
 ('      {/* Alerts */}', '      {/* Alerts */}'),
 ('<section aria-label="पिछले 30 दिन का ऑर्डर सारांश" className="mb-4 border border-slate-200 rounded-2xl bg-sky-50/60 p-3 space-y-2">',
  '<section aria-label="पिछले 30 दिन का ऑर्डर सारांश" className="ankur-owner-overview mb-4 border border-slate-200 rounded-2xl bg-sky-50/60 p-3 space-y-2">')
]
for before,after in changes:
    if before==after:continue
    assert s.count(before)==1,(before[:90],s.count(before))
    s=s.replace(before,after,1)
# Navigation is structurally seven buttons; close the semantic <nav>.
a=s.index('<nav aria-label="मालिक डैशबोर्ड के सभी सेक्शन"')
b=s.index('      {/* Alerts */}',a)
segment=s[a:b]
assert segment.count('<button')==7 and segment.rstrip().endswith('</div>')
start_of_last=segment.rfind('      </div>')
assert start_of_last>=0
segment=segment[:start_of_last]+'      </nav>'+segment[start_of_last+len('      </div>'):]
s=s[:a]+segment+s[b:]
assert s.count('ankur-owner-nav')==1 and s.count('ankur-owner-masthead')==1
for needed in ["'new-entry'","'orders'","'insights'","'expenses'","'users'","'storefront'","'ai-chat'","<OwnerStorefrontManager","<UserManagement","<ExpensesView","<AIChat"]:
    assert needed in s,needed
p.write_text(s,encoding="utf-8")

# Keep Android 15+ system bars outside the WebView using Capacitor's own
# inset handling, rather than guessing status-bar heights in CSS.
config=Path('capacitor.config.ts')
value=config.read_text()
assert 'adjustMarginsForEdgeToEdge' not in value
assert value.count("  webDir: 'dist',")==1
config.write_text(value.replace("  webDir: 'dist',", "  webDir: 'dist',\n  android: { adjustMarginsForEdgeToEdge: 'auto' },",1))

import shutil
shutil.copy2('ui-fixes/AIChat.template','src/components/AIChat.tsx')
shutil.copy2('ui-fixes/voiceInput.template','src/utils/voiceInput.ts')

css=Path("src/index.css")
old=css.read_text(encoding="utf-8")
sheet=Path("ui-fixes/owner-premium-v148.css").read_text(encoding="utf-8")
assert "ANKUR OWNER PREMIUM 1.0.48" not in old
css.write_text(old+"\n"+sheet,encoding="utf-8")
print("PASS: complete owner dashboard retained, scoped masthead/nav/insights/controls premium styling")
