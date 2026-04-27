'use client';

import { useState } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Plus, Minus } from 'lucide-react';

const FAQS = [
  {
    q: 'What is Vivo Wine Club?',
    a: 'Vivo Wine Club is an exclusive community of wine lovers. We bring people together through carefully curated experiences — from wine parties and aperitifs to wine lounges and private visits to some of the world\'s finest wineries. Good wine, good music, good people.',
  },
  {
    q: 'How do I become a member?',
    a: 'You can apply for membership directly on our website. Each application is reviewed individually to make sure we keep the right vibe in our community. We will get back to you within a few days.',
  },
  {
    q: 'How much does membership cost?',
    a: 'Membership is available in different tiers depending on the experiences and benefits you are looking for. Pricing details are shared during the application process.',
  },
  {
    q: 'What kind of events do you organize?',
    a: 'We organize a wide range of experiences: wine parties, aperitifs, wine lounge evenings, sommelier-led masterclasses, and exclusive visits to some of the most iconic wineries in the world. Every event is designed to combine great wine with great company.',
  },
  {
    q: 'Do I need to be a wine expert to join?',
    a: 'Not at all. Vivo welcomes everyone with a genuine passion for wine — whether you are just starting to explore or you have been collecting for years. What matters is the love for wine and the people around it.',
  },
  {
    q: 'In which cities is Vivo Wine Club active?',
    a: 'We are currently active in Turin, Paris, Brescia, Milan, and Florence.',
  },
];

function FaqItem({
  faq,
  isOpen,
  onToggle,
  reducedMotion,
}: {
  faq: (typeof FAQS)[number];
  isOpen: boolean;
  onToggle: () => void;
  reducedMotion: boolean | null;
}) {
  return (
    <div className="border-b border-[#731515]/10 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-6 py-6 text-left group"
        aria-expanded={isOpen}
      >
        <span
          className={`text-base md:text-lg font-light leading-snug transition-colors duration-300 ${
            isOpen ? 'text-[#731515]' : 'text-[#1a0505] group-hover:text-[#731515]'
          }`}
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {faq.q}
        </span>
        <span
          className={`shrink-0 w-7 h-7 rounded-full border flex items-center justify-center transition-all duration-300 ${
            isOpen
              ? 'border-[#731515] bg-[#731515] text-white'
              : 'border-[#731515]/30 text-[#731515]/60 group-hover:border-[#731515]/60 group-hover:text-[#731515]'
          }`}
        >
          {isOpen ? <Minus size={13} strokeWidth={2} /> : <Plus size={13} strokeWidth={2} />}
        </span>
      </button>

      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: reducedMotion ? 1 : 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: reducedMotion ? 1 : 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.35, ease: [0.16, 1, 0.3, 1] }}
            style={{ overflow: 'hidden' }}
          >
            <p
              className="pb-6 text-sm md:text-base text-[#7a4a4a] font-light leading-relaxed max-w-2xl"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {faq.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function FaqSection() {
  const [open, setOpen] = useState<number | null>(null);
  const reducedMotion = useReducedMotion();
  const d = (n: number) => (reducedMotion ? 0 : n);

  const toggle = (i: number) => setOpen((prev) => (prev === i ? null : i));

  return (
    <section className="py-28 md:py-32 relative overflow-hidden">
      <div className="fog-left" style={{ top: '20%' }} />

      <div className="max-w-5xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.8) }}
          className="grid grid-cols-1 lg:grid-cols-[1fr_2fr] gap-10 lg:gap-20 items-start mb-14"
        >
          <div>
            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">FAQ</div>
            <h2
              className="text-[clamp(2.2rem,5vw,4rem)] font-light text-[#1a0505] leading-tight section-title"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Frequently<br />Asked<br />Questions
            </h2>
          </div>
          <p
            className="text-base md:text-lg text-[#7a4a4a] font-light italic leading-relaxed self-end pb-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Everything you need to know about Vivo Wine Club — from joining to what to expect at your first event.
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: reducedMotion ? 1 : 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
          className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-2"
        />

        {/* Accordion */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.6), delay: d(0.15) }}
        >
          {FAQS.map((faq, i) => (
            <FaqItem
              key={i}
              faq={faq}
              isOpen={open === i}
              onToggle={() => toggle(i)}
              reducedMotion={reducedMotion}
            />
          ))}
        </motion.div>

      </div>
    </section>
  );
}
