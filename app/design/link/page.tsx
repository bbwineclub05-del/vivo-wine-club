import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { notFound } from 'next/navigation';

import { Section } from '@/components/ui/Section';
import { homeReels, nomeCopertina, videoCopertina } from '@/lib/home-reels';
import { LinkForm } from './LinkForm';

/**
 * Dove si attaccano i post alle clip.
 *
 * Instagram da fuori non si legge: senza credenziali una pagina
 * profilo restituisce il titolo e basta, e i file non portano
 * nessuna data che permetta di indovinare l'abbinamento. Quindi
 * l'accoppiata la fa una persona, una volta sola, qui: si vede il
 * primo fotogramma di ogni clip e si incolla l'indirizzo del post.
 *
 * Scrive in `public/home/link.json`, lo stesso file che si puo'
 * aprire a mano. Solo in sviluppo: la pagina non esiste in
 * produzione, e nemmeno la rotta che salva.
 */
export const dynamic = 'force-dynamic';

export default function PaginaLink() {
  if (process.env.NODE_ENV === 'production') notFound();

  const copertina = videoCopertina();
  const clip = homeReels().filter((r, i, tutte) =>
    tutte.findIndex((x) => (x.src ?? x.poster) === (r.src ?? r.poster)) === i,
  );

  const file = join(process.cwd(), 'public', 'home', 'link.json');
  const salvati: Record<string, string> = existsSync(file)
    ? JSON.parse(readFileSync(file, 'utf8'))
    : {};

  const nomeDi = (r: { src?: string; poster?: string }) => {
    const indirizzo = decodeURIComponent(r.src ?? r.poster ?? '');
    return indirizzo.split('/').pop()?.replace(/\.[^.]+$/, '') ?? '';
  };

  return (
    <main className="ds bg-paper text-on-paper">
      <Section>
        <h1 className="ds-display text-title">Link delle clip</h1>
        <p className="mt-4 max-w-[58ch] text-body text-on-paper-muted">
          Incolla l’indirizzo del post di Instagram accanto alla clip da cui viene. Si salva da
          solo quando esci dal campo. Chi resta vuoto non diventa cliccabile.
        </p>

        <ul className="mt-10 max-w-[640px] border-t border-rule-paper">
          {/* Prima il filmato grande in cima alla home: e' quello che
              si vede per primo, ed e' giusto che si possa aprire. */}
          <LinkForm
            nome={nomeCopertina()}
            poster={copertina.poster}
            src={copertina.src}
            iniziale={salvati[nomeCopertina()] ?? ''}
          />

          {clip.map((r) => {
            const nome = nomeDi(r);
            return (
              <LinkForm
                key={nome}
                nome={nome}
                poster={r.poster}
                src={r.src}
                iniziale={salvati[nome] ?? ''}
              />
            );
          })}
        </ul>
      </Section>
    </main>
  );
}
