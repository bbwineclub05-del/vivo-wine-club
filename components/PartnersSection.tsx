import Image from 'next/image';

const PARTNERS = [
  { name: 'Atelier Vini',    src: '/sponsors/atelier-vini.png'   },
  { name: 'Canto del Gallo', src: '/sponsors/canto-del-gallo.jpg'},
  { name: "Ca' del Bosco",   src: '/sponsors/ca-del-bosco.png'   },
  { name: 'Pavie Macquin',   src: '/sponsors/pavie-macquin.png'  },
  { name: 'Sandrone',        src: '/sponsors/sandrone.avif'       },
];

export default function PartnersSection() {
  return (
    <section className="py-20 relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 lg:px-10">

        {/* Header */}
        <div className="text-center mb-12">
          <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">TRUSTED BY THE BEST</div>
          <h2
            className="text-[clamp(1.8rem,4vw,3rem)] font-light text-[#1a0505] leading-none"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Our Partners
          </h2>
        </div>

        {/* Divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#731515]/20 to-transparent mb-14" />

        {/* Logo grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-8 md:gap-10 items-center justify-items-center">
          {PARTNERS.map((partner) => (
            <div
              key={partner.name}
              className="relative w-28 sm:w-32 h-12 sm:h-14 opacity-80 hover:opacity-100 transition-opacity duration-300"
            >
              <Image
                src={partner.src}
                alt={partner.name}
                fill
                loading="lazy"
                className="object-contain"
                sizes="128px"
              />
            </div>
          ))}
        </div>

        {/* Bottom divider */}
        <div className="w-full h-px bg-gradient-to-r from-transparent via-[#731515]/20 to-transparent mt-14" />

      </div>
    </section>
  );
}
