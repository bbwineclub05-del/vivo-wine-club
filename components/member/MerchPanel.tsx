'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Check, Copy, ShoppingBag } from 'lucide-react';

/**
 * Il 15% sul merch.
 *
 * Non un secondo negozio dentro l'area del socio — significherebbe
 * tenere allineati due cataloghi, due listini e due magazzini — ma il
 * codice personale e il collegamento al negozio vero. Un tocco copia
 * il codice, il tocco dopo apre la pagina: al carrello si incolla e
 * basta.
 */

export default function MerchPanel({ token }: { token: string }) {
  const t = useTranslations('member');
  const [code, setCode] = useState<string | null>(null);
  const [percent, setPercent] = useState(15);
  const [copiato, setCopiato] = useState(false);
  const [caricato, setCaricato] = useState(false);

  const carica = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/member/discount', { headers: { Authorization: `Bearer ${token}` } });
      const j = await res.json();
      if (j.code) { setCode(j.code); setPercent(j.percent ?? 15); }
    } catch {
      /* senza codice, il riquadro non compare */
    } finally {
      setCaricato(true);
    }
  }, [token]);

  useEffect(() => { carica(); }, [carica]);

  function copia() {
    if (!code) return;
    navigator.clipboard.writeText(code).then(() => {
      setCopiato(true);
      setTimeout(() => setCopiato(false), 2500);
    }).catch(() => {});
  }

  if (!caricato || !code) return null;

  return (
    <div className="rounded-2xl border border-rule-paper p-5">
      <div className="flex items-start gap-4">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
          <ShoppingBag size={19} strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-body font-medium">{t('merchTitolo', { percent })}</p>
          <p className="mt-1.5 text-fine text-on-paper-muted">{t('merchCorpo')}</p>
        </div>
      </div>

      <button
        onClick={copia}
        className="mt-4 flex w-full items-center justify-between gap-3 rounded-2xl border border-dashed border-accent/40 bg-accent/[0.04] px-4 py-3.5 text-left"
      >
        <span className="ds-numeric truncate text-[19px] font-medium tracking-[0.06em] text-accent">
          {code}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 text-fine text-on-paper-muted">
          {copiato ? <Check size={15} strokeWidth={2.4} /> : <Copy size={15} strokeWidth={1.9} />}
          {copiato ? t('merchCopiato') : t('merchCopia')}
        </span>
      </button>

      <Link
        href="/wear-the-club"
        className="mt-3 inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-accent px-5 text-fine font-medium text-paper transition-opacity hover:opacity-90"
      >
        {t('merchVai')}
      </Link>

      <p className="mt-3 text-fine text-on-paper-muted">{t('merchDove')}</p>
    </div>
  );
}
