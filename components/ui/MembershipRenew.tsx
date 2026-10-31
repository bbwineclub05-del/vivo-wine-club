'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';

/**
 * Rinnovare la tessera.
 *
 * Una casella sola: l'indirizzo con cui ci si è iscritti. Il prezzo lo
 * decide il server leggendo la riga della persona — venti euro se
 * rinnova in anticipo, trenta dopo — perché un prezzo che arriva dal
 * browser è un prezzo che chiunque può riscrivere.
 *
 * È la pagina a cui portano i promemoria automatici.
 */
const FIELD =
  'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body text-on-paper ' +
  'placeholder:text-on-paper-muted/60 transition-colors focus:border-accent/50 focus:outline-none [font-size:16px]';

export function MembershipRenew() {
  const t = useTranslations('membership');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/memberships/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.status === 404) {
        setError(t('renewNotFound'));
        return;
      }
      if (!res.ok || !data.url) throw new Error(data.error ?? t('errGeneric'));
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errGeneric'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <p className="text-lead text-on-paper-muted">{t('renewBody')}</p>
      <label className="block">
        <span className="mb-2 block text-fine font-medium">{t('labelEmail')}</span>
        <input
          type="email"
          required
          autoFocus
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          className={FIELD}
          autoComplete="email"
        />
      </label>
      {error && <p className="text-fine font-medium text-accent">{error}</p>}
      <button
        type="submit"
        disabled={loading || !email.includes('@')}
        className="inline-flex min-h-[56px] items-center justify-center self-start rounded-full bg-accent px-8 text-fine font-medium text-paper transition-colors hover:bg-accent-lift disabled:opacity-50"
      >
        {loading ? t('joining') : t('renewCta')}
      </button>
    </form>
  );
}
