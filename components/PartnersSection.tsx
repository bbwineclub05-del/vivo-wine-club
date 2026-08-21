'use client';

import Image from 'next/image';
import { useTranslations } from 'next-intl';

const PARTNERS = [
  { name: 'Atelier Vini',          src: '/sponsors/atelier-vini.png',            href: 'https://www.atelierviniecultura.com/'                    },
  { name: 'Canto del Gallo',       src: '/sponsors/canto-del-gallo.jpg',         href: 'https://ilcantodelgallowinebar.it/'                      },
  { name: 'Bertani',               src: '/wineries/bertani logo .png',            href: 'https://www.bertani.net/'                               },
  { name: 'Sandrone',              src: '/sponsors/sandrone.avif',                href: 'https://sandroneluciano.com/it/web/?lev1=99&age=over18' },
  { name: 'Monterossa',            src: '/sponsors/Monterossa.png',               href: 'https://www.monterossa.com/'                           },
  { name: 'Beneperora',            src: '/sponsors/beneperora.webp',              href: 'https://beneperora.it/'                                 },
  { name: 'Bersi Serlini',         src: '/sponsors/Bersi Serlini.webp',           href: 'https://www.bersiserlini.it/'                          },
  { name: 'Alata Investment Club', src: '/sponsors/alata.png',                    href: 'https://www.alatainvestmentclub.com/'                  },
  { name: 'Cassa Rurale',          src: '/sponsors/cassarurale.png',              href: 'https://www.lacassarurale.it/privati-e-famiglie/'      },
  { name: "Ca' del Bosco",         src: '/sponsors/ca-del-bosco.png',             href: 'https://www.cadelbosco.com/'                           },
  { name: 'Tenuta del Buonamico',  src: '/sponsors/Tenuta del buonamico.jpg',     href: 'https://www.buonamico.it/'                             },
  { name: 'Perfect',               src: '/sponsors/perfect.png',                  href: 'https://perfect.com/'                                   },
];

// Logo item width + gap in px — must match the CSS values below
const ITEM_W = 160;
const ITEM_GAP = 80;
// One full set of logos in px
const TRACK_W = PARTNERS.length * (ITEM_W + ITEM_GAP);
// Render 6 copies: guarantees no gap on any screen up to 4K
// Animation translates exactly -TRACK_W, so the snap is invisible
const COPIES = 6;
const REPEATED = Array.from({ length: COPIES }, () => PARTNERS).flat();

export default function PartnersSection() {
  const t = useTranslations('home');
  return (
    <section className="pt-4 pb-0 relative overflow-hidden">

      {/* Header */}
      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{t('trustedBy')}</div>
          <h2
            className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-none"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            {t('partners')}
          </h2>
        </div>
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#731515]/20 to-transparent mb-14" />
      </div>

      {/* Marquee track — full bleed so logos emerge from edges */}
      <div
        className="relative w-full overflow-hidden"
        /* Fade edges */
        style={{
          maskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to right, transparent 0%, black 10%, black 90%, transparent 100%)',
        }}
      >
        <div
          className="marquee-track flex"
          style={{
            width: `${TRACK_W * COPIES}px`,
            animation: `marquee 18s linear infinite`,
          }}
        >
          {REPEATED.map((partner, i) => {
            const inner = (
              <div className="relative w-full h-full">
                <Image
                  src={partner.src}
                  alt={partner.name}
                  fill
                  loading="lazy"
                  className="object-contain"
                  sizes="160px"
                />
              </div>
            );
            return partner.href ? (
              <a
                key={i}
                href={partner.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={partner.name}
                className="shrink-0 flex items-center justify-center opacity-70 hover:opacity-100 transition-opacity duration-300"
                style={{ width: ITEM_W, marginRight: ITEM_GAP, height: 64 }}
              >
                {inner}
              </a>
            ) : (
              <div
                key={i}
                className="shrink-0 flex items-center justify-center opacity-70"
                style={{ width: ITEM_W, marginRight: ITEM_GAP, height: 64 }}
              >
                {inner}
              </div>
            );
          })}
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 lg:px-10">
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#731515]/20 to-transparent mt-8" />
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-${TRACK_W}px); }
        }
        @media (prefers-reduced-motion: reduce) {
          .marquee-track { animation: none !important; }
        }
      `}</style>
    </section>
  );
}
