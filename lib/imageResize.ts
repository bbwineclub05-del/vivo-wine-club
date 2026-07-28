/**
 * Downscale + re-encode an image file client-side before sending it to the
 * API — phone photos can be several MB, and only ~1500px on the long edge is
 * useful for reading a label anyway.
 */
export interface ResizedImage {
  base64:   string; // no "data:...;base64," prefix
  dataUrl:  string; // for local <img> preview
  mediaType: 'image/jpeg';
}

export function resizeImageForUpload(file: File, maxDim = 1568, quality = 0.85): Promise<ResizedImage> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) { reject(new Error('Canvas not supported')); return; }
      ctx.drawImage(img, 0, 0, w, h);

      const dataUrl = canvas.toDataURL('image/jpeg', quality);
      const base64 = dataUrl.split(',')[1] ?? '';
      resolve({ base64, dataUrl, mediaType: 'image/jpeg' });
    };
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Impossibile leggere il file immagine'));
    };
    img.src = objectUrl;
  });
}
