import { existsSync, readdirSync, readFileSync } from 'node:fs';
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
 * Un'immagine *senza* un video che si chiami come lei diventa invece
 * una scheda per conto suo: nella fila ci stanno anche le foto.
 *
 * I due gruppi vengono alternati, cosi' la riga non e' prima tutta
 * verticale e poi tutta orizzontale.
 *
 * In `public/home/link.json` ogni file puo' avere l'indirizzo del
 * post da cui viene: la scheda diventa cliccabile e porta li'. E' un
 * file di testo con dentro nome e indirizzo, da riempire senza
 * toccare il codice; quello che resta vuoto e' una scheda da
 * guardare e basta.
 */

export interface HomeReel {
  /** Manca quando la scheda e' una fotografia e basta. */
  src?: string;
  poster?: string;
  orientamento: 'verticale' | 'orizzontale';
  /** Il post da cui viene la clip, se c'e'. */
  link?: string;
}

const CARTELLA = join(process.cwd(), 'public', 'home');
const POSTER = ['.jpg', '.jpeg', '.png', '.webp'];

/**
 * Gli indirizzi dei post, per nome di file senza estensione.
 *
 * Se il file non c'e' o e' scritto male non si ferma niente: le
 * schede restano quelle di prima, senza link. Un errore di battitura
 * in un elenco di indirizzi non deve far sparire la home.
 */
function collegamenti(): Record<string, string> {
  try {
    const grezzo = readFileSync(join(CARTELLA, 'link.json'), 'utf8');
    const dati = JSON.parse(grezzo) as Record<string, unknown>;
    const fuori: Record<string, string> = {};
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

function leggi(sotto: 'verticali' | 'orizzontali'): HomeReel[] {
  const dir = join(CARTELLA, sotto);
  if (!existsSync(dir)) return [];

  const verso = sotto === 'verticali' ? ('verticale' as const) : ('orizzontale' as const);
  const indirizzo = (f: string) => `/home/${sotto}/${encodeURIComponent(f)}`;
  const tutti = readdirSync(dir).filter((f) => !f.startsWith('.'));

  const video = tutti.filter((f) => f.toLowerCase().endsWith('.mp4'));
  const nomiVideo = new Set(video.map((f) => f.replace(/\.mp4$/i, '').toLowerCase()));

  const link = collegamenti();

  const schedeVideo: HomeReel[] = video.sort((a, b) => a.localeCompare(b, 'it')).map((file) => {
    const nudo = file.replace(/\.mp4$/i, '');
    const poster = POSTER.map((e) => `${nudo}${e}`).find((n) => existsSync(join(dir, n)));
    return {
      src: indirizzo(file),
      poster: poster ? indirizzo(poster) : undefined,
      orientamento: verso,
      link: link[nudo.toLowerCase()],
    };
  });

  // Le foto rimaste sole: quelle che non fanno da copertina a un video.
  const schedeFoto: HomeReel[] = tutti
    .filter((f) => POSTER.some((e) => f.toLowerCase().endsWith(e)))
    .filter((f) => !nomiVideo.has(f.replace(/\.[^.]+$/, '').toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'it'))
    .map((file) => ({
      poster: indirizzo(file),
      orientamento: verso,
      link: link[file.replace(/\.[^.]+$/, '').toLowerCase()],
    }));

  // Mescolate, non prima tutti i video e poi tutte le foto: in fila
  // due gruppi separati si leggono come due file diverse attaccate.
  return alterna(schedeVideo, schedeFoto);
}

/** Uno di qua, uno di la', e in coda quelli avanzati. */
function alterna(a: HomeReel[], b: HomeReel[]): HomeReel[] {
  const fuori: HomeReel[] = [];
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if (a[i]) fuori.push(a[i]);
    if (b[i]) fuori.push(b[i]);
  }
  return fuori;
}

/**
 * Il filmato grande in cima alla home.
 *
 * Si chiama `copertina.mp4` e sta in `public/home`, accanto alle due
 * cartelle delle clip. Se c'e' una `copertina.jpg` con lo stesso
 * nome, e' il primo fotogramma: si vede mentre il video carica e
 * resta a chi ha chiesto di non far muovere niente.
 *
 * Finche' nessuno lo mette, resta quello di prima: la home non puo'
 * aprirsi con un buco nero perche' manca un file.
 */
export interface Copertina {
  src: string;
  poster?: string;
  /** Il post da cui viene, come per le clip della striscia. */
  link?: string;
}

export function videoCopertina(): Copertina {
  const link = collegamenti();
  const video = join(CARTELLA, 'copertina.mp4');

  if (!existsSync(video)) {
    return {
      src: '/videosito-corto.mp4',
      poster: '/vigna.jpg',
      link: link['videosito-corto'],
    };
  }

  const poster = POSTER.map((e) => `copertina${e}`).find((n) => existsSync(join(CARTELLA, n)));
  return {
    src: '/home/copertina.mp4',
    poster: poster ? `/home/${poster}` : undefined,
    link: link.copertina,
  };
}

/** Il nome con cui la copertina compare in `link.json`. */
export function nomeCopertina(): string {
  return existsSync(join(CARTELLA, 'copertina.mp4')) ? 'copertina' : 'videosito-corto';
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

  const misti = alterna(verticali, orizzontali);

  // Con due o tre clip la fila finirebbe prima del bordo dello schermo
  // e si vedrebbe il vuoto girare: si ripetono finche' bastano. Con
  // sei o piu' file veri, nessuno si ripete.
  const pieni = [...misti];
  while (pieni.length < MINIMO) pieni.push(misti[pieni.length % misti.length]);
  return pieni;
}
