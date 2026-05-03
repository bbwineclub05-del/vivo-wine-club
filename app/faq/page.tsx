'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import FaqSection from '@/components/FaqSection';

export default function FaqPage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── Back link ── */}
        <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
            BACK
          </Link>
        </div>

        <FaqSection />

      </main>
      <Footer />
    </>
  );
}
