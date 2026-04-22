'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, MapPin, Minus, Plus, Calendar, Tag } from 'lucide-react';
import Navbar from '@/components/Navbar';
import { getEventBySlug } from '@/lib/events';
import { notFound } from 'next/navigation';

const MAX_TICKETS = 10;

export default function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);
  const event = getEventBySlug(slug);

  if (!event) notFound();

  return <CheckoutContent slug={slug} />;
}

/* ── Separate client component so hooks work after the guard above ── */
function CheckoutContent({ slug }: { slug: string }) {
  const event = getEventBySlug(slug)!;
  const [qty, setQty] = useState(1);
  const total = event.price * qty;

  const dec = () => setQty((q) => Math.max(1, q - 1));
  const inc = () => setQty((q) => Math.min(MAX_TICKETS, q + 1));

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="fog-center" />

          <div className="max-w-3xl mx-auto px-6 lg:px-10">

            {/* Back link */}
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-12 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-8"
            >

              {/* ── Event summary card ── */}
              <div className="glass-card p-8 md:p-10">
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
                  <div className="flex items-center gap-2">
                    <Tag size={13} className="text-[#731515] shrink-0" />
                    <span style={{ fontFamily: 'var(--font-nunito)' }}>€{event.price} per person</span>
                  </div>
                </div>

                <div className="w-10 h-px bg-[#731515]/20 mt-7 mb-6" />

                <p className="text-[#7a4a4a] text-sm leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {event.description}
                </p>
              </div>

              {/* ── Ticket selector ── */}
              <div className="glass-card p-8 md:p-10">
                <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-6">
                  SELECT TICKETS
                </div>

                <div className="flex items-center justify-between">
                  <span
                    className="text-sm text-[#1a0505]"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Number of tickets
                  </span>

                  <div className="flex items-center gap-4">
                    <button
                      onClick={dec}
                      disabled={qty <= 1}
                      className="w-9 h-9 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
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
                      onClick={inc}
                      disabled={qty >= MAX_TICKETS}
                      className="w-9 h-9 flex items-center justify-center border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515] hover:text-[#731515] disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-200"
                      aria-label="Add ticket"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>

                {qty >= MAX_TICKETS && (
                  <p className="mt-3 text-[10px] tracking-[0.2em] text-[#7a4a4a]/60 text-right" style={{ fontFamily: 'var(--font-nunito)' }}>
                    Maximum {MAX_TICKETS} tickets per order. Contact us for group bookings.
                  </p>
                )}
              </div>

              {/* ── Order summary ── */}
              <div className="glass-card p-8 md:p-10">
                <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-6">
                  ORDER SUMMARY
                </div>

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

                <motion.button
                  whileTap={{ scale: 0.99 }}
                  className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.4em] hover:bg-[#aa4848] transition-colors duration-300"
                >
                  PROCEED TO PAYMENT
                </motion.button>

                <p className="mt-4 text-center text-[10px] text-[#7a4a4a]/50 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Secure payment powered by Stripe — you will not be charged yet
                </p>
              </div>

            </motion.div>
          </div>
        </section>
      </main>
    </>
  );
}
