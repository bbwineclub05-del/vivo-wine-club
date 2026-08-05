import type { ReactNode } from 'react';
import type { LegalDocument } from '@/lib/legal/types';

/** Renders `[label](url)` tokens as real links; everything else stays plain text. */
function renderTextWithLinks(text: string): ReactNode[] {
  const parts: ReactNode[] = [];
  const linkPattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = linkPattern.exec(text)) !== null) {
    if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
    const [, label, url] = match;
    parts.push(
      <a
        key={key++}
        href={url}
        target={url.startsWith('mailto:') ? undefined : '_blank'}
        rel={url.startsWith('mailto:') ? undefined : 'noopener noreferrer'}
        className="text-[#731515] underline hover:text-[#9b2323] transition-colors"
      >
        {label}
      </a>,
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(text.slice(lastIndex));
  return parts;
}

export default function LegalDocumentView({ document }: { document: LegalDocument }) {
  return (
    <div className="max-w-3xl mx-auto px-6 lg:px-10 pt-10 pb-24">
      <h1
        className="text-[clamp(2rem,5vw,3rem)] font-light text-[#1a0505] leading-tight mb-2"
        style={{ fontFamily: 'var(--font-syne)' }}
      >
        {document.title}
      </h1>

      {document.subtitle && (
        <p className="text-sm text-[#7a4a4a] mb-6" style={{ fontFamily: 'var(--font-nunito)' }}>
          {document.subtitle}
        </p>
      )}

      {document.intro?.map((para, i) => (
        <p key={i} className="text-[#4a2a2a] text-[15px] leading-relaxed mb-4" style={{ fontFamily: 'var(--font-nunito)' }}>
          {renderTextWithLinks(para)}
        </p>
      ))}

      <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent my-8" />

      <div className="flex flex-col gap-7">
        {document.sections.map((section, i) => (
          <div key={i}>
            {section.heading && (
              <h2
                className="text-lg font-medium text-[#731515] mb-2.5"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {section.heading}
              </h2>
            )}
            {section.paragraphs?.map((para, j) => (
              <p key={j} className="text-[#4a2a2a] text-[15px] leading-relaxed mb-2.5 last:mb-0" style={{ fontFamily: 'var(--font-nunito)' }}>
                {renderTextWithLinks(para)}
              </p>
            ))}
            {section.bullets && (
              <ul className="flex flex-col gap-1.5 mt-2.5 mb-2.5 last:mb-0">
                {section.bullets.map((bullet, j) => (
                  <li key={j} className="flex gap-2.5 text-[#4a2a2a] text-[15px] leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                    <span className="text-[#731515] shrink-0">·</span>
                    <span>{renderTextWithLinks(bullet)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ))}
      </div>

      {document.lastUpdated && (
        <p className="mt-10 text-[12px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
          Last updated: {document.lastUpdated}
        </p>
      )}
    </div>
  );
}
