import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { Resend } from 'resend';
import { dbEventToEventData, type EventData, type DbEvent } from '@/lib/events';
import { getSupabaseAdmin } from '@/lib/supabase-admin';
import { generateTicketPdf } from '@/lib/ticket-pdf';
import { emailShell, heading, para, ctaButton, divider } from '@/lib/email-shell';
import { getClientIp, PRIVACY_POLICY_VERSION, TERMS_OF_SERVICE_VERSION } from '@/lib/consent';

/** Resolve event by slug from Supabase */
async function resolveEvent(slug: string): Promise<EventData | undefined> {
  try {
    const supabase = getSupabaseAdmin();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data } = await (supabase as any)
      .from('events')
      .select('*')
      .eq('slug', slug)
      .single();
    if (data) return dbEventToEventData(data as DbEvent);
  } catch {/* fall through */}
  return undefined;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2026-04-22.dahlia',
});

const resend = new Resend(process.env.RESEND_API_KEY!);

interface Body {
  slug:        string;
  qty:         number;
  firstName:   string;
  lastName:    string;
  email:       string;
  phone:       string;
  refCode?:    string;
  partnerCode?: string;
  upsellItems?: { configId: string; title: string; price: number }[];
  consentPrivacyTerms?: boolean;
  consentMarketing?:    boolean;
  consentPhotoVideo?:   boolean;
}

interface ConsentParams {
  consentPrivacyAcceptedAt:   string;
  consentPrivacyVersion:      string;
  consentTermsAcceptedAt:     string;
  consentTermsVersion:        string;
  consentMarketing:           boolean;
  consentMarketingAcceptedAt: string | null;
  consentPhotoVideo:          boolean;
  consentIp:                  string | null;
}

// ── Email helpers ─────────────────────────────────────────────────────────────

