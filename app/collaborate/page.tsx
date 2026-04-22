'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft, Send } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const COLLABORATION_TYPES = [
  'Winery / Producer',
  'Bar / Restaurant / Club',
  'Sponsor / Partner',
  'Media / Press',
  'Other',
];

interface FormState {
  name: string;
  email: string;
  type: string;
  proposal: string;
}

const EMPTY: FormState = { name: '', email: '', type: '', proposal: '' };

export default function CollaboratePage() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [sent, setSent] = useState(false);

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const subject = encodeURIComponent(`Collaboration request — ${form.type || 'General'}`);
    const body = encodeURIComponent(
      `Name: ${form.name}\nEmail: ${form.email}\nType: ${form.type}\n\nProposal:\n${form.proposal}`
    );
    window.location.href = `mailto:vivowineclub@gmail.com?subject=${subject}&body=${body}`;
    setSent(true);
  };

  const inputBase =
    'w-full bg-white/70 border border-[#e8d5d5] text-[#1a0505] placeholder-[#7a4a4a]/50 px-5 py-4 text-sm focus:outline-none focus:border-[#731515]/50 transition-colors duration-300';

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">
        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-3xl mx-auto px-6 lg:px-10">

            {/* Back link */}
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-12 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-14"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">
                GET IN TOUCH
              </div>
              <h1
                className="text-[clamp(2.2rem,5.5vw,4.5rem)] font-light text-[#1a0505] leading-tight mb-6"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Let&apos;s work together.
              </h1>
              <p
                className="text-base text-[#7a4a4a] font-light leading-relaxed max-w-xl"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Are you a winery, wine bar, restaurant or industry organisation? We&apos;re always open
                to creative partnerships and new projects.
              </p>
            </motion.div>

            {/* Form */}
            <motion.form
              onSubmit={handleSubmit}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.15 }}
              className="flex flex-col gap-4"
            >
              {/* Name + Email */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <input
                  type="text"
                  placeholder="Full name"
                  required
                  value={form.name}
                  onChange={set('name')}
                  className={inputBase}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
                <input
                  type="email"
                  placeholder="Email"
                  required
                  value={form.email}
                  onChange={set('email')}
                  className={inputBase}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </div>

              {/* Type of collaboration */}
              <div className="relative">
                <select
                  required
                  value={form.type}
                  onChange={set('type')}
                  className={`${inputBase} appearance-none cursor-pointer ${form.type === '' ? 'text-[#7a4a4a]/50' : 'text-[#1a0505]'}`}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  <option value="" disabled>Type of collaboration</option>
                  {COLLABORATION_TYPES.map((t) => (
                    <option key={t} value={t} className="bg-white text-[#1a0505]">
                      {t}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
                  <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
                    <path d="M1 1l4 4 4-4" stroke="#731515" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
              </div>

              {/* Proposal */}
              <textarea
                placeholder="Briefly describe your proposal..."
                required
                rows={6}
                value={form.proposal}
                onChange={set('proposal')}
                className={`${inputBase} resize-none`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />

              {/* Submit */}
              <motion.button
                type="submit"
                whileTap={{ scale: 0.99 }}
                className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.4em] flex items-center justify-center gap-3 hover:bg-[#aa4848] transition-colors duration-300 mt-2"
              >
                <Send size={13} />
                SEND PROPOSAL
              </motion.button>
            </motion.form>

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
