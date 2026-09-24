'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Users, Megaphone } from 'lucide-react';
import { useTranslations } from 'next-intl';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import BackButton from '@/components/BackButton';
import { SLOGAN } from '@/lib/brand';

/* ─────────────────────────────────────────────
   Shared icon
───────────────────────────────────────────── */
function LinkedInIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M4.98 3.5A2.49 2.49 0 0 0 2.5 5.99C2.5 7.37 3.6 8.49 4.98 8.49a2.49 2.49 0 0 0 0-4.99ZM2.76 10.2h4.44V21H2.76V10.2ZM9.35 10.2h4.25v1.49h.06c.59-1.12 2.04-2.3 4.2-2.3 4.49 0 5.32 2.96 5.32 6.8V21h-4.43v-4.27c0-1.02-.02-2.33-1.42-2.33-1.43 0-1.64 1.11-1.64 2.26V21H9.35V10.2Z" />
    </svg>
  );
}

/* ─────────────────────────────────────────────
   Static data
───────────────────────────────────────────── */
const TEAM_MEMBERS = [
  { name: 'Carolina Maria Carra', initials: 'CC', role: 'Team Media',             linkedin: 'https://www.linkedin.com/in/carolina-maria-carra/' },
  { name: 'Elena Catellani',      initials: 'EC', role: 'Team Media',             linkedin: 'https://www.linkedin.com/in/elena-catellani-a70aa72b0/' },
  { name: 'Marcello Abbadati',    initials: 'MA', role: 'Team Events · Sommelier',linkedin: 'https://www.linkedin.com/in/marcelloabbadati/' },
  { name: 'Giovanni Giachino',    initials: 'GG', role: 'Team Events · Sommelier',linkedin: 'https://www.linkedin.com/in/giovanni-giachino-/' },
  { name: 'Francesco Basile',     initials: 'FB', role: 'Team Sponsorship',       linkedin: 'https://www.linkedin.com/in/francesco-basile-a3b670265/' },
  { name: 'Federico Paroli',      initials: 'FP', role: 'Team Events',            linkedin: 'https://www.linkedin.com/in/federico-paroli-a10793378/' },
  { name: 'Giulia Fascella',      initials: 'GF', role: 'Team Media',             linkedin: 'https://www.linkedin.com/in/giulia-fascella-4a0772366/' },
  { name: 'Daniele Natalini',     initials: 'DN', role: 'Team Media',             linkedin: 'https://www.linkedin.com/in/daniele-natalini-076190381/' },
  { name: 'Lorenzo Fioretti',     initials: 'LF', role: 'Team Sponsorship',       linkedin: 'https://www.linkedin.com/in/lorenzo-fioretti-a6726a258/' },
  { name: 'Edoardo Piceni',       initials: 'EP', role: 'Team Tech',              linkedin: 'https://www.linkedin.com/in/edoardo-antonio-piceni-89a132212/' },
] as const;

const FOUNDERS_DATA = [
  { name: 'Giacomo Gallo',       city: 'Turin',    role: 'Co-Founder', image: '/giacomo2.png',  bioKey: 'bioGiacomo'    as const, taglineKey: 'taglineGiacomo'   as const, linkedin: 'https://www.linkedin.com/in/giacomo-gallo-520a85286/' },
  { name: 'Filippo Lombardi',    city: 'Brescia',  role: 'Co-Founder', image: '/filippo.png',   bioKey: 'bioFilippo'    as const, taglineKey: 'taglineFilippo'   as const, linkedin: 'https://www.linkedin.com/in/filippolombardiofficial/' },
  { name: 'Cristiano Michelotti',city: 'Florence', role: 'Co-Founder', image: '/cristiano.png', bioKey: 'bioCristiano'  as const, linkedin: 'https://www.linkedin.com/in/cristiano-michelotti-799a49299/' },
];

const STATS = [
  { value: '100+', labelKey: 'statMembers' as const },
  { value: '+5',   labelKey: 'statCities'  as const },
  { value: '15+',  labelKey: 'statEvents'  as const },
  { value: '70+',  labelKey: 'statWineries'as const },
];

const PILLARS = [
  { Icon: Users,     tagKey: 'pillar1Tag' as const, titleKey: 'pillar1Title' as const, bodyKey: 'pillar1Body' as const },
  { Icon: Megaphone, tagKey: 'pillar2Tag' as const, titleKey: 'pillar2Title' as const, bodyKey: 'pillar2Body' as const },
];

