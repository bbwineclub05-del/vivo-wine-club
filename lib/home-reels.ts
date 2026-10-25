import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/**
 * I video che scorrono in home, presi dalla cartella dove stanno.
 *
 * Prima erano sei voci scritte nel codice che puntavano tutte allo
 * stesso file: per cambiarli serviva un programmatore. Adesso si
 * leggono da `public/home`, e l'orientamento lo dice la cartella:
 *
 *   public/home/verticali/     → schede 9:16, come un reel
 *   public/home/orizzontali/   → schede 16:9
 *
 * Chi carica un video ci mette accanto, se vuole, un'immagine con lo
 * stesso nome (`festa.mp4` + `festa.jpg`): e' il primo fotogramma, si
 * vede prima che il video parta e resta a chi ha chiesto al telefono
 * di non far muovere niente.
 *
 * I due gruppi vengono alternati, cosi' la riga non e' prima tutta
 * verticale e poi tutta orizzontale.
 */

export interface HomeReel {
  src: string;
  poster?: string;
  orientamento: 'verticale' | 'orizzontale';
}

const CARTELLA = join(process.cwd(), 'public', 'home');
const POSTER = ['.jpg', '.jpeg', '.png', '.webp'];

function leggi(sotto: 'verticali' | 'orizzontali'): HomeReel[] {
  const dir = join(CARTELLA, sotto);
  if (!existsSync(dir)) return [];

  return readdirSync(dir)
    .filter((f) => f.toLowerCase().endsWith('.mp4'))
    .sort((a, b) => a.localeCompare(b, 'it'))
    .map((file) => {
      const nudo = file.replace(/\.mp4$/i, '');
      const poster = POSTER.map((e) => `${nudo}${e}`).find((n) => existsSync(join(dir, n)));
      return {
        src: `/home/${sotto}/${encodeURIComponent(file)}`,
        poster: poster ? `/home/${sotto}/${encodeURIComponent(poster)}` : undefined,
        orientamento: sotto === 'verticali' ? ('verticale' as const) : ('orizzontale' as const),
      };
    });
}

/** Il video di prima, finche' le cartelle sono vuote. */
const RIPIEGO: HomeReel[] = Array.from({ length: 6 }, () => ({
  src: '/videosito-corto.mp4',
  poster: '/vigna.jpg',
  orientamento: 'verticale' as const,
}));

/** Sotto questa soglia la riga lascerebbe un buco scorrendo. */
const MINIMO = 6;

export function homeReels(): HomeReel[] {
  const verticali = leggi('verticali');
  const orizzontali = leggi('orizzontali');
  if (verticali.length === 0 && orizzontali.length === 0) return RIPIEGO;

  // Alternati: uno di qua, uno di la', e in coda quelli avanzati.
  const misti: HomeReel[] = [];
  for (let i = 0; i < Math.max(verticali.length, orizzontali.length); i++) {
    if (verticali[i]) misti.push(verticali[i]);
    if (orizzontali[i]) misti.push(orizzontali[i]);
  }

  // Con due o tre clip la fila finirebbe prima del bordo dello schermo
  // e si vedrebbe il vuoto girare: si ripetono finche' bastano. Con
  // sei o piu' file veri, nessuno si ripete.
  const pieni = [...misti];
  while (pieni.length < MINIMO) pieni.push(misti[pieni.length % misti.length]);
  return pieni;
}
