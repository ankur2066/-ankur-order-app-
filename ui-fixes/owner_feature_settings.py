#!/usr/bin/env python3
"""Add owner-controlled optional feature switches after pinned localization edits."""
from pathlib import Path

p=Path("src/components/AdminDashboard.tsx")
s=p.read_text(encoding="utf-8")
imp="import { FeatureSuiteSettings } from './owner/FeatureSuiteSettings';\n"
if "FeatureSuiteSettings" not in s:
    s=imp+s
root='<div className="ankur-owner-dashboard max-w-5xl mx-auto py-3 px-3 sm:px-6 text-slate-900 min-h-screen">'
if '<FeatureSuiteSettings />' not in s:
    assert s.count(root)==1
    s=s.replace(root,root+'\n      <div className="mb-4"><FeatureSuiteSettings /></div>',1)
panel=Path("src/components/customer/FeatureDataPanels.tsx")
ps=panel.read_text(encoding="utf-8")
old_sig="export function useFeatureRows(path:string,user:User|null,owner:boolean,point=false){"
new_sig="export function useFeatureRows(path:string,user:User|null,owner:boolean,point=false,featureId=path){"
if new_sig not in ps:
    assert ps.count(old_sig)==1
    ps=ps.replace(old_sig,new_sig,1)
old_watch="useEffect(()=>onSnapshot(doc(db,'settings','featureSuite'),s=>{setEnabled(s.exists()&&s.data().enabled===true);setReady(true);},()=>{setReady(true);setEnabled(false);}),[]);"
new_watch="useEffect(()=>onSnapshot(doc(db,'settings','featureSuite'),s=>{const config=s.data();setEnabled(s.exists()&&config?.enabled===true&&config?.features?.[featureId]===true);setReady(true);},()=>{setReady(true);setEnabled(false);}),[featureId]);"
if new_watch not in ps:
    assert ps.count(old_watch)==1
    ps=ps.replace(old_watch,new_watch,1)
old_call=" const {rows,ready,error,enabled}=useFeatureRows(paths[id]||'userPrefs',user,owner,['loyalty','preferences','eta'].includes(id)||(id==='referral'||id==='partner')&&!owner);"
new_call=" const featureId=id==='bulk'?'partner':id;\n const {rows,ready,error,enabled}=useFeatureRows(paths[id]||'userPrefs',user,owner,['loyalty','preferences','eta'].includes(id)||(id==='referral'||id==='partner')&&!owner,featureId);"
if new_call not in ps:
    assert ps.count(old_call)==1
    ps=ps.replace(old_call,new_call,1)
panel.write_text(ps,encoding="utf-8")
p.write_text(s,encoding="utf-8")
nav=Path("src/components/customer/BottomNav.tsx")
ns=nav.read_text(encoding="utf-8")
ns=ns.replace("House, ClipboardList, Clapperboard, Sparkles, User","House, ClipboardList, Clapperboard, User")
ns=ns.replace(" | 'ai-features'","")
ns=ns.replace("  { id: 'ai-features', label: 'AI Features', Icon: Sparkles },\n","")
ns=ns.replace("grid-cols-5","grid-cols-4")
nav.write_text(ns,encoding="utf-8")
a=Path("src/App.tsx")
app=a.read_text(encoding="utf-8")
start="      {currentTab === 'ai-features' && ("
end="      {currentTab === 'ai-video' &&"
if start in app:
    begin=app.index(start);finish=app.index(end,begin)
    app=app[:begin]+app[finish:]
home_tools="""      {currentTab === 'home' && (
        <section className="c-app ankur-readable-customer-page max-w-lg mx-auto px-3 pb-4">
          <details className="c-card border b-line rounded-2xl p-4">
            <summary className="font-black">{language === 'hi' ? 'AI सुविधाएँ और सेवाएँ' : 'AI Features and Services'}</summary>
            <div className="mt-3"><DailyWinnerBanner currentUser={currentUser} /></div>
            <div className="mt-3"><FeatureHub currentUser={currentUser} role={role}
              allowed={['calculator','loyalty','catalog','partner','subscriptions','promotions','faq','rates','support','service-area','referral']} /></div>
          </details>
        </section>
      )}

"""
anchor_home="      {false && currentTab === 'categories' && ("
if home_tools.strip() not in app:
    assert app.count(anchor_home)==1
    app=app.replace(anchor_home,home_tools+anchor_home,1)
a.write_text(app,encoding="utf-8")
hub=Path("src/components/customer/FeatureHub.tsx")
hs=hub.read_text(encoding="utf-8")
if "OWNER_SWITCHED_FEATURES" not in hs:
    hs=hs.replace("export type FeatureId =", "const OWNER_SWITCHED_FEATURES=new Set(['loyalty','catalog','partner','subscriptions','promotions','inventory','referral']);\nexport type FeatureId =",1)
    hs=hs.replace("export const FeatureHub: React.FC", "export const FeatureHub: React.FC",1)
    sig="  const {language,t}=useLanguage(); const [active,setActive]=useState<FeatureId|null>(initial);"
    repl=sig+"\n  const [featureFlags,setFeatureFlags]=useState<Record<string,boolean>>({});\n  React.useEffect(()=>onSnapshot(doc(db,'settings','featureSuite'),snapshot=>setFeatureFlags(snapshot.data()?.features||{}),()=>setFeatureFlags({})),[]);"
    assert hs.count(sig)==1
    hs=hs.replace(sig,repl,1)
    old_visible="(!allowed||allowed.includes(f.id))"
    new_visible="(!allowed||allowed.includes(f.id))&&(role==='admin'||!OWNER_SWITCHED_FEATURES.has(f.id)||featureFlags[f.id]===true)"
    assert hs.count(old_visible)==1
    hs=hs.replace(old_visible,new_visible,1)
    hs=hs.replace("import React, { useMemo, useState } from 'react';","import React, { useMemo, useState } from 'react';\nimport { doc, onSnapshot } from 'firebase/firestore';\nimport { db } from '../../firebase';",1)
hub.write_text(hs,encoding="utf-8")
print("PASS: owner-only dashboard has independent feature controls")
