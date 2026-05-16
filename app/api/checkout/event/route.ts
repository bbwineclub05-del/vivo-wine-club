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

/** Word-wrap `text` into lines of at most `maxChars` characters. */
function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (candidate.length <= maxChars) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      // If a single word is longer than maxChars, hard-break it
      current = word.length > maxChars ? word.slice(0, maxChars) : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

async function generateTicketPdf(params: {
  event: EventData;
  firstName: string;
  lastName: string;
  email: string;
  total: number;
  ticketId: string;
  ticketNum: number;
  totalTickets: number;
}): Promise<Uint8Array> {
  const { event, firstName, lastName, email, total, ticketId, ticketNum, totalTickets } = params;

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
    page.drawText('VIVO WINE CLUB', { x: 40, y: H - 56, size: 18, font: bold, color: WHITE });
  }

  const headerLabel  = totalTickets > 1 ? `TICKET ${ticketNum} OF ${totalTickets}` : 'EVENT TICKET';
  const headerLabelW = bold.widthOfTextAtSize(headerLabel, 9);
  page.drawText(headerLabel, {
    x: W - 40 - headerLabelW, y: H - 53,
    size: 9, font: bold, color: WHITE, opacity: 0.7,
  });

  // ── Event type + title ──
  let y = H - 122;
  page.drawText(event.type.toUpperCase(), { x: 40, y, size: 7.5, font: bold, color: BORDEAUX });

  y -= 26;
  const titleWords  = wrapText(event.title, 34); // ~34 chars at size 20 fits within margins
  for (const line of titleWords) {
    page.drawText(line, { x: 40, y, size: 20, font: bold, color: DARK });
    y -= 26;
  }

  // ── Description ──
  y -= 6;
  const descLines = wrapText(event.description, 72);
  for (const line of descLines) {
    page.drawText(line, { x: 40, y, size: 9, font: regular, color: GRAY });
    y -= 14;
  }

  // ── EVENT DETAILS section ──
  y -= 14;
  page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.5, color: LIGHT });
  y -= 14;
  page.drawText('EVENT DETAILS', { x: 40, y, size: 7, font: bold, color: GRAY, opacity: 0.6 });
  y -= 14;

  const dateStr  = `${event.month} ${event.day}, ${event.year}`;
  const dateTime = event.time ? `${dateStr}  ·  ${event.time}` : dateStr;
  const priceStr = total === 0 ? 'Free' : `€${event.price.toFixed(2)} per ticket`;

  const eventRows: [string, string][] = [
    ['Date & Time', dateTime],
    ['Location',    event.locationFull],
    ['Type',        event.type],
    ['Price',       priceStr],
  ];

  for (const [label, value] of eventRows) {
    page.drawText(label.toUpperCase(), { x: 40, y, size: 7, font: bold, color: GRAY });
    const valLines = wrapText(value, 55);
    page.drawText(valLines[0], { x: 160, y, size: 9.5, font: regular, color: DARK });
    if (valLines[1]) {
      page.drawText(valLines[1], { x: 160, y: y - 13, size: 9.5, font: regular, color: DARK });
      y -= 13;
    }
    y -= 23;
  }

  // ── YOUR TICKET section ──
  y -= 4;
  page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.5, color: LIGHT });
  y -= 14;
  page.drawText('YOUR TICKET', { x: 40, y, size: 7, font: bold, color: GRAY, opacity: 0.6 });
  y -= 14;

  const ticketRows: [string, string][] = [
    ['Attendee', `${firstName} ${lastName}`],
    ['Email',    email],
    ['Ticket',   totalTickets > 1 ? `${ticketNum} of ${totalTickets}` : '1 of 1'],
  ];

  for (const [label, value] of ticketRows) {
    page.drawText(label.toUpperCase(), { x: 40, y, size: 7, font: bold, color: GRAY });
    const valLines = wrapText(value, 55);
    page.drawText(valLines[0], { x: 160, y, size: 9.5, font: regular, color: DARK });
    if (valLines[1]) {
      page.drawText(valLines[1], { x: 160, y: y - 13, size: 9.5, font: regular, color: DARK });
      y -= 13;
    }
    y -= 23;
  }

  // ── QR code ──
  y -= 10;
  page.drawLine({ start: { x: 40, y }, end: { x: W - 40, y }, thickness: 0.5, color: LIGHT });
  y -= 18;

  const qrBuffer = await QRCode.toBuffer(ticketId, { width: 180, margin: 1 });
  const qrImage  = await pdfDoc.embedPng(qrBuffer);
  const qrSize   = 150;
  const qrX      = (W - qrSize) / 2;

  const qrLabel    = 'SHOW THIS QR CODE AT THE ENTRANCE';
  const qrLabelW   = bold.widthOfTextAtSize(qrLabel, 8);
  page.drawText(qrLabel, { x: (W - qrLabelW) / 2, y, size: 8, font: bold, color: BORDEAUX });
  y -= 14;
  page.drawImage(qrImage, { x: qrX, y: y - qrSize, width: qrSize, height: qrSize });
  const qrSub    = 'One scan per ticket · valid for this event only';
  const qrSubW   = regular.widthOfTextAtSize(qrSub, 7.5);
  page.drawText(qrSub, { x: (W - qrSubW) / 2, y: y - qrSize - 12, size: 7.5, font: regular, color: GRAY });

  // ── Footer ──
  const footerY = 36;
  page.drawLine({
    start: { x: 40, y: footerY + 18 }, end: { x: W - 40, y: footerY + 18 },
    thickness: 0.5, color: LIGHT,
  });
  page.drawText(`Ticket ID: ${ticketId}`, { x: 40, y: footerY + 4, size: 7, font: regular, color: GRAY });
  const contact    = 'vivowineclub.com · info@vivowineclub.com';
  const contactW   = regular.widthOfTextAtSize(contact, 7);
  page.drawText(contact, { x: W - 40 - contactW, y: footerY + 4, size: 7, font: regular, color: GRAY });

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
    Your ticket${qty > 1 ? 's' : ''} for <strong>${event.title}</strong> ${qty > 1 ? 'are' : 'is'} confirmed.
    Find your ${qty > 1 ? `${qty} ticket PDFs` : 'ticket PDF'} attached to this email.
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

  // ── 1. Upsert one ticket row per ticket ──────────────────────────────────────
  // Each ticket gets a unique ID: `${orderId}-${n}` (e.g. VWC-...-ABC12-1, -2, …)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = getSupabaseAdmin() as any;
  const ticketIds = Array.from({ length: qty }, (_, i) => `${orderId}-${i + 1}`);
  const ticketRows = ticketIds.map((tid) => ({
    order_id:   tid,
    qr_code:    tid,
    event_id:   event.slug,
    email:      email,
    name:       `${firstName} ${lastName}`,
    checked_in: false,
  }));

  const { error: ticketErr } = await db.from('tickets').upsert(ticketRows, { onConflict: 'order_id' });
  if (ticketErr) {
    console.error(`${tag} ticket upsert FAILED:`, JSON.stringify(ticketErr));
  } else {
    console.log(`${tag} ${qty} ticket row(s) upserted OK`);
  }

  // ── 2. Upsert CRM customer ────────────────────────────────────────────────────
  await upsertCustomer({ email, name: `${firstName} ${lastName}`, eventSlug: event.slug });

  // ── 3-5. Generate PDFs + send emails ─────────────────────────────────────────
  // Non-fatal block: if PDF generation or Resend fails, the ticket records are
  // already in the DB. Log the error clearly and return — the caller (free
  // checkout) must still redirect to the success page.
  try {
    // 3. Generate one PDF per ticket
    console.log(`${tag} generating ${qty} PDF(s)…`);
    const attachments = await Promise.all(
      ticketIds.map(async (tid, i) => {
        const pdfBytes = await generateTicketPdf({
          event, firstName, lastName, email, total,
          ticketId:     tid,
          ticketNum:    i + 1,
          totalTickets: qty,
        });
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
      from:    'Vivo Wine Club <noreply@vivowineclub.com>',
      to:      email,
      subject: `Your ticket${qty > 1 ? 's' : ''} for ${event.title} — Vivo Wine Club`,
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

  // Paid event — save one ticket row per ticket immediately so records are in the
  // DB regardless of whether the buyer completes payment and the success page loads.
  const paidTicketRows = Array.from({ length: qty }, (_, i) => ({
    order_id:   `${orderId}-${i + 1}`,
    qr_code:    `${orderId}-${i + 1}`,
    event_id:   event.slug,
    email:      email,
    name:       `${firstName} ${lastName}`,
    checked_in: false,
  }));
  await (getSupabaseAdmin() as any).from('tickets').upsert(paidTicketRows, { onConflict: 'order_id' });

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
