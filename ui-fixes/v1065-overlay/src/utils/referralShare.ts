// A native Capacitor origin (localhost) must never be sent to a customer.
export const REFERRAL_PAGE = 'https://www.ankurdryice.store/refer.html';
export function referralCode(value: unknown): string | null {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{3,128}$/.test(value) ? value : null;
}
export function referralDetails(uid: string, hi = false) {
  const code = referralCode(uid);
  if (!code) throw new Error('Invalid referral code');
  const url = new URL(REFERRAL_PAGE);
  url.searchParams.set('ref', code);
  const text = hi
    ? `Ankur Dryice and Events — ड्राई आइस बुकिंग की जानकारी। रेफरल कोड: ${code}। बुकिंग के समय यह कोड बताएं। इनाम मालिक की पुष्टि पर निर्भर है।`
    : `Ankur Dryice and Events — dry ice booking enquiries. Referral code: ${code}. Mention this code when booking. Rewards require owner confirmation.`;
  return {title:'Ankur Dryice and Events', text, url:url.toString()};
}
export async function shareReferral(
  details: ReturnType<typeof referralDetails>,
  api: {share?: (data: ShareData) => Promise<void>; clipboard?: {writeText: (text:string)=>Promise<void>}}
): Promise<'shared'|'copied'|'cancelled'|'manual'> {
  if (api.share) {
    try { await api.share(details); return 'shared'; }
    catch(error) { if ((error as {name?:string})?.name === 'AbortError') return 'cancelled'; }
  }
  try {
    if (!api.clipboard) return 'manual';
    await api.clipboard.writeText(`${details.text}\n${details.url}`);
    return 'copied';
  } catch { return 'manual'; }
}

/** Native chooser failures never trigger an unexpected clipboard write. */
export async function shareNativeReferral(
  details: ReturnType<typeof referralDetails>,
  share: (details: ReturnType<typeof referralDetails>) => Promise<unknown>
): Promise<'shared'|'cancelled'|'manual'> {
  try { await share(details); return 'shared'; }
  catch(error) {
    const message=String((error as {message?:unknown})?.message||'');
    return (error as {name?:string})?.name==='AbortError'||/cancel(?:led|ed)/i.test(message)
      ? 'cancelled' : 'manual';
  }
}
