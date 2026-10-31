import type { ReactNode } from 'react';

/**
 * Trasforma i token `[etichetta](url)` di un testo in link veri.
 *
 * I testi lunghi del sito — pagine legali, FAQ — stanno in file di
 * dati, non in JSX: è il modo di tenerli in tre lingue senza
 * duplicare il markup. Un indirizzo email o un rimando a un'altra
 * pagina però vanno cliccati, e questa è l'unica sintassi che quei
 * file possono contenere.
 */
export function withLinks(text: string): ReactNode[] {
  const parti: ReactNode[] = [];
  const pattern = /\[([^\]]+)\]\(([^)]+)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;

  while ((m = pattern.exec(text)) !== null) {
    if (m.index > last) parti.push(text.slice(last, m.index));
    const [, label, url] = m;
    const esterno = !url.startsWith('mailto:') && !url.startsWith('/');
    parti.push(
      <a
        key={k++}
        href={url}
        target={esterno ? '_blank' : undefined}
        rel={esterno ? 'noopener noreferrer' : undefined}
        className="text-accent underline decoration-accent/40 underline-offset-2 transition-colors hover:text-accent-lift"
      >
        {label}
      </a>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parti.push(text.slice(last));
  return parti;
}
