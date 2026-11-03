#!/usr/bin/env python3
"""v1.0.38 private review: retire duplicate customer Categories/Products tab.

The live Dry Ice booking remains on Home.  Product/order/catalogue records and
owner/staff workflows remain intact; no Firestore, rates or billing changes.
Run after the review's existing Home/language overlay.
"""
from pathlib import Path

nav = Path("src/components/customer/BottomNav.tsx")
app = Path("src/App.tsx")
assert nav.is_file() and app.is_file(), "Run after reconstructing the React app"

source = nav.read_text(encoding="utf-8")
changes = [
    ("House, LayoutGrid, ClipboardList, Clapperboard, User",
     "House, ClipboardList, Clapperboard, User"),
    ("  { id: 'categories', label: 'Categories', Icon: LayoutGrid },\n", ""),
    ("max-w-lg mx-auto grid grid-cols-5", "max-w-lg mx-auto grid grid-cols-4"),
]
for before, after in changes:
    assert source.count(before) == 1, f"BottomNav source changed: {before}"
    source = source.replace(before, after, 1)
# The legacy union remains compatible with the review-only customer App router.
assert all(source.count(f"id: '{tab}'") == 1 for tab in
           ("home", "my-orders", "ai-video", "profile"))
assert "id: 'categories'" not in source
nav.write_text(source, encoding="utf-8")

source = app.read_text(encoding="utf-8")
before = "else if (action === 'categories') setCurrentTab('categories');"
after = "else if (action === 'categories') setCurrentTab('home');"
assert source.count(before) == 1, "Legacy catalogue promo target changed"
source = source.replace(before, after, 1)
# Keep the old internal catalog component temporarily: removing UI/data owners
# must not delete historic product records or break order/price dependencies.
assert "bookingForm={(inlineProduct)" in source
assert "onGoToTrack={handleGoToTrack}" in source
assert "CategoriesTab" in source
# Keep the legacy component compiled for internal product/order compatibility,
# but disable its customer page while its redundant bottom-tab is retired.
# This also avoids rendering an orphaned catalogue if a stale tab state survives.
old_page = "{currentTab === 'categories' && ("
assert source.count(old_page) == 1, "Duplicate Categories page anchor changed"
source = source.replace(old_page, "{false && currentTab === 'categories' && (", 1)
assert "{currentTab === 'categories' && (" not in source, "Customer Categories route must not be live"
app.write_text(source, encoding="utf-8")
print("PASS: four customer tabs; obsolete catalogue promo opens Home; booking and product data preserved.")
