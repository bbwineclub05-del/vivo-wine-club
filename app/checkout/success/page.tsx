'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useEffect } from 'react';
import { useCart } from '@/contexts/CartContext';

export default function CheckoutSuccessPage() {
  const { clearCart } = useCart();

  // Clear the cart once the user lands on the success page
  useEffect(() => {
    clearCart();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px] bg-[#fdf6f6]">
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
            {/* Icon */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
            >
              <CheckCircle size={56} className="text-[#731515]" strokeWidth={1} />
            </motion.div>

            {/* Label */}
            <div className="text-[10px] tracking-[0.5em] text-[#731515]">ORDER CONFIRMED</div>

            {/* Heading */}
            <h1
              className="text-3xl md:text-4xl font-light text-[#1a0505] leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Thank you for your order.
            </h1>

            {/* Body */}
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

            {/* Divider */}
            <div className="w-16 h-px bg-[#731515]/30 my-2" />

            {/* CTA */}
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
      </main>
      <Footer />
    </>
  );
}
