import type { Resend } from 'resend';
import { emailShell, heading, para } from '@/lib/email-shell';
import { ageOn } from '@/lib/membership';

const FROM = 'Vivo Wine Club <noreply@vivowineclub.com>';
const A_NOI = 'info@vivowineclub.com';

/**
 * «Si è iscritto qualcuno», e «qualcuno ha rinnovato».
 *
 * Le candidature per collaborare e i biglietti venduti ci arrivano in
 * casella da sempre; le iscrizioni al club no, si vedevano solo
 * aprendo l'area riservata e andandole a cercare. Chi entra nel club
 * e chi decide di restarci un altro anno sono le due cose che ci
 * interessano di più: vanno dette appena succedono.
 *
 * Le due mail sono la stessa tabella con un'intestazione diversa. Il
 * rinnovo porta in più quanto è stato incassato, perché è l'unica
 * informazione che l'area riservata non mostra a colpo d'occhio.
 *
 * È una mail di servizio, non una mail del sito: niente racconto,
 * niente pulsanti, solo la riga di chi è arrivato. L'invio non alza
 * mai un errore verso chi la chiama, perché un'iscrizione non deve
 * fallire per una notifica interna.
 */
export interface SocioDaAnnunciare {
  member_id?: string | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  city?: string | null;
  date_of_birth?: string | null;
  source?: string | null;
  locale?: string | null;
  expires_at?: string | null;
}

function riga(label: string, valore: string | null | undefined) {
  return `
<tr>
  <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a4a4a;width:140px;white-space:nowrap;" class="em-label">${label}</td>
  <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;border-bottom:1px solid #f5eded;">${valore || '—'}</td>
</tr>`;
}

/** Nuovo socio, oppure un socio che ha rinnovato. */
export type MotivoNotifica = 'iscrizione' | 'rinnovo';

export async function notificaIscrizione(
  resend: Resend,
  socio: SocioDaAnnunciare,
  pagatoCents: number,
  motivo: MotivoNotifica = 'iscrizione',
): Promise<void> {
  try {
    const eta = socio.date_of_birth ? `${ageOn(socio.date_of_birth)} anni` : null;
    const pagato =
      pagatoCents > 0
        ? `${Math.floor(pagatoCents / 100)}${pagatoCents % 100 ? ',' + String(pagatoCents % 100).padStart(2, '0') : ''} €`
        : 'gratuita (periodo di lancio)';
    const chi = socio.full_name || socio.email || socio.member_id || 'senza nome';
    const rinnovo = motivo === 'rinnovo';

    const corpo = `
${heading(rinnovo ? 'Rinnovo tessera' : 'Nuova iscrizione al club')}
${para(
  rinnovo
    ? `<strong>${socio.full_name || 'Senza nome'}</strong> ha rinnovato: ${pagato} incassati.`
    : `<strong>${socio.full_name || 'Senza nome'}</strong> è socio da adesso.`,
)}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #eddada;border-radius:4px;overflow:hidden;margin-top:20px;">
  ${riga('Tessera', socio.member_id)}
  ${riga('Nome', socio.full_name)}
  ${riga('Email', socio.email)}
  ${riga('Telefono', socio.phone)}
  ${riga('Città', socio.city)}
  ${riga('Età', eta)}
  ${riga('Come ci ha trovati', socio.source)}
  ${riga('Lingua', socio.locale)}
  ${riga(rinnovo ? 'Nuova scadenza' : 'Scadenza', socio.expires_at?.slice(0, 10))}
  ${riga(rinnovo ? 'Incassato' : 'Quota', pagato)}
</table>`;

    const { error } = await resend.emails.send({
      from: FROM,
      to: A_NOI,
      subject: rinnovo ? `Rinnovo: ${chi}` : `Nuovo socio: ${chi}`,
      html: emailShell(corpo),
    });
    if (error) console.error('[notificaIscrizione]', error.message);
  } catch (e) {
    console.error('[notificaIscrizione]', e);
  }
}
