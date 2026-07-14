/**
 * guest-list-pdf.ts
 * Browser-compatible PDF generator for event guest lists.
 * Uses pdf-lib (already in project). Logo is fetched via fetch() — no fs/path.
 */
import { PDFDocument, rgb, StandardFonts, PDFFont, PDFPage } from 'pdf-lib';

// ── Colours ───────────────────────────────────────────────────────────────────
const BLACK    = rgb(0.08, 0.02, 0.02);
const GRAY     = rgb(0.42, 0.35, 0.35);
const GRAY_LT  = rgb(0.65, 0.60, 0.60);
const BORDEAUX = rgb(0.45, 0.08, 0.08);
const BDX_PALE = rgb(0.55, 0.10, 0.10);
const EMERALD  = rgb(0.06, 0.50, 0.30);
const ROW_ALT  = rgb(0.97, 0.95, 0.95);
const PALE_HDR = rgb(0.93, 0.86, 0.86);
const WHITE    = rgb(1, 1, 1);

// ── Layout constants ──────────────────────────────────────────────────────────
const PW  = 595;   // A4 width
const PH  = 842;   // A4 height
const ML  = 40;    // left margin
const MR  = 40;    // right margin
const CW  = PW - ML - MR;  // 515
const MB  = 36;    // bottom margin
const ROW = 17;    // data row height
const HDR = 20;    // table header row height

export interface GuestPdfRow {
  first_name:                 string;
  last_name:                  string;
  email:                      string;
  phone:                      string | null;
  checked_in:                 boolean;
  created_at:                 string;
  referral_reward_unlocked?:  boolean;
  route?:                     string | null;   // wine ride only
}

