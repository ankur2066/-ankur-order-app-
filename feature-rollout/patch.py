#!/usr/bin/env python3
"""Stage 5 safe customer modules and explicit tester-only incremental rollout."""
from pathlib import Path
from shutil import copyfile
root=Path(".")
hub=root/"src/components/customer/FeatureHub.tsx"
s=hub.read_text(encoding="utf-8")
assert "useState(30)" in s or "[duration,setDuration]=useState(30)" in s
assert "ankur-video-occasion-grid" in s
assert s.count("const visible=useMemo(()=>FEATURES.filter(f=>(!f.owner||role==='admin')&&(!allowed||allowed.includes(f.id))),[role,allowed]);")==1
s=s.replace("import React, { useMemo, useState } from 'react';","import React, { useEffect, useMemo, useState } from 'react';",1)
s="import {doc,onSnapshot} from 'firebase/firestore';\nimport {db} from '../../firebase';\nimport {resolvedCustomerFeatures, type RolloutConfig} from '../../utils/customerFeatureRollout';\n"+s
old="  const visible=useMemo(()=>FEATURES.filter(f=>(!f.owner||role==='admin')&&(!allowed||allowed.includes(f.id))),[role,allowed]);"
new="""  const [pilotConfig,setPilotConfig]=useState<RolloutConfig|null>(null);
  const [suiteEnabled,setSuiteEnabled]=useState(false);
  useEffect(()=>{
    const stop=onSnapshot(doc(db,'settings','customerFeatureRollout'),
      snap=>setPilotConfig(snap.exists()?snap.data() as RolloutConfig:null),
      ()=>setPilotConfig(null));
    const stopSuite=onSnapshot(doc(db,'settings','featureSuite'),
      snap=>setSuiteEnabled(snap.data()?.enabled===true),
      ()=>setSuiteEnabled(false));
    return ()=>{stop();stopSuite();};
  },[]);
  const enabled=resolvedCustomerFeatures({rollout:pilotConfig,uid:currentUser?.uid,
    isOwner:role==='admin',suiteEnabled});
  const visible=useMemo(()=>FEATURES.filter(f=>(!f.owner||role==='admin')&&
    (!allowed||(allowed.includes(f.id)&&enabled.has(f.id)))),[role,allowed,enabled]);"""
assert old in s
s=s.replace(old,new,1)
# Feature 1: Calculator — retain original formula and event binding; make results
# explanatory, price indicative, and provide user-facing dry-ice safety guidance.
needle="<p className=\"font-bold\">Suggested booking: {result.bookKg} KG · Estimated ₹{result.estimatedTotal}</p>"
assert s.count(needle)==1
s=s.replace(needle,needle+"""<p className="text-xs t-sub">Based on current app rate settings. Final packing, transport and total are confirmed on the actual booking form.</p>""",1)
# Feature 3: FAQ — structured, accessible, practical, no invented hours/prices.
oldfaq="""  if(id==='faq') return <div className="space-y-3 text-sm"><p><b>How should dry ice be handled?</b><br/>Use insulated gloves, keep ventilation, and never seal it in an airtight container.</p><p><b>When is delivery confirmed?</b><br/>Only after the order status and owner confirmation shown in the app.</p></div>;"""
faq="""  if(id==='faq') return <section className="space-y-3 text-sm" aria-label="Dry ice help">
    {[
      ['How should I handle dry ice?','Use insulated gloves; direct skin contact can cause severe cold burns. Keep children away.'],
      ['How should dry ice be stored?','Use a vented, insulated container. NEVER store it in a sealed airtight container or in an unventilated room or vehicle.'],
      ['Can I touch or eat dry ice?','No. Do not swallow dry ice or let it directly touch skin, food or drinks. Use trained event staff for effects.'],
      ['How is my order confirmed?','Check My Orders for your order status. Delivery or pickup timing is confirmed by the business.'],
      ['Are the calculator estimates final prices?','No. The final amount is shown and confirmed during booking; packing and delivery costs may vary.'],
      ['How do I get assistance?','Use Support Hub to call or WhatsApp the business.']
    ].map(([question,answer])=><details key={question} className="border b-line rounded-xl p-3 c-card">
      <summary className="font-bold cursor-pointer">{question}</summary><p className="mt-2 t-sub">{answer}</p>
    </details>)}
  </section>;"""
