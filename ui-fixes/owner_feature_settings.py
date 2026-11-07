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
print("PASS: owner-only dashboard has independent feature controls")
