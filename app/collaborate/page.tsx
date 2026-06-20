'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import BackButton from '@/components/BackButton';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

interface FormState {
  name: string;
  email: string;
  type: string;
  proposal: string;
}

const EMPTY: FormState = { name: '', email: '', type: '', proposal: '' };

export default function CollaboratePage() {
  const t = useTranslations('collaborate');
  const COLLABORATION_TYPES = [
    { key: 'typeWinery', value: 'Winery / Producer' },
    { key: 'typeBar',    value: 'Bar / Restaurant / Club' },
    { key: 'typeSponsor',value: 'Sponsor / Partner' },
    { key: 'typeMedia',  value: 'Media / Press' },
    { key: 'typeOther',  value: 'Other' },
  ] as const;
  const [form, setForm] = useState<FormState>(EMPTY);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/collaborate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error(t('errorMessage'));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorMessage'));
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full bg-white/70 border border-[#e8d5d5] text-[#1a0505] placeholder-[#7a4a4a]/50 px-5 py-4 text-sm focus:outline-none focus:border-[#731515]/50 transition-colors duration-300 rounded-lg';

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── Back link ── */}
        <div className="max-w-5xl mx-auto px-6 lg:px-10 pt-6">
          <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300" />
        </div>

        <section className="relative overflow-hidden py-16 md:py-24">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-3xl mx-auto px-6 lg:px-10">

            {/* Header */}
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="mb-14"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">
                {t('getInTouch')}
              </div>
              <h1
                className="text-[clamp(2.2rem,5.5vw,4.5rem)] font-light text-[#1a0505] leading-tight mb-6"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('heading')}
              </h1>
              <p
                className="text-base text-[#7a4a4a] font-light leading-relaxed max-w-xl"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('subtitle')}
              </p>
            </motion.div>

            {/* Success state */}
            {sent && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="p-8 border border-[#731515]/30 bg-[#731515]/5 text-center rounded-lg"
              >
                <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-3">{t('proposalSent')}</div>
                <p className="text-base text-[#1a0505] font-light" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {t('thankYou')}
                </p>
                <p className="text-sm text-[#7a4a4a] mt-2" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {t('confirmationEmail')} <strong>{form.email}</strong>.
                </p>
              </motion.div>
            )}

            {/* Form */}
            {!sent && (
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
                  placeholder={t('namePlaceholder')}
                  required
                  value={form.name}
                  onChange={set('name')}
                  className={inputBase}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
                <input
                  type="email"
                  placeholder={t('emailPlaceholder')}
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
                  <option value="" disabled>{t('typePlaceholder')}</option>
                  {COLLABORATION_TYPES.map((item) => (
                    <option key={item.value} value={item.value} className="bg-white text-[#1a0505]">
                      {t(item.key)}
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
                placeholder={t('proposalPlaceholder')}
                required
                rows={6}
                value={form.proposal}
                onChange={set('proposal')}
                className={`${inputBase} resize-none`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              />

              {/* Error */}
              {error && (
                <p className="text-center text-xs text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {error}
                </p>
              )}

              {/* Submit */}
              <motion.button
                type="submit"
                disabled={loading}
                whileTap={{ scale: 0.99 }}
                className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.4em] flex items-center justify-center gap-3 hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300 mt-2 rounded-lg"
              >
                <Send size={13} />
                {loading ? t('sending') : t('sendProposal')}
              </motion.button>
            </motion.form>
            )}

          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