function buyerEmailHtml(params: {
  firstName: string;
  event: EventData;
  qty: number;
  total: number;
  orderId: string;
}): string {
  const { firstName, event, qty, total, orderId } = params;
  const eventDate  = `${event.month} ${event.day}, ${event.year}`;
  const totalLabel = total === 0 ? 'Free' : `&euro;${total.toFixed(2)}`;

  const detailRows = [
    ['Event',    event.title,        'font-weight:700;'],
    ['Date',     eventDate,          ''],
    ['Location', event.locationFull, ''],
    ['Tickets',  String(qty),        ''],
  ].map(([label, value, extra]) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#7a4a4a;" class="em-p">${label}</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;text-align:right;${extra}" class="em-p">${value}</td>
    </tr>`).join('');

  const body = `
${heading(`You're in, ${firstName}!`, `Your ticket${qty > 1 ? 's' : ''} for ${event.title} ${qty > 1 ? 'are' : 'is'} confirmed.`)}
${para(`Find your ${qty > 1 ? `${qty} ticket PDFs` : 'ticket PDF'} attached to this email.`, 'text-align:center;')}
${divider()}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom:20px;">
  ${detailRows}
  <tr>
    <td style="padding:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:14px;color:#7a4a4a;" class="em-p">Total</td>
    <td style="padding:14px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:700;color:#731515;text-align:right;">${totalLabel}</td>
  </tr>
</table>
${divider('8px 0 0')}
<p style="margin:12px 0 0;font-family:Arial,Helvetica,sans-serif;font-size:11px;color:#7a4a4a;text-align:center;line-height:1.6;" class="em-muted">Order ID: ${orderId}</p>`;

  return emailShell(body);
}

function adminEmailHtml(params: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  event: EventData;
  qty: number;
  total: number;
  orderId: string;
}): string {
  const { firstName, lastName, email, phone, event, qty, total, orderId } = params;
  const eventDate = `${event.month} ${event.day}, ${event.year}`;

  const rows = [
    ['Order ID', `<span style="font-family:monospace;">${orderId}</span>`],
    ['Event',    `<strong>${event.title}</strong>`],
    ['Date',     eventDate],
    ['Location', event.locationFull],
    ['Buyer',    `${firstName} ${lastName}`],
    ['Email',    email],
    ['Phone',    phone],
    ['Tickets',  String(qty)],
    ['Total',    `<strong style="color:#731515;">&euro;${total.toFixed(2)}</strong>`],
  ].map(([k, v], i) => `
    <tr class="${i % 2 === 0 ? 'em-row-even' : ''}">
      <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#7a4a4a;width:110px;white-space:nowrap;" class="em-label">${k}</td>
      <td style="padding:9px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;color:#1a0505;border-bottom:1px solid #f5eded;">${v}</td>
    </tr>`).join('');

  const body = `
<h2 style="margin:0 0 20px;font-family:Georgia,'Times New Roman',serif;font-size:20px;font-weight:400;color:#1a0505;" class="em-h1">New ticket order — ${event.title}</h2>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;border:1px solid #eddada;border-radius:4px;overflow:hidden;">
  ${rows}
</table>`;
  return emailShell(body);
}

// ── Customer CRM upsert ───────────────────────────────────────────────────────

async function upsertCustomer({
  email,
  name,
  eventSlug,
}: {
  email:     string;
  name:      string;
  eventSlug: string;
}) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db  = getSupabaseAdmin() as any;
    const now = new Date().toISOString();

    const { data: existing } = await db
      .from('customers')
      .select('id, events, total_events')
      .eq('email', email)
      .maybeSingle();

    if (existing) {
      const existingEvents: string[] = existing.events ?? [];
      const hasEvent = existingEvents.includes(eventSlug);
      await db.from('customers').update({
        name,
        last_purchase_at: now,
        ...(hasEvent ? {} : {
          total_events: (existing.total_events as number) + 1,
          events:       [...existingEvents, eventSlug],
        }),
      }).eq('id', existing.id);
    } else {
      await db.from('customers').insert({
        email,
        name,
        first_purchase_at: now,
        last_purchase_at:  now,
        total_events:      1,
        events:            [eventSlug],
      });
    }
  } catch (err) {
    console.error('[upsertCustomer] error:', err);
  }
}

// ── Main email sender (exported so /confirm can reuse it) ─────────────────────
//
// Operation order matters:
//   1. Upsert ticket to DB   ← must happen first so the record is safe even if
//   2. Upsert CRM customer      PDF generation or email sending fails later
//   3. Generate PDF
//   4. Send buyer email (with PDF attachment)
//   5. Send admin notification
//
// Steps 3-5 are wrapped in a try/catch so that a Resend or pdf-lib error
// cannot prevent the caller from returning a success response — the ticket
// record is already persisted at that point.

export async function sendEventConfirmationEmails(params: {
  orderId:      string;
  event:        EventData;
  firstName:    string;
  lastName:     string;
  email:        string;
  phone:        string;
  qty:          number;
  total:        number;
  partnerCode?: string;
} & ConsentParams) {
  const {
    orderId, event, firstName, lastName, email, phone, qty, total, partnerCode,
    consentPrivacyAcceptedAt, consentPrivacyVersion, consentTermsAcceptedAt, consentTermsVersion,
    consentMarketing, consentMarketingAcceptedAt, consentPhotoVideo, consentIp,
  } = params;
  const tag = `[ticket-email order=${orderId} event=${event.slug}]`;

  console.log(`${tag} start — buyer=${email} qty=${qty} total=${total}`);

  // ── 1. Upsert one ticket row per ticket ──────────────────────────────────────
  // Each ticket gets a unique ID: `${orderId}-${n}` (e.g. VWC-...-ABC12-1, -2, …)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const ticketIds = Array.from({ length: qty }, (_, i) => `${orderId}-${i + 1}`);
  const ticketRows = ticketIds.map((tid) => ({
    order_id:       tid,
    qr_code:        tid,
    event_id:       event.slug,
    email:          email,
    name:           `${firstName} ${lastName}`,
    phone:          phone || null,
    checked_in:     false,
    payment_status: 'paid',
    partner_code:   partnerCode ?? null,
    // email_sent intentionally omitted — upsert must not overwrite an existing true
    consent_privacy_accepted_at:   consentPrivacyAcceptedAt,
    consent_privacy_version:       consentPrivacyVersion,
    consent_terms_accepted_at:     consentTermsAcceptedAt,
    consent_terms_version:         consentTermsVersion,
    consent_marketing:             consentMarketing,
    consent_marketing_accepted_at: consentMarketingAcceptedAt,
    consent_photo_video:           consentPhotoVideo,
    consent_ip:                    consentIp,
  }));

  const { error: ticketErr } = await db.from('tickets').upsert(ticketRows, { onConflict: 'order_id' });
  if (ticketErr) {
    console.error(`${tag} ticket upsert FAILED:`, JSON.stringify(ticketErr));
  } else {
    console.log(`${tag} ${qty} ticket row(s) upserted OK`);
  }

  // ── 1b. Guard: skip if emails were already sent for this order ────────────────
  // Check the first ticket of this order. If email_sent=true, a previous confirm
  // call already sent the emails — return early so refreshing the success page
  // never triggers a second send.
  const { data: sentCheck } = await db
    .from('tickets')
    .select('email_sent')
    .eq('order_id', `${orderId}-1`)
    .maybeSingle();

  if (sentCheck?.email_sent === true) {
    console.log(`${tag} emails already sent — skipping duplicate send`);
    return;
  }

  // ── 2. Upsert CRM customer ────────────────────────────────────────────────────
  await upsertCustomer({ email, name: `${firstName} ${lastName}`, eventSlug: event.slug });

  // ── 3-5. Generate PDFs + send emails ─────────────────────────────────────────
  // Non-fatal block: if PDF generation or Resend fails, the ticket records are
  // already in the DB. Log the error clearly and return — the caller (free
  // checkout) must still redirect to the success page.
  try {
    // 3. Generate one PDF per ticket
    console.log(`${tag} generating ${qty} PDF(s) — event.description="${event.description}" event.type="${event.type}"`);
    const attachments = await Promise.all(
      ticketIds.map(async (tid, i) => {
        console.log(`${tag} generating PDF ${i + 1}/${qty} for ticket ${tid}`);
        const pdfBytes = await generateTicketPdf({
          event, firstName, lastName, email, total,
          ticketId:     tid,
          ticketNum:    i + 1,
          totalTickets: qty,
        });
        console.log(`${tag} PDF ${i + 1} generated — ${pdfBytes.length} bytes`);
        const filename = qty > 1
          ? `vivo-ticket-${event.slug}-${i + 1}.pdf`
          : `vivo-ticket-${event.slug}.pdf`;
        return { filename, content: Buffer.from(pdfBytes).toString('base64') };
      }),
    );
    console.log(`${tag} ${qty} PDF(s) generated`);

    // 4. Buyer email with all PDF attachments
    console.log(`${tag} sending buyer email to ${email}…`);
    const buyerResult = await resend.emails.send({
      from:     'Vivo Wine Club <noreply@vivowineclub.com>',
      replyTo: 'info@vivowineclub.com',
      to:       email,
      subject:  `Your ticket${qty > 1 ? 's' : ''} for ${event.title} — Vivo Wine Club`,
      html:    buyerEmailHtml({ firstName, event, qty, total, orderId }),
      attachments,
    });
    if (buyerResult.error) {
      console.error(`${tag} buyer email FAILED:`, JSON.stringify(buyerResult.error));
    } else {
      console.log(`${tag} buyer email sent — id=${buyerResult.data?.id}`);
    }

    // 5. Admin notification (best-effort, no attachment)
    console.log(`${tag} sending admin notification…`);
    const adminResult = await resend.emails.send({
      from:    'Vivo Wine Club <noreply@vivowineclub.com>',
      to:      'info@vivowineclub.com',
      subject: `New ticket — ${event.title} (${qty} ticket${qty > 1 ? 's' : ''})`,

      html:    adminEmailHtml({ firstName, lastName, email, phone, event, qty, total, orderId }),
    });
    if (adminResult.error) {
      console.error(`${tag} admin email FAILED:`, JSON.stringify(adminResult.error));
    } else {
      console.log(`${tag} admin email sent — id=${adminResult.data?.id}`);
    }

    // Mark all tickets in this order so a second confirm call is a no-op
    await db
      .from('tickets')
      .update({ email_sent: true })
      .like('order_id', `${orderId}-%`);
    console.log(`${tag} email_sent=true set on all order tickets`);

  } catch (emailErr) {
    // Catch any unexpected error (pdf-lib, network, Resend SDK) so the caller
    // is NOT blocked from completing the checkout redirect.
    console.error(`${tag} PDF/email error (ticket is in DB — user can still be checked in):`, emailErr);
  }

  console.log(`${tag} done`);
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
  const body: Body = await request.json();
  const { slug, qty, firstName, lastName, email, phone, refCode, partnerCode, upsellItems: rawUpsellItems } = body;
  const consentPrivacyTerms = body.consentPrivacyTerms === true;
  const consentMarketing    = body.consentMarketing === true;
  const consentPhotoVideo   = body.consentPhotoVideo === true;

  if (!slug || !qty || !firstName || !lastName || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  // Privacy Policy + Terms of Service consent is REQUIRED — reject if not explicitly true
  if (!consentPrivacyTerms) {
    return NextResponse.json({ error: 'Consent to the Privacy Policy and Terms of Service is required.' }, { status: 400 });
  }

  const consentNow = new Date().toISOString();
  const consentIp  = getClientIp(request);

  const event = await resolveEvent(slug);
  if (!event)                  return NextResponse.json({ error: 'Event not found' },       { status: 404 });
  if (event.status !== 'open') return NextResponse.json({ error: 'Event not available' },   { status: 400 });
  if (qty < 1 || qty > 10)     return NextResponse.json({ error: 'Invalid ticket count' },  { status: 400 });

  const total       = event.price * qty;
  const upsellItems = rawUpsellItems ?? [];
  const upsellTotal = upsellItems.reduce((sum, item) => sum + (item.price ?? 0), 0);
  const grandTotal  = total + upsellTotal;
  const orderId     = `VWC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Free event (and no upsell) — skip Stripe, save ticket + send PDF confirmation immediately.
  // sendEventConfirmationEmails upserts the ticket first, then sends the email.
  // Even if the email step fails internally, the ticket is in the DB and the
  // user is redirected to the success page. The error is logged server-side.
  if (grandTotal === 0) {
    await sendEventConfirmationEmails({
      orderId, event, firstName, lastName, email, phone, qty, total, partnerCode,
      consentPrivacyAcceptedAt:   consentNow,
      consentPrivacyVersion:      PRIVACY_POLICY_VERSION,
      consentTermsAcceptedAt:     consentNow,
      consentTermsVersion:        TERMS_OF_SERVICE_VERSION,
      consentMarketing,
      consentMarketingAcceptedAt: consentMarketing ? consentNow : null,
      consentPhotoVideo,
      consentIp,
    });

    // Referral attribution for free events (non-blocking)
    if (refCode) {
      fetch(`${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://vivowineclub.com'}/api/referral/use`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ref_code:      refCode,
          used_by_email: email.toLowerCase(),
          event_slug:    slug,
        }),
      }).catch(() => {/* non-fatal */});
    }

    return NextResponse.json({ url: `/checkout/success?order_id=${encodeURIComponent(orderId)}&email=${encodeURIComponent(email)}&slug=${encodeURIComponent(slug)}` });
  }

  // Stripe session; confirmation emails sent in /api/checkout/confirm
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const lineItems: any[] = [];

  if (event.price > 0) {
    lineItems.push({
      quantity: qty,
      price_data: {
        currency:     'eur',
        unit_amount:  Math.round(event.price * 100),
        product_data: {
          name:        event.title,
          description: `${event.month} ${event.day}, ${event.year} · ${event.locationFull}`,
        },
      },
    });
  }

  for (const item of upsellItems) {
    if (item.price > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency:     'eur',
          unit_amount:  Math.round(item.price * 100),
          product_data: { name: item.title, description: 'Aggiunto come upsell' },
        },
      });
    }
  }

  const session = await stripe.checkout.sessions.create({
    mode:           'payment',
    customer_email: email,
    line_items:     lineItems,
    success_url: `https://vivowineclub.com/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `https://vivowineclub.com/checkout/${slug}`,
    billing_address_collection: 'required',
    metadata: {
      type:             'event',
      order_id:         orderId,
      event_slug:       slug,
      buyer_first_name: firstName,
      buyer_last_name:  lastName,
      buyer_email:      email,
      buyer_phone:      phone,
      ticket_count:     String(qty),
      ref_code:         refCode     ?? '',
      partner_code:     partnerCode ?? '',
      upsell_items:     upsellItems.length > 0 ? JSON.stringify(upsellItems).slice(0, 500) : '',
      consent_privacy_at:      consentNow,
      consent_privacy_version: PRIVACY_POLICY_VERSION,
      consent_terms_at:        consentNow,
      consent_terms_version:   TERMS_OF_SERVICE_VERSION,
      consent_marketing:       String(consentMarketing),
      consent_photo_video:     String(consentPhotoVideo),
      consent_ip:              consentIp ?? '',
    },
    locale: 'auto',
  });

  return NextResponse.json({ url: session.url });
  } catch (err) {
    console.error('[/api/checkout/event] Unhandled error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