export interface GuestListPdfInput {
  eventTitle:  string;
  eventSlug:   string;
  guests:      GuestPdfRow[];  // already sorted alphabetically
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function nowLabel(): string {
  const now = new Date();
  return now.toLocaleString('it-IT', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

/** Truncate text to fit maxWidth at given font+size */
function truncate(text: string, font: PDFFont, size: number, maxWidth: number): string {
  if (font.widthOfTextAtSize(text, size) <= maxWidth) return text;
  let t = text;
  while (t.length > 0 && font.widthOfTextAtSize(t + '…', size) > maxWidth) {
    t = t.slice(0, -1);
  }
  return t + '…';
}

/** Draw a filled rectangle + centered-Y text label (for table header cells) */
function drawHeaderCell(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  label: string,
  font: PDFFont, size: number,
) {
  page.drawRectangle({ x, y, width: w, height: h, color: PALE_HDR });
  const textW = font.widthOfTextAtSize(label, size);
  const tx = x + Math.max(4, (w - textW) / 2);
  const ty = y + (h - size) / 2 + 1;
  page.drawText(label, { x: tx, y: ty, size, font, color: BORDEAUX });
}

/** Draw a single data row; returns nothing */
function drawRow(
  page: PDFPage,
  x: number, y: number, rowH: number,
  cols: { x: number; w: number; text: string; align?: 'left' | 'center'; color?: ReturnType<typeof rgb> }[],
  font: PDFFont, size: number,
  bgColor: ReturnType<typeof rgb>,
) {
  page.drawRectangle({ x, y, width: CW, height: rowH, color: bgColor });
  for (const col of cols) {
    const text = truncate(col.text, font, size, col.w - 6);
    const textW = font.widthOfTextAtSize(text, size);
    const tx = col.align === 'center'
      ? col.x + Math.max(2, (col.w - textW) / 2)
      : col.x + 4;
    const ty = y + (rowH - size) / 2 + 1;
    page.drawText(text, { x: tx, y: ty, size, font, color: col.color ?? BLACK });
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function generateGuestListPdf(input: GuestListPdfInput): Promise<Uint8Array> {
  const { eventTitle, eventSlug, guests } = input;
  const isWineRide = eventSlug.includes('wine-ride') || eventSlug.includes('wineride');

  const pdfDoc = await PDFDocument.create();
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

  // ── Logo (optional — falls back to text if fetch fails) ───────────────
  let logoImg: Awaited<ReturnType<typeof pdfDoc.embedPng>> | null = null;
  try {
    const resp = await fetch('/main-logo.png');
    if (resp.ok) {
      const buf = await resp.arrayBuffer();
      logoImg = await pdfDoc.embedPng(new Uint8Array(buf));
    }
  } catch { /* logo not critical */ }

  // ── Column definitions ─────────────────────────────────────────────────
  // CW = 515. Distribute across columns.
  type ColDef = { key: string; label: string; w: number; align?: 'left' | 'center' };
  const COLS: ColDef[] = isWineRide
    ? [
        { key: '#',        label: '#',           w: 18, align: 'center' },
        { key: 'cognome',  label: 'COGNOME',      w: 82 },
        { key: 'nome',     label: 'NOME',         w: 70 },
        { key: 'email',    label: 'EMAIL',        w: 118 },
        { key: 'telefono', label: 'TELEFONO',     w: 68 },
        { key: 'data',     label: 'ISCRIZIONE',   w: 64 },
        { key: 'stato',    label: 'STATO',        w: 40, align: 'center' },
        { key: 'percorso', label: 'PERCORSO',     w: 55, align: 'center' },
      ]
    : [
        { key: '#',        label: '#',           w: 18, align: 'center' },
        { key: 'cognome',  label: 'COGNOME',      w: 90 },
        { key: 'nome',     label: 'NOME',         w: 80 },
        { key: 'email',    label: 'EMAIL',        w: 128 },
        { key: 'telefono', label: 'TELEFONO',     w: 75 },
        { key: 'data',     label: 'ISCRIZIONE',   w: 74 },
        { key: 'stato',    label: 'STATO',        w: 50, align: 'center' },
      ];

  // Compute x offsets
  let xCursor = ML;
  const colX: number[] = COLS.map(c => { const x = xCursor; xCursor += c.w; return x; });

  // ── Page factory ───────────────────────────────────────────────────────
  let page = pdfDoc.addPage([PW, PH]);
  let curY  = PH - 36;

  function ensureSpace(needed: number) {
    if (curY - needed < MB) {
      page = pdfDoc.addPage([PW, PH]);
      curY  = PH - 36;
      // Repeat table header on new page
      drawTableHeader();
    }
  }

  // ── Page 1 header ──────────────────────────────────────────────────────
  // Logo
  if (logoImg) {
    const dims = logoImg.scaleToFit(120, 36);
    const lx   = (PW - dims.width) / 2;
    page.drawImage(logoImg, { x: lx, y: curY - dims.height, width: dims.width, height: dims.height });
    curY -= dims.height + 8;
  } else {
    page.drawText('VIVO WINE CLUB', { x: ML, y: curY - 14, size: 13, font: bold, color: BORDEAUX });
    curY -= 22;
  }

  // Thin rule
  page.drawLine({ start: { x: ML, y: curY }, end: { x: PW - MR, y: curY }, thickness: 0.5, color: PALE_HDR });
  curY -= 14;

  // Title
  page.drawText('LISTA INVITATI', { x: ML, y: curY, size: 14, font: bold, color: BORDEAUX });
  curY -= 18;
  page.drawText(eventTitle, { x: ML, y: curY, size: 11, font: bold, color: BLACK });
  curY -= 14;

  // Generated at
  page.drawText(`Generato il ${nowLabel()}`, { x: ML, y: curY, size: 8, font: regular, color: GRAY_LT });
  curY -= 14;

  // Counters
  const checkedIn = guests.filter(g => g.checked_in).length;
  const counterTxt = `Totale iscritti: ${guests.length}   ·   Presenti: ${checkedIn}   ·   Assenti: ${guests.length - checkedIn}`;
  page.drawText(counterTxt, { x: ML, y: curY, size: 9, font: bold, color: GRAY });
  curY -= 18;

  // ── Table header ───────────────────────────────────────────────────────
  function drawTableHeader() {
    COLS.forEach((col, i) => {
      drawHeaderCell(page, colX[i], curY - HDR, col.w, HDR, col.label, bold, 7);
    });
    // Right-side border line for last column
    curY -= HDR;
  }

  drawTableHeader();

  // ── Data rows ──────────────────────────────────────────────────────────
  guests.forEach((g, idx) => {
    ensureSpace(ROW);

    const bg = idx % 2 === 0 ? WHITE : ROW_ALT;
    const rowY = curY - ROW;

    const cells = COLS.map((col, ci): { x: number; w: number; text: string; align?: 'left' | 'center'; color?: ReturnType<typeof rgb> } => {
      let text = '';
      let color: ReturnType<typeof rgb> | undefined;

      switch (col.key) {
        case '#':        text = String(idx + 1); break;
        case 'cognome':  text = g.last_name; break;
        case 'nome': {
          const rewardStar = g.referral_reward_unlocked ? ' ⭐' : '';
          text = g.first_name + rewardStar;
          break;
        }
        case 'email':    text = g.email; break;
        case 'telefono': text = g.phone ?? '—'; break;
        case 'data':     text = fmtDate(g.created_at); break;
        case 'stato':
          text  = g.checked_in ? '✓' : '—';
          color = g.checked_in ? EMERALD : GRAY_LT;
          break;
        case 'percorso': text = g.route ?? '—'; break;
      }

      return { x: colX[ci], w: col.w, text, align: col.align, color };
    });

    drawRow(page, ML, rowY, ROW, cells, regular, 8, bg);

    // Bottom border line for each row
    page.drawLine({
      start: { x: ML, y: rowY },
      end:   { x: PW - MR, y: rowY },
      thickness: 0.3,
      color: PALE_HDR,
    });

    curY -= ROW;
  });

  // ── Footer: total count ────────────────────────────────────────────────
  ensureSpace(20);
  curY -= 8;
  const footerTxt = `${guests.length} iscritti totali · ${checkedIn} presenti`;
  page.drawText(footerTxt, { x: ML, y: curY, size: 8, font: bold, color: GRAY });

  // ── Page numbers ───────────────────────────────────────────────────────
  const pageCount = pdfDoc.getPageCount();
  pdfDoc.getPages().forEach((pg, i) => {
    pg.drawText(`${i + 1} / ${pageCount}`, {
      x: PW - MR - 30, y: MB - 16, size: 7, font: regular, color: GRAY_LT,
    });
  });

  return pdfDoc.save();
}

/** Trigger browser download of the generated PDF bytes */
export function downloadPdf(bytes: Uint8Array, filename: string) {
  // Slice the exact buffer range to avoid subview offset issues (type-safe)
  const buf  = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
  const blob = new Blob([buf], { type: 'application/pdf' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = filename;
  // Must be in DOM for Safari to trigger download
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