/** Last checkpoint (`next`) is the open-ended goal: lighter, pulsing marker and a line that fades out. */
const TIMELINE = [
  { next: false, placeKey: 'timeline1Place' as const, textKey: 'timeline1Text' as const, detailKey: 'timeline1Detail' as const },
  { next: false, placeKey: 'timeline2Place' as const, textKey: 'timeline2Text' as const, detailKey: 'timeline2Detail' as const },
  { next: false, placeKey: 'timeline3Place' as const, textKey: 'timeline3Text' as const, detailKey: 'timeline3Detail' as const },
  { next: true,  placeKey: 'timeline4Place' as const, textKey: null, detailKey: 'timeline4Detail' as const },
];

/* ─────────────────────────────────────────────
   Sub-components
───────────────────────────────────────────── */
function FounderCard({
  name,
  city,
  role,
  image,
  bio,
  linkedin,
  index,
}: {
  name: string;
  city: string;
  role: string;
  image: string;
  bio: string;
  linkedin: string;
  index: number;
}) {
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
        {/* Photo */}
        <div className="relative overflow-hidden rounded-2xl mb-4 aspect-square w-full max-w-[240px] sm:max-w-none sm:w-[78%] bg-white shadow-sm border border-[#e8d5d5]">
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
            className="text-[10px] tracking-[0.2em] text-[#731515] mt-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {city.toUpperCase()}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            <p
              className="text-xs text-[#7a4a4a]"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {role}
            </p>
            <span className="text-[#7a4a4a] group-hover:text-[#731515] transition-colors duration-300 shrink-0">
              <LinkedInIcon />
            </span>
          </div>
          <p
            className="text-xs text-[#7a4a4a]/70 leading-relaxed mt-3 flex-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {bio}
          </p>
        </div>
      </a>
    </motion.div>
  );
}

