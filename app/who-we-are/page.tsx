'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const FOUNDERS = [
  {
    name: 'Giacomo Gallo',
    city: 'Turin',
    role: 'Co-Founder',
    image: '/giacomo.png',
  },
  {
    name: 'Filippo Lombardi',
    city: 'Brescia',
    role: 'Co-Founder',
    image: '/filippo.jpeg',
  },
  {
    name: 'Cristiano Michelotti',
    city: 'Florence',
    role: 'Co-Founder & Creative Director',
    image: '/cristiano.png',
  },
  {
    name: 'Riccardo Consalvo',
    city: 'Milan',
    role: 'Co-Founder',
    image: '/riccardo.jpeg',
  },
];

function FounderCard({
  name,
  city,
  role,
  image,
  index,
}: (typeof FOUNDERS)[number] & { index: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      whileHover={{ y: -6 }}
      style={{ willChange: 'transform' }}
      className="group flex flex-col"
    >
      {/* Photo — white bg, square, rounded */}
      <div className="relative overflow-hidden rounded-2xl mb-5 aspect-square bg-white shadow-sm border border-[#e8d5d5]">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover object-top transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1">
        <h3
          className="text-base font-medium text-[#1a0505] leading-snug group-hover:text-[#731515] transition-colors duration-300"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {name}
        </h3>
        <p
          className="text-[11px] tracking-[0.2em] text-[#731515]"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {city.toUpperCase()}
        </p>
        <p
          className="text-xs text-[#7a4a4a] mt-0.5"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {role}
        </p>
      </div>
    </motion.div>
  );
}

export default function WhoWeArePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-10 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">THE TEAM</div>
              <h1
                className="text-[clamp(3rem,8vw,6rem)] font-light text-[#1a0505] leading-none section-title mb-6"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                WHO WE ARE
              </h1>
              <p
                className="text-lg md:text-xl text-[#7a4a4a] font-light italic max-w-2xl leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Four friends. One passion. A mission to change the way young people experience wine.
              </p>
            </motion.div>
          </div>
        </section>

        {/* ── OUR STORY ── */}
        <section className="relative overflow-hidden pb-20 md:pb-28">
          <div className="fog-left" style={{ top: '20%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">

            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-20"
            />

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
              {/* Label + title */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8 }}
              >
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">OUR STORY</div>
                <h2
                  className="text-[clamp(2rem,5vw,4rem)] font-light text-[#1a0505] leading-tight"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  It started<br />in Paris.
                </h2>
              </motion.div>

              {/* Narrative text */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.8, delay: 0.15 }}
              >
                <p
                  className="text-base md:text-lg text-[#7a4a4a] font-light leading-relaxed"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Four students at ESCP, brought together not just by lectures and case studies,
                  but by a shared obsession with wine. We spent weekends visiting cellars in Bordeaux
                  and Burgundy, arguing about tannins over cheap bistro tables, and slowly realising
                  something: wine had an image problem. It felt exclusive, complicated, reserved for
                  people who already knew.
                </p>
                <p
                  className="text-base md:text-lg text-[#7a4a4a] font-light leading-relaxed mt-6"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  We wanted to change that. Vivo Wine Club was born from a simple idea — bring great
                  wine to great people, without the pretension. Themed parties, intimate winery visits,
                  curated tastings. No dress codes. No gatekeeping. Just bottles worth opening and
                  people worth meeting.
                </p>
              </motion.div>
            </div>
          </div>
        </section>

        {/* ── FOUNDERS ── */}
        <section className="relative overflow-hidden pb-28 md:pb-32">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-16"
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mb-14"
            >
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">THE FOUNDERS</div>
              <h2
                className="text-[clamp(2rem,5vw,4rem)] font-light text-[#1a0505] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                MEET THE TEAM
              </h2>
            </motion.div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
              {FOUNDERS.map((founder, i) => (
                <FounderCard key={founder.name} {...founder} index={i} />
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
