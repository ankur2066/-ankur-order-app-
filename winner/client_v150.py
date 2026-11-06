#!/usr/bin/env python3
"""v1.0.50 review overlay, applied after all staff privacy v149 overlays."""
from pathlib import Path
from shutil import copyfile
source=Path('winner/DailyWinner.template')
target=Path('src/components/customer/DailyWinner.tsx')
assert source.exists() and not target.exists()
copyfile(source,target)

app=Path('src/App.tsx')
text=app.read_text(encoding='utf-8')
anchor="import { FeatureHub } from './components/customer/FeatureHub';"
assert text.count(anchor)==1
text=text.replace(anchor,
  "import { DailyWinnerBanner } from './components/customer/DailyWinner';\n"+anchor,1)
start_marker='          <section className="ankur-daily-winner"'
end_marker="          <FeatureHub currentUser={currentUser} role={role}"
assert text.count(start_marker)==1 and end_marker in text[text.index(start_marker):]
start=text.index(start_marker)
end=text.index(end_marker,start)
previous=text[start:end]
assert "winner?.active" in previous and "विजेता घोषित होने पर" in previous
assert previous.count('</section>')==1
text=text[:start]+"          <DailyWinnerBanner currentUser={currentUser} />\n"+text[end:]
# The old banner used a Gift icon in App, now owned by the winner component.
assert text.count("ArrowLeft, BellRing, Gift, Loader2")==1
text=text.replace("ArrowLeft, BellRing, Gift, Loader2",
                  "ArrowLeft, BellRing, Loader2",1)
assert text.count('<DailyWinnerBanner currentUser={currentUser} />')==1
assert "currentTab === 'ai-features'" in text
assert "bookingForm={(inlineProduct)" in text
app.write_text(text,encoding='utf-8')

owner=Path('src/components/AdminDashboard.tsx')
s=owner.read_text(encoding='utf-8')
anchor="import { StaffOrderAccessManager } from './StaffOrderAccessManager';"
assert s.count(anchor)==1
s=s.replace(anchor,anchor+"\nimport { DailyWinnerOwnerControls } from './customer/DailyWinner';",1)
anchor="<StaffOrderAccessManager />"
assert s.count(anchor)==1
s=s.replace(anchor,anchor+"\n            <DailyWinnerOwnerControls />",1)
assert "<UserManagement" in s and "ankur-owner-dashboard" in s
owner.write_text(s,encoding='utf-8')
print('PASS: live Daily Winner banner and owner Auto/Manual control integrated in review source')
