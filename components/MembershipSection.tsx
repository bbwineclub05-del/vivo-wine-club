'use client';

import Link from 'next/link';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function MembershipSection() {
  const reducedMotion = useReducedMotion();
  const d = (n: number) => (reducedMotion ? 0 : n);
  const t = useTranslations('home');

  const BENEFITS = [
    { number: '01', title: t('benefit1Title'), body: t('benefit1Body') },
    { number: '02', title: t('benefit2Title'), body: t('benefit2Body') },
    { number: '03', title: t('benefit3Title'), body: t('benefit3Body') },
  ];

  return (
    <section className="pt-6 pb-16 md:pt-8 md:pb-20 relative overflow-hidden">
      <div className="fog-left" style={{ top: '10%' }} />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Divider */}
        <motion.div
          initial={{ scaleX: reducedMotion ? 1 : 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
          className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-16"
        />

        {/* Header */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.8) }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-5">{t('membershipLabel')}</div>
          <h2
            className="text-[clamp(2rem,4.5vw,3.5rem)] font-light text-[#1a0505] leading-tight max-w-3xl"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {t('membershipHeading')}
          </h2>
        </motion.div>

        {/* Benefits grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-[#731515]/10 mb-14">
          {BENEFITS.map((b, i) => (
            <motion.div
              key={b.number}
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: d(0.7), delay: d(i * 0.1), ease: [0.16, 1, 0.3, 1] }}
              whileHover={reducedMotion ? {} : { scale: 1.03 }}
              style={{ transition: 'transform 0.3s ease' }}
              className="bg-[#fdf6f6] p-7 flex flex-col gap-4 cursor-default"
            >
              <span
                className="text-[2.6rem] font-light leading-none tabular-nums text-[#731515]"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {b.number}
              </span>
              <div className="w-8 h-px bg-[#731515]/30" />
              <h3
                className="text-lg font-medium text-[#1a0505] leading-snug"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {b.title}
              </h3>
              <p
                className="text-sm text-[#7a4a4a] font-light leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {b.body}
              </p>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.7), delay: d(0.2) }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6"
        >
          <p
            className="text-sm text-[#7a4a4a] font-light italic max-w-sm leading-relaxed"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {t('membershipExclusive')}
          </p>
          <Link
            href="/membership"
            className="group inline-flex items-center gap-3 px-10 py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] hover:shadow-[0_0_40px_rgba(115,21,21,0.25)] transition-all duration-300 border border-[#731515] whitespace-nowrap"
          >
            {t('applyForMembership')}
            <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform duration-300" />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
