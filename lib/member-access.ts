import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * L'accesso del socio.
 *
 * Avere una tessera e poter entrare nell'area riservata erano due cose
 * separate, e nessuno le teneva insieme: creare o attivare una tessera
 * non creava l'account e non metteva il timbro del ruolo, e la mail di
 * benvenuto rimandava a una pagina di login dove la persona non aveva
 * nessuna password da inserire. Diciotto persone invitate a settembre
 * erano in quello stato: account creato, mai usato.
 *
 * Qui l'accesso si prepara una volta, e si risponde a una domanda
 * sola: come entra questa persona? Torna sempre un indirizzo che
 * porta a `/reset-password`, dove la password si imposta e la salva
 * Supabase. Sempre, anche per chi una password ce l'ha già: l'ultimo
 * accesso di queste persone è di mesi fa, e dare per scontato che se
 * la ricordino vuol dire chiudere fuori chi non se la ricorda.
 *
 * Quello che cambia è come lo si presenta, e lo decide `haPassword`:
 * chi la password non ce l'ha trova il pulsante per sceglierla, chi
 * ce l'ha trova il pulsante per entrare e sotto una riga per rifarla.
 *
 * Tre situazioni, perché tre sono quelle che esistono davvero:
 *
 * 1. Non c'è nessun account. Si crea con un link di invito, che lo
 *    crea e lo restituisce in un colpo solo.
 * 2. L'account c'è e la mail è confermata: la password ce l'ha, e il
 *    link è solo la via d'uscita se non se la ricorda.
 * 3. L'account c'è ma la mail non è mai stata confermata. Qui serve un
 *    link di recupero, e un invito non funziona perché l'utente esiste
 *    già. Se Supabase rifiuta il recupero perché la mail non è
 *    confermata, la si conferma e si riprova: l'indirizzo lo abbiamo
 *    perché è quello con cui questa persona si è candidata, e il link
 *    arriva solo lì.
 *
 * Non manda niente: `generateLink` restituisce l'indirizzo e basta. La
 * mail la manda chi chiama, con il testo che preferisce.
 */

/** Dove si va a impostare la password. Deve stare fra i Redirect URL del progetto Supabase. */
const DOVE = 'https://vivowineclub.com/reset-password';

export interface AccessoSocio {
  /** `true` se la password ce l'ha già: cambia come si presenta il link, non se c'è. */
  haPassword: boolean;
  /** L'indirizzo per impostarla o per rifarla. `null` solo se non si è riusciti a crearlo. */
  link: string | null;
  /** Che cosa è stato fatto, per il registro. */
  nota: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** L'account con questo indirizzo, se esiste. Si sfogliano le pagine: un elenco troncato direbbe «non esiste» di qualcuno che c'è. */
async function cercaAccount(db: SupabaseClient, email: string): Promise<any | null> {
  const cercato = email.trim().toLowerCase();
  for (let page = 1; page <= 20; page++) {
    const { data, error } = await db.auth.admin.listUsers({ page, perPage: 200 });
    if (error) throw new Error(error.message);
    const utenti = data?.users ?? [];
    const trovato = utenti.find((u: any) => (u.email ?? '').toLowerCase() === cercato);
    if (trovato) return trovato;
    if (utenti.length < 200) return null;
  }
  return null;
}

/** Il timbro del ruolo: senza questo l'area socio non si apre, anche con la password giusta. */
async function timbraSocio(db: SupabaseClient, utente: any): Promise<void> {
  const ruolo = utente?.app_metadata?.role;
  // Chi è staff o board lo resta: è anche socio, ma il ruolo più alto
  // decide cosa vede, e declassarlo gli chiuderebbe l'area di lavoro.
  if (ruolo === 'member' || ruolo === 'staff' || ruolo === 'admin' || ruolo === 'collaborator') return;
  await db.auth.admin.updateUserById(utente.id, { app_metadata: { ...utente.app_metadata, role: 'member' } });
}

export async function preparaAccessoSocio(
  db: SupabaseClient,
  email: string,
  nome?: string | null,
): Promise<AccessoSocio> {
  const indirizzo = email.trim().toLowerCase();
  const esistente = await cercaAccount(db, indirizzo);

  /* 1. Nessun account: l'invito lo crea e restituisce il link. */
  if (!esistente) {
    const { data, error } = await db.auth.admin.generateLink({
      type: 'invite',
      email: indirizzo,
      options: { data: nome ? { name: nome } : undefined, redirectTo: DOVE },
    });
    if (error) throw new Error(`invito non creato: ${error.message}`);
    if (data?.user?.id) {
      await db.auth.admin.updateUserById(data.user.id, { app_metadata: { role: 'member' } });
    }
    return {
      haPassword: false,
      link: data?.properties?.action_link ?? null,
      nota: 'account creato adesso',
    };
  }

  await timbraSocio(db, esistente);

  const recupero = async () =>
    db.auth.admin.generateLink({ type: 'recovery', email: indirizzo, options: { redirectTo: DOVE } });

  /* 2. La password c'è già: il link serve lo stesso, come via d'uscita
     per chi non se la ricorda. Se non si riesce a crearlo non è grave:
     resta il pulsante per entrare, e dalla pagina di accesso c'è
     «Password dimenticata». */
  if (esistente.email_confirmed_at || esistente.last_sign_in_at) {
    const { data, error } = await recupero();
    if (error) {
      console.error('[member-access] link di scorta non creato:', error.message);
      return { haPassword: true, link: null, nota: 'password già impostata, senza link di scorta' };
    }
    return {
      haPassword: true,
      link: data?.properties?.action_link ?? null,
      nota: 'password già impostata, con link di scorta',
    };
  }

  /* 3. Account mai usato: serve un link per scegliere la password. */
  let { data, error } = await recupero();

  if (error) {
    // Il rifiuto atteso è «mail non confermata». Si conferma e si
    // riprova: è un indirizzo che questa persona ci ha dato, e il link
    // non porta da nessuna parte se non ci arriva lei.
    const { error: confErr } = await db.auth.admin.updateUserById(esistente.id, { email_confirm: true });
    if (confErr) throw new Error(`recupero non creato: ${error.message}; conferma fallita: ${confErr.message}`);
    ({ data, error } = await recupero());
    if (error) throw new Error(`recupero non creato nemmeno dopo la conferma: ${error.message}`);
    return {
      haPassword: false,
      link: data?.properties?.action_link ?? null,
      nota: 'account mai usato, confermato e link di recupero',
    };
  }

  return {
    haPassword: false,
    link: data?.properties?.action_link ?? null,
    nota: 'account mai usato, link di recupero',
  };
}
