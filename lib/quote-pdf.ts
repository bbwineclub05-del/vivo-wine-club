import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * Una voce del preventivo.
 *
 * `description` è testo libero: i servizi del club cambiano a ogni
 * evento, e un elenco fisso di sei caselle da spuntare costringeva a
 * far rientrare "allestimento luci e scenografia per la terrazza" in
 * "Altro". L'importo è facoltativo: una voce senza prezzo è inclusa.
 */
export interface QuoteItem {
  description: string;
  /** In centesimi. `null` = voce inclusa, senza prezzo a sé. */
  amountCents: number | null;
}

export interface QuoteData {
  quoteNumber: string;
  issueDate: string;
  clientName: string;
  clientEmail: string;
  eventType: string;
  eventDate: string;
  venue: string;
  attendees: number | string;
  items: QuoteItem[];
  paymentConditions: string;
  description: string;
  notes: string;
}

/** "2026-11-14" -> "14/11/2026". Qualunque altra cosa resta com'e'. */
function fmtDateIT(iso: string): string {
  if (!iso) return '\u2014';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Formattazione italiana scritta a mano: vedi la nota in lib/ledger.ts. */
function eur(cents: number): string {
  const units = Math.floor(Math.abs(cents) / 100);
  const dec = String(Math.abs(cents) % 100).padStart(2, '0');
  const grouped = String(units).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${cents < 0 ? '-' : ''}\u20ac ${grouped},${dec}`;
}

// ── Colours ──────────────────────────────────────────────────────────
const BORDEAUX   = rgb(0.357, 0.102, 0.078); // #5b1a14
const DARK       = rgb(0.12,  0.10,  0.10);  // near-black
const GRAY       = rgb(0.42,  0.40,  0.40);  // medium gray
const GRAY_LIGHT = rgb(0.82,  0.82,  0.82);  // separator lines
const WHITE      = rgb(1, 1, 1);

const ML = 55; // left margin
const MR = 55; // right margin
const LINE_H = 14; // default line height

function wrapText(text: string, font: { widthOfTextAtSize: (t: string, s: number) => number }, size: number, maxWidth: number): string[] {
  const paragraphs = text.split('\n');
  const result: string[] = [];
  for (const para of paragraphs) {
    if (!para.trim()) { result.push(''); continue; }
    const words = para.split(' ');
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
        line = candidate;
      } else {
        if (line) result.push(line);
        // Hard-break very long words
        if (font.widthOfTextAtSize(word, size) > maxWidth) {
          let chunk = '';
          for (const ch of word) {
            if (font.widthOfTextAtSize(chunk + ch, size) <= maxWidth) chunk += ch;
            else { result.push(chunk); chunk = ch; }
          }
          line = chunk;
        } else {
          line = word;
        }
      }
    }
    if (line) result.push(line);
  }
  return result;
}

export async function generateQuotePdf(data: QuoteData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([595, 842]); // A4
  const W      = page.getWidth();
  const H      = page.getHeight();
  const CW     = W - ML - MR; // content width = 485

  // ── Fonts ──
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const oblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  // White background
  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });

  // ── HEADER ───────────────────────────────────────────────────────────
  const HEADER_TOP = H - 30;

  // Logo — single static path so the file tracer picks up exactly this file.
  // (A dynamic loop would cause the tracer to include the entire public/ dir.)
  try {
    const logoBytes = readFileSync(join(process.cwd(), 'public', 'logobianco.png'));
    const logoImg   = await pdfDoc.embedPng(logoBytes);
    const logoDims  = logoImg.scaleToFit(120, 38);
    // Draw on white: tint with a bordeaux-ish overlay using opacity isn't available
    // in pdf-lib, so we draw it as-is — logobianco on white reads well at small size.
    page.drawImage(logoImg, {
      x: ML,
      y: HEADER_TOP - logoDims.height,
      width:  logoDims.width,
      height: logoDims.height,
    });
  } catch {
    page.drawText('VIVO WINE CLUB', { x: ML, y: HEADER_TOP - 18, size: 14, font: bold, color: BORDEAUX });
  }

  // Company name + contact — right-aligned
  const companyName = 'VIVO WINE CLUB';
  const contactLine = 'info@vivowineclub.com  ·  vivowineclub.com';
  const companyW    = bold.widthOfTextAtSize(companyName, 11);
  const contactW    = regular.widthOfTextAtSize(contactLine, 8);
  page.drawText(companyName, {
    x: W - MR - companyW, y: HEADER_TOP - 10,
    size: 11, font: bold, color: BORDEAUX,
  });
  page.drawText(contactLine, {
    x: W - MR - contactW, y: HEADER_TOP - 24,
    size: 8, font: regular, color: GRAY,
  });

  // Bordeaux separator line under header
  const HEADER_LINE_Y = HEADER_TOP - 44;
  page.drawLine({
    start: { x: ML, y: HEADER_LINE_Y },
    end:   { x: W - MR, y: HEADER_LINE_Y },
    thickness: 1.5,
    color: BORDEAUX,
  });

  // ── DOCUMENT TITLE (centred) ─────────────────────────────────────────
  const TITLE      = 'PROPOSTA EVENTO';
  const TITLE_SIZE = 20;
  const titleW     = bold.widthOfTextAtSize(TITLE, TITLE_SIZE);
  const TITLE_Y    = HEADER_LINE_Y - 28;
  page.drawText(TITLE, {
    x: (W - titleW) / 2, y: TITLE_Y,
    size: TITLE_SIZE, font: bold, color: BORDEAUX,
  });

  const metaLine = `N°  ${data.quoteNumber}   ·   Emesso il  ${data.issueDate}`;
  const metaW    = regular.widthOfTextAtSize(metaLine, 9);
  page.drawText(metaLine, {
    x: (W - metaW) / 2, y: TITLE_Y - 18,
    size: 9, font: regular, color: GRAY,
  });

  // ── Helper: draw a light-gray section divider ─────────────────────────
  function divider(y: number) {
    page.drawLine({
      start: { x: ML, y },
      end:   { x: W - MR, y },
      thickness: 0.5,
      color: GRAY_LIGHT,
    });
  }

  // Running Y cursor — moves downward
  let y = TITLE_Y - 42;
  divider(y);

  // ── DATI CLIENTE ─────────────────────────────────────────────────────
  y -= 16;
  page.drawText('DATI CLIENTE', { x: ML, y, size: 7.5, font: bold, color: BORDEAUX });
  y -= 14;
  page.drawText(data.clientName || '—', { x: ML, y, size: 12, font: bold, color: DARK });
  y -= 14;
  page.drawText(data.clientEmail || '—', { x: ML, y, size: 9, font: regular, color: GRAY });

  // ── DETTAGLI EVENTO (4-column row) ───────────────────────────────────
  y -= 22;
  divider(y);
  y -= 16;
  page.drawText('DETTAGLI EVENTO', { x: ML, y, size: 7.5, font: bold, color: BORDEAUX });
  y -= 14;

  const eventCols = [
    { label: 'TIPO EVENTO',   value: data.eventType                },
    { label: 'DATA',          value: fmtDateIT(data.eventDate)     },
    { label: 'LUOGO',         value: data.venue                    },
    { label: 'PARTECIPANTI',  value: String(data.attendees || '—') },
  ];
  const colW = CW / 4;
  // Ogni colonna va a capo dentro la propria larghezza. Il tipo evento
  // ora è testo libero — "Serata di degustazione in terrazza" è una
  // risposta legittima — e prima una frase così si stampava sopra la
  // colonna accanto.
  let maxRows = 1;
  eventCols.forEach(({ label, value }, i) => {
    const cx = ML + i * colW;
    page.drawText(label, { x: cx, y, size: 7, font: bold, color: BORDEAUX });
    const lines = wrapText(value || '—', regular, 9.5, colW - 10).slice(0, 3);
    maxRows = Math.max(maxRows, lines.length);
    lines.forEach((line, r) => {
      page.drawText(line, { x: cx, y: y - 13 - r * 11, size: 9.5, font: regular, color: DARK });
    });
  });
  y -= 19 + maxRows * 11;

  // ── DESCRIZIONE EVENTO ───────────────────────────────────────────────
  y -= 8;
  divider(y);
  y -= 16;
  page.drawText('DESCRIZIONE EVENTO', { x: ML, y, size: 7.5, font: bold, color: BORDEAUX });
  y -= 14;

  const descMaxW = CW;
  const descLines = wrapText(data.description || '—', oblique, 9.5, descMaxW);
  for (const line of descLines) {
    if (y < 170) break;
    if (line === '') { y -= LINE_H * 0.6; continue; }
    page.drawText(line, { x: ML, y, size: 9.5, font: oblique, color: GRAY });
    y -= LINE_H;
  }

  // ── LA PROPOSTA ──────────────────────────────────────────────────────
  // Una riga per voce, con il suo importo a destra. Il totale è la somma
  // di quello che si legge sopra: non è un campo a parte che qualcuno
  // può dimenticare di aggiornare.
  const items = (data.items ?? []).filter((it) => it.description.trim());

  if (items.length > 0) {
    y -= 10;
    divider(y);
    y -= 16;
    page.drawText('LA PROPOSTA', { x: ML, y, size: 7.5, font: bold, color: BORDEAUX });
    y -= 16;

    for (const item of items) {
      if (y < 120) break;
      const priced = item.amountCents !== null && item.amountCents !== undefined;
      const right = priced ? eur(item.amountCents as number) : 'Incluso';
      const rightW = (priced ? bold : regular).widthOfTextAtSize(right, 9.5);
      // Il testo va a capo lasciando libera la colonna dell'importo.
      const lines = wrapText(item.description, regular, 9.5, CW - rightW - 18);

      page.drawText(right, {
        x: ML + CW - rightW,
        y,
        size: 9.5,
        font: priced ? bold : regular,
        color: priced ? DARK : GRAY,
      });

      for (const line of lines) {
        if (y < 120) break;
        page.drawText(line, { x: ML, y, size: 9.5, font: regular, color: DARK });
        y -= LINE_H;
      }
      y -= 4;
    }
  }

  // ── TOTALE ───────────────────────────────────────────────────────────
  const totalCents = items.reduce((sum, it) => sum + (it.amountCents ?? 0), 0);

  y -= 6;
  divider(y);
  y -= 18;
  page.drawText('TOTALE', { x: ML, y, size: 8, font: bold, color: GRAY });
  const totalText = eur(totalCents);
  const totalW = bold.widthOfTextAtSize(totalText, 22);
  page.drawText(totalText, {
    x: ML + CW - totalW,
    y: y - 6,
    size: 22,
    font: bold,
    color: BORDEAUX,
  });
  // Il totale è composto a 22pt disegnato sotto la linea di base: senza
  // questo respiro, la sezione successiva gli finisce addosso.
  y -= 48;

  if (data.paymentConditions) {
    page.drawText('CONDIZIONI DI PAGAMENTO', { x: ML, y, size: 7.5, font: bold, color: BORDEAUX });
    y -= 13;
    const payLines = wrapText(data.paymentConditions, regular, 9, CW);
    for (const line of payLines) {
      if (y < 160) break;
      if (line === '') { y -= LINE_H * 0.5; continue; }
      page.drawText(line, { x: ML, y, size: 9, font: regular, color: DARK });
      y -= LINE_H;
    }
  }

  // ── NOTE ─────────────────────────────────────────────────────────────
  if (data.notes) {
    y -= 10;
    divider(y);
    y -= 16;
    page.drawText('NOTE', { x: ML, y, size: 7.5, font: bold, color: BORDEAUX });
    y -= 13;
    const noteLines = wrapText(data.notes, regular, 9, CW);
    for (const line of noteLines) {
      if (y < 155) break;
      if (line === '') { y -= LINE_H * 0.5; continue; }
      page.drawText(line, { x: ML, y, size: 9, font: regular, color: DARK });
      y -= LINE_H;
    }
  }

  // Niente blocco firme: quattro righe da firmare in calce a un
  // preventivo via email non le firma nessuno, e l'elenco di nomi
  // cablato qui dentro era già sbagliato — conteneva persone che non
  // fanno più parte del team.

  // ── FOOTER ───────────────────────────────────────────────────────────
  const FOOTER_H = 34;
  page.drawRectangle({ x: 0, y: 0, width: W, height: FOOTER_H, color: BORDEAUX });
  const footerText = 'vivowineclub.com   ·   info@vivowineclub.com   ·   Vivo Wine Club';
  const footerW    = regular.widthOfTextAtSize(footerText, 8);
  page.drawText(footerText, {
    x: (W - footerW) / 2,
    y: (FOOTER_H - 8) / 2,
    size: 8, font: regular, color: rgb(0.93, 0.80, 0.80),
  });

  return pdfDoc.save();
}
