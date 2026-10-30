import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { NextResponse } from 'next/server';

/**
 * Salva l'indirizzo del post di una clip in `public/home/link.json`.
 *
 * Esiste solo in sviluppo: in produzione la cartella del sito e' di
 * sola lettura, e comunque un modo per riscrivere un file dal
 * browser non deve esistere su un sito pubblico. La rotta risponde
 * 404 quando non siamo sulla macchina di chi lavora, cosi' non e'
 * nemmeno visibile che ci sia.
 */

const FILE = join(process.cwd(), 'public', 'home', 'link.json');

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Non disponibile.' }, { status: 404 });
  }

  try {
    const { nome, url } = (await request.json()) as { nome?: string; url?: string };
    if (!nome) {
      return NextResponse.json({ error: 'Serve il nome del file.' }, { status: 400 });
    }

    const pulito = String(url ?? '').trim();
    if (pulito && !/^https?:\/\/(www\.)?instagram\.com\//i.test(pulito)) {
      return NextResponse.json(
        { error: 'Dev’essere un indirizzo di instagram.com.' },
        { status: 400 },
      );
    }

    const dati = JSON.parse(readFileSync(FILE, 'utf8')) as Record<string, string>;
    dati[nome] = pulito;
    writeFileSync(FILE, `${JSON.stringify(dati, null, 2)}\n`, 'utf8');

    return NextResponse.json({ nome, url: pulito });
  } catch (err) {
    console.error('[link-clip]', err);
    return NextResponse.json({ error: 'Non sono riuscito a salvare.' }, { status: 500 });
  }
}
