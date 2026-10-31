import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * L'elenco delle clip della home, scritto prima del build.
 *
 * Su Vercel la cartella `public` viene servita dalla rete di
 * distribuzione e non finisce dentro la funzione che genera le
 * pagine: leggerla a runtime con `readdirSync` trovava il vuoto, e la
 * striscia mostrava per tutte le schede il solo video di ripiego.
 *
 * Qui la cartella si legge una volta sola, durante il build, dove i
 * file ci sono davvero, e il risultato finisce in un file JSON che il
 * sito importa come qualunque altro dato. Chi carica i video continua
 * a metterli in una cartella senza toccare il codice: la differenza
 * e' che l'elenco si aggiorna quando si pubblica, non a ogni visita.
 */

const RADICE = process.cwd();
const CARTELLA = join(RADICE, 'public', 'home');
const USCITA = join(RADICE, 'lib', 'home-reels.generated.json');
const POSTER = ['.jpg', '.jpeg', '.png', '.webp'];

function collegamenti() {
  try {
    const dati = JSON.parse(readFileSync(join(CARTELLA, 'link.json'), 'utf8'));
    const fuori = {};
    for (const [nome, url] of Object.entries(dati)) {
      if (typeof url === 'string' && /^https?:\/\//.test(url.trim())) {
        fuori[nome.toLowerCase()] = url.trim();
      }
    }
    return fuori;
  } catch {
    return {};
  }
}

function alterna(a, b) {
  const fuori = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) fuori.push(a[i]);
    if (b[i]) fuori.push(b[i]);
  }
  return fuori;
}

function leggi(sotto, link) {
  const dir = join(CARTELLA, sotto);
  if (!existsSync(dir)) return [];

  const orientamento = sotto === 'verticali' ? 'verticale' : 'orizzontale';
  const indirizzo = (f) => `/home/${sotto}/${encodeURIComponent(f)}`;
  const tutti = readdirSync(dir).filter((f) => !f.startsWith('.'));

  const video = tutti.filter((f) => f.toLowerCase().endsWith('.mp4'));
  const nomiVideo = new Set(video.map((f) => f.replace(/\.mp4$/i, '').toLowerCase()));

  const schedeVideo = video.sort((a, b) => a.localeCompare(b, 'it')).map((file) => {
    const nudo = file.replace(/\.mp4$/i, '');
    const poster = POSTER.map((e) => `${nudo}${e}`).find((n) => existsSync(join(dir, n)));
    return {
      src: indirizzo(file),
      poster: poster ? indirizzo(poster) : undefined,
      orientamento,
      link: link[nudo.toLowerCase()],
    };
  });

  const schedeFoto = tutti
    .filter((f) => POSTER.some((e) => f.toLowerCase().endsWith(e)))
    .filter((f) => !nomiVideo.has(f.replace(/\.[^.]+$/, '').toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'it'))
    .map((file) => ({
      poster: indirizzo(file),
      orientamento,
      link: link[file.replace(/\.[^.]+$/, '').toLowerCase()],
    }));

  return alterna(schedeVideo, schedeFoto);
}

const link = collegamenti();
const reels = [...leggi('verticali', link), ...leggi('orizzontali', link)];

const copertina = existsSync(join(CARTELLA, 'copertina.mp4'))
  ? {
      src: '/home/copertina.mp4',
      poster: POSTER.map((e) => `copertina${e}`).find((n) => existsSync(join(CARTELLA, n)))
        ? `/home/${POSTER.map((e) => `copertina${e}`).find((n) => existsSync(join(CARTELLA, n)))}`
        : undefined,
    }
  : null;

writeFileSync(USCITA, `${JSON.stringify({ reels, copertina }, null, 2)}\n`, 'utf8');

const video = reels.filter((r) => r.src).length;
console.log(
  `[reels] ${reels.length} schede (${video} video, ${reels.length - video} foto), ` +
  `copertina ${copertina ? 'presente' : 'assente'} -> lib/home-reels.generated.json`,
);
