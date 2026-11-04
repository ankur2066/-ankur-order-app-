#!/usr/bin/env python3
"""v1.0.47 privacy/UI patch: compact dispatch radios and remove Rules viewer.

Only customer OrderForm presentation + owner UI. No Firestore rules,
roles, auth, booking calculations, dispatch slot validation, Firebase
data, or payment operations are changed.
"""
from pathlib import Path

def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    assert count == 1, f"{label}: expected exactly one anchor; found {count}"
    return source.replace(old, new, 1)

# 1. Compact each dispatch choice to radio + one text label, retaining
# original slot ids/labels, selected values, date window and expiry checks.
order_path=Path("src/components/OrderForm.tsx")
order=order_path.read_text(encoding="utf-8")
before_start='                <div className="apb-slot-grid grid grid-cols-2 gap-3">'
before_end='                <p className="apb-helper mt-2 text-xs flex items-start gap-2">'
assert order.count(before_start)==1 and order.count(before_end)==1
start=order.index(before_start)
end=order.index(before_end, start)
end=order.index('                </p>',end)+len('                </p>')
old=order[start:end]
assert "dispatchSlots.map((slot)" in old and "slot.timeWindow" in old
assert "disabled={slot.disabled}" in old and "checked={dispatchTiming === slot.label}" in old
assert "Expired dispatch slots close automatically." in old
new="""                <div className="apb-slot-grid apb-slot-compact-grid grid grid-cols-2 gap-2">
                  {dispatchSlots.map((slot) => {
                    const titleText =
                      slot.id === 'today_morning' ? 'आज सुबह' :
                      slot.id === 'today_evening' ? 'आज शाम' :
                      slot.id === 'tomorrow_morning' ? 'कल सुबह' : 'कल शाम';

                    return (
                      <label
                        key={slot.id}
                        aria-disabled={slot.disabled}
                        className={\`apb-slot apb-slot-compact flex flex-row items-center gap-2 cursor-pointer transition-all \${
                          slot.disabled ? 'apb-slot-disabled cursor-not-allowed' :
                          dispatchTiming === slot.label ? 'apb-slot-selected' : 'apb-slot-idle'
                        }\`}
                      >
                        <input
                          type="radio"
                          name="dispatchTiming"
                          value={slot.label}
                          disabled={slot.disabled}
                          checked={dispatchTiming === slot.label}
                          onChange={() => setDispatchTiming(slot.label)}
                          className="accent-sky-600 w-4 h-4 shrink-0"
                        />
                        <span className="apb-slot-title text-sm font-bold">{titleText}</span>
                      </label>
                    );
                  })}
                </div>"""
order=order[:start]+new+order[end:]
assert order.count('getDispatchSlots()')>=1
assert "slot.timeWindow" not in order[start:start+len(new)]
assert all(n in new for n in ("आज सुबह","आज शाम","कल सुबह","कल शाम"))
assert "disabled={slot.disabled}" in new and "checked={dispatchTiming === slot.label}" in new
order_path.write_text(order,encoding="utf-8")

css_path=Path("src/index.css")
css=css_path.read_text(encoding="utf-8")
style=Path("ui-fixes/dispatch-rules-v147.css").read_text(encoding="utf-8")
assert "ANKUR COMPACT DISPATCH v1.0.47" not in css
css_path.write_text(css+"\n"+style,encoding="utf-8")

# 2. Remove the public Rules viewer and the underlying raw source import
# from the bundled Android/Web app. Hiding only the button is insufficient:
# the old RulesReviewModal imported ../../firestore.rules?raw.
app_path=Path("src/App.tsx")
app=app_path.read_text(encoding="utf-8")
app=replace_once(app,
    "import { RulesReviewModal } from './components/RulesReviewModal';\n","",
    "remove bundled security rules viewer import")
app=replace_once(app,
    "  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);\n","",
    "remove rules viewer state")
app=replace_once(app,
    "            onOpenRulesReview={() => setIsRulesModalOpen(true)}\n","",
    "remove rules page action from owner route")
app=replace_once(app,
    "      {/* Security rules review is available to the owner only */}\n"
    "      {role === 'admin' && <RulesReviewModal isOpen={isRulesModalOpen} onClose={() => setIsRulesModalOpen(false)} />}\n",
    "","remove owner rules modal")
assert "RulesReviewModal" not in app and "onOpenRulesReview" not in app
app_path.write_text(app,encoding="utf-8")

admin_path=Path("src/components/AdminDashboard.tsx")
admin=admin_path.read_text(encoding="utf-8")
admin=replace_once(admin,"  FileText,\n","","remove Rules icon")
admin=replace_once(admin,"  onOpenRulesReview: () => void;\n","","remove owner rules prop type")
admin=replace_once(admin,"  onOpenRulesReview,\n","","remove owner rules prop")
old_button="""          <button
            onClick={onOpenRulesReview}
            className="px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-sky-700" />
            <span>रूल्स</span>
          </button>

"""
admin=replace_once(admin,old_button,"","remove Rules button")
assert "onOpenRulesReview" not in admin
admin_path.write_text(admin,encoding="utf-8")

header_path=Path("src/components/Header.tsx")
header=header_path.read_text(encoding="utf-8")
header=replace_once(header,"  onOpenRulesReview?: () => void;\n","",
                   "remove unused Header rules prop")
header_path.write_text(header,encoding="utf-8")

# Remove the sensitive source-viewer component from generated client source.
viewer=Path("src/components/RulesReviewModal.tsx")
assert viewer.exists()
viewer_text=viewer.read_text(encoding="utf-8")
assert "../../firestore.rules?raw" in viewer_text
viewer.unlink()
assert not viewer.exists()
assert "getDispatchSlots" in order and "setDispatchTiming" in order
assert "<AdminDashboard" in app and "<StaffDashboard" in app
print("PASS: four minimal radio dispatch choices; expiry validation intact; no bundled Rules source viewer or owner Rules button")
