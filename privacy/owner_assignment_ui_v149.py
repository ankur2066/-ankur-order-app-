#!/usr/bin/env python3
"""Owner-only per-order staff contact grant UI, source review only."""
from pathlib import Path
from shutil import copyfile
root=Path(".")
target=root/"src/components/StaffOrderAccessManager.tsx"
assert not target.exists()
copyfile(root/"privacy/StaffOrderAccessManager.template",target)
p=root/"src/components/AdminDashboard.tsx"
s=p.read_text(encoding="utf-8")
assert "StaffOrderAccessManager" not in s
s="import { StaffOrderAccessManager } from './StaffOrderAccessManager';\n"+s
assert s.count("<UserManagement")==1
start=s.index("<UserManagement")
end=s.index("/>",start)+2
original=s[start:end]
s=s[:start]+"""<>
            <StaffOrderAccessManager />
            """+original+"""
          </>"""+s[end:]
assert "<StaffOrderAccessManager />" in s
assert "<UserManagement" in s
p.write_text(s,encoding="utf-8")
print("PASS: owner users section retains existing management and adds order-specific contact approval")
