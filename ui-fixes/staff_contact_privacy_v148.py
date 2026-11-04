#!/usr/bin/env python3
"""v1.0.48: staff contact privacy at the presentation layer.

Default: no customer telephone in staff cards or search. Only explicitly
opening ONE order reveals its number for a short period. Preserve WhatsApp/
call action but do not pretend this removes raw PII from Firestore snapshots;
server-side staff-safe projections and Rules deployment must follow separately.
"""
from pathlib import Path
p=Path("src/components/StaffDashboard.tsx")
s=p.read_text(encoding="utf-8")
def once(old,new,label):
    global s
    assert s.count(old)==1,(label,s.count(old))
    s=s.replace(old,new,1)

once("  const [orders, setOrders] = useState<Order[]>([]);",
"""  const [orders, setOrders] = useState<Order[]>([]);
  // One order at a time; do not keep all contacts visible in the dashboard.
  const [revealedContactOrderId, setRevealedContactOrderId] = useState<string | null>(null);
  useEffect(() => {
    const closeOnBackground = () => { if (document.visibilityState === 'hidden') setRevealedContactOrderId(null); };
    document.addEventListener('visibilitychange', closeOnBackground);
    return () => document.removeEventListener('visibilitychange', closeOnBackground);
  }, []);
  const openOneContact = (orderId: string) => {
    setRevealedContactOrderId(current => current === orderId ? null : orderId);
  };
  useEffect(() => {
    if (!revealedContactOrderId) return;
    const timeout = window.setTimeout(() => setRevealedContactOrderId(null), 15000);
    return () => window.clearTimeout(timeout);
  }, [revealedContactOrderId]);""",
 "contact reveal state")

once("        const phoneMatch = (ord.customerPhone || '').includes(q);\n","",
     "do not search entire staff phone database")
once("if (!idMatch && !nameMatch && !phoneMatch && !cityMatch)","if (!idMatch && !nameMatch && !cityMatch)",
     "remove phone lookup from staff UI")
start=s.index("                    {ord.customerPhone && (")
end=s.index("                  </div>\n\n                  {/* Quantity & Dispatch Note */}",start)
section=s[start:end]
assert "कॉल: {ord.customerPhone}" in section and "WhatsApp" in section
replace="""                    {ord.customerPhone && (
                      <div className="ankur-staff-contact mt-2">
                        <button type="button"
                          onClick={() => openOneContact(ord.orderId)}
                          aria-expanded={revealedContactOrderId === ord.orderId}
                          aria-label="इस एक ऑर्डर के ग्राहक को कॉल करें"
                          className="ankur-staff-call-trigger inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold">
                          <Phone className="w-4 h-4" aria-hidden="true"/>
                          {revealedContactOrderId === ord.orderId ? 'ग्राहक संपर्क छिपाएँ' : 'कॉल करें'}
                        </button>
                        {revealedContactOrderId === ord.orderId && (
                          <div role="group" aria-label="केवल चयनित ऑर्डर का संपर्क"
                            className="ankur-staff-contact-revealed mt-2 rounded-xl border p-3 space-y-2">
                            <p className="font-semibold text-xs">केवल इस ऑर्डर का नंबर — 15 सेकंड में अपने-आप छिपेगा।</p>
                            <p className="font-mono text-base font-black">{ord.customerPhone}</p>
                            <div className="flex flex-wrap gap-2">
                              <a href={`tel:${ord.customerPhone.replace(/[^0-9+]/g, '')}`}
                                className="ankur-staff-dial inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold">
                                <Phone className="w-3.5 h-3.5" /> डायल करें
                              </a>
                              <a href={`https://wa.me/91${ord.customerPhone.replace(/[^0-9]/g, '').slice(-10)}?text=${encodeURIComponent(`नमस्ते ${ord.customerName} जी, Ankur Dryice से आपके ऑर्डर #${shortId} (${quantityText(ord)}) के संबंध में सूचना।`)}`}
                                target="_blank" rel="noopener noreferrer"
                                className="ankur-staff-whatsapp inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold">
                                <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                              </a>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
"""
assert '                  </div>' in s[end:end+120]
s=s[:start]+replace+s[end:]
assert "कॉल: {ord.customerPhone}" not in s
assert "phoneMatch" not in s
assert "href={`tel:${ord.customerPhone" in s
assert "revealedContactOrderId === ord.orderId" in s
p.write_text(s,encoding="utf-8")

sheet=Path("ui-fixes/staff-contact-v148.css").read_text(encoding="utf-8")
css_path=Path("src/index.css")
css=css_path.read_text(encoding="utf-8")
assert "ANKUR STAFF CONTACT PRIVACY 1.0.48" not in css
css_path.write_text(css+"\n"+sheet,encoding="utf-8")
print("PASS: no bulk staff-visible phone numbers, one-at-a-time limited reveal, Call/WhatsApp intact; backend PII restriction pending")
