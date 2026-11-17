/**
 * v1.0.76 (Ankur, 14 Nov 2026): staff "कॉल करें" on the order-update screen did
 * nothing useful. It asked the Cloud Function `ankurGetOneOrderContact` for the
 * number, but the project runs on the Spark plan (no Cloud Functions deployed)
 * and the call also needed App Check, so it always failed with "no permission"
 * and the dialer never opened.
 *
 * The staff projection already carries `waPhone` (10-digit customer number the
 * owner approved for staff on 12 Nov 2026, used by "Customer ko WhatsApp").
 * The Call button now dials that number directly.
 */

/** 10-digit Indian mobile (or +91/91/0 prefixed) -> "tel:+91XXXXXXXXXX"; '' if not valid. */
export function staffDialHref(phone: unknown): string {
  if (typeof phone !== 'string') return '';
  const digits = phone.replace(/[^0-9]/g, '');
  const ten = digits.length === 12 && digits.startsWith('91') ? digits.slice(2)
    : digits.length === 11 && digits.startsWith('0') ? digits.slice(1)
    : digits;
  return /^[6-9][0-9]{9}$/.test(ten) ? 'tel:+91' + ten : '';
}

/** "98765 43210" for display. */
export function staffDialDisplay(href: string): string {
  const ten = href.replace(/^tel:\+91/, '');
  return /^[0-9]{10}$/.test(ten) ? ten.slice(0, 5) + ' ' + ten.slice(5) : '';
}

/**
 * Opens the phone dialer. Inside the Capacitor APK a top-level navigation to a
 * tel: URL is handed to Android as an ACTION_VIEW intent (the dialer); in a
 * browser it opens the default calling app. Returns false when nothing to dial.
 */
export function openDialer(href: string, loc: { href: string } | null = typeof window !== 'undefined' ? window.location : null): boolean {
  if (!href.startsWith('tel:') || !loc) return false;
  loc.href = href;
  return true;
}
