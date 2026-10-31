#!/usr/bin/env python3
"""Make the real pre-existing Firebase OrderForm the first feature on CustomerHome.

No copied booking implementation, checkout changes, price mutations or security changes.
Applied AFTER the premium v1.0.23 patch. Fails fast if the source shape changes.
"""
from pathlib import Path

def replace_once(source: str, before: str, after: str, label: str) -> str:
    count=source.count(before)
    assert count==1, f"{label}: expected 1 match, got {count}"
    return source.replace(before,after,1)

app=Path("src/App.tsx")
s=app.read_text(encoding="utf-8")
s=replace_once(s,
    "          onPromoAction={handlePromoAction}\n        />",
    """          onPromoAction={handlePromoAction}
          bookingForm={
            <OrderForm
              currentUser={currentUser}
              onOrderSuccess={handleOrderSuccess}
              onGoToTrack={handleGoToTrack}
              onGoToMyOrders={() => setCurrentTab('my-orders')}
            />
          }
        />""",
    "reuse real OrderForm on home")
app.write_text(s,encoding="utf-8")

home=Path("src/components/customer/CustomerHome.tsx")
s=home.read_text(encoding="utf-8")
s=replace_once(s,
    "  onPromoAction: (action: PromoAction) => void;\n}",
    "  onPromoAction: (action: PromoAction) => void;\n  /** Actual React/Firebase booking form, never a static mockup. */\n  bookingForm: React.ReactNode;\n}",
    "prop interface")
s=replace_once(s,
    "  onPromoAction,\n}) => {",
    "  onPromoAction,\n  bookingForm,\n}) => {",
    "prop destructuring")

s=replace_once(s,
    "  const tiles: { label:",
    """  const focusBooking = () => {
    document.getElementById('ankur-customer-booking')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const tiles: { label:""",
    "booking CTA focus")
s=replace_once(s,
    "{ label: 'आज की बुकिंग', Icon: Clock, action: () => onBook(null) }",
    "{ label: 'आज की बुकिंग', Icon: Clock, action: focusBooking }",
    "quick action")
s=replace_once(s,
    'className="aqp-spotlight-cta focus-ring" onClick={() => onBook(null)}',
    'className="aqp-spotlight-cta focus-ring" onClick={focusBooking}',
    "prominent hero CTA")
s=replace_once(s,
    '      <main className="aqp-main pt-4 space-y-5">',
    '''      <main className="aqp-main pt-4 space-y-5">
        {/* Existing OrderForm rendered first, with its original auth, Firebase and payment workflow. */}
        <section id="ankur-customer-booking" className="aqp-booking-section mx-3 sm:mx-4" aria-labelledby="aqp-booking-title">
          <div className="aqp-booking-heading">
            <div>
              <span className="aqp-booking-eyebrow">ANKUR DRYICE · ONLINE BOOKING</span>
              <h2 id="aqp-booking-title">अपना ऑर्डर भरें</h2>
              <p>नाम, मोबाइल, शहर, ड्राई आइस की मात्रा और डिलीवरी स्लॉट भरकर बुकिंग करें।</p>
            </div>
            <span className="aqp-booking-icon" aria-hidden="true"><Clock className="w-6 h-6" /></span>
          </div>
          <div className="aqp-booking-form">{bookingForm}</div>
        </section>''',
    "actual form first in main")
home.write_text(s,encoding="utf-8")

css=Path("ui-fixes/customer-home-form-v124.css")
assert css.exists() and css.stat().st_size > 200
p=Path("src/index.css")
original=p.read_text(encoding="utf-8")
assert "ANKUR PREMIUM CUSTOMER FORM v1.0.24" not in original
p.write_text(original+"\n"+css.read_text(encoding="utf-8"),encoding="utf-8")

# Prevent regression to a visual-only form. These refer to original booking handlers.
a=app.read_text(encoding="utf-8")
h=home.read_text(encoding="utf-8")
assert a.count("bookingForm={")==1 and "onOrderSuccess={handleOrderSuccess}" in a
assert "onGoToTrack={handleGoToTrack}" in a
assert "{bookingForm}" in h and h.index("{bookingForm}") < h.index("aqp-spotlight")
assert "ankur-customer-booking" in h
print("PASS: real customer OrderForm shown first, handlers retained, admin/staff/backend unchanged")
