import { emailShell, heading, para, divider } from '@/lib/email-shell';
import { emailLocale, type EmailLocale } from '@/lib/emails/membership-emails';

/**
 * Le mail delle candidature.
 *
 * Chi si propone riceve una conferma, nella sua lingua, e noi
 * riceviamo la riga completa in casella. Prima non partiva niente: la
 * candidatura finiva nel database e la persona non sapeva se fosse
 * arrivata, mentre noi lo scoprivamo solo entrando nell'area
 * riservata.
 *
 * La conferma non promette tempi che non possiamo rispettare e non
 * dice «ti faremo sapere presto». Dice cosa succede adesso: la
 * leggiamo noi, e se c'è da parlarne scriviamo di persona. Chi si
 * candida come creator e chi scrive per una cantina hanno bisogno di
 * due risposte diverse, quindi il testo cambia per tipo.
 *
 * L'avviso a noi resta in italiano: lo leggiamo noi, non il
 * candidato.
 */

export type KindCandidatura = 'ambassador' | 'company' | 'creator' | 'staff';

export interface DatiCandidatura {
  kind: KindCandidatura;
  email: string;
  first_name?: string | null;
  last_name?: string | null;
  phone?: string | null;
  city?: string | null;
  country?: string | null;
  company?: string | null;
  role?: string | null;
  website?: string | null;
  instagram?: string | null;
  tiktok?: string | null;
  followers?: number | null;
  message?: string | null;
  locale?: string | null;
}

/* ── I testi ──────────────────────────────────────────────────────── */

const COPY: Record<EmailLocale, {
  oggetto: Record<KindCandidatura, string>;
  titolo: Record<KindCandidatura, string>;
  ciao: (n: string) => string;
  arrivata: string;
  cosaSuccede: Record<KindCandidatura, string>;
  intanto: string;
  firma: string;
  rispondi: string;
}> = {
  it: {
    oggetto: {
      ambassador: 'La tua candidatura come ambassador | Vivo Wine Club',
      company: 'La tua richiesta a Vivo Studio | Vivo Wine Club',
      creator: 'La tua candidatura come creator | Vivo Wine Club',
      staff: 'La tua candidatura per il team | Vivo Wine Club',
    },
    titolo: {
      ambassador: 'Candidatura ricevuta',
      company: 'Richiesta ricevuta',
      creator: 'Candidatura ricevuta',
      staff: 'Candidatura ricevuta',
    },
    ciao: (n) => (n ? `Ciao ${n},` : 'Ciao,'),
    arrivata: 'la tua richiesta è arrivata: la leggiamo noi, una per una.',
    cosaSuccede: {
      ambassador:
        'Essere ambassador vuol dire portare VIVO nella tua città: se quello che ci hai ' +
        'scritto ha senso per noi, ti scriviamo di persona per parlarne con calma. Non ci sono ' +
        'moduli da compilare dopo questo.',
      company:
        'Diamo un’occhiata a quello che fate e a cosa vi servirebbe. Se c’è margine per ' +
        'lavorare insieme vi scriviamo di persona, con una proposta concreta e non con un ' +
        'catalogo di servizi.',
      creator:
        'Guardiamo i tuoi contenuti, non il numero di follower. Se vediamo che il vino ' +
        'raccontato come lo raccontiamo noi è una cosa tua, ti scriviamo di persona.',
      staff:
        'Il team è piccolo e cresce poco alla volta. Se quello che sai fare ci serve, ti ' +
        'scriviamo di persona: non ci sono selezioni a scadenza.',
    },
    intanto:
      'Nel frattempo ci trovi su Instagram, ed è lì che si capisce meglio cosa facciamo che in ' +
      'qualsiasi mail.',
    firma: 'A presto.<br />Il team VIVO',
    rispondi: 'A questa mail puoi rispondere: la leggiamo noi.',
  },

  en: {
    oggetto: {
      ambassador: 'Your ambassador application | Vivo Wine Club',
      company: 'Your enquiry to Vivo Studio | Vivo Wine Club',
      creator: 'Your creator application | Vivo Wine Club',
      staff: 'Your application to the team | Vivo Wine Club',
    },
    titolo: {
      ambassador: 'Application received',
      company: 'Enquiry received',
      creator: 'Application received',
      staff: 'Application received',
    },
    ciao: (n) => (n ? `Hi ${n},` : 'Hi,'),
    arrivata: 'your message reached us, and we read them one by one.',
    cosaSuccede: {
      ambassador:
        'Being an ambassador means bringing VIVO to your city: if what you wrote makes sense ' +
        'for us, we write to you personally so we can talk it through. There are no further ' +
        'forms after this one.',
      company:
        'We’ll look at what you do and at what you would need. If there is room to work ' +
        'together we write to you personally, with a concrete proposal rather than a catalogue ' +
        'of services.',
      creator:
        'We look at your content, not at your follower count. If we can see that wine told the ' +
        'way we tell it is your thing, we write to you personally.',
      staff:
        'The team is small and grows slowly. If what you can do is what we need, we write to ' +
        'you personally: there are no application deadlines here.',
    },
    intanto:
      'In the meantime you’ll find us on Instagram, and that says more about what we do than ' +
      'any email could.',
    firma: 'Talk soon.<br />The VIVO team',
    rispondi: 'You can reply to this email. We read them.',
  },

  fr: {
    oggetto: {
      ambassador: 'Ta candidature comme ambassadeur | Vivo Wine Club',
      company: 'Ta demande à Vivo Studio | Vivo Wine Club',
      creator: 'Ta candidature comme créateur | Vivo Wine Club',
      staff: 'Ta candidature pour l’équipe | Vivo Wine Club',
    },
    titolo: {
      ambassador: 'Candidature reçue',
      company: 'Demande reçue',
      creator: 'Candidature reçue',
      staff: 'Candidature reçue',
    },
    ciao: (n) => (n ? `Salut ${n},` : 'Salut,'),
    arrivata: 'ta demande nous est bien arrivée : on les lit une par une.',
    cosaSuccede: {
      ambassador:
        'Être ambassadeur, c’est amener VIVO dans ta ville : si ce que tu nous as écrit a du ' +
        'sens pour nous, on t’écrit personnellement pour en parler tranquillement. Il n’y a ' +
        'aucun autre formulaire après celui-ci.',
      company:
        'On regarde ce que vous faites et ce dont vous auriez besoin. S’il y a de la place pour ' +
        'travailler ensemble, on vous écrit personnellement, avec une proposition concrète et ' +
        'non un catalogue de services.',
      creator:
        'On regarde tes contenus, pas ton nombre d’abonnés. Si on voit que le vin raconté ' +
        'comme on le raconte est vraiment ton truc, on t’écrit personnellement.',
      staff:
        'L’équipe est petite et grandit lentement. Si ce que tu sais faire nous est utile, on ' +
        't’écrit personnellement : il n’y a pas de sélection à date fixe.',
    },
    intanto:
      'En attendant, on est sur Instagram, et ça explique mieux ce qu’on fait que n’importe ' +
      'quel e-mail.',
    firma: 'À très vite.<br />L’équipe VIVO',
    rispondi: 'Tu peux répondre à cet e-mail : c’est nous qui le lisons.',
  },
};

