'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Grape, Lock, MapPin, Percent, Shirt, Star, Ticket,
} from 'lucide-react';
import MembershipCard from '@/components/MembershipCard';
import { benefitsFor } from '@/lib/member-benefits';
import { Head, Panel } from '@/components/member/MemberShell';
import BottigliaPanel from '@/components/member/BottigliaPanel';

/**
 * La tessera, e cosa ci si fa.
 *
 * In cima la cosa che va capita adesso: la membership vera parte il
 * 1° gennaio 2027, e chi c'era prima la paga venti invece di trenta.
 * Non è una promozione da nascondere in fondo a una pagina: è il
 * motivo per cui questa gente si è fidata per prima, e si scrive
 * grande.
 */

const ICONE = {
  grapes: Grape, ticket: Ticket, lock: Lock, map: MapPin,
  shirt: Shirt, percent: Percent, star: Star,
};

interface Tessera {
  member_id: string | null;
  full_name: string | null;
  tier: string;
  started_at: string;
  expires_at: string;
  status: 'active' | 'expiring' | 'expired' | 'cancelled';
  daysLeft: number;
}

interface Rinnovo {
  cents: number;
  fullCents: number;
  discounted: boolean;
  offerUntil: string | null;
}

function eur(cents: number) {
  return `${Math.floor(cents / 100)}${cents % 100 ? ',' + String(cents % 100).padStart(2, '0') : ''} €`;
}

function fmtDate(iso: string, locale: string) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

export default function TesseraSection({ token, name }: { token: string; name: string }) {
  const t = useTranslations('member');
  const locale = useLocale();
  const [tessera, setTessera] = useState<Tessera | null>(null);
  const [rinnovo, setRinnovo] = useState<Rinnovo | null>(null);
  const [card, setCard] = useState<{ memberId: string; name: string; tier: string; memberSince: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [pagando, setPagando] = useState(false);
  const [errore, setErrore] = useState('');
  const cardRef = useRef<HTMLDivElement>(null);

  const carica = useCallback(async () => {
    if (!token) return;
    try {
      const [mine, cardRes] = await Promise.all([
        fetch('/api/memberships/me', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/member/card', { headers: { Authorization: `Bearer ${token}` } }),
      ]);
      const j = await mine.json();
      setTessera(j.membership ?? null);
      setRinnovo(j.renewal ?? null);
      const c = await cardRes.json();
      if (c.memberId) setCard(c);
    } catch {
      /* lo stato vuoto dice già cosa fare */
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { carica(); }, [carica]);

  async function rinnova() {
    setPagando(true);
    setErrore('');
    try {
      const res = await fetch('/api/memberships/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Non riesco ad aprire il pagamento.');
      window.location.href = data.url;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore.');
      setPagando(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const primoNome = (name || '').trim().split(' ')[0];
  const data = (iso: string) => fmtDate(iso, locale);

  return (
    <>
      <Head title={primoNome ? t('ciao', { name: primoNome }) : t('tesseraTitolo')} />

      {/* ── Il banner: cosa succede il 1° gennaio ── */}
      {tessera && rinnovo && (
        <div className="mb-5 overflow-hidden rounded-2xl bg-accent text-paper">
          <div className="p-5 lg:p-7">
            <p className="text-fine uppercase tracking-[0.18em] opacity-80">{t('bannerSopra')}</p>

            <p className="ds-display mt-3 text-[26px] leading-[1.05] tracking-[-0.02em] lg:text-[34px]">
              {rinnovo.discounted
                ? t('bannerPrezzo', { price: eur(rinnovo.cents), full: eur(rinnovo.fullCents) })
                : t('bannerPrezzoPieno', { price: eur(rinnovo.cents) })}
            </p>

            <p className="mt-3 max-w-[52ch] text-body opacity-90">
              {rinnovo.discounted ? t('bannerFedelta') : t('bannerNormale')}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={rinnova}
                disabled={pagando}
                className="inline-flex min-h-[52px] items-center justify-center rounded-full bg-paper px-6 text-fine font-medium text-accent transition-opacity hover:opacity-90 disabled:opacity-60"
              >
                {pagando ? t('rinnovaInCorso') : t('rinnova', { price: eur(rinnovo.cents) })}
              </button>
              <span className="text-fine opacity-80">
                {t('scadeIl', { date: data(tessera.expires_at) })}
              </span>
            </div>

            {rinnovo.discounted && rinnovo.offerUntil && (
              <p className="mt-3 text-fine opacity-80">
                {t('offertaFino', { date: data(rinnovo.offerUntil), full: eur(rinnovo.fullCents) })}
              </p>
            )}

            {errore && <p className="mt-3 text-fine font-medium">{errore}</p>}
          </div>
        </div>
      )}

      {/* ── La tessera ── */}
      {card && (
        <Panel className="mb-5">
          <div className="mx-auto w-full max-w-[340px]">
            <MembershipCard {...card} cardRef={cardRef} />
          </div>
          {tessera && (
            <p className="mt-4 text-center text-fine text-on-paper-muted">
              {t('socioDal', { start: data(tessera.started_at), end: data(tessera.expires_at) })}
            </p>
          )}
        </Panel>
      )}

      {!tessera && (
        <Panel className="mb-5">
          <p className="text-body">{t('nessunaTessera')}</p>
          <p className="mt-2 text-fine text-on-paper-muted">{t('nessunaTesseraAiuto')}</p>
        </Panel>
      )}

      {/* ── Cosa comprende ── */}
      <h3 className="ds-display mb-4 mt-8 text-[20px] leading-none tracking-[-0.02em]">
        {t('cosaTiDa')}
      </h3>

      <div className="grid gap-3 lg:grid-cols-2">
        {benefitsFor(locale).map((b) => {
          const Icon = ICONE[b.icon];
          return (
            <div key={b.id} className="flex gap-4 rounded-2xl border border-rule-paper p-5">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                <Icon size={19} strokeWidth={1.8} />
              </span>
              <div className="min-w-0">
                <p className="text-body font-medium">{b.title}</p>
                <p className="mt-1.5 text-fine text-on-paper-muted">{b.body}</p>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-fine text-on-paper-muted">{t('welcomePack')}</p>

      {/* Quello che forse faremo, se lo volete. */}
      <div className="mt-6">
        <BottigliaPanel token={token} name={name} />
      </div>
    </>
  );
}
