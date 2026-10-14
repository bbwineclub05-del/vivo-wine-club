import Image from 'next/image';
import Link from 'next/link';
import { PARTNERS } from '@/lib/partners';

/**
 * The estates that have already hosted us, shown on the Studio page as
 * access rather than as a client list. The distinction is deliberate and
 * the copy above it says so: these are partners for events and visits,
 * not brands that have bought media work.
 *
 * Logos only. A category label under each one would add nothing a
 * winery does not already know.
 */
export function PartnerLogos({ category = 'cantina' }: { category?: 'cantina' | 'location' }) {
  const partners = PARTNERS.filter((p) => p.category === category && p.logo);

  if (partners.length === 0) return null;

  return (
    <ul className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-rule-paper sm:grid-cols-4">
      {partners.map((p) => (
        <li key={p.slug} className="bg-paper">
          <Link
            href={`/partners/${p.slug}`}
            className="grid h-32 place-items-center px-6 transition-colors duration-200 hover:bg-paper-soft"
            aria-label={p.name}
          >
            <span className="relative block h-14 w-full">
              <Image
                src={p.logo as string}
                alt={p.name}
                fill
                sizes="(max-width: 640px) 40vw, 180px"
                className="object-contain"
              />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
