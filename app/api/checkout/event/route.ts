import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync } from 'fs';
import { join } from 'path';
import { Resend } from 'resend';
import { dbEventToEventData, type EventData, type DbEvent } from '@/lib/events';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

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
  slug: string;
  qty: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
}

// ── PDF generation ────────────────────────────────────────────────────────────

async function generateTicketPdf(params: {
  event: EventData;
  firstName: string;
  lastName: string;
  email: string;
  qty: number;
  total: number;
  orderId: string;
}): Promise<Uint8Array> {
  const { event, firstName, lastName, email, qty, total, orderId } = params;

  const eventDate = `${event.month} ${event.day}, ${event.year}`;

  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([595, 842]); // A4
  const W      = page.getWidth();
  const H      = page.getHeight();

  const BORDEAUX = rgb(0.44, 0.10, 0.18);
  const DARK     = rgb(0.10, 0.02, 0.02);
  const GRAY     = rgb(0.48, 0.29, 0.29);
  const LIGHT    = rgb(0.91, 0.84, 0.84);
  const WHITE    = rgb(1, 1, 1);

  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── Header bar ──
  page.drawRectangle({ x: 0, y: H - 90, width: W, height: 90, color: BORDEAUX });

  // Logo (logo-extracted.png is dark/grayscale — we invert by drawing white rect first, but
  // instead just render the brand name as text since the PNG is dark on transparent)
  try {
    const logoBytes = readFileSync(join(process.cwd(), 'public', 'logobianco.png'));
    const logoImg   = await pdfDoc.embedPng(logoBytes);
    const logoDims  = logoImg.scaleToFit(160, 50);
    page.drawImage(logoImg, {
      x: 40,
      y: H - 90 + (90 - logoDims.height) / 2,
      width:  logoDims.width,
      height: logoDims.height,
    });
  } catch {
    page.drawText('VIVO WINE CLUB', {
      x: 40, y: H - 56,
      size: 18, font: bold, color: WHITE,
    });
  }

  // Header right label
  page.drawText('EVENT TICKET', {
    x: W - 120, y: H - 53,
    size: 9, font: bold, color: WHITE,
    opacity: 0.7,
  });

  // ── Event type label ──
  let y = H - 130;
  page.drawText(event.type, {
    x: 40, y,
    size: 8, font: bold, color: BORDEAUX,
  });

  // ── Event title ──
  y -= 28;
  // Simple line-break for long titles (split at " · " or at ~45 chars)
  const titleLines = event.title.length > 44
    ? [event.title.slice(0, event.title.lastIndexOf(' ', 44)), event.title.slice(event.title.lastIndexOf(' ', 44) + 1)]
    : [event.title];
  for (const line of titleLines) {
    page.drawText(line, { x: 40, y, size: 22, font: bold, color: DARK });
    y -= 28;
  }

  // ── Divider ──
  y -= 8;
  page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.5, color: LIGHT });
  y -= 20;

  // ── Detail rows ──
  const rows: [string, string][] = [
    ['Date',     eventDate],
    ['Location', event.locationFull],
    ['Attendee', `${firstName} ${lastName}`],
    ['Email',    email],
    ['Tickets',  String(qty)],
    ['Total',    `€${total.toFixed(2)}`],
  ];

  for (const [label, value] of rows) {
    page.drawText(label.toUpperCase(), { x: 40, y, size: 7.5, font: bold, color: GRAY });
    // Wrap value if needed
    const maxChars = 52;
    const valLines = value.length > maxChars
      ? [value.slice(0, value.lastIndexOf(' ', maxChars)), value.slice(value.lastIndexOf(' ', maxChars) + 1)]
      : [value];
    page.drawText(valLines[0], { x: 160, y, size: 10, font: regular, color: DARK });
    if (valLines[1]) {
      page.drawText(valLines[1], { x: 160, y: y - 14, size: 10, font: regular, color: DARK });
      y -= 14;
    }
    y -= 26;
  }

  // ── Divider ──
  y -= 4;
  page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.5, color: LIGHT });
  y -= 30;

  // ── QR code — all event types ──
  // Encodes the raw orderId. The scanner accepts both this format
  // and the legacy URL format (https://vivowineclub.com/checkin?token=xxx).
  const qrBuffer = await QRCode.toBuffer(orderId, { width: 180, margin: 1 });
  const qrImage  = await pdfDoc.embedPng(qrBuffer);

  const qrSize = 160;
  const qrX    = (W - qrSize) / 2;
  page.drawText('SHOW THIS QR CODE AT THE ENTRANCE', {
    x: W / 2 - 100, y,
    size: 8, font: bold, color: BORDEAUX,
  });
  y -= 16;
  page.drawImage(qrImage, { x: qrX, y: y - qrSize, width: qrSize, height: qrSize });
  page.drawText('One scan per ticket · valid for this event only', {
    x: W / 2 - 82, y: y - qrSize - 16,
    size: 8, font: regular, color: GRAY,
  });
  y -= qrSize + 36;

  // ── Footer ──
  const footerY = 40;
  page.drawLine({
    start: { x: 40, y: footerY + 20 },
    end:   { x: W - 40, y: footerY + 20 },
    thickness: 0.5, color: LIGHT,
  });
  page.drawText(`Order ID: ${orderId}`, {
    x: 40, y: footerY + 6,
    size: 7.5, font: regular, color: GRAY,
  });
  page.drawText('vivowineclub.com · info@vivowineclub.com', {
    x: W - 210, y: footerY + 6,
    size: 7.5, font: regular, color: GRAY,
  });

  return pdfDoc.save();
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
  const totalLabel = total === 0 ? 'Gratuito' : `&#8364;${total.toFixed(2)}`;
  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <div style="text-align:center;background-color:#6b1a1a;padding:24px;margin-bottom:32px;border-radius:4px;">
    <img src="https://vivowineclub.com/logobianco.png" style="height:56px;" alt="Vivo Wine Club" />
  </div>

  <h2 style="text-align:center;font-weight:300;font-size:26px;margin-bottom:6px;">
    You&#39;re in, ${firstName}!
  </h2>
  <p style="text-align:center;color:#7a4a4a;font-style:italic;margin-bottom:32px;">
    Your ticket for <strong>${event.title}</strong> is confirmed.
    Find your ticket PDF attached to this email.
  </p>

  <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:14px;">
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;color:#7a4a4a;">Event</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;text-align:right;font-weight:600;">${event.title}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;color:#7a4a4a;">Date</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;text-align:right;">${eventDate}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;color:#7a4a4a;">Location</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;text-align:right;">${event.locationFull}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;color:#7a4a4a;">Tickets</td>
      <td style="padding:10px 0;border-bottom:1px solid #f0e4e4;text-align:right;">${qty}</td>
    </tr>
    <tr>
      <td style="padding:10px 0;color:#7a4a4a;">Total</td>
      <td style="padding:10px 0;text-align:right;font-weight:700;color:#731515;font-size:16px;">${totalLabel}</td>
    </tr>
  </table>

  <p style="margin-top:40px;color:#aaa;font-size:11px;text-align:center;line-height:1.6;">
    Order ID: ${orderId}<br/>
    Vivo Wine Club &#183; info@vivowineclub.com &#183; vivowineclub.com
  </p>
