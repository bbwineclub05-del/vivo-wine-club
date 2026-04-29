'use client';

import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

const POSTS = [
  {
    tag: 'WINERY VISIT',
    title: "Ca' del Bosco Visit",
    description:
      "A private visit to one of Franciacorta's most iconic estates. We explored the cellars, tasted through the range, and discovered why Ca' del Bosco has set the benchmark for Italian méthode classique sparkling wine for over fifty years.",
    href: 'https://www.linkedin.com/feed/update/urn:li:activity:7454502442269937665/',
    region: 'Franciacorta, Italy',
    image: '/Ca-del-Bosco.png',
  },
  {
    tag: 'WINERY VISIT',
    title: 'Monterossa Visit',
    description:
      "An intimate morning at Monterossa — one of Franciacorta's most elegant producers. From vineyard to bottle, we got a rare behind-the-scenes look at the craftsmanship behind their Satèn and Rosé, with a tasting that left a lasting impression.",
    href: 'https://www.linkedin.com/feed/update/urn:li:activity:7452272329461649408/',
    region: 'Franciacorta, Italy',
    image: '/Monterossa.png',
  },
];

export default function LinkedInSection() {
  const reducedMotion = useReducedMotion();
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <section className="py-28 md:py-32 relative overflow-hidden">
      <div className="fog-right" style={{ top: '10%' }} />

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
            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">LATEST NEWS</div>
            <h2
              className="text-[clamp(2.2rem,5vw,4rem)] font-light text-[#1a0505] leading-tight section-title"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Our Latest<br />News
            </h2>
          </div>
          <p
            className="text-base md:text-lg text-[#7a4a4a] font-light italic leading-relaxed self-end pb-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Behind-the-scenes stories, winery visits and exclusive moments — shared with our community on LinkedIn.
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: reducedMotion ? 1 : 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
          className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-12"
        />

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {POSTS.map((post, i) => (
            <motion.a
              key={post.href}
              href={post.href}
              target="_blank"
              rel="noopener noreferrer"
              initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-20px' }}
              transition={{ duration: d(0.65), delay: d(i * 0.12), ease: [0.16, 1, 0.3, 1] }}
              className="group flex flex-col bg-white border border-[#e8d5d5] hover:border-[#731515]/40 transition-colors duration-300 overflow-hidden"
            >
              {/* Image */}
              <div className="relative w-full shrink-0 bg-[#f5f0f0] border-b border-[#e8d5d5]" style={{ height: 160 }}>
                <Image
                  src={post.image}
                  alt={post.title}
                  fill
                  loading="lazy"
                  className="object-contain p-4"
                  sizes="(max-width: 768px) 100vw, 50vw"
                />
              </div>

              {/* Content */}
              <div className="flex flex-col flex-1 p-8">
              {/* Top row */}
              <div className="flex items-center justify-between gap-4 mb-5">
                <span className="text-[9px] tracking-[0.4em] text-[#731515]">{post.tag}</span>
                <ArrowUpRight
                  size={15}
                  className="text-[#731515]/30 group-hover:text-[#731515] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all duration-300 shrink-0"
                />
              </div>

              {/* Title */}
              <h3
                className="text-xl font-medium text-[#1a0505] group-hover:text-[#731515] transition-colors duration-300 mb-4 leading-snug"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {post.title}
              </h3>

              {/* Description */}
              <p
                className="text-sm text-[#7a4a4a] font-light leading-relaxed flex-1 mb-6"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {post.description}
              </p>

              {/* Footer row */}
              <div className="flex items-center justify-between pt-5 border-t border-[#e8d5d5]">
                <span
                  className="text-[10px] tracking-[0.2em] text-[#7a4a4a]/50"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {post.region}
                </span>
                <span
                  className="text-[10px] tracking-[0.2em] text-[#731515] group-hover:underline underline-offset-2"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  Read more →
                </span>
              </div>
              </div>{/* end content */}
            </motion.a>
          ))}
        </div>

      </div>
    </section>
  );
}
