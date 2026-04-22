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
      style={{ willChange: 'transform' }}
      className="group flex flex-col"
    >
      {/* Photo */}
      <div className="relative overflow-hidden rounded-lg mb-3 aspect-square">
        <Image
          src={image}
          alt={name}
          fill
          className="object-cover object-center transition-transform duration-700 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />

        {/* City pill on hover */}
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          whileHover={{ opacity: 1, y: 0 }}
          className="absolute top-3 right-3 px-2.5 py-1 bg-[#731515]/80 backdrop-blur-sm rounded-full"
        >
          <span className="text-[8px] tracking-[0.3em] text-[#F5EEE6]" style={{ fontFamily: 'var(--font-nunito)' }}>
            {city.toUpperCase()}
          </span>
        </motion.div>
      </div>

      {/* Text */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[8px] tracking-[0.4em] text-[#731515] md:hidden" style={{ fontFamily: 'var(--font-nunito)' }}>
          {city.toUpperCase()}
        </span>

        <h3
          className="text-sm font-medium text-[#1a0505] leading-snug transition-colors duration-300 group-hover:text-[#731515]"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {name}
        </h3>

        <div className="w-6 h-px bg-[#731515]/40 mb-0.5 transition-all duration-300 group-hover:w-10 group-hover:bg-[#731515]/70" />

        <p className="text-xs text-[#7a4a4a] leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
          {bio}
        </p>
      </div>
    </motion.div>
  );
}

export default function WhoWeAreSection() {
  return (
    <section id="chi-siamo" className="py-28 md:py-32 relative overflow-hidden">
      {/* Section fog — left */}
      <div className="fog-left" style={{ top: '30%' }} />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16 max-w-3xl"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">
            THE TEAM
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none section-title mb-8"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            WHO WE ARE
          </h2>
          <p
            className="text-base md:text-lg text-[#7a4a4a] font-light leading-relaxed"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            We are four young friends brought together by a shared passion for wine. Our mission
            is simple: bring wine back into the lives of young people. We believe wine shouldn&apos;t
            feel intimidating — it should feel alive. Through themed parties, visits to the world&apos;s
            most prestigious wineries, and curated tastings, we&apos;re breaking down the barriers of a
            complex world and bringing great bottles closer to the people who deserve them.
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-16"
        />

        {/* Founder cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-4">
          {FOUNDERS.map((founder, i) => (
            <FounderCard key={founder.name} {...founder} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
