import { emailShell, heading, para, divider, ctaButton } from '@/lib/email-shell';
import { benefitsFor } from '@/lib/member-benefits';

export type EmailLocale = 'it' | 'en' | 'fr';

/** La lingua in cui scrivere a questa persona. */
export function emailLocale(raw: string | null | undefined): EmailLocale {
  return raw === 'en' || raw === 'fr' ? raw : 'it';
}

/**
 * Le tre mail della tessera.
 *
 * Sono tre perché parlano a tre persone diverse.
 *
 * **Benvenuto** va a chi arriva da zero: non sa ancora bene cosa sia
 * VIVO, e la mail glielo racconta prima di elencargli i vantaggi.
 *
 * **Attivazione** va a chi c'era già — i soci della prima ora, quelli
 * che venivano agli eventi quando la tessera non esisteva. A loro
 * raccontare il club sarebbe offensivo: la mail dice che la tessera
 * adesso c'è, che è loro, e che il prezzo di favore è il nostro modo
 * di dire grazie.
 *
 * **Rinnovo** va a chi ha appena pagato l'anno successivo: è una
 * ricevuta, non una presentazione. Dice che il pagamento è arrivato,
 * fino a quando vale la tessera e quanto ha pagato. I vantaggi non si
 * rielencano a chi li ha già usati per un anno.
 *
 * Il corpo centrale — numero, scadenza, cosa comprende — è lo stesso:
 * le promesse arrivano da lib/member-benefits.ts, così non possono
 * divergere fra le due mail e l'area personale.
 */

/**
 * La data nella lingua di chi legge.
 *
 * `toLocaleDateString` gira anche sul server: i dati di
 * localizzazione ci sono, e una data scritta a mano in italiano
 * dentro una mail inglese è il genere di dettaglio che fa capire che
 * la traduzione è finta.
 */
