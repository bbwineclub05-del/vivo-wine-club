'use client';

/**
 * Le cose aperte sopra la pagina, la più recente per ultima.
 *
 * Prima ogni pannello si arrangiava da sé: apriva, spingeva una tappa
 * nella cronologia del browser e, se veniva chiuso in un altro modo,
 * se la riprendeva. Due pannelli che si davano il cambio — la scheda
 * di un movimento che apre il modulo per correggerlo — facevano
 * questo: la scheda toglieva la sua tappa mentre il modulo ne metteva
 * una nuova, il browser mandava il ritorno indietro un istante dopo, e
 * a riceverlo era il modulo appena aperto, che si chiudeva da solo. Il
 * movimento non si poteva correggere, e sembrava che la funzione non
 * esistesse.
 *
 * Qui non si tocca la cronologia. I pannelli aperti si limitano a
 * mettersi in fila; chi ascolta il tasto indietro — l'area riservata,
 * in un posto solo — chiude quello in cima. Da cui anche il fatto che
 * due pannelli sovrapposti ora si chiudono uno alla volta, cosa che
 * prima non succedeva.
 */

type Close = () => void;

const stack: Close[] = [];

/** Mette un pannello in cima alla pila. Il valore restituito lo toglie. */
export function registerOverlay(close: Close): () => void {
  stack.push(close);
  return () => {
    const i = stack.lastIndexOf(close);
    if (i !== -1) stack.splice(i, 1);
  };
}

/** Chiude il pannello in cima. Risponde `true` se ce n'era uno. */
export function closeTopOverlay(): boolean {
  const close = stack[stack.length - 1];
  if (!close) return false;
  close();
  return true;
}
