import { statusOf, type Membership } from '@/lib/membership';

/**
 * Chi è socio, e chi solo lo dice.
 *
 * Un evento «riservato ai soci» finora era un'etichetta: scritta sulla
 * scheda, ignorata dal checkout. Qui diventa una domanda con una
 * risposta sola, e la risposta la dà il server — un controllo fatto
 * nel browser lo toglie chiunque apra gli strumenti per sviluppatori,
 * e un evento riservato a chi sa premere F12 non è riservato.
 *
 * La chiave è l'email, non la tessera. Il numero di tessera si gira a
 * un amico via messaggio e funziona lo stesso, mentre l'email è quella
 * a cui arrivano il biglietto e il QR: passarla a qualcun altro vuol
 * dire rinunciare al proprio posto. Non è una serratura, ma è la
 * serratura giusta per un club.
 *
 * Lo stato non si legge da una colonna: si ricava dalla scadenza, come
 * ovunque nel resto del sito. Chi è in scadenza è ancora socio — gli
 * ultimi trenta giorni valgono quanto i primi.
 */

export interface Socio {
  id: string;
  email: string;
  nome: string | null;
  memberId: string | null;
  scadenza: string;
}

/** La riga del socio in regola, o `null` se non c'è o è scaduta. */
export async function socioInRegola(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  db: any,
  email: string,
): Promise<Socio | null> {
  const pulita = email.trim().toLowerCase();
  if (!pulita) return null;

  /* `ilike` serve perché l'email in archivio può avere le maiuscole,
     ma tratta `_` e `%` come jolly — e `_` nelle email è comunissimo:
     «mario_rossi@x.it» pescherebbe anche «marioXrossi@x.it». Quindi
     si cerca largo e poi si confronta per davvero, qui. */
  const { data: candidati } = await db
    .from('memberships')
    .select('id, email, full_name, member_id, expires_at, cancelled_at')
    .ilike('email', pulita)
    .limit(10);

  const data = (candidati ?? []).find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => String(r.email ?? '').trim().toLowerCase() === pulita,
  );
  if (!data) return null;

  const stato = statusOf(data as Membership);
  if (stato === 'expired' || stato === 'cancelled') return null;

  return {
    id: data.id,
    email: data.email,
    nome: data.full_name ?? null,
    memberId: data.member_id ?? null,
    scadenza: data.expires_at,
  };
}

/** Il messaggio che legge chi non passa il controllo. */
export const NON_SOCIO: Record<'it' | 'en' | 'fr', string> = {
  it: 'Questo evento è riservato ai soci. Non troviamo una tessera in corso con questa email.',
  en: 'This event is for members only. We can’t find a valid membership for this email.',
  fr: 'Cet événement est réservé aux membres. Aucune adhésion en cours ne correspond à cet e-mail.',
};
