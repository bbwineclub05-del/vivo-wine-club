import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff, getAuthUser } from '@/lib/auth-guard';
import { emailShell, heading, para, divider } from '@/lib/email-shell';

const resend = new Resend(process.env.RESEND_API_KEY);

/* ── Confirmation email HTML ── */
function buildConfirmationEmail(opts: {
  firstName: string;
  eventTitle: string;
  eventDate: string;   // "12 JUL 2026"
  eventLocation: string;
  eventTime: string | null;
}): string {
  const { firstName, eventTitle, eventDate, eventLocation, eventTime } = opts;

  const body = `
${heading('Iscrizione confermata', 'Vivo Wine Club · Guest List')}
${divider('20px 0')}
<p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:15px;color:#3a1a1a;text-align:center;line-height:1.7;">
  Ciao <strong>${firstName}</strong>,
</p>
${para('la tua iscrizione alla lista è confermata. Ci vediamo all&apos;evento! 🍷')}
${divider('20px 0')}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
    <td style="padding:8px 0;border-top:1px solid #eddada;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a4a4a;">Evento</p>
      <p style="margin:4px 0 0;font-family:Georgia,serif;font-size:17px;color:#1a0505;font-weight:400;">${eventTitle}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0;border-top:1px solid #eddada;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a4a4a;">Data</p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a0505;">${eventDate}${eventTime ? ' · ' + eventTime : ''}</p>
    </td>
  </tr>
  <tr>
    <td style="padding:8px 0;border-top:1px solid #eddada;border-bottom:1px solid #eddada;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a4a4a;">Luogo</p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a0505;">${eventLocation}</p>
    </td>
  </tr>
</table>
${para('Porta con te questa email come conferma oppure comunicaci semplicemente il tuo nome all&apos;ingresso.')}
`;

  return emailShell(body);
}

/* ── GET /api/events/[slug]/guests  (admin/staff only) ── */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const db = getSupabaseAdmin();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (db as any)
    .from('event_guests')
    .select('*')
    .eq('event_slug', slug)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ guests: data ?? [] });
}

/* ── POST /api/events/[slug]/guests  (public — no auth required) ── */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  let body: Record<string, unknown>;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const firstName = String(body.first_name ?? '').trim();
  const lastName  = String(body.last_name  ?? '').trim();
  const email     = String(body.email      ?? '').trim().toLowerCase();
  const phone     = String(body.phone      ?? '').trim() || null;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'Nome, cognome ed email sono obbligatori.' }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Indirizzo email non valido.' }, { status: 422 });
  }

  const db = getSupabaseAdmin();

  // Fetch the event to get id, title, date, location, time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventRow, error: evtErr } = await (db as any)
    .from('events')
    .select('id, title, date, time, location, location_full, guest_list_enabled')
    .eq('slug', slug)
    .single();

  if (evtErr || !eventRow) {
    return NextResponse.json({ error: 'Evento non trovato.' }, { status: 404 });
  }
  if (!eventRow.guest_list_enabled) {
    return NextResponse.json({ error: 'Lista invitati non attiva per questo evento.' }, { status: 403 });
  }

  // Check for duplicate email on same event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: existing } = await (db as any)
    .from('event_guests')
    .select('id')
    .eq('event_slug', slug)
    .eq('email', email)
    .maybeSingle();

  if (existing) {
    return NextResponse.json({ error: 'Sei già iscritto a questo evento con questa email.' }, { status: 409 });
  }

  // Insert guest
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: guest, error: insertErr } = await (db as any)
    .from('event_guests')
    .insert({
      event_id:   eventRow.id,
      event_slug: slug,
      first_name: firstName,
      last_name:  lastName,
      email,
      phone,
    })
    .select()
    .single();

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  // Format date for email
  const [y, m, d] = (eventRow.date as string).split('-');
  const months = ['GEN','FEB','MAR','APR','MAG','GIU','LUG','AGO','SET','OTT','NOV','DIC'];
  const eventDate = `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`;

  // Send confirmation email (non-blocking — don't fail the request if email fails)
  try {
    await resend.emails.send({
      from:     'Vivo Wine Club <noreply@vivowineclub.com>',
      replyTo:  'info@vivowineclub.com',
      to:       email,
      subject:  `Vivo Wine Club List — ${eventRow.title}`,
      html:     buildConfirmationEmail({
        firstName,
        eventTitle:    eventRow.title,
        eventDate,
        eventLocation: eventRow.location_full || eventRow.location,
        eventTime:     eventRow.time ?? null,
      }),
      headers: {
        'List-Unsubscribe':      '<mailto:info@vivowineclub.com?subject=unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
  } catch (emailErr) {
    console.error('[event guests] email error:', emailErr);
  }

  return NextResponse.json({ guest }, { status: 201 });
}

/* ── DELETE /api/events/[slug]/guests  (admin/staff only)
   Removes all guests and disables the guest list for the event. ── */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const auth = await requireAdminOrStaff(request);
  if (!auth.ok) return auth.response;

  const { slug } = await params;
  const db = getSupabaseAdmin();

  // Delete all guests for this event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: deleteErr } = await (db as any)
    .from('event_guests')
    .delete()
    .eq('event_slug', slug);

  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 });

  // Disable guest_list_enabled on the event
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: updateErr } = await (db as any)
    .from('events')
    .update({ guest_list_enabled: false })
    .eq('slug', slug);

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