/* ── La conferma a chi si è candidato ─────────────────────────────── */

export function candidaturaRicevuta(
  d: DatiCandidatura,
): { subject: string; html: string } {
  const locale = emailLocale(d.locale);
  const t = COPY[locale];
  const nome = (d.first_name ?? '').trim().split(' ')[0];

  return {
    subject: t.oggetto[d.kind],
    html: emailShell(
      [
        heading(t.titolo[d.kind]),
        para(`${t.ciao(nome)} ${t.arrivata}`),
        para(t.cosaSuccede[d.kind]),
        divider(),
        para(t.intanto),
        para(t.firma, 'font-size:13px;color:#7a4a4a;'),
        para(t.rispondi, 'font-size:13px;color:#7a4a4a;'),
      ].join(''),
    ),
  };
}

/* ── L'avviso a noi ───────────────────────────────────────────────── */

const ETICHETTA_KIND: Record<KindCandidatura, string> = {
  ambassador: 'Ambassador',
  company: 'Azienda',
  creator: 'Creator',
  staff: 'Team',
};

function riga(label: string, valore: string | null | undefined) {
  if (!valore) return '';
  return `
<tr>
  <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a4a4a;width:140px;white-space:nowrap;vertical-align:top;" class="em-label">${label}</td>
  <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;border-bottom:1px solid #f5eded;white-space:pre-wrap;">${valore}</td>
</tr>`;
}

export function avvisoCandidatura(d: DatiCandidatura): { subject: string; html: string } {
  const nome = [d.first_name, d.last_name].filter(Boolean).join(' ').trim();
  const chi = nome || d.company || d.email;

  const corpo = `
${heading(`Nuova candidatura: ${ETICHETTA_KIND[d.kind]}`)}
${para(`<strong>${chi}</strong> si è proposto come ${ETICHETTA_KIND[d.kind].toLowerCase()}.`)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #eddada;border-radius:4px;overflow:hidden;margin-top:20px;">
  ${riga('Nome', nome)}
  ${riga('Email', d.email)}
  ${riga('Telefono', d.phone)}
  ${riga('Città', d.city)}
  ${riga('Paese', d.country)}
  ${riga('Azienda', d.company)}
  ${riga('Ruolo', d.role)}
  ${riga('Sito', d.website)}
  ${riga('Instagram', d.instagram)}
  ${riga('TikTok', d.tiktok)}
  ${riga('Follower', d.followers != null ? String(d.followers) : null)}
  ${riga('Lingua', d.locale)}
  ${riga('Cosa ci ha scritto', d.message)}
</table>
${para('La trovi in area riservata, sotto Membership, nella scheda del suo tipo.', 'font-size:13px;color:#7a4a4a;')}`;

  return {
    subject: `Nuova candidatura ${ETICHETTA_KIND[d.kind]}: ${chi}`,
    html: emailShell(corpo),
  };
}
