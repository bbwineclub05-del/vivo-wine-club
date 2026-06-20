'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { MapPin, Minus, Plus, Calendar, Tag, User } from 'lucide-react';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { type EventData } from '@/lib/events';

const EMAIL_MISMATCH = 'Email addresses do not match.';

const MAX_TICKETS = 10;

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
        className={`w-full border bg-white px-4 py-3 text-sm text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none transition-colors duration-200 ${error ? 'border-[#731515]' : 'border-[#e8d5d5] focus:border-[#731515]'}`}
        style={{ fontFamily: 'var(--font-nunito)' }}
      />
      {error && (
        <span className="text-[10px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</span>
      )}
    </div>
  );
}

/* ── Checkout form ── */
export default function CheckoutForm({ event }: { event: EventData }) {
  const [qty,          setQty]          = useState(1);
  const [firstName,    setFirstName]    = useState('');
  const [lastName,     setLastName]     = useState('');
  const [email,        setEmail]        = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [phone,        setPhone]        = useState('');
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  const emailsMatch = email.length > 0 && email === confirmEmail;

  const total = event.price * qty;
  const dec   = () => setQty((q) => Math.max(1, q - 1));
  const inc   = () => setQty((q) => Math.min(MAX_TICKETS, q + 1));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailsMatch) { setError(EMAIL_MISMATCH); return; }
    setError('');
    setLoading(true);

    try {
      const res  = await fetch('/api/checkout/event', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ slug: event.slug, qty, firstName, lastName, email, phone }),
      });
      const data = await res.json();

      if (!res.ok || !data.url) {
        throw new Error(data.error ?? 'Something went wrong. Please try again.');
      }

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
              <div className="relative w-full aspect-[16/7] overflow-hidden mb-8">
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
                        className="w-11 h-11 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
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
                        className="w-11 h-11 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
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
                      </div>

                      <div className="w-full h-px bg-[#e8d5d5] mb-5" />

                      <div className="flex items-center justify-between mb-8">
                        <span className="text-[11px] tracking-[0.3em] text-[#7a4a4a]">TOTAL</span>
                        <motion.span
                          key={total}
                          initial={{ opacity: 0, y: -6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.25 }}
                          className="text-3xl font-light text-[#731515]"
                          style={{ fontFamily: 'var(--font-syne)' }}
                        >
                          €{total.toFixed(2)}
                        </motion.span>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-between mb-8">
                      <span className="text-sm text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        {event.title} × {qty}
                      </span>
                      <span className="text-xl font-light text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                        FREE
                      </span>
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
                    className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.4em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300"
                  >
                    {loading ? 'PROCESSING…' : event.price > 0 ? 'PROCEED TO PAYMENT' : 'GET YOUR FREE TICKET'}
                  </motion.button>

                  <p className="mt-4 text-center text-[10px] text-[#7a4a4a]/50 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {event.price > 0
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