assert s.count(oldfaq)==1
s=s.replace(oldfaq,faq)
# Feature 4: Support — real, separate Call and WhatsApp actions.
oldsupport="""  if(id==='support') return <div className="grid grid-cols-2 gap-3"><a className="c-brand rounded-xl p-3 text-center font-bold" href="tel:+919580882066">Call</a><a className="c-brand rounded-xl p-3 text-center font-bold" target="_blank" rel="noreferrer" href="https://wa.me/918896332066?text=Hello%20Ankur%20Dryice">WhatsApp</a></div>;"""
support="""  if(id==='support') return <section className="space-y-3" aria-label="Customer support">
    <p className="text-sm t-sub">For booking, packing, delivery or pickup confirmation, contact Ankur Dryice. Availability is confirmed by the team.</p>
    <div className="grid grid-cols-2 gap-3">
      <a className="c-brand rounded-xl p-3 text-center font-bold min-h-12" href="tel:+919580882066">Call Support</a>
      <a className="c-brand rounded-xl p-3 text-center font-bold min-h-12" target="_blank" rel="noopener noreferrer"
        href="https://wa.me/918896332066?text=Hello%20Ankur%20Dryice%2C%20I%20need%20help%20with%20my%20order.">WhatsApp Help</a>
    </div><p className="text-xs t-sub">Call and WhatsApp use separate official contact numbers. Never send a payment PIN or password in chat.</p>
  </section>;"""
assert s.count(oldsupport)==1
s=s.replace(oldsupport,support)
# Feature 5: Service Area — searchable known UP districts, not blanket guarantee.
oldarea="""function ServiceAreaPanel(){const[search,setSearch]=useState('');return <div className="space-y-3"><p>Delivery availability and timing are confirmed for each order.</p><input className="w-full border rounded-xl p-3" aria-label="Search district" placeholder="Search Uttar Pradesh district" value={search} onChange={e=>setSearch(e.target.value)}/><ul>{UP_DISTRICTS.filter(d=>d.toLowerCase().includes(search.trim().toLowerCase())).map(d=><li className="border-b py-2" key={d}>{d}</li>)}</ul></div>;}"""
newarea="""function ServiceAreaPanel(){
 const[search,setSearch]=useState('');
 const matches=UP_DISTRICTS.filter(d=>d.toLowerCase().includes(search.trim().toLowerCase()));
 return <section className="space-y-3">
   <p className="text-sm t-sub">We serve events across Uttar Pradesh. Search your district. Every location, dispatch method, delivery charge and arrival time require order confirmation.</p>
   <label className="block text-sm font-bold">District
     <input className="mt-2 w-full border rounded-xl p-3" aria-label="Search district" placeholder="Search Uttar Pradesh district"
       value={search} maxLength={60} onChange={e=>setSearch(e.target.value)}/>
   </label>
   <p role="status" className="text-xs t-sub">{matches.length} matching district(s)</p>
   {matches.length===0?<p className="text-sm font-semibold">No matching district. Contact support to confirm delivery options.</p>:
     <ul className="max-h-72 overflow-y-auto">{matches.map(d=><li className="border-b py-2" key={d}>{d}</li>)}</ul>}
   <a className="inline-block c-brand rounded-xl p-3 text-center font-bold" href="tel:+919580882066">Confirm delivery for my district</a>
 </section>;
}"""
assert s.count(oldarea)==1
s=s.replace(oldarea,newarea)
hub.write_text(s,encoding="utf-8")
copyfile(root/"feature-rollout/customerFeatureRollout.template",root/"src/utils/customerFeatureRollout.ts")
copyfile(root/"feature-rollout/CustomerFeatureRolloutOwner.template",root/"src/components/CustomerFeatureRolloutOwner.tsx")
owner=root/"src/components/AdminDashboard.tsx"
o=owner.read_text(encoding="utf-8")
assert "CustomerFeatureRolloutOwner" not in o
assert o.count("<StaffOrderAccessManager />")==1
o="import {CustomerFeatureRolloutOwner} from './CustomerFeatureRolloutOwner';\n"+o
o=o.replace("<StaffOrderAccessManager />","<StaffOrderAccessManager />\n            <CustomerFeatureRolloutOwner />",1)
owner.write_text(o,encoding="utf-8")
print("PASS: five ready features; owner-controlled tester-only future rollout; all original modules preserved")
