#!/usr/bin/env python3
"""Apply the one-shot feature/language overlay after v1.0.32 + Phase A."""
from pathlib import Path
import shutil

ROOT = Path(__file__).resolve().parents[1]
APP = Path(__import__('os').environ.get('ANKUR_APP_DIR', ROOT / 'app'))
SRC = APP / 'src'
TEMPLATES = ROOT / 'all-features' / 'templates'

if not (SRC / 'App.tsx').exists():
    raise SystemExit(f'ANKUR_APP_DIR must point to extracted app source: {APP}')

def replace_once(path: Path, old: str, new: str):
    text = path.read_text()
    if new in text:
        return
    if old not in text:
        raise SystemExit(f'Expected anchor missing in {path}: {old[:80]!r}')
    path.write_text(text.replace(old, new, 1))

(SRC / 'context').mkdir(exist_ok=True)
shutil.copy2(TEMPLATES / 'LanguageContext.template', SRC / 'context' / 'LanguageContext.tsx')
shutil.copy2(TEMPLATES / 'FeatureHub.template', SRC / 'components' / 'customer' / 'FeatureHub.tsx')
shutil.copy2(TEMPLATES / 'FeatureDataPanels.template', SRC / 'components' / 'customer' / 'FeatureDataPanels.tsx')
shutil.copy2(TEMPLATES / 'dryIceCalc.template', SRC / 'utils' / 'dryIceCalc.ts')
shutil.copy2(TEMPLATES / 'stockQuantity.template', SRC / 'utils' / 'stockQuantity.ts')
shutil.copy2(TEMPLATES / 'pilotRollout.template', SRC / 'utils' / 'pilotRollout.ts')
shutil.copy2(TEMPLATES / 'referralShare.template', SRC / 'utils' / 'referralShare.ts')
shutil.copy2(TEMPLATES / 'ReferralSharePanel.template', SRC / 'components' / 'customer' / 'ReferralSharePanel.tsx')
shutil.copy2(TEMPLATES / 'commercialReceipt.template', SRC / 'utils' / 'commercialReceipt.ts')
# Local review-only update check; no download/install permissions.
shutil.copy2(ROOT / 'updates' / 'appUpdate.template', SRC / 'services' / 'appUpdate.ts')
shutil.copy2(ROOT / 'updates' / 'AppUpdateNotice.template', SRC / 'components' / 'AppUpdateNotice.tsx')

app = SRC / 'App.tsx'
replace_once(app, "import { ThemeProvider } from './context/ThemeContext';", "import { ThemeProvider } from './context/ThemeContext';\nimport { LanguageProvider, useLanguage } from './context/LanguageContext';\nimport { AppUpdateNotice } from './components/AppUpdateNotice';")
replace_once(app, "function AppShell() {\n", "function AppShell() {\n  const { language } = useLanguage();\n")
replace_once(app, '<span className="text-xs t-sub">लोड हो रहा है…</span>', '<span className="text-xs t-sub">{language === \'hi\' ? \'लोड हो रहा है…\' : \'Loading…\'}</span>')
replace_once(app, '<SubPageBar title="ड्राई आइस बुकिंग"', '<SubPageBar title={language === \'hi\' ? \'ड्राई आइस बुकिंग\' : \'Dry Ice Booking\'}')
replace_once(app, '<SubPageBar title="ऑर्डर ट्रैकिंग"', '<SubPageBar title={language === \'hi\' ? \'ऑर्डर ट्रैकिंग\' : \'Order Tracking\'}')
replace_once(app, "  return (\n    <ThemeProvider>\n      <AppShell />\n    </ThemeProvider>\n  );\n}", "  return (\n    <LanguageProvider>\n      <ThemeProvider>\n        <AppUpdateNotice />\n        <AppShell />\n      </ThemeProvider>\n    </LanguageProvider>\n  );\n}")

profile = SRC / 'components' / 'customer' / 'ProfileTab.tsx'
replace_once(profile, "import React", "import { ANDROID_VERSION_NAME } from '../../services/appUpdate';\nimport React")
replace_once(profile, "import { SignInScreen } from '../SignInScreen';", "import { SignInScreen } from '../SignInScreen';\nimport { FeatureHub, LanguageSettings } from './FeatureHub';\nimport { useLanguage } from '../../context/LanguageContext';")
replace_once(profile, "export const ProfileTab: React.FC<ProfileTabProps> = ({ currentUser, role, onOpenOwnerDashboard }) => {\n", "export const ProfileTab: React.FC<ProfileTabProps> = ({ currentUser, role, onOpenOwnerDashboard }) => {\n  const { t } = useLanguage();\n")
for old,new in [
 ('<h1 className="text-xl font-black t-main">प्रोफ़ाइल</h1>','<h1 className="text-xl font-black t-main">{t(\'profile\')}</h1>'),
 ("{currentUser.displayName || 'ग्राहक'}","{currentUser.displayName || t('customer')}"),
 ("{role === 'admin' ? 'मालिक' : role === 'staff' ? 'स्टाफ' : 'डिलीवरी'}","{role === 'admin' ? t('owner') : role === 'staff' ? t('staff') : t('delivery')}"),
 ('<span className="text-sm font-extrabold">ओनर डैशबोर्ड खोलें</span>','<span className="text-sm font-extrabold">{t(\'ownerDashboard\')}</span>'),
 ('<h2 className="text-sm font-black t-main">संपर्क करें</h2>','<h2 className="text-sm font-black t-main">{t(\'contact\')}</h2>'),
 ('<p className="text-xs t-sub mt-0.5">अंकुर ड्राई आइस एंड इवेंट्स, लखनऊ · {BUSINESS_PHONE_DISPLAY}</p>','<p className="text-xs t-sub mt-0.5">Ankur Dry Ice and Events, Lucknow · {BUSINESS_PHONE_DISPLAY}</p>'),
 ('<Phone className="w-4 h-4" /> कॉल','<Phone className="w-4 h-4" /> {t(\'call\')}'),
 ('<LogOut className="w-4 h-4" /> लॉगआउट','<LogOut className="w-4 h-4" /> {t(\'logout\')}'),
]: replace_once(profile, old, new)
replace_once(profile, "<h1 className=\"text-xl font-black t-main\">{t('profile')}</h1>", "<h1 className=\"text-xl font-black t-main\">{t('profile')} <span className=\"ml-2 inline-block rounded-full border b-line px-2 py-0.5 text-xs font-semibold t-sub\">v{ANDROID_VERSION_NAME}</span></h1>")
replace_once(profile, '        <section className="c-card border b-line rounded-2xl p-4">\n          <h2 className="text-sm font-black t-main">{t(\'contact\')}</h2>', '        <LanguageSettings />\n\n        <FeatureHub currentUser={currentUser} role={role} />\n\n        <section className="c-card border b-line rounded-2xl p-4">\n          <h2 className="text-sm font-black t-main">{t(\'contact\')}</h2>')

print('Applied English-first language and 14-feature navigation overlay')
