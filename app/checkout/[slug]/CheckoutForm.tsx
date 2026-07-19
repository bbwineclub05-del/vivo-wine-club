'use client';

import { useState, useEffect } from 'react';
import { pixel } from '@/lib/pixel';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MapPin, Minus, Plus, Calendar, Tag, User, Gift, Sparkles, ShoppingBag, Check } from 'lucide-react';
import BackButton from '@/components/BackButton';
import Navbar from '@/components/Navbar';
import { type EventData } from '@/lib/events';

const EMAIL_MISMATCH = 'Email addresses do not match.';

const MAX_TICKETS = 10;

/* ── UpsellConfig type ── */
interface UpsellConfig {
  id: string;
  product_id: string;
  context: 'event' | 'merch';
  target_slug: string | null;
  sort_order: number;
  active: boolean;
  products: {
    id: string;
    title: string;
    price: number;
    images: string[];
    slug: string;
    product_variants?: { id: string; images: string[] }[];
  };
}

/* ── Input field ── */
function Field({
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  autoComplete,
  error,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoComplete?: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[9px] tracking-[0.3em] text-[#7a4a4a]">{label}</label>
      <input
        type={type}
        required
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={`w-full border bg-white px-4 py-3 text-sm text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none transition-colors duration-200 rounded-lg ${error ? 'border-[#731515]' : 'border-[#e8d5d5] focus:border-[#731515]'}`}
        style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
      />
      {error && (
        <span className="text-[10px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</span>
      )}
    </div>
  );
}

/* ── Checkout form ── */
export default function CheckoutForm({ event, refCode, partnerCode, referralEnabled }: { event: EventData; refCode?: string; partnerCode?: string; referralEnabled?: boolean }) {
  const [qty,            setQty]            = useState(1);
  const [firstName,      setFirstName]      = useState('');
  const [lastName,       setLastName]       = useState('');
  const [email,          setEmail]          = useState('');
  const [confirmEmail,   setConfirmEmail]   = useState('');
  const [phone,          setPhone]          = useState('');
  const [enteredRefCode, setEnteredRefCode] = useState(refCode ?? '');
  const [loading,        setLoading]        = useState(false);
  const [error,          setError]          = useState('');

  /* ── Upsell state ── */
  const [upsellConfigs, setUpsellConfigs] = useState<UpsellConfig[]>([]);
  const [upsellAdded,   setUpsellAdded]   = useState<Set<string>>(new Set());

  const emailsMatch = email.length > 0 && email === confirmEmail;

  const total = event.price * qty;

  /* ── Upsell totals ── */
  const upsellTotal = upsellConfigs
    .filter(c => upsellAdded.has(c.id))
    .reduce((sum, c) => sum + Number(c.products.price), 0);
  const grandTotal = total + upsellTotal;

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(MAX_TICKETS, q + 1));

  /* ── Fetch upsell configs on mount ── */
  useEffect(() => {
    fetch(`/api/upsell?context=event&slug=${event.slug}`)
      .then(r => r.json())
      .then(j => {
        if (j.configs?.length > 0) {
          setUpsellConfigs(j.configs);
          // Track impressions (fire-and-forget)
          for (const c of j.configs) {
            fetch('/api/upsell/track', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ upsellConfigId: c.id, eventType: 'impression', checkoutContext: event.slug }),
            }).catch(() => {});
          }
        }
      })
      .catch(() => {});
  }, [event.slug]);

  /* ── Toggle upsell item ── */
  function toggleUpsell(configId: string, eventType: 'added' | 'removed') {
    setUpsellAdded(prev => {
      const next = new Set(prev);
      if (next.has(configId)) next.delete(configId); else next.add(configId);
      return next;
    });
    fetch('/api/upsell/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ upsellConfigId: configId, eventType, checkoutContext: event.slug }),
    }).catch(() => {});
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailsMatch) { setError(EMAIL_MISMATCH); return; }
    setError('');
    setLoading(true);

    try {
      const upsellItems = upsellConfigs
        .filter(c => upsellAdded.has(c.id))
        .map(c => ({ configId: c.id, title: c.products.title, price: Number(c.products.price) }));

      const res  = await fetch('/api/checkout/event', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          slug: event.slug,
          qty,
          firstName,
          lastName,
          email,
          phone,
          refCode: enteredRefCode.trim().toUpperCase() || undefined,
          partnerCode,
          upsellItems,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }

      pixel.initiateCheckout({ value: grandTotal, content_name: event.title });
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setLoading(false);
    }
  };

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── Back link ── */}
        <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-6">
          <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300" />
        </div>

        <section className="relative overflow-hidden py-10 md:py-16">
          <div className="fog-center" />

          <div className="max-w-3xl mx-auto px-6 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              {/* ── Event image — same width as cards below, sharp edges ── */}
            {event.image_url && (
              <div className="relative w-full aspect-[16/7] overflow-hidden mb-8 rounded-lg">
                <Image
                  src={event.image_url}
                  alt={event.title}
                  fill
                  className="object-cover"
                  priority
                  sizes="(max-width:768px) 100vw, 768px"
                />
                <div className="absolute inset-0 bg-[#731515]/50" />
              </div>
            )}

            <form onSubmit={handleSubmit} className="flex flex-col gap-8">

                {/* ── Event summary ── */}
                <div className="glass-card p-5 sm:p-8 md:p-10">
                  <div className="text-[9px] tracking-[0.45em] text-[#731515] mb-4">
                    {event.type}
                  </div>
                  <h1
                    className="text-[clamp(1.8rem,5vw,3rem)] font-light text-[#1a0505] leading-tight mb-6"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    {event.title}
                  </h1>

                  <div className="flex flex-col sm:flex-row gap-4 text-sm text-[#7a4a4a]">
                    <div className="flex items-center gap-2">
                      <Calendar size={13} className="text-[#731515] shrink-0" />
                      <span style={{ fontFamily: 'var(--font-nunito)' }}>
                        {event.month} {event.day}, {event.year}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin size={13} className="text-[#731515] shrink-0" />
                      <span style={{ fontFamily: 'var(--font-nunito)' }}>{event.locationFull}</span>
                    </div>
                    {event.price > 0 && (
                      <div className="flex items-center gap-2">
                        <Tag size={13} className="text-[#731515] shrink-0" />
                        <span style={{ fontFamily: 'var(--font-nunito)' }}>€{event.price} per person</span>
                      </div>
                    )}
                  </div>

                  <div className="w-10 h-px bg-[#731515]/20 mt-7 mb-6" />

                  <p className="text-[#7a4a4a] text-sm leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {event.description}
                  </p>
                </div>

                {/* ── Ticket selector ── */}
                <div className="glass-card p-5 sm:p-8 md:p-10">
                  <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-6">
                    SELECT TICKETS
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                      Number of tickets
                    </span>

                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={dec}
                        disabled={qty <= 1}
                        className="w-11 h-11 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 rounded-lg"
                        aria-label="Remove ticket"
                      >
                        <Minus size={13} />
                      </button>

                      <span
                        className="text-2xl font-light text-[#1a0505] w-8 text-center tabular-nums"
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {qty}
                      </span>

                      <button
                        type="button"
                        onClick={inc}
                        disabled={qty >= MAX_TICKETS}
                        className="w-11 h-11 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200 rounded-lg"
                        aria-label="Add ticket"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {qty >= MAX_TICKETS && (
                    <p className="mt-3 text-[10px] tracking-[0.2em] text-[#7a4a4a]/60 text-right" style={{ fontFamily: 'var(--font-nunito)' }}>
                      Maximum {MAX_TICKETS} tickets per order.
                    </p>
                  )}
                </div>

                {/* ── Buyer details ── */}
                <div className="glass-card p-5 sm:p-8 md:p-10">
                  <div className="flex items-center gap-2 mb-6">
                    <User size={13} className="text-[#731515]" />
                    <div className="text-[10px] tracking-[0.4em] text-[#731515]">YOUR DETAILS</div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Field label="FIRST NAME" value={firstName} onChange={setFirstName} placeholder="Marco" autoComplete="given-name" />
                    <Field label="LAST NAME"  value={lastName}  onChange={setLastName}  placeholder="Rossi"  autoComplete="family-name" />
                    <Field label="EMAIL" type="email" value={email} onChange={setEmail} placeholder="marco@example.com" autoComplete="email" />
                    <Field
                      label="CONFIRM EMAIL"
                      type="email"
                      value={confirmEmail}
                      onChange={setConfirmEmail}
                      placeholder="marco@example.com"
                      autoComplete="off"
                      error={confirmEmail.length > 0 && email !== confirmEmail ? EMAIL_MISMATCH : undefined}
                    />
                    <Field label="PHONE NUMBER" type="tel" value={phone} onChange={setPhone} placeholder="+39 333 000 0000" autoComplete="tel" />
                  </div>

                  <p className="mt-5 text-[10px] text-[#7a4a4a]/50 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    Your confirmation email with QR code entry ticket will be sent to the address above.
                  </p>
                </div>

                {/* ── Upsell section ── */}
                {upsellConfigs.length > 0 && (
                  <div className="glass-card p-5 sm:p-8 md:p-10">
                    <div className="flex items-center gap-2 mb-5">
                      <Sparkles size={13} className="text-[#731515]" />
                      <div className="text-[10px] tracking-[0.4em] text-[#731515]">YOU MIGHT ALSO LIKE</div>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1">
                      {upsellConfigs.map(config => {
                        const isAdded   = upsellAdded.has(config.id);
                        // Images may live at product level or inside variants — check both
                        const imgSrc    = config.products.images?.[0]
                          ?? config.products.product_variants?.find(v => v.images?.length > 0)?.images?.[0]
                          ?? null;
                        const price     = Number(config.products.price);
                        return (
                          <div
                            key={config.id}
                            className={`shrink-0 w-[200px] sm:w-[220px] rounded-xl border transition-all duration-200 overflow-hidden ${isAdded ? 'border-[#731515]/60 shadow-md' : 'border-[#e8d5d5]'}`}
                          >
                            {/* Product image */}
                            {imgSrc ? (
                              <div className="relative w-full aspect-square bg-[#fdf6f6]">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={imgSrc} alt={config.products.title} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-full aspect-square bg-[#fdf6f6] flex items-center justify-center text-[#e8d5d5]">
                                <ShoppingBag size={32} />
                              </div>
                            )}
                            <div className="p-3 bg-white">
                              <p className="text-[12px] font-medium text-[#1a0505] leading-tight mb-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                                {config.products.title}
                              </p>
                              <div className="flex items-center gap-1.5 mb-2.5">
                                <span className="text-sm font-medium text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                                  €{price.toFixed(2)}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleUpsell(config.id, isAdded ? 'removed' : 'added')}
                                className={`w-full min-h-[44px] flex items-center justify-center gap-1.5 rounded-lg text-[11px] tracking-[0.2em] font-medium transition-all duration-200 ${
                                  isAdded
                                    ? 'bg-[#731515] text-white hover:bg-[#aa4848]'
                                    : 'border border-[#731515] text-[#731515] bg-white hover:bg-[#fdf0f0]'
                                }`}
                                style={{ fontFamily: 'var(--font-nunito)' }}
                              >
                                {isAdded ? <><Check size={13} /> AGGIUNTO</> : <><Plus size={11} /> AGGIUNGI</>}
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* ── Order summary + pay ── */}
                <div className="glass-card p-5 sm:p-8 md:p-10">
                  <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-6">
                    ORDER SUMMARY
                  </div>

                  {event.price > 0 ? (
                    <>
                      <div className="flex flex-col gap-3 mb-6">
                        <div className="flex items-center justify-between text-sm text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                          <span>{event.title}</span>
                          <span>€{event.price}</span>
                        </div>
                        <div className="flex items-center justify-between text-sm text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                          <span>Tickets</span>
                          <span>× {qty}</span>
                        </div>

                        {/* Upsell items */}
                        {Array.from(upsellAdded).map(configId => {
                          const config = upsellConfigs.find(c => c.id === configId);
                          if (!config) return null;
                          return (
                            <div key={configId} className="flex items-center justify-between text-sm text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                              <span className="flex items-center gap-1.5">
                                <Sparkles size={11} className="text-[#731515]" />
                                {config.products.title}
                              </span>
                              <span>€{Number(config.products.price).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>

                      <div className="w-full h-px bg-[#e8d5d5] mb-5" />

                      <div className="flex items-center justify-between mb-8">
                        <span className="text-[11px] tracking-[0.3em] text-[#7a4a4a]">TOTAL</span>
                        <motion.span
                          key={grandTotal}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className="text-3xl font-light text-[#731515]"
                          style={{ fontFamily: 'var(--font-syne)' }}
                        >
                          €{grandTotal.toFixed(2)}
                        </motion.span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex flex-col gap-3 mb-6">
                        <div className="flex items-center justify-between" style={{ fontFamily: 'var(--font-nunito)' }}>
                          <span className="text-sm text-[#7a4a4a]">
                            {event.title} × {qty}
                          </span>
                          <span className="text-xl font-light text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                            FREE
                          </span>
                        </div>

                        {/* Upsell items for free events */}
                        {Array.from(upsellAdded).map(configId => {
                          const config = upsellConfigs.find(c => c.id === configId);
                          if (!config) return null;
                          return (
                            <div key={configId} className="flex items-center justify-between text-sm text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                              <span className="flex items-center gap-1.5">
                                <Sparkles size={11} className="text-[#731515]" />
                                {config.products.title}
                              </span>
                              <span>€{Number(config.products.price).toFixed(2)}</span>
                            </div>
                          );
                        })}
                      </div>

                      {upsellAdded.size > 0 && (
                        <>
                          <div className="w-full h-px bg-[#e8d5d5] mb-5" />
                          <div className="flex items-center justify-between mb-8">
                            <span className="text-[11px] tracking-[0.3em] text-[#7a4a4a]">TOTAL</span>
                            <motion.span
                              key={grandTotal}
                              initial={{ opacity: 0, y: -6 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.25 }}
                              className="text-3xl font-light text-[#731515]"
                              style={{ fontFamily: 'var(--font-syne)' }}
                            >
                              €{grandTotal.toFixed(2)}
                            </motion.span>
                          </div>
                        </>
                      )}

                      {upsellAdded.size === 0 && (
                        <div className="mb-8" />
                      )}
                    </>
                  )}

                  {/* ── Referral code (paid events with referral enabled) ── */}
                  {referralEnabled && event.price > 0 && (
                    <div className="mb-6 flex flex-col gap-1.5">
                      <label className="flex items-center gap-1.5 text-[9px] tracking-[0.3em] text-[#7a4a4a]">
                        <Gift size={11} className="text-[#731515]" />
                        {refCode ? 'REFERRAL CODE' : 'HAI UN CODICE REFERRAL? INSERISCILO QUI'}
                      </label>
                      <input
                        type="text"
                        value={enteredRefCode}
                        onChange={e => setEnteredRefCode(e.target.value)}
                        readOnly={!!refCode}
                        placeholder="VIVO-XXXXX (opzionale)"
                        className={`w-full border bg-white px-4 py-3 text-sm text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none transition-colors duration-200 rounded-lg uppercase tracking-widest ${refCode ? 'border-[#e8d5d5] bg-[#fdf6f6] text-[#731515] font-semibold cursor-default' : 'border-[#e8d5d5] focus:border-[#731515]'}`}
                        style={{ fontFamily: 'var(--font-nunito)', fontSize: '14px' }}
                      />
                      {refCode && (
                        <p className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                          Codice referral applicato automaticamente dal link.
                        </p>
                      )}
                    </div>
                  )}

                  {error && (
                    <p className="mb-4 text-center text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {error}
                    </p>
                  )}

                  <motion.button
                    type="submit"
                    disabled={loading || !emailsMatch}
                    whileTap={{ scale: 0.99 }}
                    className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.4em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300 rounded-lg"
                  >
                    {loading
                      ? 'PROCESSING…'
                      : event.price > 0 || upsellAdded.size > 0
                        ? 'PROCEED TO PAYMENT'
                        : 'GET YOUR FREE TICKET'}
                  </motion.button>

                  <p className="mt-4 text-center text-[10px] text-[#7a4a4a]/50 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {event.price > 0 || upsellAdded.size > 0
                      ? 'Secure payment powered by Stripe — you will not be charged yet'
                      : 'Free entry — confirm your spot and receive your QR code by email'}
                  </p>
                </div>

              </form>
            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
}
