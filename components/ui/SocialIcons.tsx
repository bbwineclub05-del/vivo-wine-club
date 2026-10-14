/**
 * The three brand marks, drawn once and shared.
 *
 * All three are solid, at the same optical weight. The previous navbar
 * mixed an outlined Instagram with a solid LinkedIn and TikTok, which
 * made the row read as three different weights at 18px.
 *
 * The URLs are the ones already live on the site.
 */
export const SOCIALS = [
  { label: 'Instagram', href: 'https://www.instagram.com/vivo.wineclub/' },
  { label: 'TikTok', href: 'https://www.tiktok.com/@vivo.wineclub' },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/vivowineclub/?viewAsMember=true',
  },
] as const;

export type SocialLabel = (typeof SOCIALS)[number]['label'];

export function SocialIcon({ label, size = 18 }: { label: SocialLabel; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor' as const, 'aria-hidden': true };

  if (label === 'Instagram') {
    return (
      <svg {...common}>
        <path d="M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.26.07 1.64.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.26.06-1.64.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41-.56-.22-.96-.48-1.38-.9-.42-.42-.68-.82-.9-1.38-.16-.42-.36-1.06-.41-2.23C2.17 15.58 2.16 15.2 2.16 12s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41C8.42 2.17 8.8 2.16 12 2.16Zm0 5.68a4.16 4.16 0 1 0 0 8.32 4.16 4.16 0 0 0 0-8.32Zm0 6.86a2.7 2.7 0 1 1 0-5.4 2.7 2.7 0 0 1 0 5.4Zm5.3-7.02a.97.97 0 1 1-1.94 0 .97.97 0 0 1 1.94 0Z" />
      </svg>
    );
  }

  if (label === 'TikTok') {
    return (
      <svg {...common}>
        <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07Z" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="M4.98 3.5A2.49 2.49 0 0 0 2.5 5.99C2.5 7.37 3.6 8.49 4.98 8.49a2.49 2.49 0 0 0 0-4.99ZM2.76 10.2h4.44V21H2.76V10.2ZM9.35 10.2h4.25v1.49h.06c.59-1.12 2.04-2.3 4.2-2.3 4.49 0 5.32 2.96 5.32 6.8V21h-4.43v-4.27c0-1.02-.02-2.33-1.42-2.33-1.43 0-1.64 1.11-1.64 2.26V21H9.35V10.2Z" />
    </svg>
  );
}

/** The row used in the navigation bar and inside the mobile menu. */
export function SocialRow({
  size = 18,
  className = '',
  itemClassName = '',
}: {
  size?: number;
  className?: string;
  itemClassName?: string;
}) {
  return (
    <ul className={`flex items-center ${className}`}>
      {SOCIALS.map((s) => (
        <li key={s.label}>
          <a
            href={s.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={s.label}
            title={s.label}
            className={`grid h-11 w-11 place-items-center rounded-full transition-colors duration-200 ${itemClassName}`}
          >
            <SocialIcon label={s.label} size={size} />
          </a>
        </li>
      ))}
    </ul>
  );
}
