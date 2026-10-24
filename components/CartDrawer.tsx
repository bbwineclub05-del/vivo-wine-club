'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Check, Minus, Plus, ShoppingBag, Trash2, X } from 'lucide-react';
import { useCart } from '@/contexts/CartContext';

/**
 * Il carrello.
 *
 * È l'ultimo passo prima di pagare, e fino a ieri era anche il più
 * trascurato: scritte maiuscole spaziate in mezzo a un sito che non
 * le usa più, e soprattutto in inglese dentro un sito italiano —
 * "CART", "SUBTOTAL", "DISCOUNT CODE", "CHECKOUT". Chi arriva qui ha
 * già deciso di comprare: non è il momento di farlo sentire su un
 * altro sito.
 *
 * Su un telefono sale dal basso e il totale con il pulsante restano
 * fermi in fondo, come nella scheda prodotto.
 */

function eur(n: number) {
  return `${n.toFixed(2).replace('.', ',')} €`;
}

export default function CartDrawer() {
  const t = useTranslations('shop');
  const tc = useTranslations('consent');
  const reduce = useReducedMotion();
  const { items, removeItem, updateQuantity, clearCart, total, isOpen, setIsOpen } = useCart();

  const [spedizioneBase, setSpedizioneBase] = useState(0);
  const [codice, setCodice] = useState('');
  const [sconto, setSconto] = useState(0);
  const [codiceErrore, setCodiceErrore] = useState('');
  const [codiceInCorso, setCodiceInCorso] = useState(false);
  const [email, setEmail] = useState('');
  const [consenso, setConsenso] = useState(false);
  const [errore, setErrore] = useState('');
  const [inCorso, setInCorso] = useState(false);

  useEffect(() => {
    fetch('/api/merch/settings')
      .then((r) => r.json())
      .then((d) => { if (typeof d?.shipping_cost === 'number') setSpedizioneBase(d.shipping_cost); })
      .catch(() => {});
  }, []);

  // La spedizione più alta fra i prodotti nel carrello, o quella generale.
  const spedizione = useMemo(
    () => Math.max(0, ...items.map((i) => (i.shippingCost != null ? i.shippingCost : spedizioneBase))),
    [items, spedizioneBase],
  );

  const scontato = sconto > 0 ? total * (1 - sconto / 100) : total;
  const daPagare = scontato + (items.length > 0 ? spedizione : 0);

  // Il tasto indietro del telefono chiude il carrello invece di uscire.
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setIsOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [isOpen, setIsOpen]);

  const applicaCodice = useCallback(async () => {
    const code = codice.trim().toUpperCase();
    if (!code) return;
    setCodiceInCorso(true);
    setCodiceErrore('');
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items, discountCode: code, validateOnly: true }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? '');
      setSconto(d.discountPercent ?? 0);
    } catch (e) {
      setSconto(0);
      setCodiceErrore(e instanceof Error && e.message ? e.message : 'Codice non valido.');
    } finally {
      setCodiceInCorso(false);
    }
  }, [codice, items]);

  const paga = useCallback(async () => {
    if (!consenso) { setErrore(tc('requiredErrorPrivacyTerms')); return; }
    setErrore('');
    setInCorso(true);
    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          discountCode: sconto > 0 ? codice.trim().toUpperCase() : undefined,
          shippingCost: spedizione > 0 ? spedizione : undefined,
          customerEmail: email.trim() ? email.trim().toLowerCase() : undefined,
          consentPrivacyTerms: consenso,
        }),
      });
      const d = await res.json();
      if (!res.ok || !d.url) throw new Error(d.error ?? 'Pagamento non disponibile.');
      window.location.href = d.url;
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore.');
      setInCorso(false);
    }
  }, [items, codice, sconto, spedizione, email, consenso, tc]);

  const campo =
    'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3 text-body placeholder:text-on-paper-muted/60 focus:border-accent/50 focus:outline-none [font-size:16px]';

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="ds fixed inset-0 z-[70] flex flex-col lg:items-end">
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            aria-label={t('cartClose')}
            onClick={() => setIsOpen(false)}
            className="absolute inset-0 bg-ink/60 backdrop-blur-sm"
          />

          <motion.aside
            initial={reduce ? false : { y: '100%' }}
            animate={{ y: 0 }}
            exit={reduce ? undefined : { y: '100%' }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 mt-auto flex max-h-[94dvh] w-full flex-col overflow-hidden rounded-t-3xl bg-paper text-on-paper lg:mt-0 lg:h-full lg:max-h-none lg:max-w-[460px] lg:rounded-none"
            role="dialog"
            aria-modal="true"
            aria-label={t('cartTitle')}
          >
            {/* ── Intestazione ── */}
            <div className="flex items-center gap-3 border-b border-rule-paper px-5 py-4">
              <ShoppingBag size={19} strokeWidth={1.8} className="shrink-0 text-accent" />
              <h2 className="ds-display flex-1 text-[19px] tracking-[-0.02em]">
                {t('cartTitle')}
                {items.length > 0 && (
                  <span className="ds-numeric ml-2 text-[14px] font-normal text-on-paper-muted">
                    {items.reduce((n, i) => n + i.quantity, 0)}
                  </span>
                )}
              </h2>
              <button
                onClick={() => setIsOpen(false)}
                aria-label={t('cartClose')}
                className="grid h-11 w-11 place-items-center rounded-full hover:bg-paper-soft"
              >
                <X size={19} strokeWidth={1.8} />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
                <p className="text-body text-on-paper-muted">{t('cartEmpty')}</p>
                <Link
                  href="/wear-the-club"
                  onClick={() => setIsOpen(false)}
                  className="inline-flex min-h-[48px] items-center rounded-full border border-rule-paper px-5 text-fine font-medium"
                >
                  {t('cartEmptyCta')}
                </Link>
              </div>
            ) : (
              <>
                {/* ── Le righe ── */}
                <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                  <div className="flex flex-col gap-3">
                    {items.map((i) => (
                      <div key={i.cartKey} className="flex gap-3">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-paper-soft">
                          {i.image && <Image src={i.image} alt="" fill sizes="80px" className="object-cover" />}
                        </div>

                        <div className="flex min-w-0 flex-1 flex-col">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 text-body leading-snug">{i.name}</p>
                            <button
                              onClick={() => removeItem(i.cartKey)}
                              aria-label={t('cartRemove')}
                              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-on-paper-muted hover:bg-paper-soft hover:text-accent"
                            >
                              <Trash2 size={15} strokeWidth={1.8} />
                            </button>
                          </div>

                          <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                            <div className="flex items-center gap-1 rounded-full border border-rule-paper">
                              <button
                                onClick={() => updateQuantity(i.cartKey, i.quantity - 1)}
                                aria-label="−"
                                className="grid h-10 w-10 place-items-center rounded-full"
                              >
                                <Minus size={14} strokeWidth={2} />
                              </button>
                              <span className="ds-numeric min-w-[20px] text-center text-body">{i.quantity}</span>
                              <button
                                onClick={() => updateQuantity(i.cartKey, i.quantity + 1)}
                                aria-label="+"
                                className="grid h-10 w-10 place-items-center rounded-full"
                              >
                                <Plus size={14} strokeWidth={2} />
                              </button>
                            </div>
                            <span className="ds-numeric text-body font-medium">{eur(i.price * i.quantity)}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* ── Email e codice ── */}
                  <div className="mt-6 flex flex-col gap-3">
                    <label className="block">
                      <span className="mb-1.5 block text-fine font-medium">
                        {t('cartEmail')}
                        <span className="ml-2 font-normal text-on-paper-muted">{t('cartEmailHint')}</span>
                      </span>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="tu@email.com"
                        className={campo}
                      />
                    </label>

                    <div>
                      <div className="flex gap-2">
                        <input
                          value={codice}
                          onChange={(e) => { setCodice(e.target.value); setCodiceErrore(''); }}
                          placeholder={t('cartDiscount')}
                          className={`${campo} uppercase`}
                        />
                        <button
                          onClick={applicaCodice}
                          disabled={codiceInCorso || !codice.trim()}
                          className="inline-flex min-h-[48px] shrink-0 items-center rounded-2xl border border-rule-paper px-4 text-fine font-medium disabled:opacity-45"
                        >
                          {t('cartApply')}
                        </button>
                      </div>
                      {sconto > 0 && (
                        <p className="mt-2 inline-flex items-center gap-1.5 text-fine text-accent">
                          <Check size={14} strokeWidth={2.4} />
                          −{sconto}% {t('cartApplied')}
                        </p>
                      )}
                      {codiceErrore && <p className="mt-2 text-fine text-accent">{codiceErrore}</p>}
                      {sconto === 0 && !codiceErrore && (
                        <p className="mt-2 text-fine text-on-paper-muted">{t('cartSocioHint')}</p>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={clearCart}
                    className="mt-6 text-fine text-on-paper-muted underline underline-offset-2"
                  >
                    {t('cartClear')}
                  </button>
                </div>

                {/* ── Il totale e il pagamento, fermi in fondo ── */}
                <div
                  className="border-t border-rule-paper px-5 py-4"
                  style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
                >
                  <dl className="mb-3 flex flex-col gap-1.5">
                    <div className="flex justify-between text-fine text-on-paper-muted">
                      <dt>{t('cartSubtotal')}</dt>
                      <dd className="ds-numeric">{eur(scontato)}</dd>
                    </div>
                    <div className="flex justify-between text-fine text-on-paper-muted">
                      <dt>{t('cartShipping')}</dt>
                      <dd className="ds-numeric">{spedizione > 0 ? eur(spedizione) : t('cartFreeShipping')}</dd>
                    </div>
                    <div className="flex items-baseline justify-between border-t border-rule-paper pt-2">
                      <dt className="text-body font-medium">{t('cartTotal')}</dt>
                      <dd className="ds-numeric text-[22px] font-medium">{eur(daPagare)}</dd>
                    </div>
                  </dl>

                  <label className="mb-3 flex cursor-pointer items-start gap-3">
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

                  {errore && <p className="mb-3 text-fine font-medium text-accent">{errore}</p>}

                  <button
                    onClick={paga}
                    disabled={inCorso}
                    className="inline-flex min-h-[56px] w-full items-center justify-center rounded-full bg-accent px-6 text-fine font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-50"
                  >
                    {inCorso ? t('cartCheckoutLoading') : t('cartCheckout')}
                  </button>
                </div>
              </>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}
