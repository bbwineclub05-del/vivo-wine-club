'use client';

import { useRef, useState } from 'react';
import { ImagePlus, Loader2, X } from 'lucide-react';

/**
 * Le foto di un prodotto, di una variante o di una combinazione.
 *
 * Il cestino su ogni foto appariva solo al passaggio del mouse: su un
 * telefono non c'era modo di togliere un'immagine caricata per
 * sbaglio. Adesso è un pulsante vero, sempre visibile.
 */
export function ImageUploader({
  images,
  onChange,
  token,
  label = 'Immagini',
}: {
  images: string[];
  onChange: (imgs: string[]) => void;
  token: string;
  label?: string;
}) {
  const [caricando, setCaricando] = useState(false);
  const [errore, setErrore] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function carica(files: FileList | null) {
    if (!files || files.length === 0) return;
    setCaricando(true);
    setErrore('');
    try {
      const nuove: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'products');
        const res = await fetch('/api/media/upload', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          setErrore(data.error ?? 'Non sono riuscito a caricare l’immagine.');
          return;
        }
        nuove.push(data.url);
      }
      onChange([...images, ...nuove]);
    } catch {
      setErrore('Errore di rete durante il caricamento.');
    } finally {
      setCaricando(false);
    }
  }

  return (
    <div>
      <p className="mb-2 text-fine font-medium text-on-paper">{label}</p>

      {images.length > 0 && (
        <ul className="mb-3 flex flex-wrap gap-2">
          {images.map((url, i) => (
            <li key={`${url}-${i}`} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt=""
                className="h-20 w-20 rounded-2xl border border-rule-paper object-cover"
              />
              <button
                type="button"
                aria-label="Togli questa foto"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute -right-1.5 -top-1.5 grid h-7 w-7 place-items-center rounded-full border border-rule-paper bg-paper text-on-paper shadow-sm transition-colors hover:border-accent hover:text-accent"
              >
                <X size={14} strokeWidth={2} />
              </button>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={caricando}
        className="flex min-h-[48px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-rule-paper text-fine font-medium text-on-paper-muted transition-colors hover:border-accent/50 hover:text-accent disabled:opacity-50"
      >
        {caricando ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} strokeWidth={1.8} />}
        {caricando ? 'Carico…' : 'Aggiungi foto'}
      </button>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          setErrore('');
          carica(e.target.files);
        }}
      />

      {errore && <p className="mt-2 text-fine text-accent">{errore}</p>}
    </div>
  );
}
