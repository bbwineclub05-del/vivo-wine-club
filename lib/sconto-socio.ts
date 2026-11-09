import { socioInRegola } from '@/lib/soci';
import { contoBiglietti, type ContoBiglietti } from '@/lib/prezzo-evento';

/**
 * Il conto di un biglietto, fatto dal server.
 *
 * Due domande al database — questo indirizzo e' di un socio in
 * regola, e per questa serata lo sconto l'ha gia' speso — e poi
 * l'aritmetica, che sta in `prezzo-evento.ts` insieme a quella che
 * usa il modulo di acquisto per mostrare la cifra.
 *
 * Qui non si decide niente di nuovo: si raccolgono i due fatti e si
 * chiama lo stesso conto. Cosi' quello che si vede sullo schermo e
 * quello che Stripe addebita vengono dalla stessa riga di codice.
 */
export async function contoPerEmail({
  db,
  slug,
  email,
  qty,
  prezzoCents,
  prezzoSocioCents,
}: {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any;
  slug: string;
  email: string;
  qty: number;
  prezzoCents: number;
  prezzoSocioCents: number | null;
}): Promise<ContoBiglietti> {
  const pulita = email.trim().toLowerCase();

  // Senza un prezzo riservato non c'e' niente da chiedere a nessuno.
  if (prezzoSocioCents == null) {
    return contoBiglietti({ prezzoCents, prezzoSocioCents: null, qty, socio: false, giaUsato: false });
  }

  const socio = !!(await socioInRegola(db, pulita));

  let giaUsato = false;
  if (socio) {
    /* `ilike` per via delle maiuscole, e poi il confronto stretto in
       memoria: nelle email `_` e' comune e `ilike` lo tratta come un
       jolly. Vedi la stessa accortezza in `lib/soci.ts`. */
    const { data } = await db
      .from('tickets')
      .select('email')
      .eq('event_id', slug)
      .eq('member_price_applied', true)
      .ilike('email', pulita)
      .limit(10);
    giaUsato = (data ?? []).some(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (t: any) => String(t.email ?? '').trim().toLowerCase() === pulita,
    );
  }

  return contoBiglietti({ prezzoCents, prezzoSocioCents, qty, socio, giaUsato });
}