function fmtDate(iso: string, locale: EmailLocale) {
  return new Date(`${iso.slice(0, 10)}T12:00:00Z`).toLocaleDateString(locale, {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

function eur(cents: number) {
  return `${Math.floor(cents / 100)}${cents % 100 ? ',' + String(cents % 100).padStart(2, '0') : ''} €`;
}

function riga(label: string, value: string, pari: boolean) {
  return `
<tr class="${pari ? 'em-row-even' : ''}"${pari ? ' bgcolor="#fdf6f6"' : ''}>
  <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#8a5a5a;letter-spacing:0.06em;text-transform:uppercase;" class="em-label">${label}</td>
  <td style="padding:11px 16px;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a0505;text-align:right;font-weight:700;" class="em-value">${value}</td>
</tr>`;
}

const ETICHETTE: Record<EmailLocale, { card: string; until: string }> = {
  it: { card: 'Tessera', until: 'Valida fino al' },
  en: { card: 'Membership', until: 'Valid until' },
  fr: { card: 'Carte', until: 'Valable jusqu’au' },
};

function tessera(memberId: string | null, expiresAt: string, locale: EmailLocale) {
  const e = ETICHETTE[locale];
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:24px 0;border:1px solid #eddada;border-radius:6px;overflow:hidden;" class="em-card">
  ${riga(e.card, memberId ?? '—', false)}
  ${riga(e.until, fmtDate(expiresAt, locale), true)}
</table>`;
}

function vantaggi(locale: EmailLocale) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:8px 0 0;">${
    benefitsFor(locale).map(
      (b) => `
<tr>
  <td style="padding:10px 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#3a1a1a;line-height:1.65;border-top:1px solid #eddada;" class="em-p em-row">
    <strong style="color:#1a0505;" class="em-value">${b.title}</strong><br />
    <span style="color:#7a4a4a;" class="em-muted">${b.body}</span>
  </td>
</tr>`,
    ).join('')
  }</table>`;
}

export type MembershipEmailKind = 'benvenuto' | 'attivazione' | 'rinnovo';

export interface MembershipEmailData {
  fullName: string | null;
  memberId: string | null;
  expiresAt: string;
  /** Quanto costerà il rinnovo a questa persona. */
  renewalCents?: number | null;
  standardCents?: number | null;
  /** Quanto ha pagato adesso: serve solo alla mail del rinnovo. */
  paidCents?: number | null;
  /**
   * L'indirizzo dove impostare la password. Arriva sempre, anche per
   * chi una password ce l'ha: cambia solo come viene presentato.
   */
  passwordLink?: string | null;
  /**
   * `true` se la password questa persona ce l'ha già. Allora il
   * pulsante resta «entra» e il link diventa una riga sotto, per chi
   * non se la ricorda: l'ultimo accesso di queste persone è di mesi
   * fa, e un benvenuto senza via d'ingresso è un vicolo cieco.
   */
  haPassword?: boolean;
}

/* ── Chi arriva da zero ───────────────────────────────────────────── */

/* ── I testi, nelle tre lingue ─────────────────────────────────────── */

const COPY = {
  it: {
    benvenutoOggetto: (id: string | null) =>
      id ? `Wine but make it VIVO: la tua tessera ${id}` : 'Wine but make it VIVO',
    benvenutoTitolo: 'Wine but make it VIVO',
    ciao: (n: string) => (n ? `Ciao ${n},` : 'Ciao,'),
    chiSiamo:
      'Siamo una community di giovani con un’idea fissa: <strong>cambiare il modo in cui si ' +
      'racconta il vino</strong>. Troppo esclusivo, troppo complicato, troppo riservato a chi già ' +
      'sapeva tutto. E invece è una delle cose più belle da condividere a vent’anni.',
    comeLoFacciamo:
      'Lo facciamo nell’unico modo che conosciamo: portandoti dentro le cantine a conoscere chi il ' +
      'vino lo fa davvero, e organizzando serate che ti ricordi il giorno dopo. ' +
      '<strong>Esperienze, non degustazioni.</strong>',
    ciSeiAncheTu:
      '<strong>Da oggi ci sei anche tu.</strong> Questo è il tuo numero di tessera: serve agli ' +
      'eventi riservati e quando chiedi una visita in cantina da parte nostra.',
    cosaTiPorti: '<strong>Cosa ti porti a casa</strong>',
    gratuitaFino: (data: string, prezzo: string) =>
      `L’iscrizione è gratuita fino al ${data}. Dal 2027 la tessera costa ${prezzo} all’anno, e te ` +
      'lo ricorderemo per tempo: nessun addebito automatico, nessuna sorpresa.',
    areaPersonale:
      'Nella tua area personale trovi la tessera, gli eventi, la mappa delle cantine con i contatti ' +
      'e gli sconti riservati.',
    bottone: 'Entra nella tua area',
    firma: 'Ci vediamo al prossimo brindisi.<br />Il team VIVO',
    rispondi: 'A questa mail puoi rispondere: la leggiamo noi.',

    attivazioneOggetto: (id: string | null) =>
      id ? `La tua tessera VIVO è attiva: ${id}` : 'La tua tessera VIVO è attiva',
    attivazioneTitolo: 'La tua tessera è attiva',
    ceriPrima:
      'Ci sei da prima che tutto questo avesse un nome e un numero. Adesso il club ha le sue ' +
      'tessere, e la prima è tua: non devi fare niente, è già attiva.',
    cosaTiDaOggi: '<strong>Cosa ti dà, da oggi</strong>',
    scontoFedelta: (sconto: string, pieno: string) =>
      `La membership vera parte il <strong>1° gennaio 2027</strong>. Tu c’eri prima, quando non ` +
      `c’era ancora niente da vedere: il tuo rinnovo costa <strong>${sconto}</strong> invece di ` +
      `${pieno}. Te lo ricorderemo per tempo, senza addebiti a sorpresa.`,
    senzaSconto: (data: string, prezzo: string) =>
      `La tessera vale fino al ${data}, poi si rinnova a ${prezzo}. Ti scriveremo prima: nessun ` +
      'addebito automatico.',

    rinnovoOggetto: (id: string | null) =>
      id ? `Tessera VIVO rinnovata: ${id}` : 'Tessera VIVO rinnovata',
    rinnovoTitolo: 'La tua tessera è rinnovata',
    rinnovoGrazie:
      'Pagamento ricevuto, tessera rinnovata. Il numero resta lo stesso, cambia solo la scadenza: ' +
      'non devi fare niente.',
    rinnovoImporto: (importo: string) => `Hai pagato <strong>${importo}</strong>.`,
    rinnovoAnnoNuovo:
      'Un altro anno di serate, visite in cantina e sconti riservati. Ci vediamo alla prossima.',

    bottonePassword: 'Imposta la tua password',
    nonRicordi: 'Non ricordi la password?',
    rifalla: 'Impostane una nuova',
    scegliPassword:
      'Per entrare nella tua area ti serve una password: sceglila da qui, ci vuole un minuto. ' +
      'Il link è personale e vale qualche giorno; se scade, dalla pagina di accesso puoi ' +
      'chiederne un altro con «Password dimenticata».',
  },

  en: {
    benvenutoOggetto: (id: string | null) =>
      id ? `Wine but make it VIVO: your card ${id}` : 'Wine but make it VIVO',
    benvenutoTitolo: 'Wine but make it VIVO',
    ciao: (n: string) => (n ? `Hi ${n},` : 'Hi,'),
    chiSiamo:
      'We’re a community of young people with one fixed idea: <strong>changing the way wine is ' +
      'talked about</strong>. Too exclusive, too complicated, too reserved for those who already ' +
      'knew everything. And it’s one of the best things to share when you’re young.',
    comeLoFacciamo:
      'We do it the only way we know: taking you inside the estates to meet the people who ' +
      'actually make the wine, and throwing nights you still remember the morning after. ' +
      '<strong>Experiences, not tastings.</strong>',
    ciSeiAncheTu:
      '<strong>From today you’re one of us.</strong> This is your membership number: you’ll need ' +
      'it at members-only events and whenever you ask a winery for a visit on our behalf.',
    cosaTiPorti: '<strong>What you get</strong>',
    gratuitaFino: (data: string, prezzo: string) =>
      `Joining is free until ${data}. From 2027 the card costs ${prezzo} a year, and we’ll remind ` +
      'you in good time: no automatic charges, no surprises.',
    areaPersonale:
      'Your personal area has your card, the events, the winery map with contacts and the ' +
      'members’ discounts.',
    bottone: 'Open your area',
    firma: 'See you at the next toast.<br />The VIVO team',
    rispondi: 'You can reply to this email. We read them.',

    attivazioneOggetto: (id: string | null) =>
      id ? `Your VIVO membership is active: ${id}` : 'Your VIVO membership is active',
    attivazioneTitolo: 'Your membership is active',
    ceriPrima:
      'You were here before any of this had a name and a number. The club has its cards now, and ' +
      'the first one is yours: nothing to do, it’s already active.',
    cosaTiDaOggi: '<strong>What it gives you, from today</strong>',
    scontoFedelta: (sconto: string, pieno: string) =>
      `The real membership starts on <strong>1 January 2027</strong>. You were there first, when ` +
      `there was nothing to see yet: your renewal costs <strong>${sconto}</strong> instead of ` +
      `${pieno}. We’ll remind you in good time, with no surprise charges.`,
    senzaSconto: (data: string, prezzo: string) =>
      `Your card runs until ${data}, then renews at ${prezzo}. We’ll write to you first: no ` +
      'automatic charges.',

    rinnovoOggetto: (id: string | null) =>
      id ? `VIVO membership renewed: ${id}` : 'VIVO membership renewed',
    rinnovoTitolo: 'Your membership is renewed',
    rinnovoGrazie:
      'Payment received, membership renewed. Your number stays the same, only the expiry date ' +
      'changes: there is nothing for you to do.',
    rinnovoImporto: (importo: string) => `You paid <strong>${importo}</strong>.`,
    rinnovoAnnoNuovo:
      'Another year of nights, winery visits and members’ discounts. See you at the next one.',

    bottonePassword: 'Set your password',
    nonRicordi: 'Don’t remember your password?',
    rifalla: 'Set a new one',
    scegliPassword:
      'To get into your area you need a password: choose one here, it takes a minute. The link ' +
      'is personal and lasts a few days; if it expires, you can ask for another one from the ' +
      'login page with “Forgot password”.',
  },

  fr: {
    benvenutoOggetto: (id: string | null) =>
      id ? `Wine but make it VIVO : ta carte ${id}` : 'Wine but make it VIVO',
    benvenutoTitolo: 'Wine but make it VIVO',
    ciao: (n: string) => (n ? `Salut ${n},` : 'Salut,'),
    chiSiamo:
      'Nous sommes une communauté de jeunes avec une idée fixe : <strong>changer la façon dont on ' +
      'raconte le vin</strong>. Trop exclusif, trop compliqué, trop réservé à ceux qui savaient ' +
      'déjà tout. Alors que c’est l’une des plus belles choses à partager à vingt ans.',
    comeLoFacciamo:
      'On le fait de la seule manière qu’on connaisse : en t’emmenant dans les domaines rencontrer ' +
      'ceux qui font vraiment le vin, et en organisant des soirées dont tu te souviens le ' +
      'lendemain. <strong>Des expériences, pas des dégustations.</strong>',
    ciSeiAncheTu:
      '<strong>À partir d’aujourd’hui, tu en fais partie.</strong> Voici ton numéro de carte : il ' +
      'sert aux événements réservés et quand tu demandes une visite de la part du club.',
    cosaTiPorti: '<strong>Ce que tu y gagnes</strong>',
    gratuitaFino: (data: string, prezzo: string) =>
      `L’adhésion est gratuite jusqu’au ${data}. À partir de 2027 la carte coûte ${prezzo} par an, ` +
      'et on te préviendra à temps : aucun prélèvement automatique, aucune surprise.',
    areaPersonale:
      'Dans ton espace personnel tu trouves ta carte, les événements, la carte des domaines avec ' +
      'les contacts et les remises réservées.',
    bottone: 'Ouvrir ton espace',
    firma: 'À bientôt, au prochain verre.<br />L’équipe VIVO',
    rispondi: 'Tu peux répondre à cet e-mail : c’est nous qui le lisons.',

    attivazioneOggetto: (id: string | null) =>
      id ? `Ta carte VIVO est active : ${id}` : 'Ta carte VIVO est active',
    attivazioneTitolo: 'Ta carte est active',
    ceriPrima:
      'Tu es là depuis avant que tout cela ait un nom et un numéro. Le club a ses cartes ' +
      'maintenant, et la première est la tienne : rien à faire, elle est déjà active.',
    cosaTiDaOggi: '<strong>Ce qu’elle te donne, dès aujourd’hui</strong>',
    scontoFedelta: (sconto: string, pieno: string) =>
      `La vraie adhésion commence le <strong>1er janvier 2027</strong>. Tu étais là avant, quand il ` +
      `n’y avait encore rien à voir : ton renouvellement coûte <strong>${sconto}</strong> au lieu ` +
      `de ${pieno}. On te préviendra à temps, sans prélèvement surprise.`,
    senzaSconto: (data: string, prezzo: string) =>
      `Ta carte est valable jusqu’au ${data}, puis se renouvelle à ${prezzo}. On t’écrira avant : ` +
      'aucun prélèvement automatique.',

    rinnovoOggetto: (id: string | null) =>
      id ? `Carte VIVO renouvelée : ${id}` : 'Carte VIVO renouvelée',
    rinnovoTitolo: 'Ta carte est renouvelée',
    rinnovoGrazie:
      'Paiement reçu, carte renouvelée. Ton numéro ne change pas, seule la date d’échéance ' +
      'change : tu n’as rien à faire.',
    rinnovoImporto: (importo: string) => `Tu as payé <strong>${importo}</strong>.`,
    rinnovoAnnoNuovo:
      'Une autre année de soirées, de visites dans les domaines et de remises réservées. ' +
      'À la prochaine.',

    bottonePassword: 'Choisis ton mot de passe',
    nonRicordi: 'Tu ne te souviens plus de ton mot de passe ?',
    rifalla: 'Choisis-en un nouveau',
    scegliPassword:
      'Pour entrer dans ton espace il te faut un mot de passe : choisis-le ici, ça prend une ' +
      'minute. Le lien est personnel et valable quelques jours ; s’il expire, tu peux en ' +
      'demander un autre depuis la page de connexion avec « Mot de passe oublié ».',
  },
} as const;

/* ── Il passo finale: impostare la password, oppure entrare ───────── */

/**
 * Chi non ha ancora una password la imposta da qui; chi ce l'ha entra.
 *
 * Il pulsante e' uno, e cambia dove porta: due pulsanti vicini, «entra»
 * e «imposta la password», sono il modo migliore per far cliccare
 * quello sbagliato.
 */
function accesso(d: MembershipEmailData, t: (typeof COPY)[EmailLocale]) {
  // Non ha ancora una password: il pulsante e' quello.
  if (d.passwordLink && !d.haPassword) {
    return [
      para(t.scegliPassword),
      `<div style="margin:24px 0 0;">${ctaButton(t.bottonePassword, d.passwordLink)}</div>`,
    ].join('');
  }

  const entra = `<div style="margin:24px 0 0;">${ctaButton(t.bottone, 'https://vivowineclub.com/members')}</div>`;

  // Ce l'ha, ma l'ultimo accesso e' di mesi fa: la via d'uscita sta
  // sotto il pulsante, scritta piccola. Non e' un secondo pulsante,
  // e' una nota a pie' di pagina: due pulsanti vicini sono il modo
  // migliore per far premere quello sbagliato.
  if (!d.passwordLink) return entra;

  return [
    entra,
    para(
      `${t.nonRicordi} <a href="${d.passwordLink}" style="color:#731515;">${t.rifalla}</a>.`,
      'font-size:13px;color:#7a4a4a;margin-top:14px;',
    ),
  ].join('');
}

/* ── Chi arriva da zero ───────────────────────────────────────────── */

function benvenuto(d: MembershipEmailData, locale: EmailLocale) {
  const t = COPY[locale];
  const nome = (d.fullName ?? '').trim().split(' ')[0];

  return {
    subject: t.benvenutoOggetto(d.memberId),
    html: emailShell(
      [
        heading(t.benvenutoTitolo),
        para(t.ciao(nome)),
        para(t.chiSiamo),
        para(t.comeLoFacciamo),
        para(t.ciSeiAncheTu),
        tessera(d.memberId, d.expiresAt, locale),
        para(t.cosaTiPorti),
        vantaggi(locale),
        divider(),
        para(t.gratuitaFino(fmtDate(d.expiresAt, locale), eur(d.standardCents ?? 3000))),
        para(t.areaPersonale),
        accesso(d, t),
        para(t.firma, 'font-size:13px;color:#7a4a4a;'),
        para(t.rispondi, 'font-size:13px;color:#7a4a4a;'),
      ].join(''),
    ),
  };
}

/* ── Chi c'era già ────────────────────────────────────────────────── */

function attivazione(d: MembershipEmailData, locale: EmailLocale) {
  const t = COPY[locale];
  const nome = (d.fullName ?? '').trim().split(' ')[0];
  const scontato =
    d.renewalCents != null && d.standardCents != null && d.renewalCents < d.standardCents;

  return {
    subject: t.attivazioneOggetto(d.memberId),
    html: emailShell(
      [
        heading(t.attivazioneTitolo),
        para(t.ciao(nome)),
        para(t.ceriPrima),
        tessera(d.memberId, d.expiresAt, locale),
        para(t.cosaTiDaOggi),
        vantaggi(locale),
        divider(),
        scontato
          ? para(t.scontoFedelta(eur(d.renewalCents!), eur(d.standardCents!)))
          : para(t.senzaSconto(fmtDate(d.expiresAt, locale), eur(d.standardCents ?? 3000))),
        para(t.areaPersonale),
        accesso(d, t),
        para(t.rispondi, 'font-size:13px;color:#7a4a4a;'),
      ].join(''),
    ),
  };
}

/* ── Chi ha appena rinnovato ──────────────────────────────────────── */

/**
 * La ricevuta del rinnovo.
 *
 * Qui i vantaggi non si rielencano: chi rinnova li conosce, li ha
 * usati per un anno. Servono tre cose e basta: che il pagamento e'
 * arrivato, fino a quando vale la tessera, e quanto ha pagato.
 */
function rinnovo(d: MembershipEmailData, locale: EmailLocale) {
  const t = COPY[locale];
  const nome = (d.fullName ?? '').trim().split(' ')[0];

  return {
    subject: t.rinnovoOggetto(d.memberId),
    html: emailShell(
      [
        heading(t.rinnovoTitolo),
        para(t.ciao(nome)),
        para(t.rinnovoGrazie),
        tessera(d.memberId, d.expiresAt, locale),
        d.paidCents != null ? para(t.rinnovoImporto(eur(d.paidCents))) : '',
        divider(),
        para(t.rinnovoAnnoNuovo),
        accesso(d, t),
        para(t.firma, 'font-size:13px;color:#7a4a4a;'),
        para(t.rispondi, 'font-size:13px;color:#7a4a4a;'),
      ].join(''),
    ),
  };
}

export function membershipEmail(
  kind: MembershipEmailKind,
  d: MembershipEmailData,
  rawLocale?: string | null,
): { subject: string; html: string } {
  const locale = emailLocale(rawLocale);
  if (kind === 'benvenuto') return benvenuto(d, locale);
  if (kind === 'rinnovo') return rinnovo(d, locale);
  return attivazione(d, locale);
}
