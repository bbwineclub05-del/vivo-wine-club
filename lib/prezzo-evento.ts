/**
 * Quanto paga chi compra un biglietto.
 *
 * Il conto sta qui e non dentro la rotta del pagamento perche' lo
 * fanno in due: il server, che decide davvero quanto addebitare, e il
 * modulo di acquisto, che deve mostrare la stessa cifra mentre la
 * persona scrive la sua email. Due conti scritti in due posti
 * diversi, prima o poi, dicono due numeri diversi — e quello che si
 * vede non e' quello che si paga.
 *
 * La regola: **uno sconto a socio per evento.** Non tutto l'ordine.
 * "Il tuo sconto socio" e' al singolare, ed e' giusto cosi': altrimenti
 * un socio comprerebbe dieci biglietti scontati per dieci amici che
 * soci non sono, e la tessera smetterebbe di valere qualcosa. Quindi
 * un biglietto al prezzo riservato e gli altri a prezzo pieno, e
 * quando torna per la stessa serata glielo si dice invece di
 * applicarglielo di nuovo in silenzio.
 */

export interface ContoBiglietti {
  /** Quanto si paga in tutto, in centesimi. */
  totaleCents: number;
  /** Quanti biglietti vanno al prezzo riservato: 0 oppure 1. */
  bigliettiSocio: number;
  /** Quanto si risparmia rispetto al prezzo pieno, in centesimi. */
  risparmioCents: number;
  /** Il prezzo riservato esiste per questo evento. */
  cePrezzoSocio: boolean;
  /** Chi compra e' un socio in regola. */
  socio: boolean;
  /** E' socio, ma per questa serata lo sconto l'ha gia' speso. */
  giaUsato: boolean;
}

export function contoBiglietti({
  prezzoCents,
  prezzoSocioCents,
  qty,
  socio,
  giaUsato,
}: {
  /** Il prezzo pieno di un biglietto, in centesimi. */
  prezzoCents: number;
  /** Il prezzo riservato ai soci, in centesimi. `null` = non c'e'. */
  prezzoSocioCents: number | null;
  qty: number;
  socio: boolean;
  giaUsato: boolean;
}): ContoBiglietti {
  const n = Math.max(0, Math.trunc(qty));

  /* Un prezzo riservato piu' alto di quello pieno sarebbe un errore di
     chi l'ha scritto, non un'offerta: in quel caso si ignora, invece
     di far pagare a un socio piu' che a un estraneo. */
  const cePrezzoSocio =
    prezzoSocioCents != null && prezzoSocioCents >= 0 && prezzoSocioCents < prezzoCents;

  const siApplica = cePrezzoSocio && socio && !giaUsato && n > 0;
  const bigliettiSocio = siApplica ? 1 : 0;

  const totaleCents = siApplica
    ? prezzoSocioCents! + prezzoCents * (n - 1)
    : prezzoCents * n;

  return {
    totaleCents,
    bigliettiSocio,
    risparmioCents: prezzoCents * n - totaleCents,
    cePrezzoSocio,
    socio,
    giaUsato: socio && cePrezzoSocio && giaUsato,
  };
}

/** Da «12,50» o 12.5 a centesimi interi. Gli euro con la virgola non si sommano. */
export function euroInCentesimi(v: number | string | null | undefined): number | null {
  if (v == null || v === '') return null;
  const n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'));
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
