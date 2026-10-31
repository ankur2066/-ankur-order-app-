"""Reduce repeated navigation in the review build; no data/rate/booking writes."""
from pathlib import Path

def edit(path, change):
    p=Path(path);old=p.read_text();new=change(old);assert old!=new,path;p.write_text(new)

def home(s):
    assert s.count('<div className="aqp-category-strip aqp-booking-shortcuts"')==1
    a=s.index('        <div className="aqp-category-strip aqp-booking-shortcuts"');b=s.index('      </header>',a);s=s[:a]+s[b:]
    a=s.index('            <button type="button" onClick={onOpenProfile}');b=s.index('            </button>',a)+len('            </button>\n');s=s[:a]+s[b:]
    s=s.replace('Bell, Clock, User as UserIcon','Bell, Clock').replace("import type { User } from 'firebase/auth';\n",'')
    for line in ['  currentUser: User | null;\n','  onOpenProfile: () => void;\n','  onOpenProducts: () => void;\n','  onOpenAI: () => void;\n','  currentUser,\n','  onOpenProfile,\n','  onOpenProducts,\n','  onOpenAI,\n']:
        assert s.count(line)==1,line;s=s.replace(line,'',1)
    return s.replace('data-ui-build="1.0.28"','data-ui-build="1.0.32"',1)
edit('src/components/customer/CustomerHome.tsx',home)

def profile(s):
    a=s.index('            <button\n              type="button"\n              onClick={onGoOrders}');b=s.index("            {role === 'admin'",a);s=s[:a]+s[b:]
    a=s.index('                <button\n                  type="button"\n                  onClick={onOpenRulesReview}');b=s.index('                </button>',a)+len('                </button>\n');s=s[:a]+s[b:]
    s=s.replace('ClipboardList, FileCode, ','')
    for line in ['  onGoOrders: () => void;\n','  onOpenRulesReview: () => void;\n']:
        assert s.count(line)==1;s=s.replace(line,'',1)
    return s.replace('currentUser, role, onGoOrders, onOpenOwnerDashboard, onOpenRulesReview','currentUser, role, onOpenOwnerDashboard',1)
edit('src/components/customer/ProfileTab.tsx',profile)

def orders(s):
    a=s.index('      {/* Header */}\n',s.index('  return (',s.index('// If customer is NOT signed')))
    b=s.index('      {errorMsg && (',a)
    s=s[:a]+'''      <header className="flex items-center justify-between gap-3 mb-3 c-card border b-line p-3 rounded-2xl">
        <h1 className="text-lg font-black t-main">मेरे ऑर्डर</h1>
        <button type="button" onClick={fetchOrders} disabled={loading}
          aria-label="ऑर्डर रीफ्रेश करें" title="रीफ्रेश"
          className="focus-ring p-2 rounded-xl border b-line t-sub cursor-pointer disabled:opacity-60">
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </header>

'''+s[b:]
    return s.replace('  LogOut,\n','').replace('db, signInWithGoogle, signOutUser','db, signInWithGoogle')
edit('src/components/CustomerOrders.tsx',orders)

def product(s):
    assert s.count('<Snowflake className="w-12 h-12 t-brand opacity-70" aria-hidden="true" />')==1
    return s.replace("import { Snowflake } from 'lucide-react';", "import { CategoryIcon } from './categoryIcons';",1).replace('<Snowflake className="w-12 h-12 t-brand opacity-70" aria-hidden="true" />','<CategoryIcon id={product.category || \'dry_ice\'} className="w-12 h-12 t-brand opacity-70" />',1)
edit('src/components/customer/ProductCard.tsx',product)

def app(s):
    a=s.index('        <CustomerHome\n');b=s.index('          bookingForm=',a);header=s[a:b]
    for line in ['          currentUser={currentUser}\n','          onOpenProfile={() => setCurrentTab(\'profile\')}\n','          onOpenProducts={() => setCurrentTab(\'categories\')}\n','          onOpenAI={() => setCurrentTab(\'ai-video\')}\n']:
        assert header.count(line)==1,line;header=header.replace(line,'',1)
    s=s[:a]+header+s[b:]
    a=s.index('        <ProfileTab\n');b=s.index('        />',a);header=s[a:b]
    for line in ["          onGoOrders={() => setCurrentTab('my-orders')}\n",'          onOpenRulesReview={() => setIsRulesModalOpen(true)}\n']:
        assert header.count(line)==1,line;header=header.replace(line,'',1)
    return s[:a]+header+s[b:]
edit('src/App.tsx',app)
print('v1.0.32: repeated navigation removed; existing order cards, product records, rates and booking handlers retained.')
