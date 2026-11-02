import type { MetadataRoute } from 'next';

/**
 * Il biglietto da visita che il telefono legge quando il sito viene
 * aggiunto alla schermata Home.
 *
 * Serve a una cosa sola, ma importante: `display: 'standalone'` dice a
 * iOS e ad Android di aprire l'icona **senza il browser intorno**.
 * Niente barra dell'indirizzo sopra, niente barra degli strumenti
 * sotto — quella con frecce, condividi, libreria e pagine, che compare
 * e sparisce a ogni scorrimento e fa ballare il menù dell'area
 * riservata. Non si può nascondere da dentro una pagina web, e questo
 * è l'unico modo che Apple lascia aperto: non essere una pagina web.
 *
 * Il sito pubblico non cambia di una virgola: questo vale solo per chi
 * apre dall'icona.
 *
 * `start_url` è `/members` perché l'icona ha senso per chi lavora qui
 * dentro. È la stessa porta per tutti: chi è socio trova la sua
 * tessera, chi è staff trova il pannello.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Vivo Wine Club',
    short_name: 'VIVO',
    description: 'Area riservata del club: tessera, eventi e gestione.',
    start_url: '/members',
    display: 'standalone',
    // Il fondo che si vede nell'istante fra il tocco sull'icona e la
    // pagina disegnata: quello della barra in alto, così non lampeggia
    // bianco.
    background_color: '#1a0505',
    theme_color: '#1a0505',
    lang: 'it',
    // Due file, non uno: Android ritaglia l'icona in tondo, e un logo
    // largo quanto sta bene in un quadrato perde le punte nel cerchio.
    // Quella `maskable` tiene il segno piu' stretto apposta.
    icons: [
      { src: '/icona-app.png', sizes: '1024x1024', type: 'image/png', purpose: 'any' },
      { src: '/icona-app-maskable.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
