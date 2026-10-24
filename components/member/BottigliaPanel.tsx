'use client';

import { useCallback, useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Wine } from 'lucide-react';

/**
 * "Una bottiglia al mese": per ora si alza la mano, non si paga.
 *
 * È una proposta, non un prodotto: un abbonamento ricorrente vuole
 * webhook, carte che scadono, spedizioni e resi, e metterlo in piedi
 * prima di sapere quante persone lo vogliono è il modo più rapido per
 * costruire un servizio in perdita. Qui si misura l'interesse; se i
 * numeri reggono, si costruisce.
 */

const SCELTE = [
  { id: 'rosso', key: 'bottigliaRossi' },
  { id: 'bianco', key: 'bottigliaBianchi' },
  { id: 'misto', key: 'bottigliaMisto' },
] as const;

export default function BottigliaPanel({ token, name }: { token: string; name: string }) {
  const t = useTranslations('member');
  const [scelta, setScelta] = useState<string>('misto');
  const [dentro, setDentro] = useState(false);
  const [caricato, setCaricato] = useState(false);
  const [occupato, setOccupato] = useState(false);

  const carica = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/bottle-interest', { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j.interest) {
        setDentro(true);
        setScelta(j.interest.preference ?? 'misto');
      }
    } catch {
      /* il riquadro resta nello stato di partenza */
    } finally {
      setCaricato(true);
    }
  }, [token]);

  useEffect(() => { carica(); }, [carica]);

  async function alzaLaMano(preference: string) {
    setOccupato(true);
    try {
      const res = await fetch('/api/bottle-interest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ preference, full_name: name }),
      });
      if (res.ok) { setDentro(true); setScelta(preference); }
    } finally {
      setOccupato(false);
    }
  }

  async function ciHoRipensato() {
    setOccupato(true);
    try {
      const res = await fetch('/api/bottle-interest', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) setDentro(false);
    } finally {
      setOccupato(false);
    }
  }

  if (!caricato) return null;

  return (
    <div className="rounded-2xl border border-accent/30 bg-accent/[0.06] p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
          <Wine size={19} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium">{t('bottigliaTitolo')}</p>
          <p className="mt-1.5 text-fine text-on-paper-muted">{t('bottigliaCorpo')}</p>
        </div>
      </div>

      {dentro ? (
        <div className="mt-4">
          <p className="inline-flex items-center gap-2 text-fine text-accent">
            <Check size={15} strokeWidth={2.4} />
            {t('bottigliaDentro')} · {t(SCELTE.find((s) => s.id === scelta)?.key ?? 'bottigliaMisto')}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {SCELTE.map((s) => (
              <button
                key={s.id}
                onClick={() => alzaLaMano(s.id)}
                disabled={occupato}
                aria-pressed={scelta === s.id}
                className={`inline-flex min-h-[44px] items-center rounded-full border px-4 text-fine font-medium transition-colors ${
                  scelta === s.id ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                }`}
              >
                {t(s.key)}
              </button>
            ))}
          </div>
          <button
            onClick={ciHoRipensato}
            disabled={occupato}
            className="mt-3 text-fine text-on-paper-muted underline underline-offset-2"
          >
            {t('bottigliaRipensato')}
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <p className="mb-2 text-fine text-on-paper-muted">{t('bottigliaDomanda')}</p>
          <div className="flex flex-wrap gap-2">
            {SCELTE.map((s) => (
              <button
                key={s.id}
                onClick={() => alzaLaMano(s.id)}
                disabled={occupato}
                className="inline-flex min-h-[48px] items-center rounded-full bg-accent px-5 text-fine font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {t(s.key)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
