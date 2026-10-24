'use client';

/**
 * Rimpicciolire una foto prima di spedirla.
 *
 * Una foto scattata col telefono pesa fra i tre e i dieci megabyte, e
 * il server ne accetta quattro e mezzo: dal telefono — cioè da dove si
 * scattano le foto — il caricamento falliva quasi sempre, senza che
 * niente spiegasse perché. Qui l'immagine viene ridisegnata su una
 * tela alla dimensione che serve davvero e riesce in JPEG: resta sotto
 * il mezzo megabyte e parte anche con due tacche di rete.
 *
 * Il ridimensionamento sul server resta dov'è: è la seconda rete, per
 * quello che arriva da altre strade.
 */

export async function resizeImage(
  file: File,
  { maxSide = 1600, quality = 0.85 }: { maxSide?: number; quality?: number } = {},
): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const scala = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scala);
  const h = Math.round(bitmap.height * scala);

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Il browser non riesce a leggere questa immagine.');
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((risolvi) =>
    canvas.toBlob(risolvi, 'image/jpeg', quality),
  );
  if (!blob) throw new Error('Conversione non riuscita.');

  return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' });
}
