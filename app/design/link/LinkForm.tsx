'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Image from 'next/image';

/**
 * Una clip e il suo indirizzo.
 *
 * Salva da solo poco dopo che si smette di scrivere, e di nuovo
 * uscendo dal campo. La prima versione salvava solo all'uscita: chi
 * incollava e premeva Invio si ritrovava il campo pieno e il file
 * vuoto, senza che niente glielo dicesse. Adesso il salvataggio non
 * dipende da come si lascia il campo, e la riga dice sempre a che
 * punto e'.
 */
export function LinkForm({
  nome,
  poster,
  src,
  iniziale,
}: {
  nome: string;
  poster?: string;
  src?: string;
  iniziale: string;
}) {
  const [url, setUrl] = useState(iniziale);
  const [stato, setStato] = useState<'fermo' | 'salvo' | 'fatto' | 'errore'>(
    iniziale ? 'fatto' : 'fermo',
  );
  const [errore, setErrore] = useState('');
  const salvato = useRef(iniziale);
  const attesa = useRef<ReturnType<typeof setTimeout> | null>(null);

  const salva = useCallback(async (valore: string) => {
    if (valore.trim() === salvato.current.trim()) return;
    setStato('salvo');
    setErrore('');
    try {
      const res = await fetch('/api/dev/link-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, url: valore }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Non salvato.');
      salvato.current = valore;
      setStato('fatto');
    } catch (e) {
      setStato('errore');
      setErrore(e instanceof Error ? e.message : 'Non salvato.');
    }
  }, [nome]);

  /* Mezzo secondo dopo l'ultimo tasto: chi incolla un indirizzo non
     deve fare altro. */
  useEffect(() => {
    if (attesa.current) clearTimeout(attesa.current);
    if (url.trim() === salvato.current.trim()) return;
    attesa.current = setTimeout(() => salva(url), 500);
    return () => {
      if (attesa.current) clearTimeout(attesa.current);
    };
  }, [url, salva]);

  const segno =
    stato === 'salvo' ? 'salvo…'
      : stato === 'fatto' ? 'salvato'
        : stato === 'errore' ? errore
          : url.trim() ? 'da salvare' : '';

  return (
    <li className="flex gap-5 border-b border-rule-paper py-5">
      <div className="relative h-24 w-20 shrink-0 overflow-hidden rounded-xl bg-ink-soft">
        {poster && <Image src={poster} alt="" fill sizes="80px" className="object-cover" />}
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-body font-medium">{nome}</p>
        <p className="text-fine text-on-paper-muted">{src ? 'video' : 'foto'}</p>

        <input
          type="url"
          value={url}
          placeholder="https://www.instagram.com/p/…"
          onChange={(e) => setUrl(e.target.value)}
          onBlur={() => salva(url)}
          className="mt-2.5 w-full rounded-xl border border-rule-paper bg-paper px-3.5 py-2.5 text-fine [font-size:16px] focus:border-accent/50 focus:outline-none"
        />

        <p className={`mt-1.5 h-4 text-fine ${stato === 'fatto' ? 'text-accent' : 'text-on-paper-muted'}`}>
          {segno}
        </p>
      </div>
    </li>
  );
}
