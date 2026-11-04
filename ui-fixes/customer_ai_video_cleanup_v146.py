#!/usr/bin/env python3
"""v1.0.46: keep the working video prompt builder, drop duplicate lower AI Video Studio.

Customer AI Features gets every non-video, non-owner, non-catalogue tool.
Do not change backend, bookings, money, Firebase, owner/staff or promo data.
"""
from pathlib import Path

app=Path("src/App.tsx")
s=app.read_text(encoding="utf-8")
old="import { AIVideoStudio } from './components/AIVideoStudio';\n"
assert s.count(old)==1, "AI Video Studio import has changed"
s=s.replace(old,"",1)

old_route="""{currentTab === 'ai-video' && <><FeatureHub currentUser={currentUser} role={role} initial="video" allowed={['video']}/><AIVideoStudio currentUser={currentUser} /></>}"""
new_route="""{currentTab === 'ai-video' && <FeatureHub currentUser={currentUser} role={role} initial="video" allowed={['video']}/>}"""
assert s.count(old_route)==1, "AI Video screen no longer matches expected two-panel layout"
s=s.replace(old_route,new_route,1)

old_allowed="allowed={['calculator','loyalty','partner','subscriptions','promotions','faq','support','service-area','referral']}"
new_allowed="allowed={['calculator','loyalty','partner','subscriptions','promotions','faq','rates','support','service-area','referral']}"
assert s.count(old_allowed)==1, "AI Features customer list changed"
s=s.replace(old_allowed,new_allowed,1)

assert s.count("currentTab === 'ai-video'") == 1, "Must preserve existing AI Video bottom tab route"
assert "<AIVideoStudio" not in s and "import { AIVideoStudio }" not in s
assert "initial=\"video\" allowed={['video']}" in s, "Keep original working Video Idea Builder"
assert "ankur-daily-winner" in s and "bookingForm={(inlineProduct)" in s
assert "<AdminDashboard" in s and "<StaffDashboard" in s
app.write_text(s,encoding="utf-8")
print("PASS: AI Video has one builder, lower unused studio removed; all ten customer tools in AI Features")
