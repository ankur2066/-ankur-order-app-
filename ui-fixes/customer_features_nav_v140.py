#!/usr/bin/env python3
"""v1.0.40: expose customer AI Features as the fifth navigation tab.

This is customer presentation/router wiring only. Never modify the real
OrderForm, order rates, Firestore rules, customer history, owner/staff UI,
or claim a Daily Winner has been selected automatically.
"""
from pathlib import Path

nav = Path("src/components/customer/BottomNav.tsx")
app = Path("src/App.tsx")
n = nav.read_text(encoding="utf-8")
a = app.read_text(encoding="utf-8")

def once(old, new, source, label):
    count = source.count(old)
    assert count == 1, f"{label}: expected one anchor, found {count}: {old[:80]}"
    return source.replace(old, new, 1)

n = once("House, ClipboardList, Clapperboard, User",
         "House, ClipboardList, Clapperboard, Sparkles, User",
         n, "new AI Features icon")
n = once(" | 'my-orders' | 'ai-video' | 'profile'",
         " | 'my-orders' | 'ai-features' | 'ai-video' | 'profile'",
         n, "CustomerTab type")
n = once("  { id: 'ai-video', label: 'AI Video', Icon: Clapperboard },",
         "  { id: 'ai-features', label: 'AI Features', Icon: Sparkles },\n"
         "  { id: 'ai-video', label: 'AI Video', Icon: Clapperboard },",
         n, "five-tab order")
n = once("max-w-lg mx-auto grid grid-cols-4",
         "max-w-lg mx-auto grid grid-cols-5",
         n, "five columns")
assert all(n.count(f"id: '{tab}'") == 1 for tab in
           ("home", "my-orders", "ai-features", "ai-video", "profile"))
assert "id: 'categories'" not in n, "do not restore old Products tab"
nav.write_text(n, encoding="utf-8")

a = once("ArrowLeft, BellRing, Loader2, ShieldCheck, X",
         "ArrowLeft, BellRing, Gift, Loader2, ShieldCheck, X",
         a, "winner visual icon")
route = """      {currentTab === 'ai-features' && (
        <main className="c-app ankur-readable-customer-page min-h-screen page-with-bottom-nav max-w-lg mx-auto px-3 pt-4"
          style={{ paddingTop: 'calc(16px + env(safe-area-inset-top, 0px))' }}>
          <section className="ankur-daily-winner" aria-labelledby="ankur-daily-winner-title">
            <div className="flex items-center gap-2">
              <Gift className="w-5 h-5" aria-hidden="true" />
              <h1 id="ankur-daily-winner-title" className="text-base font-black">आज का Lucky Winner</h1>
            </div>
            {winner?.active && winner.name?.trim() && winner.city?.trim() ? (
              <p className="mt-2 text-sm font-bold">{winner.name} · {winner.city}
                {winner.dateLabel ? <span className="block text-xs mt-1">{winner.dateLabel}</span> : null}
              </p>
            ) : (
              <p className="mt-2 text-sm">विजेता घोषित होने पर यहाँ दिखाई देगा।</p>
            )}
          </section>
          <FeatureHub currentUser={currentUser} role={role}
            allowed={['calculator','loyalty','partner','subscriptions','promotions','faq','support','service-area','referral']} />
        </main>
      )}

"""
anchor = "      {currentTab === 'ai-video' && "
assert a.count(anchor) == 1, "real AI Video screen must remain intact"
a = a.replace(anchor, route + anchor, 1)
assert "currentTab === 'ai-features'" in a
assert "currentTab === 'ai-video'" in a
assert "bookingForm={(inlineProduct)" in a
assert "onGoToTrack={handleGoToTrack}" in a
assert "false && currentTab === 'categories'" in a
app.write_text(a, encoding="utf-8")

style_path = Path("src/index.css")
original = style_path.read_text(encoding="utf-8")
sheet = Path("ui-fixes/customer-features-v140.css").read_text(encoding="utf-8")
assert "ANKUR AI FEATURES NAV v1.0.40" not in original
style_path.write_text(original + "\n" + sheet, encoding="utf-8")
print("PASS: five actual customer tabs, full-width honest winner strip and two-column feature tools")
