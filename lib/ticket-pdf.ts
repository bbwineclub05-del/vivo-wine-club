import QRCode from 'qrcode';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync } from 'fs';
import { join } from 'path';
import type { EventData } from '@/lib/events';

/** Word-wrap `text` into lines of at most `maxChars` characters. */
export function wrapText(text: string, maxChars: number): string[] {
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

export async function generateTicketPdf(params: {
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
