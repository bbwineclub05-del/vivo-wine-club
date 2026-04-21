'use client';

import Image from 'next/image';
import { motion } from 'framer-motion';

const FOUNDERS = [
  {
    name: 'Giacomo Gallo',
    city: 'Turin',
    bio: 'ESCP student and certified sommelier. Raised in a family with deep roots in the wine business, he spent time in Bordeaux studying and visiting some of the most prestigious estates in the world. Wine runs in his blood.',
    image: '/giacomo.png',
  },
  {
    name: 'Filippo Lombardi',
    city: 'Brescia',
    bio: 'ESCP student and passionate wine lover. Also studied in Bordeaux, where his appreciation for great wine deepened alongside his love for the people and stories behind each bottle.',
    image: '/filippo.jpeg',
  },
  {
    name: 'Cristiano Michelotti',
    city: 'Florence',
    bio: 'A Tuscan wine enthusiast with a sharp eye for design and aesthetics. He brings the visual soul of Vivo Wine Club to life, blending his passion for great wine with a love for beautiful things.',
    image: '/cristiano.png',
  },
  {
    name: 'Riccardo Consalvo',
    city: 'Milan',
    bio: 'ESCP student and connoisseur of Italian wines. With a deep knowledge of the Italian wine landscape, he brings taste, curiosity and a northern Italian perspective to everything we do.',
    image: '/riccardo.jpeg',
  },
];

function FounderCard({
  name,
  city,
  bio,
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
      className="group flex flex-col"
    >
      {/* Photo */}
      <div className="relative overflow-hidden rounded-xl mb-5 aspect-square">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 100vw, 25vw"
        />
        {/* Subtle gradient at bottom */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* City pill — appears on hover */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute top-4 right-4 px-3 py-1 bg-[#731515]/80 backdrop-blur-sm rounded-full"
        >
          <span
            className="text-[9px] tracking-[0.3em] text-[#F5EEE6]"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {city.toUpperCase()}
          </span>
        </motion.div>
      </div>

      {/* Text */}
      <div className="flex flex-col gap-2">
        {/* City — visible always on mobile, hidden on desktop (shown in hover pill) */}
        <span
          className="text-[9px] tracking-[0.4em] text-[#C9A84C] md:hidden"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {city.toUpperCase()}
        </span>

        <h3
          className="text-lg font-medium text-[#F5EEE6] leading-snug transition-colors duration-300 group-hover:text-[#C9A84C]"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {name}
        </h3>

        {/* Gold line */}
        <div className="w-8 h-px bg-[#C9A84C]/40 mb-1 transition-all duration-300 group-hover:w-14 group-hover:bg-[#C9A84C]/70" />

        <p
          className="text-sm text-[#C4B5A0]/80 leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {bio}
        </p>
      </div>
    </motion.div>
  );
}

export default function WhoWeAreSection() {
  return (
    <section id="chi-siamo" className="py-28 md:py-32 bg-[#090103] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-[#731515]/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 max-w-3xl"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-4">
            THE TEAM
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#F5EEE6] leading-none section-title mb-8"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            WHO WE ARE
          </h2>
          <p
            className="text-base md:text-lg text-[#C4B5A0] font-light leading-relaxed"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            We are four young friends brought together by a shared passion for wine. Our mission
            is simple: bring wine back into the lives of young people. We believe wine shouldn&apos;t
            feel intimidating — it should feel alive. Through themed parties, visits to the world&apos;s
            most prestigious wineries, and curated tastings, we&apos;re breaking down the barriers of a
            complex world and bringing great bottles closer to the people who deserve them.
          </p>
        </motion.div>

        {/* Gold divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="origin-left w-full h-px bg-gradient-to-r from-[#C9A84C]/30 via-[#C9A84C]/10 to-transparent mb-16"
        />

        {/* Founder cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-6">
          {FOUNDERS.map((founder, i) => (
            <FounderCard key={founder.name} {...founder} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
