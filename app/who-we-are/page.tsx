'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';

function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.49 2.49 0 0 0 2.5 5.99C2.5 7.37 3.6 8.49 4.98 8.49a2.49 2.49 0 0 0 0-4.99ZM2.76 10.2h4.44V21H2.76V10.2ZM9.35 10.2h4.25v1.49h.06c.59-1.12 2.04-2.3 4.2-2.3 4.49 0 5.32 2.96 5.32 6.8V21h-4.43v-4.27c0-1.02-.02-2.33-1.42-2.33-1.43 0-1.64 1.11-1.64 2.26V21H9.35V10.2Z" />
    </svg>
  );
}
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const TEAM_MEMBERS = [
  {
    name: 'Carolina Maria Carra',
    initials: 'CC',
    role: 'Team Media',
    linkedin: 'https://www.linkedin.com/in/carolina-maria-carra/',
  },
  {
    name: 'Giulia Zalum',
    initials: 'GZ',
    role: 'Team Media',
    linkedin: 'https://www.linkedin.com/in/giulia-zalum-391a83255/',
  },
  {
    name: 'Gabriele Lisanti',
    initials: 'GL',
    role: 'Team Events',
    linkedin: 'https://www.linkedin.com/in/gabrielelisanti/',
  },
];

const FOUNDERS = [
  {
    name: 'Giacomo Gallo',
    city: 'Turin',
    role: 'Co-Founder',
    image: '/giacomo2.png',
    bio: 'Certified sommelier, raised in a family deeply rooted in wine culture. Spent a year in Bordeaux, visiting some of the most prestigious châteaux in the world. His passion was born at home, among the Langa vineyards. Currently studying at ESCP.',
    linkedin: 'https://www.linkedin.com/in/giacomo-gallo-520a85286/',
  },
  {
    name: 'Filippo Lombardi',
    city: 'Brescia',
    role: 'Co-Founder',
    image: '/filippo.png',
    bio: 'Spent a year in Bordeaux, gaining hands-on experience in the wine world. Deeply connected to his home region through Franciacorta, one of Italy\'s finest sparkling wine territories. Currently studying at ESCP.',
    linkedin: 'https://www.linkedin.com/in/filippolombardiofficial/',
  },
  {
    name: 'Cristiano Michelotti',
    city: 'Florence',
    role: 'Co-Founder & Creative Director',
    image: '/cristiano.png',
    bio: 'A true Tuscan wine enthusiast, with a deep passion for the great wines of his region — from Chianti to Montalcino and Bolgheri. Currently studying at ESCP.',
    linkedin: 'https://www.linkedin.com/in/cristiano-michelotti-799a49299/',
  },
  {
    name: 'Riccardo Consalvo',
    city: 'Milan',
    role: 'Co-Founder',
    image: '/riccardo.png',
    bio: 'A passionate lover of Piedmontese wines. The most recent addition to the team, but already a key contributor with a special impact. Currently studying at ESCP.',
    linkedin: 'https://www.linkedin.com/in/riccardo-consalvo-76aba124b/',
  },
];

function FounderCard({
  name,
  city,
  role,
  image,
  bio,
  linkedin,
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
      className="group"
    >
      <a
        href={linkedin}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${name} on LinkedIn`}
        className="flex flex-col h-full"
      >
        {/* Photo — neutral bg, square, rounded */}
        <div className="relative overflow-hidden rounded-2xl mb-5 aspect-square bg-white shadow-sm border border-[#e8d5d5]">
          <Image
            src={image}
            alt={name}
            fill
            className="object-contain transition-transform duration-700 group-hover:scale-105"
            sizes="(max-width: 768px) 50vw, 25vw"
          />
        </div>

        {/* Text */}
        <div className="flex flex-col flex-1 gap-1">
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
          <p
            className="text-xs text-[#7a4a4a]/80 leading-relaxed mt-3 flex-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {bio}
          </p>
          {/* LinkedIn icon — always pinned to the bottom */}
          <div className="mt-4 pt-4 border-t border-[#e8d5d5]">
            <span className="w-7 h-7 border border-[#e8d5d5] flex items-center justify-center text-[#7a4a4a] group-hover:border-[#731515]/50 group-hover:text-[#731515] transition-all duration-300">
              <LinkedInIcon />
            </span>
          </div>
        </div>
      </a>
    </motion.div>
  );
}

export default function WhoWeArePage() {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── HERO IMAGE ── */}
        <div className="relative w-full" style={{ height: 350 }}>
          <Image
            src="/events/wine-party6.jpg"
            alt="Who We Are — Vivo Wine Club"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-[#731515]/60" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-[10px] tracking-[0.5em] text-white/70 mb-4">THE TEAM</div>
            <h1
              className="text-[clamp(2rem,5vw,4rem)] font-light text-white leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Who We Are
            </h1>
            <p
              className="mt-4 text-sm md:text-base text-white/75 font-light italic max-w-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Four friends. One passion. A mission to change the way young people experience wine.
            </p>
          </div>
          <div className="absolute top-6 left-6 md:left-10 z-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/70 hover:text-white transition-colors duration-300 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>
          </div>
        </div>

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

        {/* ── THE TEAM ── */}
        <section className="relative overflow-hidden pb-28 md:pb-32">
          <div className="fog-left" style={{ top: '10%' }} />

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
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">THE TEAM</div>
              <h2
                className="text-[clamp(2rem,5vw,4rem)] font-light text-[#1a0505] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                OUR TEAM
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 lg:gap-8">
              {TEAM_MEMBERS.map((member, i) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.6, delay: i * 0.1, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center text-center gap-4 p-8 bg-[#731515] hover:bg-[#aa4848] transition-colors duration-300"
                >
                  {/* Avatar */}
                  <div className="w-16 h-16 rounded-full border-2 border-white/30 flex items-center justify-center shrink-0">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.7">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>

                  {/* Name */}
                  <div className="flex flex-col gap-1">
                    <h3
                      className="text-base font-medium text-white leading-snug"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {member.name}
                    </h3>
                    <p
                      className="text-[10px] tracking-[0.25em] text-white/70"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {member.role.toUpperCase()}
                    </p>
                  </div>

                  {/* LinkedIn */}
                  <a
                    href={member.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${member.name} on LinkedIn`}
                    className="w-8 h-8 border border-white/30 flex items-center justify-center text-white/70 hover:border-white hover:text-white transition-all duration-300"
                  >
                    <LinkedInIcon />
                  </a>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
