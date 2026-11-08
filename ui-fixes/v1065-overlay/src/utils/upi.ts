import QRCode from 'qrcode';
import { BACKUP_UPI_ID, PRIMARY_UPI_ID, UPI_MERCHANT_NAME } from '../config/businessConfig.ts';

function upiUri(payee: string, amount?: number, orderId?: string): string {
  const params = new URLSearchParams({ pa: payee, pn: UPI_MERCHANT_NAME, cu: 'INR' });
  if (Number.isFinite(amount) && (amount || 0) > 0) params.set('am', Number(amount).toFixed(2));
  if (orderId) params.set('tn', `Order ${orderId}`);
  return `upi://pay?${params.toString()}`;
}

export const primaryUpiUri = (amount?: number, orderId?: string) => upiUri(PRIMARY_UPI_ID, amount, orderId);
export const backupUpiUri = (amount?: number, orderId?: string) => upiUri(BACKUP_UPI_ID, amount, orderId);

export async function makePrimaryUpiQr(amount?: number, orderId?: string): Promise<string> {
  return QRCode.toDataURL(primaryUpiUri(amount, orderId), { errorCorrectionLevel: 'M', margin: 2, width: 256 });
}
