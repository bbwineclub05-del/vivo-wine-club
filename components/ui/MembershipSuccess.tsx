'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

/**
 * Il ritorno da Stripe.
 *
 * Non si dà per buono che il pagamento sia andato solo perché il
 * browser è atterrato qui: questo indirizzo lo può aprire chiunque.
 * Si chiede al server di verificarlo con Stripe, e solo allora si
 * sposta la scadenza.
 */
export function MembershipSuccess({ sessionId }: { sessionId: string | null }) {
  const t = useTranslations('membership');
  // Senza sessione non c'e' niente da verificare: lo stato parte gia'
  // sbagliato invece di passare da "controllo" e correggersi subito.
  const [state, setState] = useState<'checking' | 'ok' | 'failed'>(
    sessionId ? 'checking' : 'failed',
  );
  const [card, setCard] = useState<{ member_id: string | null; expires_at: string } | null>(null);

  useEffect(() => {
    if (!sessionId) return;
    let annullato = false;

    (async () => {
      try {
        const res = await fetch('/api/memberships/confirm', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId }),
        });
        const data = await res.json().catch(() => ({}));
        if (annullato) return;
        if (!res.ok) {
          setState('failed');
          return;
        }
        setCard(data.membership ?? null);
        setState('ok');
      } catch {
        if (!annullato) setState('failed');
      }
    })();

    return () => {
      annullato = true;
    };
  }, [sessionId]);

  if (state === 'checking') {
    return <p className="text-lead text-on-paper-muted">{t('paidChecking')}</p>;
  }

  if (state === 'failed') {
    return (
      <>
        <p className="text-lead text-on-paper-muted">{t('paidFailed')}</p>
        <Link
          href="/membership"
          className="mt-8 inline-flex min-h-[52px] items-center rounded-full border border-rule-paper px-6 text-fine font-medium transition-colors hover:border-accent/40"
        >
          {t('backToHome')}
        </Link>
      </>
    );
  }

  const expires = card?.expires_at
    ? (() => {
        const [y, m, d] = card.expires_at.slice(0, 10).split('-');
        const mesi = ['gennaio','febbraio','marzo','aprile','maggio','giugno',
                      'luglio','agosto','settembre','ottobre','novembre','dicembre'];
        return `${Number(d)} ${mesi[Number(m) - 1]} ${y}`;
      })()
    : '';

  return (
    <>
      <p className="ds-display text-[28px] leading-tight tracking-[-0.02em]">{t('paidHeading')}</p>
      <p className="mt-4 text-lead text-on-paper-muted">
        {t('paidBody', { memberId: card?.member_id ?? '', expires })}
      </p>
      <Link
        href="/"
        className="mt-8 inline-flex min-h-[52px] items-center rounded-full border border-rule-paper px-6 text-fine font-medium transition-colors hover:border-accent/40"
      >
        {t('backToHome')}
      </Link>
    </>
  );
}
