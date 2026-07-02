'use client';

import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslations } from 'next-intl';
import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Calendar, MapPin, Wine, Users } from 'lucide-react';

/* ─── Slide definitions ─────────────────────────────────────────────────────── */

const SLIDES = [
  {
    image:           '/bottenago.jpg',
    imagePosition:   'center center',
    sloganColor:     '#2C4A6E',
    infoColor:       '#FFFFFF',
    contentOffset:   '0px',
    sloganGap:       null as string | null,  // default spacing
    slug:            'bottenago-lake-garda-jul-2026',
    sloganKey:       'slide1Slogan',
    whenKey:         'slide1When',
    whereKey:        'slide1Where',
    typeKey:         'slide1Type',
    accessKey:       'slide1Access',
  },
  {
    image:           '/Petrav1.png',
    imagePosition:   'center 35%',
    sloganColor:     '#4A1518',
    infoColor:       '#FFFFFF',
    contentOffset:   '28vh',          // shift block down so slogan appears below "PETRA BEACH CLUB" image text
    sloganGap:       '3vh' as string | null,    // compact gap between slogan and info strip
    slug:            'terrace-party-versilia-edition-jul-2026',
    sloganKey:       'slide2Slogan',
    whenKey:         'slide2When',
    whereKey:        'slide2Where',
    typeKey:         'slide2Type',
    accessKey:       'slide2Access',
  },
] as const;

const INFO_ITEMS = [
  { labelKey: 'labelWhen',   Icon: Calendar },
  { labelKey: 'labelWhere',  Icon: MapPin },
  { labelKey: 'labelType',   Icon: Wine },
  { labelKey: 'labelAccess', Icon: Users },
] as const;

const AUTOPLAY_MS = 4000;
const RESUME_MS   = 5000;

/* ─── Component ─────────────────────────────────────────────────────────────── */

