'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft, CalendarDays, MapPin, Clock, Mail } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useCart } from '@/contexts/CartContext';

interface EventInfo {
  title: string;
  month: string;
  day: string;
  year: string;
  time: string | null;
  locationFull: string;
  qty: number;
}

type OrderType = 'event' | 'merch' | 'loading';

function SuccessContent() {
  const { clearCart }   = useCart();
  const searchParams    = useSearchParams();
  const [orderType, setOrderType] = useState<OrderType>('loading');
  const [eventInfo, setEventInfo] = useState<EventInfo | null>(null);

  useEffect(() => {
    clearCart();

    const sessionId = searchParams.get('session_id');
    const orderId   = searchParams.get('order_id');

    if (sessionId) {
      // Paid order — confirm triggers email sending and returns type + event info
      fetch(`/api/checkout/confirm?session_id=${sessionId}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.type === 'event') {
            setEventInfo(data.event);
            setOrderType('event');
          } else {
            setOrderType('merch');
          }
        })
        .catch(() => setOrderType('merch'));
    } else if (orderId) {
      // Free event — look up order details
      fetch(`/api/checkout/order-info?order_id=${encodeURIComponent(orderId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.type === 'event') {
            setEventInfo(data.event);
            setOrderType('event');
          } else {
            setOrderType('merch');
          }
        })
        .catch(() => setOrderType('merch'));
    } else {
      setOrderType('merch');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-[#fdf6f6]">

        {/* ── Loading ── */}
        {orderType === 'loading' && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="w-6 h-6 border-2 border-[#731515]/30 border-t-[#731515] rounded-full animate-spin" />
          </div>
        )}

        {/* ── Event ticket confirmed ── */}
        {orderType === 'event' && eventInfo && (
          <>
            <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6">
              <Link
                href="/experiences"
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
              >
                <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
                BACK TO EVENTS
              </Link>
            </div>

            <section className="flex flex-col items-center justify-center px-6 py-20 md:py-28 text-center">
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-6 max-w-lg w-full"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CheckCircle size={56} className="text-[#731515]" strokeWidth={1} />
                </motion.div>

                <div className="text-[10px] tracking-[0.5em] text-[#731515]">
                  TICKET{eventInfo.qty > 1 ? 'S' : ''} CONFIRMED
                </div>

                <h1
                  className="text-3xl md:text-4xl font-light text-[#1a0505] leading-tight"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {eventInfo.qty > 1 ? "You're all in!" : "You're in!"}
                </h1>

                <p
                  className="text-sm text-[#7a4a4a] font-light italic leading-relaxed"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {eventInfo.qty > 1
                    ? `Your ${eventInfo.qty} tickets for `
                    : 'Your ticket for '}
                  <strong>{eventInfo.title}</strong> {eventInfo.qty > 1 ? 'are' : 'is'} confirmed.
                </p>

                {/* Event detail card */}
                <div className="w-full border border-[#e8d5d5] bg-white rounded-sm p-6 text-left space-y-4 mt-2">
                  <div className="text-[9px] tracking-[0.4em] text-[#731515] font-medium">
                    {eventInfo.title.toUpperCase()}
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-start gap-3">
                      <CalendarDays size={14} className="text-[#731515] mt-0.5 shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        {eventInfo.month} {eventInfo.day}, {eventInfo.year}
                      </span>
                    </div>

                    {eventInfo.time && (
                      <div className="flex items-start gap-3">
                        <Clock size={14} className="text-[#731515] mt-0.5 shrink-0" strokeWidth={1.5} />
                        <span className="text-sm text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                          {eventInfo.time}
                        </span>
                      </div>
                    )}

                    <div className="flex items-start gap-3">
                      <MapPin size={14} className="text-[#731515] mt-0.5 shrink-0" strokeWidth={1.5} />
                      <span className="text-sm text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        {eventInfo.locationFull}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Email notice */}
                <div className="flex items-start gap-3 text-left w-full px-1">
                  <Mail size={14} className="text-[#731515] mt-0.5 shrink-0" strokeWidth={1.5} />
                  <p className="text-xs text-[#7a4a4a]/80 leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    {eventInfo.qty > 1
                      ? `We've sent ${eventInfo.qty} ticket PDFs with QR codes to your email. Show each QR code at the entrance.`
                      : "We've sent your ticket PDF with QR code to your email. Show the QR code at the entrance."}
                  </p>
                </div>

                <div className="w-16 h-px bg-[#731515]/30 my-2" />

                <Link
                  href="/experiences"
                  className="text-[11px] tracking-[0.35em] text-white bg-[#731515] px-8 py-4 hover:bg-[#aa4848] transition-colors duration-300"
                >
                  BACK TO EVENTS
                </Link>

                <Link
                  href="/"
                  className="text-xs text-[#7a4a4a]/60 hover:text-[#731515] transition-colors duration-200 underline underline-offset-2"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Back to home
                </Link>
              </motion.div>
            </section>
          </>
        )}

        {/* ── Merch order confirmed ── */}
        {orderType === 'merch' && (
          <>
            <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6">
              <Link
                href="/wear-the-club"
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
              >
                <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
                BACK TO BOUTIQUE
              </Link>
            </div>

            <section className="flex flex-col items-center justify-center px-6 py-28 md:py-36 text-center">
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-center gap-6 max-w-md"
              >
                <motion.div
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                >
                  <CheckCircle size={56} className="text-[#731515]" strokeWidth={1} />
                </motion.div>

                <div className="text-[10px] tracking-[0.5em] text-[#731515]">ORDER CONFIRMED</div>

                <h1
                  className="text-3xl md:text-4xl font-light text-[#1a0505] leading-tight"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  Thank you for your order.
                </h1>

                <p
                  className="text-sm text-[#7a4a4a] font-light italic leading-relaxed"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Your Vivo Wine Club pieces are on their way. You will receive a confirmation email shortly with your order details and tracking information.
                </p>

                <p
                  className="text-xs text-[#7a4a4a]/60 leading-relaxed"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Items ship within 5–7 business days · Free returns
                </p>

                <div className="w-16 h-px bg-[#731515]/30 my-2" />

                <Link
                  href="/"
                  className="text-[11px] tracking-[0.35em] text-white bg-[#731515] px-8 py-4 hover:bg-[#aa4848] transition-colors duration-300"
                >
                  BACK TO HOME
                </Link>

                <Link
                  href="/wear-the-club"
                  className="text-xs text-[#7a4a4a]/60 hover:text-[#731515] transition-colors duration-200 underline underline-offset-2"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Continue shopping
                </Link>
              </motion.div>
            </section>
          </>
        )}

      </main>
      <Footer />
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense>
      <SuccessContent />
    </Suspense>
  );
}
