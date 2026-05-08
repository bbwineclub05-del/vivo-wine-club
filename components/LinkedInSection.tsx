'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowUpRight } from 'lucide-react';

/* ── Types ── */
export interface NewsItem {
  id: string;
  tag: string;
  title: string;
  description: string;
  href: string;
  region: string | null;
  images: string[];
  image_fit: 'cover' | 'contain';
  published: boolean;
  sort_order: number;
  created_at: string;
}

/* ── Hardcoded fallback (shown while DB loads or if DB is empty) ── */
const FALLBACK_POSTS: Omit<NewsItem, 'id' | 'published' | 'sort_order' | 'created_at'>[] = [
  {
    tag: 'COMING SOON',
    title: 'Giuseppe Quintarelli — Upcoming Visit',
    description:
      "We'll soon be visiting Giuseppe Quintarelli, one of the most legendary wineries in Valpolicella and a true global icon of Amarone. A rare opportunity to step inside a place where tradition, patience and craftsmanship have shaped some of the most coveted wines in the world.",
    href: 'https://www.linkedin.com/feed/update/urn:li:activity:7458475994270593024/',
    region: 'Valpolicella, Italy',
    images: ['/quintarelli 1.jpeg', '/quintarelli .jpeg'],
    image_fit: 'cover',
  },
  {
    tag: 'WINERY VISIT',
    title: "Ca' del Bosco Visit",
    description:
      "A private visit to one of Franciacorta's most iconic estates. We explored the cellars, tasted through the range, and discovered why Ca' del Bosco has set the benchmark for Italian méthode classique sparkling wine for over fifty years.",
    href: 'https://www.linkedin.com/feed/update/urn:li:activity:7454880388503564288/',
    region: 'Franciacorta, Italy',
    images: ['/events/Winery visits/wv3.jpg', '/Ca-del-Bosco.png'],
    image_fit: 'cover',
  },
  {
    tag: 'WINERY VISIT',
    title: 'Monterossa Visit',
    description:
      "An intimate morning at Monterossa — one of Franciacorta's most elegant producers. From vineyard to bottle, we got a rare behind-the-scenes look at the craftsmanship behind their Satèn and Rosé, with a tasting that left a lasting impression.",
    href: 'https://www.linkedin.com/feed/update/urn:li:activity:7452272329461649408/',
    region: 'Franciacorta, Italy',
    images: ['/tavolo.jpg', '/Monterossa.png'],
    image_fit: 'cover',
  },
];

/* ── Image slider ── */
function ImageSlider({ images, imageFit }: { images: string[]; imageFit: 'cover' | 'contain' }) {
  const [idx, setIdx] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (images.length <= 1) return;
    timerRef.current = setInterval(() => {
      setIdx((i) => (i + 1) % images.length);
    }, 4000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [images.length]);

  const imgClass = imageFit === 'contain' ? 'object-contain p-6' : 'object-cover';

  return (
    <div className="relative w-full h-full overflow-hidden">
      {images.map((src, i) => (
        <div
          key={src}
          className="absolute inset-0 transition-opacity duration-700"
          style={{ opacity: i === idx ? 1 : 0 }}
        >
          <Image
            src={src}
            alt=""
            fill
            loading="lazy"
            className={imgClass}
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      ))}
      {images.length > 1 && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setIdx(i); }}
              className={`w-1.5 h-1.5 rounded-full transition-all duration-300 ${i === idx ? 'bg-white' : 'bg-white/40'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── News card ── */
function NewsCard({
  post,
  index,
  reducedMotion,
}: {
  post: Omit<NewsItem, 'id' | 'published' | 'sort_order' | 'created_at'> & Partial<Pick<NewsItem, 'id'>>;
  index: number;
  reducedMotion: boolean;
}) {
  const d = (n: number) => (reducedMotion ? 0 : n);

  return (
    <motion.a
      href={post.href}
      target="_blank"
      rel="noopener noreferrer"
      initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-20px' }}
      transition={{ duration: d(0.65), delay: d(index * 0.12), ease: [0.16, 1, 0.3, 1] }}
      className="group flex flex-col bg-white border border-[#e8d5d5] hover:border-[#731515]/40 transition-colors duration-300 overflow-hidden"
    >
      {/* Image */}
      <div className="relative w-full shrink-0 bg-[#f5f0f0] border-b border-[#e8d5d5]" style={{ height: 160 }}>
        {post.images.length > 0 ? (
          <ImageSlider images={post.images} imageFit={post.image_fit} />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-12 h-12 bg-[#731515]/10 rounded-full" />
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5">
        {/* Top row */}
        <div className="flex items-center justify-between gap-4 mb-4">
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
          className="text-sm text-[#7a4a4a] font-light leading-relaxed flex-1 mb-4"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {post.description}
        </p>

        {/* Footer row */}
        <div className="flex items-center justify-between pt-4 border-t border-[#e8d5d5]">
          <span
            className="text-[10px] tracking-[0.2em] text-[#7a4a4a]/50"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {post.region ?? ''}
          </span>
          <span
            className="text-[10px] tracking-[0.2em] text-[#731515] group-hover:underline underline-offset-2"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Read more →
          </span>
        </div>
      </div>
    </motion.a>
  );
}

/* ── Main section ── */
export default function LinkedInSection() {
  const reducedMotion = useReducedMotion() ?? false;
  const d = (n: number) => (reducedMotion ? 0 : n);

  const [posts, setPosts] = useState<typeof FALLBACK_POSTS>(FALLBACK_POSTS);

  useEffect(() => {
    fetch('/api/news')
      .then((r) => r.json())
      .then((json) => {
        if (Array.isArray(json.news) && json.news.length > 0) {
          setPosts(json.news);
        }
      })
      .catch(() => {/* silently keep fallback */});
  }, []);

  return (
    <section className="pt-4 pb-4 md:pt-6 md:pb-6 relative overflow-hidden">
      <div className="fog-right" style={{ top: '10%' }} />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <motion.div
          initial={{ opacity: reducedMotion ? 1 : 0, y: reducedMotion ? 0 : 28 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.8) }}
          className="mb-8"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">LATEST NEWS</div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#1a0505] leading-none section-title"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Our Latest News
          </h2>
          <p
            className="mt-6 text-lg text-[#7a4a4a] font-light italic max-w-xl"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Behind-the-scenes stories, winery visits and exclusive moments, shared with our community on LinkedIn.
          </p>
        </motion.div>

        {/* Divider */}
        <motion.div
          initial={{ scaleX: reducedMotion ? 1 : 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: d(0.9), ease: [0.16, 1, 0.3, 1] }}
          className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-8"
        />

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {posts.map((post, i) => (
            <NewsCard
              key={'id' in post ? String(post.id) : post.title}
              post={post}
              index={i}
              reducedMotion={reducedMotion}
            />
          ))}
        </div>

      </div>
    </section>
  );
}
