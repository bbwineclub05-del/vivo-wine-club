/**
 * I loghi di chi lavora con noi, per la fila in fondo alla home.
 *
 * Non si leggono da `lib/partners.ts`: li' stanno le schede con
 * descrizione e indirizzo, e non tutti quelli che compaiono qui ne
 * hanno una — una cantina puo' averci ospitato una sera senza avere
 * una pagina sua. Chi ha una pagina ce l'ha anche qui, e il
 * collegamento porta al suo sito.
 */

export interface SponsorLogo {
  name: string;
  src: string;
  /** Il suo sito. Senza, il logo resta un'immagine e basta. */
  href?: string;
}

export const SPONSOR_LOGOS: SponsorLogo[] = [
  { name: 'Atelier Vini', src: '/sponsors/atelier-vini.png', href: 'https://www.atelierviniecultura.com/' },
  { name: 'Il Canto del Gallo', src: '/sponsors/canto-del-gallo.png', href: 'https://ilcantodelgallowinebar.it/' },
  { name: 'Enoteca Bonetti', src: '/sponsors/enoteca-bonetti.jpg', href: 'https://enotecabonetti.it/' },
  { name: 'Bertani', src: '/wineries/bertani logo .png', href: 'https://www.bertani.net/' },
  { name: 'Sandrone', src: '/sponsors/sandrone.avif', href: 'https://sandroneluciano.com/it/web/?lev1=99&age=over18' },
  { name: 'Monterossa', src: '/sponsors/Monterossa.png', href: 'https://www.monterossa.com/' },
  { name: 'Beneperora', src: '/sponsors/beneperora.webp', href: 'https://beneperora.it/' },
  { name: 'Bersi Serlini', src: '/sponsors/Bersi Serlini.webp', href: 'https://www.bersiserlini.it/' },
  { name: 'Alata Investment Club', src: '/sponsors/alata.png', href: 'https://www.alatainvestmentclub.com/' },
  { name: 'Cassa Rurale', src: '/sponsors/cassarurale.png', href: 'https://www.lacassarurale.it/privati-e-famiglie/' },
  { name: "Ca' del Bosco", src: '/sponsors/ca-del-bosco.png', href: 'https://www.cadelbosco.com/' },
  { name: 'Tenuta del Buonamico', src: '/sponsors/Tenuta del buonamico.jpg', href: 'https://www.buonamico.it/' },
  // I tre che mancavano: i loghi c'erano gia' in `public/sponsors`,
  // nella fila del sito vecchio no.
  { name: 'Utopia', src: '/sponsors/utopia.png' },
  { name: 'Al Bicèr 2', src: '/sponsors/albicer.png', href: 'https://www.instagram.com/albicer2/' },
  { name: 'Pavie Macquin', src: '/sponsors/pavie maquin.png' },
];

/** Due file: la prima scorre a sinistra, la seconda al contrario. */
export function righeLoghi(): [SponsorLogo[], SponsorLogo[]] {
  const meta = Math.ceil(SPONSOR_LOGOS.length / 2);
  return [SPONSOR_LOGOS.slice(0, meta), SPONSOR_LOGOS.slice(meta)];
}