export default function HeroSection() {
  const t = useTranslations('hero');
  const [current,   setCurrent]   = useState(0);
  const [direction, setDirection] = useState(1);

  const autoplayRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const resumeRef    = useRef<ReturnType<typeof setTimeout>  | null>(null);
  const sectionRef   = useRef<HTMLElement>(null);

  // Touch state — held in refs so native listeners can read them
  const touchStartX  = useRef<number | null>(null);
  const touchStartY  = useRef<number | null>(null);
  const isHorizSwipe = useRef(false);

  /* ── Autoplay ── */
  const startAutoplay = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    autoplayRef.current = setInterval(() => {
      setDirection(1);
      setCurrent(prev => (prev + 1) % SLIDES.length);
    }, AUTOPLAY_MS);
  }, []);

  const pauseAndResume = useCallback(() => {
    if (autoplayRef.current) clearInterval(autoplayRef.current);
    if (resumeRef.current)   clearTimeout(resumeRef.current);
    resumeRef.current = setTimeout(startAutoplay, RESUME_MS);
  }, [startAutoplay]);

  useEffect(() => {
    startAutoplay();
    return () => {
      if (autoplayRef.current) clearInterval(autoplayRef.current);
      if (resumeRef.current)   clearTimeout(resumeRef.current);
    };
  }, [startAutoplay]);

  /* ── Navigation ── */
  function goTo(index: number, dir: number) {
    setDirection(dir);
    setCurrent(index);
    pauseAndResume();
  }
  const prev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length, -1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);
  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length, 1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current]);

  /* ── Native touch handling via ref
       • touchstart / touchend → passive (don't need to block scroll)
       • touchmove              → { passive: false } so we CAN call
                                  preventDefault for horizontal swipes only
       This avoids React synthetic events interfering with child tap targets
       and correctly prevents pull-to-refresh during lateral swipes.        ── */
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    function onTouchStart(e: TouchEvent) {
      touchStartX.current  = e.touches[0].clientX;
      touchStartY.current  = e.touches[0].clientY;
      isHorizSwipe.current = false;
    }

    function onTouchMove(e: TouchEvent) {
      if (touchStartX.current === null || touchStartY.current === null) return;
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      const dy = Math.abs(e.touches[0].clientY - touchStartY.current);
      if (!isHorizSwipe.current && (dx > 5 || dy > 5)) {
        isHorizSwipe.current = dx > dy;
      }
      // Only block default (pull-to-refresh / horizontal scroll) for lateral swipes
      if (isHorizSwipe.current) {
        e.preventDefault();
      }
    }

    function onTouchEnd(e: TouchEvent) {
      if (touchStartX.current === null) return;
      const diff = touchStartX.current - e.changedTouches[0].clientX;
      if (isHorizSwipe.current && Math.abs(diff) > 40) {
        // Use the stable current/prev/next by reading the current ref at dispatch time
        if (diff > 0) {
          setCurrent(prev => {
            const next = (prev + 1) % SLIDES.length;
            setDirection(1);
            return next;
          });
        } else {
          setCurrent(prev => {
            const next = (prev - 1 + SLIDES.length) % SLIDES.length;
            setDirection(-1);
            return next;
          });
        }
        pauseAndResume();
      }
      touchStartX.current  = null;
      touchStartY.current  = null;
      isHorizSwipe.current = false;
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove',  onTouchMove,  { passive: false }); // must be non-passive to call preventDefault
    el.addEventListener('touchend',   onTouchEnd,   { passive: true });

    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove',  onTouchMove);
      el.removeEventListener('touchend',   onTouchEnd);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pauseAndResume]);

  const slide = SLIDES[current];

  /* ── Slide variants ── */
  const imgVariants = {
    enter:  (dir: number) => ({ x: dir > 0 ? '100%' : '-100%' }),
    center: { x: '0%' },
    exit:   (dir: number) => ({ x: dir > 0 ? '-100%' : '100%' }),
  };

  const valueKeys = [slide.whenKey, slide.whereKey, slide.typeKey, slide.accessKey] as const;

  return (
    <section
      ref={sectionRef}
      className="relative min-h-screen min-h-[100svh] flex flex-col items-center justify-center overflow-hidden"
      // No overscroll-behavior here — it blocks desktop wheel scroll on non-scrollable elements
      // No React touch handlers — handled natively above for correct passive/non-passive control
    >

      {/* ── Background slides (pointer-events: none so they never intercept clicks) ── */}
      <AnimatePresence initial={false} custom={direction}>
        <motion.div
          key={`bg-${current}`}
          custom={direction}
          variants={imgVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-0"
          style={{ pointerEvents: 'none' }}
        >
          <Image
            src={slide.image}
            alt={t(slide.sloganKey)}
            fill
            className="object-cover"
            style={{ objectPosition: slide.imagePosition }}
            priority={current === 0}
            sizes="100vw"
          />
          {/* Light bordeaux veil */}
          <div className="absolute inset-0 bg-[#1a0505]/25" />
          {/* Subtle bottom gradient */}
          <div className="absolute inset-0" style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.20) 0%, transparent 55%)' }} />
        </motion.div>
      </AnimatePresence>

      {/* ── Slide content — z-20 ensures it is always above background slides ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={`content-${current}`}
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-20 text-center px-6 max-w-3xl mx-auto w-full"
          style={slide.contentOffset !== '0px' ? { marginTop: slide.contentOffset } : undefined}
        >
          {/* Slogan — text-4xl on mobile, clamp on md+ */}
          <h1
            className="font-light tracking-[-0.01em] leading-tight text-4xl md:text-[clamp(2rem,5.5vw,5rem)]"
            style={{
              fontFamily: 'var(--font-syne)',
              color: slide.sloganColor,
              textShadow: '0 2px 8px rgba(0,0,0,0.55)',
              marginBottom: slide.sloganGap ?? '2.5rem',
            }}
          >
            {t(slide.sloganKey)}
          </h1>

          {/* Event info strip
              · Mobile  (<sm): 2×2 grid
              · Desktop (sm+): single row with ✦ separators           */}
          <div className="mb-10">
            {/* Desktop row */}
            <div className="hidden sm:flex items-start justify-center gap-0">
              {INFO_ITEMS.map((item, i) => (
                <div key={item.labelKey} className="flex items-start">
                  <div className="flex flex-col items-center gap-2.5 px-5 md:px-7">
                    <span
                      className="text-[11px] tracking-[0.4em] font-black"
                      style={{ color: slide.infoColor, textShadow: '0 2px 6px rgba(0,0,0,0.65)', WebkitTextStroke: '0.3px rgba(0,0,0,0.2)' }}
                    >
                      {t(item.labelKey)}
                    </span>
                    <item.Icon size={20} strokeWidth={2} style={{ color: slide.infoColor }} />
                    <span
                      className="text-[11px] tracking-[0.3em] font-extrabold text-center"
                      style={{
                        fontFamily: 'var(--font-nunito)',
                        color: slide.infoColor,
                        textShadow: '0 2px 6px rgba(0,0,0,0.65)', WebkitTextStroke: '0.3px rgba(0,0,0,0.2)',
                      }}
                    >
                      {t(valueKeys[i])}
                    </span>
                  </div>
                  {i < INFO_ITEMS.length - 1 && (
                    <div className="flex flex-col items-center self-center">
                      <span className="text-xs leading-none select-none" style={{ color: slide.infoColor, opacity: 0.4 }}>✦</span>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Mobile 2×2 grid */}
            <div className="grid grid-cols-2 gap-x-6 gap-y-6 sm:hidden max-w-[300px] mx-auto">
              {INFO_ITEMS.map((item, i) => (
                <div key={item.labelKey} className="flex flex-col items-center gap-2">
                  <span
                    className="text-[10px] tracking-[0.35em] font-black"
                    style={{ color: slide.infoColor, textShadow: '0 2px 6px rgba(0,0,0,0.65)', WebkitTextStroke: '0.3px rgba(0,0,0,0.2)' }}
                  >
                    {t(item.labelKey)}
                  </span>
                  <item.Icon size={17} strokeWidth={2} style={{ color: slide.infoColor }} />
                  <span
                    className="text-[10px] tracking-[0.2em] font-extrabold text-center leading-snug"
                    style={{
                      fontFamily: 'var(--font-nunito)',
                      color: slide.infoColor,
                      textShadow: '0 2px 6px rgba(0,0,0,0.65)', WebkitTextStroke: '0.3px rgba(0,0,0,0.2)',
                    }}
                  >
                    {t(valueKeys[i])}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* CTA — relative + z-30 ensures it is tappable above everything */}
          <Link
            href={`/events/${slide.slug}#guest-form`}
            className="relative z-30 inline-block px-14 py-5 bg-[#731515] text-white text-[13px] tracking-[0.35em] hover:bg-[#aa4848] hover:shadow-[0_0_40px_rgba(115,21,21,0.4)] transition-all duration-300 border border-[#731515] rounded-lg"
            style={{ WebkitTapHighlightColor: 'transparent', minHeight: '48px', minWidth: '48px' }}
          >
            {t('joinList')}
          </Link>
        </motion.div>
      </AnimatePresence>

      {/* ── Left / Right arrows — hidden on mobile, z-30, 48×48 tap target ── */}
      <button
        onClick={prev}
        aria-label="Slide precedente"
        className="hidden sm:flex absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 z-30 items-center justify-center w-12 h-12 transition-colors duration-200"
        style={{ color: 'rgba(115,21,21,0.55)', WebkitTapHighlightColor: 'transparent' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#731515')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(115,21,21,0.55)')}
      >
        <ChevronLeft size={36} strokeWidth={1} />
      </button>
      <button
        onClick={next}
        aria-label="Slide successiva"
        className="hidden sm:flex absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 z-30 items-center justify-center w-12 h-12 transition-colors duration-200"
        style={{ color: 'rgba(115,21,21,0.55)', WebkitTapHighlightColor: 'transparent' }}
        onMouseEnter={e => (e.currentTarget.style.color = '#731515')}
        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(115,21,21,0.55)')}
      >
        <ChevronRight size={36} strokeWidth={1} />
      </button>

      {/* ── Dot indicators — z-30, 44×44 tap area via padding ── */}
      <div className="absolute bottom-8 z-30 flex items-center gap-1 px-2 py-3">
        {SLIDES.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i, i > current ? 1 : -1)}
            aria-label={`Vai alla slide ${i + 1}`}
            className="flex items-center justify-center p-3"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <span
              className="block h-1.5 rounded-full transition-all duration-300"
              style={{
                width:      i === current ? '1.25rem' : '0.375rem',
                background: i === current ? '#731515' : 'rgba(115,21,21,0.35)',
              }}
            />
          </button>
        ))}
      </div>

    </section>
  );
}
