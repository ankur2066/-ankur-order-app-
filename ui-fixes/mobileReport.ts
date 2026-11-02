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
  // The monthly report contains private customer/payment data. Never let a
  // caller escape the app-private cache or choose a non-PDF output path.
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,119}\.pdf$/.test(fileName) || fileName.includes('..')) {
    throw new Error('अमान्य PDF फ़ाइल नाम');
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
    // A validated single PDF filename never needs recursive directory creation.
    recursive: false,
  });
  // The user can choose Files, Drive, WhatsApp or another PDF receiver.
  // Android may not present a "Save" action on every phone; do not claim saved until chosen.
  await Share.share({
    title: 'Ankur Dryice Monthly Report',
    // Use an actual file attachment, not a text URL, for Android PDF receivers.
    files: [result.uri],
    dialogTitle: 'मासिक रिपोर्ट PDF सेव या शेयर करें',
  });
}
