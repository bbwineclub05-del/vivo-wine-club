/**
 * Scaricare un file, su tutti i telefoni che abbiamo in tasca.
 *
 * Ogni pulsante "scarica" si era scritto il suo pezzo di codice:
 * creo un blob, creo un <a>, lo clicco, lo tolgo. Funziona sul
 * computer e si comporta in tre modi diversi altrove.
 *
 * Due cose vanno sapute.
 *
 * La prima: su iOS l'attributo `download` di un link viene ignorato
 * dentro le app che hanno il browser incorporato — Instagram,
 * Facebook, Gmail — e il file ci finisce dentro senza uscirne. Se il
 * browser non lo supporta apriamo il PDF in una scheda: da li' il
 * tasto "condividi" lo salva davvero, ed e' meglio di un pulsante che
 * sembra rotto.
 *
 * La seconda: fra il `fetch` e il click passa un secondo, e Safari
 * considera finito il gesto dell'utente. L'apertura di una scheda
 * dopo un `await` viene bloccata come se fosse una finestra
 * pubblicitaria. Per questo la scheda si apre *prima* della
 * chiamata, quando serve, e si riempie dopo.
 */

const supportaDownload =
  typeof document !== 'undefined' && 'download' in document.createElement('a');

/** Salva un blob col nome dato. Ritorna false se il browser l'ha solo aperto. */
export function salvaBlob(blob: Blob, nomeFile: string): boolean {
  const url = URL.createObjectURL(blob);

  if (!supportaDownload) {
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return false;
  }

  const a = document.createElement('a');
  a.href = url;
  a.download = nomeFile;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  a.remove();
  // Revocato tardi: su alcuni browser il salvataggio e' ancora in corso.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

/**
 * Chiede il file con un modulo, non con `fetch`.
 *
 * E' il modo che funziona ovunque: un modulo inviato dentro un
 * riquadro nascosto e' una navigazione, e il browser prende il nome
 * del file da `Content-Disposition`, deciso dal server. Con `fetch`
 * il nome lo deve dare la pagina tramite l'attributo `download`, e
 * se il browser quell'attributo lo ignora — succede in Chrome dentro
 * certi profili, e nei browser incorporati delle app — il file viene
 * salvato come `4526eaf8-92db-…`, senza estensione e inapribile.
 *
 * Se qualcosa va storto il server risponde con del JSON invece che
 * con il file, e quel JSON resta nel riquadro: lo leggiamo da li' e
 * lo riportiamo su, invece di lasciare l'utente a guardare un
 * pulsante che non fa niente.
 */
export function scaricaConModulo(
  url: string,
  campi: Record<string, string>,
): EsitoScarico {
  const modulo = document.createElement('form');
  modulo.method = 'POST';
  modulo.action = url;
  // Una scheda nuova, non un riquadro nascosto: Chrome puo' bloccare
  // un download che parte da dentro un iframe, e quando lo fa non
  // avvisa nessuno. Con `_blank` e' la stessa cosa che succede
  // cliccando un link a un PDF su un sito qualsiasi: la scheda si
  // apre, il file scende, la scheda si richiude da sola.
  modulo.target = '_blank';
  modulo.style.display = 'none';

  for (const [nome, valore] of Object.entries(campi)) {
    const campo = document.createElement('input');
    campo.type = 'hidden';
    campo.name = nome;
    campo.value = valore;
    modulo.appendChild(campo);
  }

  document.body.appendChild(modulo);
  modulo.submit();
  modulo.remove();

  // Da qui non si puo' sapere com'e' andata: la scheda e' un'altra
  // pagina. Se il server risponde con un errore, l'errore si legge
  // li'. In cambio il file arriva col nome giusto ovunque.
  return { ok: true };
}

/**
 * Un PDF nato nel browser, salvato col nome giusto.
 *
 * Le liste invitati le fabbrica jsPDF qui dentro, quindi non hanno un
 * indirizzo da cui scendere: i byte fanno un giro da `/api/download`
 * e tornano indietro con `Content-Disposition`. Costa una richiesta,
 * e vale: e' l'unico modo perche' il file si chiami come deve su
 * tutti i browser.
 */
export async function scaricaBlobGenerato(
  blob: Blob,
  nomeFile: string,
  token: string,
): Promise<EsitoScarico> {
  const base64 = await new Promise<string>((risolvi, rifiuta) => {
    const lettore = new FileReader();
    lettore.onload = () => risolvi(String(lettore.result).split(',')[1] ?? '');
    lettore.onerror = () => rifiuta(lettore.error);
    lettore.readAsDataURL(blob);
  });

  return scaricaConModulo('/api/download', { token, nome: nomeFile, contenuto: base64 });
}

export interface EsitoScarico {
  ok: boolean;
  /** Pronto da mostrare: se non e' andata, dice perche'. */
  messaggio?: string;
}

/**
 * Chiede un file al server e lo salva.
 *
 * Se il server risponde male non si resta a guardare: il messaggio
 * torna indietro e chi ha premuto il pulsante lo legge. Prima
 * l'errore veniva ignorato con un `if (!res.ok) return`, e il
 * pulsante sembrava semplicemente non funzionare.
 */
export async function scaricaDalServer(
  url: string,
  nomeFile: string,
  opzioni: { token: string; body?: unknown; method?: 'GET' | 'POST' },
): Promise<EsitoScarico> {
  try {
    const res = await fetch(url, {
      method: opzioni.method ?? (opzioni.body ? 'POST' : 'GET'),
      headers: {
        Authorization: `Bearer ${opzioni.token}`,
        ...(opzioni.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opzioni.body ? JSON.stringify(opzioni.body) : undefined,
    });

    if (!res.ok) {
      const dettaglio = await res.text().catch(() => '');
      let motivo = '';
      try {
        motivo = JSON.parse(dettaglio).error ?? '';
      } catch {
        /* il server non ha risposto in JSON */
      }
      return {
        ok: false,
        messaggio:
          motivo ||
          (res.status === 401 || res.status === 403
            ? 'Non hai il permesso di scaricare questo file.'
            : `Il file non e' stato generato (errore ${res.status}).`),
      };
    }

    const blob = await res.blob();
    if (blob.size === 0) {
      return { ok: false, messaggio: 'Il server ha restituito un file vuoto.' };
    }

    const salvato = salvaBlob(blob, nomeFile);
    return {
      ok: true,
      messaggio: salvato ? undefined : 'Aperto in una scheda: usa «Condividi» per salvarlo.',
    };
  } catch {
    return { ok: false, messaggio: 'Connessione assente: riprova.' };
  }
}
