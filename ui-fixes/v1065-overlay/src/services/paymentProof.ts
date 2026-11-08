import { doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

const TARGET_BYTES = 150 * 1024;
const MAX_BYTES = 230 * 1024;

function readAsImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not read payment image')); };
    image.src = url;
  });
}

export async function compressPaymentProof(file: File): Promise<{ dataUrl: string; sizeBytes: number }> {
  if (!file.type.startsWith('image/')) throw new Error('Payment proof must be an image');
  const image = await readAsImage(file);
  const canvas = document.createElement('canvas');
  let scale = Math.min(1, 1800 / Math.max(image.naturalWidth, image.naturalHeight));
  let quality = 0.82;
  let dataUrl = '';
  let sizeBytes = 0;
  for (let attempt = 0; attempt < 14; attempt += 1) {
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Image compression is unavailable');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    sizeBytes = Math.ceil((dataUrl.length - dataUrl.indexOf(',') - 1) * 0.75);
    if (sizeBytes <= TARGET_BYTES) break;
    if (quality > 0.42) quality -= 0.1;
    else scale *= 0.82;
  }
  if (!dataUrl.startsWith('data:image/jpeg;base64,') || sizeBytes > MAX_BYTES) {
    throw new Error('Payment image could not be compressed below 230 KB');
  }
  return { dataUrl, sizeBytes };
}

export async function savePaymentProof(orderId: string, file: File, uid: string) {
  const proof = await compressPaymentProof(file);
  await setDoc(doc(db, 'orders', orderId, 'paymentProof', 'latest'), {
    ...proof,
    contentType: 'image/jpeg',
    uploadedBy: uid,
    createdAt: serverTimestamp(),
  });
  return proof;
}
