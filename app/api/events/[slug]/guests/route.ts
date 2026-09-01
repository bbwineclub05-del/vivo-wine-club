import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { requireAdminOrStaff } from '@/lib/auth-guard';
import { emailShell, heading, para, divider } from '@/lib/email-shell';
import { getClientIp, PRIVACY_POLICY_VERSION } from '@/lib/consent';

const resend = new Resend(process.env.RESEND_API_KEY);

/* ── Confirmation email HTML ── */
function buildConfirmationEmail(opts: {
  firstName: string;
  eventTitle: string;
  eventDate: string;   // "12 JUL 2026"
  eventLocation: string;
  eventTime: string | null;
  routeOption?: string | null;
  eventPrice?: number | null;
  parkingMapUrl?: string | null;
}): string {
  const { firstName, eventTitle, eventDate, eventLocation, eventTime, routeOption, eventPrice, parkingMapUrl } = opts;
  const hasExtra = !!(parkingMapUrl || routeOption || (eventPrice && eventPrice > 0));

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
    <td style="padding:8px 0;border-top:1px solid #eddada;${hasExtra ? '' : 'border-bottom:1px solid #eddada;'}">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a4a4a;">Luogo</p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a0505;">${eventLocation}</p>
    </td>
  </tr>
  ${parkingMapUrl ? `<tr>
    <td style="padding:8px 0;border-top:1px solid #eddada;${(routeOption || (eventPrice && eventPrice > 0)) ? '' : 'border-bottom:1px solid #eddada;'}">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a4a4a;">Parcheggio &amp; Navetta</p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;">
        <a href="${parkingMapUrl}" style="color:#731515;text-decoration:none;">Apri su Google Maps →</a>
      </p>
    </td>
  </tr>` : ''}
  ${routeOption ? `<tr>
    <td style="padding:8px 0;border-top:1px solid #eddada;${eventPrice && eventPrice > 0 ? '' : 'border-bottom:1px solid #eddada;'}">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a4a4a;">Percorso scelto</p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:18px;font-weight:bold;color:#731515;">${routeOption === '40km' ? '40 km' : '80 km'} 🚴</p>
    </td>
  </tr>` : ''}
  ${eventPrice && eventPrice > 0 ? `<tr>
    <td style="padding:8px 0;border-top:1px solid #eddada;border-bottom:1px solid #eddada;">
      <p style="margin:0;font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#7a4a4a;">Ingresso</p>
      <p style="margin:4px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#1a0505;">€${eventPrice} — pagamento all&apos;ingresso</p>
    </td>
  </tr>` : ''}
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;

  const { data: guests, error } = await db
    .from('event_guests')
    .select('*')
    .eq('event_slug', slug)
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enrich guests with referral reward info (join by email + event_slug)
  const guestList = guests ?? [];
  if (guestList.length > 0) {
    const emails = [...new Set(guestList.map((g: { email: string }) => g.email))];
    const { data: refCodes } = await db
      .from('referral_codes')
      .select('owner_email, reward_unlocked, reward_code')
      .eq('event_slug', slug)
      .in('owner_email', emails);

    if (refCodes && refCodes.length > 0) {
      type RefRow = { owner_email: string; reward_unlocked: boolean; reward_code: string | null };
      const refMap = new Map((refCodes as RefRow[]).map((rc) =>
        [rc.owner_email, { reward_unlocked: rc.reward_unlocked, reward_code: rc.reward_code }]
      ));
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const g of guestList as any[]) {
        const ref = refMap.get(g.email);
        if (ref) {
          g.referral_reward_unlocked = ref.reward_unlocked;
          g.referral_reward_code     = ref.reward_code;
        }
      }
    }
  }

  return NextResponse.json({ guests: guestList });
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

  const firstName   = String(body.first_name   ?? '').trim();
  const lastName    = String(body.last_name    ?? '').trim();
  const email       = String(body.email        ?? '').trim().toLowerCase();
  const phone       = String(body.phone        ?? '').trim() || null;
  const partnerCode = body.partner_code ? String(body.partner_code).trim().toUpperCase() : null;
  const routeOption = body.route_option && ['40km', '80km'].includes(String(body.route_option))
    ? String(body.route_option)
    : null;
  const consentPrivacy   = body.consent_privacy === true;
  const consentMarketing = body.consent_marketing === true;

  if (!firstName || !lastName || !email) {
    return NextResponse.json({ error: 'Nome, cognome ed email sono obbligatori.' }, { status: 422 });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: 'Indirizzo email non valido.' }, { status: 422 });
  }
  // Privacy Policy consent is REQUIRED — reject if not explicitly true
  if (!consentPrivacy) {
    return NextResponse.json({ error: 'È necessario accettare la Privacy Policy.' }, { status: 422 });
  }

  const db = getSupabaseAdmin();

  // Fetch the event to get id, title, date, location, time
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: eventRow, error: evtErr } = await (db as any)
    .from('events')
    .select('id, title, date, time, location, location_full, guest_list_enabled, is_list_only, price, parking_map_url')
    .eq('slug', slug)
    .single();

  if (evtErr || !eventRow) {
    return NextResponse.json({ error: 'Evento non trovato.' }, { status: 404 });
  }
  if (!eventRow.guest_list_enabled && !eventRow.is_list_only) {
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
  const now = new Date().toISOString();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: guest, error: insertErr } = await (db as any)
    .from('event_guests')
    .insert({
      event_id:     eventRow.id,
      event_slug:   slug,
      first_name:   firstName,
      last_name:    lastName,
      email,
      phone,
      partner_code: partnerCode,
      route_option: routeOption,
      consent_privacy_accepted_at:   now,
      consent_privacy_version:       PRIVACY_POLICY_VERSION,
      consent_marketing:             consentMarketing,
      consent_marketing_accepted_at: consentMarketing ? now : null,
      consent_ip:                    getClientIp(request),
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

  // Sync guest to customers table (non-fatal)
  try {
    const name = [firstName, lastName].join(' ');
    const now  = new Date().toISOString();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: existingCustomer } = await (db as any)
      .from('customers')
      .select('id, events, total_events')
      .eq('email', email)
      .maybeSingle();

    if (existingCustomer) {
      const existingEvents: string[] = existingCustomer.events ?? [];
      if (!existingEvents.includes(slug)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (db as any).from('customers').update({
          name,
          last_purchase_at: now,
          total_events:     (existingCustomer.total_events ?? 0) + 1,
          events:           [...existingEvents, slug],
        }).eq('id', existingCustomer.id);
      }
    } else {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (db as any).from('customers').insert({
        email,
        name,
        first_purchase_at: now,
        last_purchase_at:  now,
        total_events:      1,
        events:            [slug],
      });
    }
  } catch (syncErr) {
    console.error('[event guests] customers sync error:', syncErr);
  }

  // Send emails (non-blocking — don't fail the request if email fails)
  console.log(`[event guests] sending emails for ${slug} to ${email}`);

  // 1. Confirmation to customer
  try {
    const result = await resend.emails.send({
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
        routeOption,
        eventPrice:    eventRow.is_list_only && eventRow.price > 0 ? eventRow.price : null,
        parkingMapUrl: eventRow.parking_map_url ?? null,
      }),
      headers: {
        'List-Unsubscribe':      '<mailto:info@vivowineclub.com?subject=unsubscribe>',
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    });
    console.log('[event guests] confirmation email sent:', result);
  } catch (emailErr) {
    console.error('[event guests] confirmation email error:', emailErr);
  }

  // Note: no admin notification email for list signups — Vivo staff only
  // gets notified for paid ticket purchases (see app/api/checkout/event/route.ts).

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
