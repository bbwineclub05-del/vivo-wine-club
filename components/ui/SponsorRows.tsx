import Image from 'next/image';

import { Marquee } from '@/components/ui/Marquee';
import { righeLoghi, type SponsorLogo } from '@/lib/sponsor-logos';

/**
 * Chi lavora con noi, in fondo alla home.
 *
 * Due file che scorrono in verso opposto. Una sola, con quattordici
 * loghi, diventa un nastro lunghissimo che non finisce mai; due che
 * si incrociano si leggono come un insieme, ed e' quello che sono.
 *
 * I loghi arrivano da fonti diverse — png su fondo bianco, jpg,
 * webp — quindi vanno appoggiati su carta e portati tutti alla
 * stessa altezza ottica, altrimenti la fila sembra montata male.
 */

function Logo({ logo }: { logo: SponsorLogo }) {
  const immagine = (
    <Image
      src={logo.src}
      alt={logo.name}
      width={200}
      height={96}
      sizes="(max-width: 768px) 120px, 160px"
      // `mix-blend-multiply`: diversi loghi sono jpg con il fondo
      // bianco, e su carta rosata si vedevano come riquadri. Cosi' il
      // bianco sparisce e resta il segno.
      className="h-10 w-auto object-contain opacity-80 mix-blend-multiply transition-opacity md:h-12"
    />
  );

  if (!logo.href) {
    return <span className="flex shrink-0 items-center">{immagine}</span>;
  }

  return (
    <a
      href={logo.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={logo.name}
      className="flex shrink-0 items-center transition-opacity hover:opacity-100 [&>img]:hover:opacity-100"
    >
      {immagine}
    </a>
  );
}

export function SponsorRows() {
  const [prima, seconda] = righeLoghi();

  return (
    <div className="flex flex-col gap-8">
      <Marquee speed={52}>
        {prima.map((l) => (
          <Logo key={l.src} logo={l} />
        ))}
      </Marquee>

      <Marquee speed={58} reverse>
        {seconda.map((l) => (
          <Logo key={l.src} logo={l} />
        ))}
      </Marquee>
    </div>
  );
}
