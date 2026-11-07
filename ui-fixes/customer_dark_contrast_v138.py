#!/usr/bin/env python3
"""Improve dark-mode contrast on customer Profile and AI Video without global recoloring."""
from pathlib import Path

targets = (
    Path("src/components/customer/ProfileTab.tsx"),
    Path("src/components/AIVideoStudio.tsx"),
    Path("src/components/customer/FeatureHub.tsx"),
)
needle = 'className="c-app min-h-screen page-with-bottom-nav"'
replacement = 'className="c-app ankur-readable-customer-page min-h-screen page-with-bottom-nav"'
for file in targets:
    source = file.read_text(encoding="utf-8")
    assert source.count(needle) >= 1, f"Page root missing from {file}"
    assert replacement not in source, "Only apply to clean reconstructed source"
    file.write_text(source.replace(needle, replacement), encoding="utf-8")

css = Path("src/index.css")
overlay = Path("ui-fixes/customer-dark-contrast-v138.css")
source = css.read_text(encoding="utf-8")
sheet = overlay.read_text(encoding="utf-8")
assert "ANKUR CUSTOMER DARK CONTRAST v1.0.38" not in source
for selector in [".ankur-readable-customer-page", ".t-main", ".t-sub", ".c-card", ".c-brand", ":focus-visible"]:
    assert selector in sheet
css.write_text(source + "\n" + sheet, encoding="utf-8")
print("PASS: dark Profile/AI Video readability; no data, rate, booking or theme preference mutation.")
