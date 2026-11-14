// v1.0.66 hotfix: customer-facing copy for the booking form that depends on
// runtime state (submit errors, average-rate note). Pure functions so they are
// unit-tested without a browser (src/utils/orderFormCopy.test.ts).

export type OrderLanguage = 'en' | 'hi';
export type OrderSubmitErrorKind = 'permission' | 'network';

export const ORDER_CALL_DISPLAY = '95808 82066';
export const ORDER_WHATSAPP_DISPLAY = '88963 32066';

/**
 * Firestore rejects a write that the published Security Rules do not allow with
 * code "permission-denied". That is NOT a connection problem: retrying from the
 * same phone will fail again until the owner publishes matching rules. Every
 * other failure (offline, unavailable, deadline-exceeded, unknown) keeps the
 * existing offline-retry behaviour.
 */
export function classifyOrderSubmitError(error: unknown): OrderSubmitErrorKind {
  const code = typeof error === 'object' && error !== null && 'code' in error
    ? String((error as { code?: unknown }).code ?? '') : '';
  const message = error instanceof Error ? error.message : String(error ?? '');
  if (code === 'permission-denied' || code === 'firestore/permission-denied' ||
      /missing or insufficient permissions/i.test(message)) return 'permission';
  return 'network';
}

export function orderSubmitErrorMessage(kind: OrderSubmitErrorKind, language: OrderLanguage): string {
  if (kind === 'permission') {
    return language === 'en'
      ? `Order server refused this order (permission). No order was created. Please tell the owner — Call ${ORDER_CALL_DISPLAY} or WhatsApp ${ORDER_WHATSAPP_DISPLAY}.`
      : `ऑर्डर सर्वर ने मना कर दिया (permission)। ऑर्डर नहीं बना। कृपया मालिक को बताएं — कॉल ${ORDER_CALL_DISPLAY} या WhatsApp ${ORDER_WHATSAPP_DISPLAY}।`;
  }
  return language === 'en'
    ? 'Connection failed. Your order details are saved on this device. Check the connection and tap Place Order to retry.'
    : 'इंटरनेट कनेक्शन नहीं है। ऑर्डर की जानकारी इस फ़ोन में सेव है। इंटरनेट आने पर दोबारा ऑर्डर बटन दबाएँ।';
}

/** True when a read was refused by Security Rules (used for the pre-submit duplicate check). */
export function isPermissionDenied(error: unknown): boolean {
  return classifyOrderSubmitError(error) === 'permission';
}

/**
 * Small note under the total. It only restates total ÷ quantity, so it is
 * labelled as an average and says what that average includes. Price logic is
 * unchanged; this is copy only.
 */
export function averageRateNote(unitRate: number, opts: { thermocolIncluded: boolean; transportRate: number }, language: OrderLanguage): string {
  const rate = Math.round((Number.isFinite(unitRate) ? unitRate : 0) * 100) / 100;
  const packing = opts.thermocolIncluded;
  const transport = (opts.transportRate || 0) > 0;
  if (language === 'en') {
    const what = packing && transport ? 'incl. packing and transport' : packing ? 'incl. packing' : transport ? 'incl. transport' : 'dry ice only';
    return `(average ₹${rate}/kg, ${what})`;
  }
  const what = packing && transport ? 'पैकिंग और परिवहन सहित' : packing ? 'पैकिंग सहित' : transport ? 'परिवहन सहित' : 'केवल ड्राई आइस';
  return `(औसत ₹${rate}/kg, ${what})`;
}