</div>`;
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
  return `
<div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#1a0505;">
  <h2 style="font-weight:400;margin-bottom:24px;">New ticket order — ${event.title}</h2>
  <table style="width:100%;border-collapse:collapse;font-size:14px;">
    <tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#666;">Order ID</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;font-family:monospace;">${orderId}</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#666;">Event</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;font-weight:600;">${event.title}</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#666;">Date</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;">${eventDate}</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#666;">Location</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;">${event.locationFull}</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#666;">Buyer</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;">${firstName} ${lastName}</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#666;">Email</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;">${email}</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#666;">Phone</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;">${phone}</td></tr>
    <tr><td style="padding:9px 0;border-bottom:1px solid #eee;color:#666;">Tickets</td><td style="padding:9px 0;border-bottom:1px solid #eee;text-align:right;">${qty}</td></tr>
    <tr><td style="padding:9px 0;color:#666;">Total</td><td style="padding:9px 0;text-align:right;font-weight:700;color:#731515;">€${total.toFixed(2)}</td></tr>
  </table>
</div>`;
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
  orderId:   string;
  event:     EventData;
  firstName: string;
  lastName:  string;
  email:     string;
  phone:     string;
  qty:       number;
  total:     number;
}) {
  const { orderId, event, firstName, lastName, email, phone, qty, total } = params;
  const tag = `[ticket-email order=${orderId} event=${event.slug}]`;

  console.log(`${tag} start — buyer=${email} qty=${qty} total=${total}`);

  // ── 1. Upsert ticket record ───────────────────────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const { error: ticketErr } = await db.from('tickets').upsert({
    order_id:   orderId,
    qr_code:    orderId,
    event_id:   event.slug,
    email:      email,
    name:       `${firstName} ${lastName}`,
    checked_in: false,
  }, { onConflict: 'order_id' });

  if (ticketErr) {
    console.error(`${tag} ticket upsert FAILED:`, JSON.stringify(ticketErr));
  } else {
    console.log(`${tag} ticket upserted OK`);
  }

  // ── 2. Upsert CRM customer ────────────────────────────────────────────────────
  await upsertCustomer({ email, name: `${firstName} ${lastName}`, eventSlug: event.slug });

  // ── 3-5. Generate PDF + send emails ──────────────────────────────────────────
  // Non-fatal block: if PDF generation or Resend fails, the ticket record is
  // already in the DB. Log the error clearly and return — the caller (free
  // checkout) must still redirect to the success page.
  try {
    // 3. Generate PDF
    console.log(`${tag} generating PDF…`);
    const pdfBytes  = await generateTicketPdf({ event, firstName, lastName, email, qty, total, orderId });
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    const pdfName   = `vivo-ticket-${event.slug}.pdf`;
    console.log(`${tag} PDF generated — ${pdfBytes.length} bytes`);

    // 4. Buyer email with PDF attachment
    console.log(`${tag} sending buyer email to ${email}…`);
    const buyerResult = await resend.emails.send({
      from:    'Vivo Wine Club <noreply@vivowineclub.com>',
      to:      email,
      subject: `Your ticket for ${event.title} — Vivo Wine Club`,
      html:    buyerEmailHtml({ firstName, event, qty, total, orderId }),
      attachments: [{ filename: pdfName, content: pdfBase64 }],
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
  const { slug, qty, firstName, lastName, email, phone } = body;

  if (!slug || !qty || !firstName || !lastName || !email || !phone) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const event = await resolveEvent(slug);
  if (!event)                  return NextResponse.json({ error: 'Event not found' },       { status: 404 });
  if (event.status !== 'open') return NextResponse.json({ error: 'Event not available' },   { status: 400 });
  if (qty < 1 || qty > 10)     return NextResponse.json({ error: 'Invalid ticket count' },  { status: 400 });

  const total   = event.price * qty;
  const orderId = `VWC-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

  // Free event — skip Stripe, save ticket + send PDF confirmation immediately.
  // sendEventConfirmationEmails upserts the ticket first, then sends the email.
  // Even if the email step fails internally, the ticket is in the DB and the
  // user is redirected to the success page. The error is logged server-side.
  if (total === 0) {
    await sendEventConfirmationEmails({ orderId, event, firstName, lastName, email, phone, qty, total });
    return NextResponse.json({ url: `/checkout/success?order_id=${encodeURIComponent(orderId)}` });
  }

  // Paid event — save ticket record immediately so it's in the DB regardless of
  // whether the buyer completes payment and the success page is loaded.
  await (getSupabaseAdmin() as any).from('tickets').upsert({
    order_id:   orderId,
    qr_code:    orderId,
    event_id:   event.slug,
    email:      email,
    name:       `${firstName} ${lastName}`,
    checked_in: false,
  }, { onConflict: 'order_id' });

  // Stripe session; confirmation emails sent in /api/checkout/confirm
  const session = await stripe.checkout.sessions.create({
    mode:           'payment',
    customer_email: email,
    line_items: [{
      quantity: qty,
      price_data: {
        currency:     'eur',
        unit_amount:  Math.round(event.price * 100),
        product_data: {
          name:        event.title,
          description: `${event.month} ${event.day}, ${event.year} · ${event.locationFull}`,
        },
      },
    }],
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
