'use client';

import { motion } from 'framer-motion';
import { useTranslations } from 'next-intl';

export default function VisionMissionSection() {
  const t = useTranslations('mission');
  return (
    <section className="py-14 md:py-20 bg-[#fdf6f6]">
      <div className="max-w-3xl mx-auto px-6 lg:px-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="flex flex-col items-center gap-5"
        >
          <h3
            className="text-[clamp(1.8rem,3vw,2.6rem)] font-light text-[#1a0505] leading-none"
            style={{ fontFamily: 'var(--font-syne)' }}
          >{t('heading')}</h3>
          <div className="w-8 h-px bg-[#731515]/30" />
          <p
            className="text-lg font-normal text-[#7a4a4a] leading-relaxed max-w-2xl"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {t('body')}
          </p>
        </motion.div>
      </div>
    </section>
  );
}
