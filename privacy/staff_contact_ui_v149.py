#!/usr/bin/env python3
"""Finish staff v1.0.49 privacy card: phone only from one authorized callable response."""
from pathlib import Path
p=Path("src/components/StaffDashboard.tsx")
s=p.read_text(encoding="utf-8")
def once(old,new,label):
    global s
    assert s.count(old)==1,(label,s.count(old))
    s=s.replace(old,new,1)

once("            const shortId = ord.orderId.split('-').pop() || ord.orderId;",
     "            const shortId = ord.orderId.split('-').pop() || ord.orderId;\n            const contactKey = (staffSource(ord) || 'unknown') + '_' + ord.orderId;",
     'one contact key')
start=s.index("                    {ord.customerPhone && (")
end=s.index("                  </div>\n\n                  {/* Quantity & Dispatch Note */}",start)
safe="""                    <div className="ankur-staff-contact mt-2">
                      <button type="button"
                        onClick={() => { void openOneContact(ord); }}
                        aria-expanded={contact?.key === contactKey}
                        aria-label="इस एक ऑर्डर के ग्राहक से संपर्क करें"
                        className="ankur-staff-call-trigger inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-extrabold">
                        <Phone className="w-4 h-4" aria-hidden="true"/>
                        {contact?.key === contactKey ? 'नंबर छिपाएँ' : 'कॉल करें'}
                      </button>
                      {contact?.key === contactKey && (
                        <div role="group" aria-label="केवल चयनित ऑर्डर का संपर्क"
                          className="ankur-staff-contact-revealed mt-2 rounded-xl border p-3 space-y-2">
                          <p className="font-semibold text-xs">अधिकृत नंबर — 15 सेकंड में अपने-आप छिपेगा।</p>
                          <p className="font-mono text-base font-black">{contact.phone}</p>
                          <div className="flex flex-wrap gap-2">
                            <a href={'tel:' + contact.phone}
                              className="ankur-staff-dial inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold">
                              <Phone className="w-3.5 h-3.5" /> डायल करें
                            </a>
                            <a href={'https://wa.me/' + contact.phone.replace(/[^0-9]/g, '') +
                              '?text=' + encodeURIComponent('नमस्ते ' + ord.customerName + ' जी, Ankur Dryice से आपके ऑर्डर #' + shortId + ' (' + quantityText(ord) + ') के संबंध में सूचना।')}
                              target="_blank" rel="noopener noreferrer"
                              className="ankur-staff-whatsapp inline-flex items-center gap-1 px-3 py-2 rounded-lg text-xs font-bold">
                              <MessageCircle className="w-3.5 h-3.5" /> WhatsApp
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
"""
s=s[:start]+safe+s[end:]
address_start=s.index("<span>{ord.address ? ")
address_end=s.index("</span>",address_start)+len("</span>")
s=s[:address_start]+"                       <span>{ord.city || 'शहर दर्ज नहीं'}</span>"+s[address_end:]
assert 'ord.customerPhone' not in s and 'revealedContactOrderId' not in s
assert "onClick={() => { void openOneContact(ord); }}" in s
assert "contact?.key === contactKey" in s
assert "href={'tel:' + contact.phone}" in s
assert "handleSelfPickup" in s and "handleUpdateStatus" in s
p.write_text(s,encoding="utf-8")
print('PASS: staff can reveal ONE callable-authorized contact for 15s; no bulk phone UI')
