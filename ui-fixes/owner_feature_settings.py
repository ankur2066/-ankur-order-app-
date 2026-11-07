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
p.write_text(s,encoding="utf-8")
print("PASS: owner-only dashboard has independent feature controls")