/* ─────────────────────────────────────────────
   Page
───────────────────────────────────────────── */
export default function WhoWeArePage() {
  const t = useTranslations('whoWeAre');

  const FOUNDERS = FOUNDERS_DATA.map(f => ({
    ...f,
    bio: t(f.bioKey),
  }));

  return (
    <>
      <Navbar />
      <main className="min-h-screen">

        {/* ── 1. HERO: what VIVO is, in one line ── */}
        <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
          {/* Background image via img tag */}
          <img
            src="/events/wine-party6.jpg"
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* Dark overlay */}
          <div className="absolute inset-0 bg-[#1a0505]/75" />

          {/* Back button */}
          <div className="absolute top-24 left-6 md:left-10 z-10">
            <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/60 hover:text-white transition-colors duration-300" />
          </div>

          {/* Content */}
          <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-[10px] tracking-[0.5em] text-white/50 mb-6"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('heading').toUpperCase()}
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.9, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="text-[clamp(2.6rem,6.5vw,5rem)] font-light text-white leading-[1.08] tracking-[-0.01em]"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {t('heroTitle')}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.25 }}
              className="mt-8 text-base md:text-xl text-white/80 font-light leading-relaxed max-w-2xl"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('heroSubtitle')}
            </motion.p>
          </div>

          {/* Scroll cue */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2"
          >
            <span className="text-[9px] tracking-[0.4em] text-white/40" style={{ fontFamily: 'var(--font-nunito)' }}>SCROLL</span>
            <div className="w-px h-10 bg-gradient-to-b from-white/30 to-transparent" />
          </motion.div>
        </section>

        {/* ── 2. WHAT WE DO: problem, answer, two pillars ── */}
        <section className="relative bg-[#fdf6f6] py-16 md:py-24 overflow-hidden">
          <div className="fog-left" style={{ top: '10%' }} />

          <div className="relative max-w-5xl mx-auto px-6 lg:px-10">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
              className="text-center max-w-3xl mx-auto mb-12 md:mb-16"
            >
              <div
                className="text-[10px] tracking-[0.5em] text-[#731515] mb-6"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('whatWeDoLabel')}
              </div>
              <p
                className="text-[clamp(1.2rem,2.5vw,1.8rem)] font-light text-[#7a4a4a] leading-snug"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('whatWeDoProblem')}
              </p>
              <p
                className="mt-5 text-[clamp(1.8rem,4.2vw,3.2rem)] font-light text-[#731515] leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('whatWeDoAnswer')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
              {PILLARS.map((pillar, i) => (
                <motion.div
                  key={pillar.titleKey}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-40px' }}
                  transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col gap-4 bg-white border border-[#eddada] rounded-lg p-7 md:p-9"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-full border border-[#731515]/30 flex items-center justify-center text-[#731515] shrink-0">
                      <pillar.Icon size={18} strokeWidth={1.5} />
                    </span>
                    <span
                      className="text-[10px] tracking-[0.4em] text-[#731515]"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {t(pillar.tagKey)}
                    </span>
                  </div>
                  <h3
                    className="text-xl md:text-2xl font-light text-[#1a0505] leading-tight"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    {t(pillar.titleKey)}
                  </h3>
                  <p
                    className="text-sm md:text-base text-[#7a4a4a] font-light leading-relaxed"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {t(pillar.bodyKey)}
                  </p>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 3. JOURNEY: horizontal timeline ── */}
        <section className="relative bg-[#1a0505] py-16 md:py-24 overflow-hidden">
          {/* Subtle radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 0%, rgba(115,21,21,0.25) 0%, transparent 70%)' }}
          />

          <div className="relative max-w-6xl mx-auto px-6 lg:px-10">
            {/* Label */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6 }}
              className="text-center mb-12 md:mb-16"
            >
              <div
                className="text-[10px] tracking-[0.5em] text-[#e8d5d5]/50 mb-4"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('timelineLabel')}
              </div>
              <h2
                className="text-[clamp(2rem,5vw,3.5rem)] font-light text-white/95 leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('storyTitle').split('\n').map((line, i) => (
                  <span key={i}>{line}{i === 0 && <br />}</span>
                ))}
              </h2>
            </motion.div>

            {/* Horizontal on desktop; swipeable row on phones */}
            <div className="-mx-6 px-6 md:mx-0 md:px-0 py-4 overflow-x-auto md:overflow-visible snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex md:grid md:grid-cols-4">
                {TIMELINE.map((item, i) => (
                  <motion.div
                    key={item.placeKey}
                    initial={{ opacity: 0, y: 24 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: '-40px' }}
                    transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
                    className="group relative shrink-0 w-[78vw] sm:w-[46vw] md:w-auto snap-center text-center"
                  >
                    {/* Date: fixed height, bottom-aligned, so markers stay on one line even if a label wraps */}
                    <div className="h-10 px-4 md:px-5 mb-3 flex items-end justify-center">
                      <p
                        className={`text-[10px] tracking-[0.4em] ${item.next ? 'text-[#e8b4b4]' : 'text-[#c84040]'}`}
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {t(item.placeKey).toUpperCase()}
                      </p>
                    </div>

                    {/* Marker row: line segments run edge to edge so the line is continuous */}
                    <div className="relative h-12 flex items-center justify-center">
                      {i > 0 && <span className="absolute left-0 top-1/2 w-1/2 h-px bg-[#731515]/60" />}
                      {i < TIMELINE.length - 1
                        ? <span className="absolute right-0 top-1/2 w-1/2 h-px bg-[#731515]/60" />
                        : <span className="absolute right-0 top-1/2 w-1/2 h-px bg-gradient-to-r from-[#731515]/60 to-transparent" />}
                      <div className="relative z-10 w-7 h-7 transition-transform duration-300 ease-out group-hover:scale-[1.35]">
                        {item.next && (
                          <span className="absolute inset-0 rounded-full bg-[#c84040]/50 motion-safe:animate-ping" />
                        )}
                        <span
                          className={`relative block w-full h-full rounded-full transition-all duration-300 ease-out group-hover:bg-[#c84040] group-hover:shadow-[0_0_0_8px_rgba(200,64,64,0.22),0_0_26px_rgba(200,64,64,0.5)] ${
                            item.next
                              ? 'bg-[#e8b4b4] shadow-[0_0_0_6px_rgba(232,180,180,0.16)]'
                              : 'bg-[#731515] shadow-[0_0_0_6px_rgba(115,21,21,0.3)]'
                          }`}
                        />
                      </div>
                    </div>

                    {/* Text */}
                    <div className="px-4 md:px-5 mt-5">
                      <h3
                        className={`text-xl leading-tight mb-3 ${
                          item.next ? 'italic font-normal text-[#e8b4b4]' : 'font-light text-white/90'
                        }`}
                        style={{ fontFamily: 'var(--font-syne)' }}
                      >
                        {item.textKey ? t(item.textKey) : SLOGAN}
                      </h3>
                      <p
                        className="text-sm text-[#e8d5d5]/60 leading-relaxed"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {t(item.detailKey)}
                      </p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── 4. STATS BAR ── */}
        <section className="bg-[#731515] py-8 md:py-10">
          <div className="max-w-3xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4">
              {STATS.map((stat, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.6, delay: i * 0.1 }}
                  className="flex flex-col items-center text-center gap-1"
                >
                  <span
                    className="text-[clamp(2.5rem,5vw,3.5rem)] font-light text-white leading-none"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    {stat.value}
                  </span>
                  <span
                    className="text-[10px] tracking-[0.4em] text-white/60"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {t(stat.labelKey).toUpperCase()}
                  </span>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 5. FOUNDERS ── */}
        <section className="relative bg-[#fdf6f6] pt-12 md:pt-14 pb-8 overflow-hidden">
          <div className="fog-right" style={{ top: '10%' }} />

          <div className="max-w-4xl mx-auto px-6 lg:px-10">
            {/* Section header */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mb-8"
            >
              <div
                className="text-[10px] tracking-[0.5em] text-[#731515] mb-3"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('theFounders')}
              </div>
              <h2
                className="text-[clamp(2rem,5vw,4rem)] font-light text-[#1a0505] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('meetTheFounders')}
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 lg:gap-8 max-w-3xl mx-auto">
              {FOUNDERS.map((founder, i) => (
                <FounderCard key={founder.name} {...founder} index={i} />
              ))}
            </div>
          </div>
        </section>

        {/* ── 6. TEAM ── */}
        <section className="relative bg-[#fdf6f6] pt-4 pb-12 md:pb-14 overflow-hidden">
          <div className="fog-left" style={{ top: '10%' }} />

          <div className="max-w-4xl mx-auto px-6 lg:px-10">
            {/* Divider */}
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="origin-left w-full h-px bg-gradient-to-r from-[#731515]/20 via-[#731515]/10 to-transparent mb-8"
            />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="mb-6"
            >
              <div
                className="text-[10px] tracking-[0.5em] text-[#731515] mb-2"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('theTeamSection')}
              </div>
              <h2
                className="text-[clamp(1.6rem,4vw,3rem)] font-light text-[#1a0505] leading-none"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('ourTeam')}
              </h2>
            </motion.div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {TEAM_MEMBERS.map((member, i) => (
                <motion.div
                  key={member.name}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: '-30px' }}
                  transition={{ duration: 0.5, delay: i * 0.07, ease: [0.16, 1, 0.3, 1] }}
                  className="flex items-center gap-4 p-4 bg-[#731515] hover:bg-[#8f2020] transition-colors duration-300 rounded-lg"
                >
                  {/* Avatar */}
                  <div className="w-10 h-10 rounded-full border border-white/25 flex items-center justify-center shrink-0">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" opacity="0.65">
                      <circle cx="12" cy="8" r="4" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                    </svg>
                  </div>

                  <div className="flex flex-col gap-0.5 flex-1 min-w-0">
                    <h3
                      className="text-xs font-medium text-white leading-snug truncate"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      {member.name}
                    </h3>
                    <p
                      className="text-[8px] tracking-[0.2em] text-white/60"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {member.role.toUpperCase()}
                    </p>
                  </div>

                  {member.linkedin && (
                    <a
                      href={member.linkedin}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`${member.name} on LinkedIn`}
                      className="w-7 h-7 border border-white/25 flex items-center justify-center text-white/60 hover:border-white hover:text-white transition-all duration-300 shrink-0 rounded-lg"
                    >
                      <LinkedInIcon />
                    </a>
                  )}
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        {/* ── 7. CLOSING: mission + join ── */}
        <section className="relative bg-[#1a0505] py-16 md:py-24 overflow-hidden">
          {/* Radial glow */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{ background: 'radial-gradient(ellipse 55% 60% at 50% 50%, rgba(115,21,21,0.3) 0%, transparent 70%)' }}
          />

          <div className="relative max-w-3xl mx-auto px-6 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7 }}
              className="flex flex-col items-center"
            >
              <div
                className="text-[10px] tracking-[0.5em] text-[#731515]/80 mb-6"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('missionLabel')}
              </div>
              <blockquote
                className="text-[clamp(1.6rem,4vw,2.8rem)] font-light italic text-white/90 leading-tight mb-6"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                &ldquo;{t('missionQuote')}&rdquo;
              </blockquote>
              <p
                className="text-base text-[#e8d5d5]/60 font-light leading-relaxed max-w-xl mx-auto"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('ctaText')}
              </p>
              <Link
                href="/membership"
                className="mt-8 inline-flex items-center gap-3 px-8 py-3.5 bg-[#731515] text-white text-[11px] tracking-[0.4em] hover:bg-[#8f2020] transition-colors duration-300 rounded-lg"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('ctaButton').toUpperCase()}
              </Link>
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
