import QRCode from 'qrcode';
import { BACKUP_UPI_ID, PRIMARY_UPI_ID, UPI_MERCHANT_NAME } from '../config/businessConfig';

function upiUri(payee: string, amount?: number): string {
  const params = new URLSearchParams({ pa: payee, pn: UPI_MERCHANT_NAME, cu: 'INR' });
  if (Number.isFinite(amount) && (amount || 0) > 0) params.set('am', Number(amount).toFixed(2));
  return `upi://pay?${params.toString()}`;
}

export const primaryUpiUri = (amount?: number) => upiUri(PRIMARY_UPI_ID, amount);
export const backupUpiUri = (amount?: number) => upiUri(BACKUP_UPI_ID, amount);

export async function makePrimaryUpiQr(amount?: number): Promise<string> {
  return QRCode.toDataURL(primaryUpiUri(amount), { errorCorrectionLevel: 'M', margin: 2, width: 256 });
}
