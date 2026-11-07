#!/usr/bin/env python3
"""Add scoped customer booking contrast fixes after the complete review overlay.

Only src/index.css is modified; existing customer, owner and Firebase logic is preserved.
Re-run on a clean ephemeral source extraction, not on a previously patched build.
"""
from pathlib import Path

root = Path.cwd()
css = root / "src/index.css"
overlay = root / "ui-fixes/seasonal-contrast-v135.css"
marker = "ANKUR WEDDING SEASON CONTRAST"
assert css.is_file() and overlay.is_file(), "Reconstructed application CSS missing"
old = css.read_text(encoding="utf-8")
assert marker not in old, "Contrast patch is already applied; rebuild from clean source"
sheet = overlay.read_text(encoding="utf-8")
for selector in [".apb-form-panel", ".apb-input", ".apb-slot-selected", ".apb-slot-disabled", ".apb-total-card"]:
    assert selector in sheet, f"Expected contrast target missing: {selector}"
css.write_text(old + "\n" + sheet, encoding="utf-8")
print("PASS: scoped booking contrast appended; no business logic or database changes")
