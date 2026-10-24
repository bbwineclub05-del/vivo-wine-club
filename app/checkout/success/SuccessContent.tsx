'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { CalendarDays, Check, MapPin } from 'lucide-react';
import ReferralShare from '@/components/ReferralShare';
import { useCart } from '@/contexts/CartContext';
import { pixel } from '@/lib/pixel';

interface EventInfo {
  title: string;
  month: string;
  day: string;
  year: string;
  time: string | null;
  locationFull: string;
  slug: string;
  qty: number;
}

/**
 * Dopo il pagamento, la parte che vive nel browser.
 *
 * Sta in un file suo perché il guscio della pagina — barra e piede —
 * è un componente server: `SiteFooter` legge le traduzioni dal
 * server, e un componente client non può importarlo.
 */

function Contenuto() {
  const t = useTranslations('events');
  const { clearCart } = useCart();
  const params = useSearchParams();

  const [tipo, setTipo] = useState<'event' | 'merch' | 'loading'>('loading');
  const [evento, setEvento] = useState<EventInfo | null>(null);
  const [email, setEmail] = useState('');
  const [nome, setNome] = useState('');
  const [referralAttivo, setReferralAttivo] = useState(false);
  const [codice, setCodice] = useState<string | null>(null);
  const [usi, setUsi] = useState(0);
  const [premio, setPremio] = useState(false);
  const [codicePremio, setCodicePremio] = useState<string | null>(null);
  const pixelFatto = useRef(false);

  useEffect(() => {
    clearCart();
    const sessionId = params.get('session_id');
    const orderId = params.get('order_id');
    const qEmail = params.get('email') ?? '';

    const leggi = (data: { type?: string; event?: EventInfo; buyer_email?: string; buyer_name?: string; referral_enabled?: boolean }) => {
      if (data.type === 'event' && data.event) {
        setEvento(data.event);
        setTipo('event');
        if (data.buyer_email) setEmail(data.buyer_email);
        if (data.buyer_name) setNome(data.buyer_name);
        if (data.referral_enabled) setReferralAttivo(true);
      } else {
        setTipo('merch');
      }
    };

    if (sessionId) {
      fetch(`/api/checkout/confirm?session_id=${sessionId}`)
        .then((r) => r.json())
        .then(leggi)
        .catch(() => setTipo('merch'));
    } else if (orderId) {
      fetch(`/api/checkout/order-info?order_id=${encodeURIComponent(orderId)}`)
        .then((r) => r.json())
        .then(leggi)
        .catch(() => setTipo('merch'));
    } else {
      setTipo('merch');
    }

    if (!sessionId && qEmail) setEmail(qEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (pixelFatto.current || tipo === 'loading') return;
    pixelFatto.current = true;
    pixel.purchase(tipo === 'event' && evento ? { content_name: evento.title } : {});
  }, [tipo, evento]);

  useEffect(() => {
    if (!email || !evento?.slug || !referralAttivo) return;
    fetch('/api/referral/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, event_slug: evento.slug, name: nome }),
    })
      .then((r) => r.json())
      .then((d) => {
        if (!d.code) return;
        setCodice(d.code);
        setUsi(d.uses ?? 0);
        setPremio(d.reward_unlocked ?? false);
        setCodicePremio(d.reward_code ?? null);
      })
      .catch(() => {});
  }, [email, nome, evento?.slug, referralAttivo]);

  if (tipo === 'loading') {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const bottone = 'inline-flex min-h-[52px] items-center justify-center rounded-full px-6 text-fine font-medium';

  return (
    <div className="mx-auto max-w-[620px] px-5 py-14 lg:px-10 lg:py-20">
      <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-paper">
        <Check size={26} strokeWidth={2.2} />
      </span>

      {tipo === 'event' && evento ? (
        <>
          <h1 className="ds-display mt-6 text-[clamp(2rem,6vw,2.8rem)] leading-tight tracking-[-0.03em]">
            {t('okTicketTitle')}
          </h1>
          <p className="mt-4 text-lead text-on-paper-muted">
            {evento.qty > 1
              ? t('okTicketMany', { n: evento.qty, title: evento.title })
              : t('okTicketOne', { title: evento.title })}
          </p>
          <p className="mt-3 text-body text-on-paper-muted">{t('okEmailSent')}</p>

          <dl className="mt-8 grid gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-paper px-4 py-4">
              <dt className="inline-flex min-w-[110px] items-center gap-2 text-fine text-on-paper-muted">
                <CalendarDays size={16} strokeWidth={1.8} className="text-accent" />
                {t('okWhen')}
              </dt>
              <dd className="min-w-0 flex-1 text-body">
                {evento.day} {evento.month} {evento.year}
                {evento.time ? ` · ${evento.time}` : ''}
              </dd>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 bg-paper px-4 py-4">
              <dt className="inline-flex min-w-[110px] items-center gap-2 text-fine text-on-paper-muted">
                <MapPin size={16} strokeWidth={1.8} className="text-accent" />
                {t('okWhere')}
              </dt>
              <dd className="min-w-0 flex-1 text-body">{evento.locationFull}</dd>
            </div>
          </dl>

          <p className="mt-3 text-fine text-on-paper-muted">{t('okCheckSpam')}</p>

          {referralAttivo && (
            <div className="mt-10">
              <ReferralShare
                referralCode={codice}
                eventSlug={evento.slug}
                eventTitle={evento.title}
                loading={!codice}
                initialUses={usi}
                initialRewardUnlocked={premio}
                initialRewardCode={codicePremio}
              />
            </div>
          )}

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/events" className={`${bottone} bg-accent text-paper`}>{t('okSeeEvents')}</Link>
            <Link href="/" className={`${bottone} border border-rule-paper`}>{t('okHome')}</Link>
          </div>
        </>
      ) : (
        <>
          <h1 className="ds-display mt-6 text-[clamp(2rem,6vw,2.8rem)] leading-tight tracking-[-0.03em]">
            {t('okMerchTitle')}
          </h1>
          <p className="mt-4 text-lead text-on-paper-muted">{t('okMerchBody')}</p>
          <p className="mt-3 text-fine text-on-paper-muted">{t('okCheckSpam')}</p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/wear-the-club" className={`${bottone} bg-accent text-paper`}>{t('okShop')}</Link>
            <Link href="/" className={`${bottone} border border-rule-paper`}>{t('okHome')}</Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function SuccessContent() {
  return (
    <Suspense fallback={null}>
      <Contenuto />
    </Suspense>
  );
}
