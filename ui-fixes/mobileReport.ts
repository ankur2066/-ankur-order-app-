import { Capacitor } from '@capacitor/core';
import type jsPDF from 'jspdf';

/** Native Android WebView does not reliably support jsPDF's Blob download.
 * Share/Save via Android's system chooser using an app-private cache file.
 */
export async function exportPdf(pdf: jsPDF, fileName: string): Promise<void> {
  if (Capacitor.getPlatform() !== 'android') {
    pdf.save(fileName);
    return;
  }
  const [{ Filesystem, Directory }, { Share }] = await Promise.all([
    import('@capacitor/filesystem'),
    import('@capacitor/share'),
  ]);
  const base64 = pdf.output('datauristring').split(',')[1];
  if (!base64) throw new Error('PDF डेटा तैयार नहीं हुआ');
  const result = await Filesystem.writeFile({
    path: fileName,
    data: base64,
    directory: Directory.Cache,
    recursive: true,
  });
  // The user can choose Files, Drive, WhatsApp or another PDF receiver.
  // Android may not present a "Save" action on every phone; do not claim saved until chosen.
  await Share.share({
    title: 'Ankur Dryice Monthly Report',
    url: result.uri,
    dialogTitle: 'मासिक रिपोर्ट PDF सेव या शेयर करें',
  });
}
