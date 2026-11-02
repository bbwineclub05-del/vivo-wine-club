'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useLocale, useTranslations } from 'next-intl';
import { Check, Minus, Plus } from 'lucide-react';
import { pixel } from '@/lib/pixel';
import type { EventData } from '@/lib/events';

/**
 * Comprare un biglietto.
 *
 * Prima erano seicento righe con i campi in maiuscoletto spaziato, il
 * totale in fondo alla pagina e il pulsante ancora più sotto: da
 * telefono, dopo aver scritto nome, cognome, due volte l'email e il
 * telefono, bisognava scorrere al buio per sapere quanto si stava per
 * pagare.
 *
 * Adesso il totale e il pulsante restano fermi in fondo allo schermo
 * e si aggiornano mentre scegli. Quello che si paga si vede sempre.
 */

const MAX = 10;

interface UpsellConfig {
  id: string;
  products: {
    id: string;
    title: string;
    price: number;
    images: string[];
    slug: string;
    product_variants?: { id: string; images: string[] }[];
  };
}

function eur(n: number) {
  return `${Number.isInteger(n) ? n : n.toFixed(2).replace('.', ',')} €`;
}

export default function CheckoutForm({
  event, refCode, partnerCode, emailIniziale, benvenuto,
}: {
  event: EventData;
  refCode?: string;
  partnerCode?: string;
  referralEnabled?: boolean;
  /** Gia' verificata alla porta di un evento riservato: non si richiede. */
  emailIniziale?: string;
  /** Il nome del socio riconosciuto, se c'e'. */
  benvenuto?: string | null;
}) {
  const t = useTranslations('events');
  const tc = useTranslations('consent');
  // Viaggia col pagamento: il biglietto lo manda il server quando il
  // browser e' ancora su Stripe, e la lingua la si sa solo qui.
  const locale = useLocale();

  const [qty, setQty] = useState(1);
  const [nome, setNome] = useState('');
  const [cognome, setCognome] = useState('');
  /* Chi ha gia' dimostrato chi e' alla porta non riscrive l'indirizzo
     due volte: lo sappiamo, ed e' quello a cui va il biglietto. */
  const [email, setEmail] = useState(emailIniziale ?? '');
  const [email2, setEmail2] = useState(emailIniziale ?? '');
  const [telefono, setTelefono] = useState('');
  const [codiceAmico, setCodiceAmico] = useState(refCode ?? '');
  const [consenso, setConsenso] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [foto, setFoto] = useState(false);
  const [inCorso, setInCorso] = useState(false);
  const [errore, setErrore] = useState('');

  const [extra, setExtra] = useState<UpsellConfig[]>([]);
  const [scelti, setScelti] = useState<Set<string>>(new Set());

  const gratis = event.price === 0;

  useEffect(() => {
    fetch(`/api/upsell?context=event&slug=${event.slug}`)
      .then((r) => r.json())
      .then((j) => {
        if (!j.configs?.length) return;
        setExtra(j.configs);
        for (const c of j.configs) {
          fetch('/api/upsell/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ upsellConfigId: c.id, eventType: 'impression', checkoutContext: event.slug }),
          }).catch(() => {});
        }
      })
      .catch(() => {});
  }, [event.slug]);

  function toggleExtra(c: UpsellConfig) {
    const dentro = scelti.has(c.id);
    setScelti((p) => {
      const n = new Set(p);
      if (dentro) n.delete(c.id); else n.add(c.id);
      return n;
    });
    fetch('/api/upsell/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        upsellConfigId: c.id,
        eventType: dentro ? 'removed' : 'added',
        checkoutContext: event.slug,
      }),
    }).catch(() => {});
  }

  const totaleExtra = extra
    .filter((c) => scelti.has(c.id))
    .reduce((s, c) => s + Number(c.products.price), 0);
  const totale = event.price * qty + totaleExtra;
  const emailDiverse = email2.length > 0 && email !== email2;

  async function invia(e: React.FormEvent) {
    e.preventDefault();
    if (emailDiverse) { setErrore(t('coEmailMismatch')); return; }
    if (!consenso) { setErrore(tc('requiredErrorPrivacyTerms')); return; }
    setErrore('');
    setInCorso(true);
    try {
      const res = await fetch('/api/checkout/event', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slug: event.slug,
          qty,
          firstName: nome,
          lastName: cognome,
          email,
          phone: telefono,
          refCode: codiceAmico.trim().toUpperCase() || undefined,
          partnerCode,
          upsellItems: extra
            .filter((c) => scelti.has(c.id))
            .map((c) => ({ configId: c.id, title: c.products.title, price: Number(c.products.price) })),
          consentPrivacyTerms: consenso,
          consentMarketing: marketing,
          consentPhotoVideo: foto,
          locale,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Qualcosa è andato storto.');
      pixel.initiateCheckout({ value: totale, content_name: event.title });
      window.location.href = data.url;
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Qualcosa è andato storto.');
      setInCorso(false);
    }
  }

  const campo =
    'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body placeholder:text-on-paper-muted/60 focus:border-accent/50 focus:outline-none [font-size:16px]';

  function Campo({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
      <label className="block">
        <span className="mb-1.5 block text-fine font-medium">
          {label}
          {hint && <span className="ml-2 font-normal text-on-paper-muted">{hint}</span>}
        </span>
        {children}
      </label>
    );
  }

  return (
    <form
      onSubmit={invia}
      className="mx-auto max-w-[760px] px-5 pb-[calc(112px+env(safe-area-inset-bottom))] pt-7 lg:px-10 lg:pb-16"
    >
      <h1 className="ds-display text-[clamp(1.8rem,5vw,2.4rem)] leading-tight tracking-[-0.03em]">
        {t('coTitle')}
      </h1>
      <p className="mt-2 text-body text-on-paper-muted">
        {event.title} · {event.day} {event.month} {event.year}
      </p>

      {/* ── Quanti ── */}
      <section className="mt-8">
        <p className="mb-2.5 text-fine font-medium">{t('coTickets')}</p>
        <div className="inline-flex items-center gap-2 rounded-full border border-rule-paper p-1">
          <button
            type="button"
            onClick={() => setQty((q) => Math.max(1, q - 1))}
            aria-label="−"
            className="grid h-12 w-12 place-items-center rounded-full hover:bg-paper-soft"
          >
            <Minus size={17} strokeWidth={2} />
          </button>
          <span className="ds-numeric min-w-[32px] text-center text-[19px] font-medium">{qty}</span>
          <button
            type="button"
            onClick={() => setQty((q) => Math.min(MAX, q + 1))}
            aria-label="+"
            className="grid h-12 w-12 place-items-center rounded-full hover:bg-paper-soft"
          >
            <Plus size={17} strokeWidth={2} />
          </button>
        </div>
      </section>

      {/* ── Chi sei ── */}
      <section className="mt-8">
        <p className="mb-3 text-body font-medium">{t('coYou')}</p>
        <div className="flex flex-col gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label={t('coFirstName')}>
              <input required value={nome} onChange={(e) => setNome(e.target.value)} className={campo} autoComplete="given-name" />
            </Campo>
            <Campo label={t('coLastName')}>
              <input required value={cognome} onChange={(e) => setCognome(e.target.value)} className={campo} autoComplete="family-name" />
            </Campo>
          </div>

          {emailIniziale ? (
            <p className="text-fine text-on-paper-muted">
              {benvenuto ? `Bentornato, ${benvenuto}. ` : ''}
              Tessera in corso: il biglietto arriva a{' '}
              <strong className="font-medium text-on-paper">{emailIniziale}</strong>.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={t('coEmail')}>
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={campo} autoComplete="email" placeholder="tu@email.com" />
              </Campo>
              <Campo label={t('coEmailConfirm')}>
                <input required type="email" value={email2} onChange={(e) => setEmail2(e.target.value)} className={campo} autoComplete="off" placeholder="tu@email.com" />
                {emailDiverse && <span className="mt-1.5 block text-fine text-accent">{t('coEmailMismatch')}</span>}
              </Campo>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <Campo label={t('coPhone')}>
              <input required type="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} className={campo} autoComplete="tel" placeholder="+39 000 000 0000" />
            </Campo>
            <Campo label={t('coRef')} hint={t('coRefHint')}>
              <input value={codiceAmico} onChange={(e) => setCodiceAmico(e.target.value)} className={`${campo} uppercase`} />
            </Campo>
          </div>
        </div>
      </section>

      {/* ── Da aggiungere ── */}
      {extra.length > 0 && (
        <section className="mt-9">
          <p className="mb-3 text-body font-medium">{t('coExtras')}</p>
          <div className="flex flex-col gap-2">
            {extra.map((c) => {
              const p = c.products;
              const img = p.images?.[0] ?? p.product_variants?.find((v) => v.images?.length)?.images[0];
              const dentro = scelti.has(c.id);
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => toggleExtra(c)}
                  aria-pressed={dentro}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${
                    dentro ? 'border-accent bg-accent/[0.05]' : 'border-rule-paper'
                  }`}
                >
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-paper-soft">
                    {img && <Image src={img} alt="" fill sizes="56px" className="object-cover" />}
                  </div>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body">{p.title}</span>
                    <span className="ds-numeric text-fine text-on-paper-muted">{eur(Number(p.price))}</span>
                  </span>
                  <span className={`inline-flex min-h-[40px] shrink-0 items-center gap-1.5 rounded-full px-3.5 text-fine font-medium ${
                    dentro ? 'bg-accent text-paper' : 'border border-rule-paper'
                  }`}>
                    {dentro ? <Check size={14} strokeWidth={2.4} /> : <Plus size={14} strokeWidth={2.2} />}
                    {dentro ? t('coAdded') : t('coAdd')}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* ── I consensi ── */}
      <section className="mt-9 flex flex-col gap-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={consenso}
            onChange={(e) => { setConsenso(e.target.checked); setErrore(''); }}
            className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
          />
          <span className="text-fine text-on-paper-muted">
            {tc.rich('privacyAndTermsRequired', {
              privacyLink: (c) => <a href="/privacy-policy" className="underline">{c}</a>,
              termsLink: (c) => <a href="/terms-of-service" className="underline">{c}</a>,
            })}
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={foto} onChange={(e) => setFoto(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
          <span className="text-fine text-on-paper-muted">{tc('photoVideoOptional')}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-[var(--color-accent)]" />
          <span className="text-fine text-on-paper-muted">{tc('marketingOptional')}</span>
        </label>
      </section>

      {errore && <p className="mt-5 text-fine font-medium text-accent">{errore}</p>}

      {/* ── Il riepilogo sul computer ── */}
      <section className="mt-9 hidden rounded-2xl border border-rule-paper p-5 lg:block">
        <dl className="flex flex-col gap-2">
          <div className="flex justify-between text-body">
            <dt className="text-on-paper-muted">{t('coTicketsLine', { n: qty })}</dt>
            <dd className="ds-numeric">{eur(event.price * qty)}</dd>
          </div>
          {extra.filter((c) => scelti.has(c.id)).map((c) => (
            <div key={c.id} className="flex justify-between text-body">
              <dt className="text-on-paper-muted">{c.products.title}</dt>
              <dd className="ds-numeric">{eur(Number(c.products.price))}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between border-t border-rule-paper pt-3">
            <dt className="text-body font-medium">{t('coTotal')}</dt>
            <dd className="ds-numeric text-[24px] font-medium">{eur(totale)}</dd>
          </div>
        </dl>

        <button
          type="submit"
          disabled={inCorso}
          className="mt-5 inline-flex min-h-[56px] w-full items-center justify-center rounded-full bg-accent px-6 text-fine font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {inCorso ? t('coPaying') : gratis ? t('coAtDoor') : t('coPay', { total: eur(totale) })}
        </button>
        <p className="mt-3 text-center text-fine text-on-paper-muted">
          {gratis ? t('paymentAtDoorNote') : t('coSecure')}
        </p>
      </section>

      {/* ── Il totale e il pulsante, fermi in fondo sul telefono ── */}
      <div
        className="fixed inset-x-0 bottom-0 z-40 border-t border-rule-paper bg-paper/95 px-5 py-3 backdrop-blur lg:hidden"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-center gap-3">
          <div className="min-w-0 shrink-0">
            <p className="text-fine text-on-paper-muted">{t('coTotal')}</p>
            <p className="ds-numeric text-[19px] font-medium leading-none">{eur(totale)}</p>
          </div>
          <button
            type="submit"
            disabled={inCorso}
            className="inline-flex min-h-[52px] flex-1 items-center justify-center rounded-full bg-accent px-5 text-fine font-medium text-paper disabled:opacity-50"
          >
            {inCorso ? t('coPaying') : gratis ? t('coAtDoor') : t('coPay', { total: eur(totale) })}
          </button>
        </div>
      </div>
    </form>
  );
}
