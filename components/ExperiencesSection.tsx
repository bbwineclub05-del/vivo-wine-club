'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const EXPERIENCES = [
  {
    id: 1,
    title: 'Wine Party',
    description: 'Themed wine nights with music, curated bottles and a crowd that loves both',
    image: 'https://images.unsplash.com/photo-1528823872057-9c018a7a7553?w=900&q=80',
    href: '/events/wine-party',
  },
  {
    id: 2,
    title: 'Wine Lounge',
    description: 'Curated evenings in the most interesting wine bars across Europe',
    image: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=900&q=80',
    href: null,
  },
  {
    id: 3,
    title: 'Winery Visits',
    description: 'Private cellar tours and guided tastings at iconic estates',
    image: 'https://images.unsplash.com/photo-1506377247377-2a5b3b417ebb?w=900&q=80',
    href: null,
  },
];

// Duplicate for seamless infinite loop
const STRIP = [...EXPERIENCES, ...EXPERIENCES];

function ExperienceCard({ title, description, image, href }: (typeof EXPERIENCES)[number]) {
  const inner = (
    <div className="relative overflow-hidden rounded-2xl group" style={{ height: '400px' }}>
      <Image
        src={image}
        alt={title}
        fill
        className="object-cover transition-transform duration-700 group-hover:scale-105"
        sizes="25vw"
      />

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />

      {/* Arrow indicator — only for linked cards */}
      {href && (
        <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#731515]/80 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <ArrowUpRight size={14} className="text-[#F5EEE6]" />
        </div>
      )}

      {/* Text — bottom left */}
      <div className="absolute bottom-0 left-0 right-0 p-6">
        <h3
          className="text-[1.35rem] font-light text-[#F5EEE6] leading-tight mb-2 transition-colors duration-300 group-hover:text-[#C9A84C]"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {title}
        </h3>
        <p
          className="text-sm text-[#C4B5A0] leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {description}
        </p>
      </div>
    </div>
  );

  return (
    <div className="shrink-0 px-3" style={{ width: '25vw' }}>
      {href ? (
        <Link href={href} className="block">
          {inner}
        </Link>
      ) : (
        inner
      )}
    </div>
  );
}

export default function ExperiencesSection() {
  return (
    <section id="esperienze" className="py-28 md:py-32 bg-[#080204] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-4">
            WHAT WE DO
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#F5EEE6] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            EXPERIENCES
          </h2>
          <p
            className="mt-6 text-lg text-[#C4B5A0] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Experiences for every taste — from lively wine parties to intimate cellar visits
          </p>
        </motion.div>
      </div>

      {/* Full-width carousel */}
      <div className="relative">
        <div className="absolute left-0 top-0 bottom-0 w-24 bg-gradient-to-r from-[#080204] to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-[#080204] to-transparent z-10 pointer-events-none" />

        <motion.div
          className="flex"
          animate={{ x: ['0%', '-50%'] }}
          transition={{ duration: 18, ease: 'linear', repeat: Infinity }}
        >
          {STRIP.map((exp, i) => (
            <ExperienceCard key={`${exp.id}-${i}`} {...exp} />
          ))}
        </motion.div>
      </div>
    </section>
  );
}
