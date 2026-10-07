import { emailShell, heading, para, ctaButton, divider } from '@/lib/email-shell';
import type { AmbassadorLocale } from '@/lib/ambassador';

// ── Candidate confirmation ───────────────────────────────────────────────────
// Fixed copy only: it must never include anything the candidate typed.

const CONFIRMATION_COPY: Record<AmbassadorLocale, { subject: string; title: string; body: string; cta: string }> = {
  it: {
    subject: 'Abbiamo ricevuto la tua candidatura — Vivo Wine Club',
    title:   'Candidatura ricevuta.',
    body:    'Grazie per la tua candidatura come Ambassador di Vivo Wine Club. Il nostro team la esaminerà con attenzione e ti ricontatteremo.',
    cta:     'VISITA IL SITO →',
  },
  en: {
    subject: 'We received your application — Vivo Wine Club',
    title:   'Application received.',
    body:    'Thank you for applying to become a Vivo Wine Club Ambassador. Our team will review your application carefully and get back to you.',
    cta:     'VISIT OUR WEBSITE →',
  },
  fr: {
    subject: 'Nous avons bien reçu votre candidature — Vivo Wine Club',
    title:   'Candidature reçue.',
    body:    'Merci pour votre candidature en tant qu’Ambassador de Vivo Wine Club. Notre équipe va l’examiner avec attention et reviendra vers vous.',
    cta:     'VISITER LE SITE →',
  },
};

export function ambassadorConfirmationEmail(locale: AmbassadorLocale): { subject: string; html: string } {
  const copy = CONFIRMATION_COPY[locale];
  const body = `
${heading(copy.title)}
${para(copy.body)}
${divider()}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
  <tr><td align="center">
    ${ctaButton(copy.cta, 'https://vivowineclub.com')}
  </td></tr>
</table>`;
  return { subject: copy.subject, html: emailShell(body) };
}

// ── Staff notification ───────────────────────────────────────────────────────

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Rows are [label, value]; every value is HTML-escaped here. */
export function ambassadorStaffEmailHtml(rows: [string, string | null][]): string {
  const tableRows = rows.map(([label, value], i) => `
    <tr class="${i % 2 === 0 ? 'em-row-even' : ''}">
      <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a4a4a;width:130px;vertical-align:top;" class="em-label">${escapeHtml(label)}</td>
      <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;border-bottom:1px solid #f5eded;white-space:pre-wrap;word-break:break-word;" class="em-value">${value ? escapeHtml(value) : '—'}</td>
    </tr>`).join('');

  const body = `
<h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#1a0505;" class="em-h1">New ambassador application</h2>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #eddada;border-radius:4px;overflow:hidden;">
  ${tableRows}
</table>`;
  return emailShell(body);
}
