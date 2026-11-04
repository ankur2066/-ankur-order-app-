"""Reproduce CI source in a new isolated directory; never writes production."""
from pathlib import Path
import argparse,shutil,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1]
CHAIN=['app-check/apply_patch.py','ui-fixes/apply_patch.py','ui-fixes/ux_qa_patch.py','ui-fixes/premium_booking_v122.py','ui-fixes/blinkit_premium_v123.py','ui-fixes/customer_home_form_v124.py','ui-fixes/customer_home_only_v125.py','ui-fixes/compact_customer_form_v126.py','ui-fixes/english_booking_v127.py','ui-fixes/readable_smooth_v128.py','notifications/apply_patch.py','notifications/client-fixes/apply_patch.py','notifications/tap-fix/apply_patch.py','ui-fixes/declutter_v132.py','phase-a/apply_patch.py','billing/apply_patch.py','all-features/apply_patch.py','all-features/wire_additions.py','ui-fixes/seasonal_contrast_v135.py','ui-fixes/customer-home-language.py','ui-fixes/customer_nav_v138.py','ui-fixes/customer_dark_contrast_v138.py','ui-fixes/customer_home_clean_v139.py','ui-fixes/customer_features_nav_v140.py','ui-fixes/video_idea_profile_v141.py','ui-fixes/customer_profile_contact_v145.py','ui-fixes/customer_ai_video_cleanup_v146.py','ui-fixes/dispatch_rules_privacy_v147.py','ui-fixes/owner_premium_v148.py','ui-fixes/staff_contact_privacy_v148.py','privacy/staff_data_cutover_v149.py','privacy/staff_contact_ui_v149.py','privacy/owner_assignment_ui_v149.py']
def reconstruct(out):
    out.mkdir(parents=True,exist_ok=False)
    with zipfile.ZipFile(ROOT/'Ankur_Order_App_Upload_GitHub.zip') as z:z.extractall(out)
    for name in ['app-check','ui-fixes','notifications','phase-a','billing','all-features','seasonal','updates','privacy']:shutil.copytree(ROOT/name,out/name,dirs_exist_ok=True,ignore=shutil.ignore_patterns('__pycache__'))
    import os
    for script in CHAIN:subprocess.run(['python3',script],cwd=out,env={**os.environ,'ANKUR_APP_DIR':str(out)},check=True)
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);reconstruct(p.parse_args().output.resolve())
