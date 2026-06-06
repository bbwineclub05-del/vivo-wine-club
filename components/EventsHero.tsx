'use client';

import BackButton from '@/components/BackButton';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function EventsHero() {
  const t = useTranslations('events');
  return (
    <div className="relative w-full h-[220px] sm:h-[280px] md:h-[350px]">
      <Image
        src="/events/wine-party8.jpg"
        alt="Events — Vivo Wine Club"
        fill
        className="object-cover"
        priority
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-[#731515]/60" />
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
        <div className="text-[10px] tracking-[0.5em] text-white/70 mb-4">{t('calendarLabel')}</div>
        <h1
          className="text-[clamp(2rem,5vw,4rem)] font-light text-white leading-tight"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {t('heading')}
        </h1>
        <p
          className="mt-4 text-sm md:text-base text-white/75 font-light italic leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {t('subtitle')}
        </p>
      </div>
      <div className="absolute top-6 left-6 md:left-10 z-10">
        <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/70 hover:text-white transition-colors duration-300" />
      </div>
    </div>
  );
}
