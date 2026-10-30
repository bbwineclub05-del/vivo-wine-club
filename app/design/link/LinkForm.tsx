'use client';

import { useState } from 'react';
import Image from 'next/image';

/**
 * Una clip e il suo indirizzo.
 *
 * Si incolla il link del post e si esce dal campo: salva da solo e
 * lo dice. Niente pulsante «salva» in fondo alla pagina, perche' con
 * dieci clip si finisce per non sapere piu' quali sono state salvate.
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
  const [stato, setStato] = useState<'fermo' | 'salvo' | 'fatto' | 'errore'>('fermo');
  const [errore, setErrore] = useState('');

  async function salva() {
    if (url.trim() === iniziale.trim() && stato === 'fermo') return;
    setStato('salvo');
    setErrore('');
    try {
      const res = await fetch('/api/dev/link-clip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, url }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(d.error ?? 'Non salvato.');
      setStato('fatto');
    } catch (e) {
      setStato('errore');
      setErrore(e instanceof Error ? e.message : 'Non salvato.');
    }
  }

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
          onChange={(e) => { setUrl(e.target.value); setStato('fermo'); }}
          onBlur={salva}
          onKeyDown={(e) => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }}
          className="mt-2.5 w-full rounded-xl border border-rule-paper bg-paper px-3.5 py-2.5 text-fine [font-size:16px] focus:border-accent/50 focus:outline-none"
        />

        <p className="mt-1.5 h-4 text-fine">
          {stato === 'salvo' && <span className="text-on-paper-muted">salvo…</span>}
          {stato === 'fatto' && <span className="text-accent">salvato</span>}
          {stato === 'errore' && <span className="text-accent">{errore}</span>}
        </p>
      </div>
    </li>
  );
}
