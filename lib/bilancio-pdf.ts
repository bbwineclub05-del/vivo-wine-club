import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { readFileSync } from 'fs';
import { join } from 'path';

// ── Colours (black/gray only — official document) ─────────────────────
const BLACK      = rgb(0, 0, 0);
const DARK_GRAY  = rgb(0.25, 0.25, 0.25);
const MED_GRAY   = rgb(0.50, 0.50, 0.50);
const LIGHT_GRAY = rgb(0.80, 0.80, 0.80);
const PALE_GRAY  = rgb(0.93, 0.93, 0.93);
const WHITE      = rgb(1, 1, 1);

const ML = 50;
const MR = 50;

export interface CategoryRow {
  entrate: number;
  uscite:  number;
  saldo:   number;
}

export interface BilancioData {
  periodLabel:      string;
  from:             string;
  to:               string;
  entrate:          number;
  uscite:           number;
  saldoPeriodo:     number;
  saldoCumulativo:  number;
  categoryBreakdown: Record<string, CategoryRow>;
  revenueCategories?: { name: string; amount: number }[];
  costCategories?:    { name: string; amount: number }[];
  mixedCategories?:   { name: string; entrate: number; uscite: number; saldo: number }[];
}

function fmtEur(n: number) {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(n);
}

function fmtDateIT(iso: string): string {
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function todayIT(): string {
  const now = new Date();
  return `${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}/${now.getFullYear()}`;
}

export async function generateBilancioPdf(data: BilancioData): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const page   = pdfDoc.addPage([595, 842]); // A4
  const W      = page.getWidth();
  const H      = page.getHeight();
  const CW     = W - ML - MR;

  const bold    = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const regular = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const italic  = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: WHITE });

  // ── HEADER ─────────────────────────────────────────────────────────
  const HEADER_TOP = H - 28;

  // Logo — top-left  (main-logo.png: colored RGBA, visible on white background)
  let headerY = HEADER_TOP;
  try {
    const logoBytes = readFileSync(join(process.cwd(), 'public', 'main-logo.png'));
    const logoImg   = await pdfDoc.embedPng(logoBytes);
    const logoDims  = logoImg.scaleToFit(110, 36);
    page.drawImage(logoImg, { x: ML, y: headerY - logoDims.height, width: logoDims.width, height: logoDims.height });
    headerY -= logoDims.height + 10;
  } catch {
    page.drawText('VIVO WINE CLUB', { x: ML, y: headerY - 14, size: 12, font: bold, color: BLACK });
    headerY -= 24;
  }

  // Company info block — left-aligned, below logo, generous line spacing
  const infoLines = [
    { text: 'VIVO WINE CLUB',                                                              size: 9.5, font: bold    },
    { text: 'Associazione Culturale — Ente non commerciale',                               size: 8,   font: regular },
    { text: 'C.F. 95023200223',                                                            size: 8,   font: regular },
    { text: 'Natura Giuridica: 12 — Associazioni non riconosciute e comitati',             size: 7.5, font: regular },
    { text: 'Codice Attività: 949920 — Att. di organizzazioni associative culturali',      size: 7.5, font: regular },
    { text: 'Sede legale: Via Conti Lodron 62, 38089 Storo (TN)',                          size: 8,   font: regular },
    { text: 'Email: info@vivowineclub.com  —  Web: vivowineclub.com',                      size: 7.5, font: regular },
    { text: 'Rappresentante legale: Filippo Lombardi',                                     size: 8,   font: regular },
  ];

  for (const line of infoLines) {
    page.drawText(line.text, { x: ML, y: headerY, size: line.size, font: line.font, color: BLACK });
    headerY -= line.size + 5; // generous spacing between lines
  }

  const HEADER_BOTTOM = headerY - 8;

  // Thin black separator
  page.drawLine({ start: { x: ML, y: HEADER_BOTTOM }, end: { x: W - MR, y: HEADER_BOTTOM }, thickness: 1, color: BLACK });

  // ── DOCUMENT TITLE ─────────────────────────────────────────────────
  let y = HEADER_BOTTOM - 20;

  const TITLE = 'RENDICONTO ECONOMICO-FINANZIARIO';
  const titleW = bold.widthOfTextAtSize(TITLE, 14);
  page.drawText(TITLE, { x: (W - titleW) / 2, y, size: 14, font: bold, color: BLACK });
  y -= 16;

  const periodoLine = `Periodo: ${fmtDateIT(data.from)} - ${fmtDateIT(data.to)}`;
  const periodoW    = regular.widthOfTextAtSize(periodoLine, 9);
  page.drawText(periodoLine, { x: (W - periodoW) / 2, y, size: 9, font: regular, color: DARK_GRAY });
  y -= 12;

  const dateEmissione = `Documento generato il ${todayIT()}`;
  const dateEmW       = regular.widthOfTextAtSize(dateEmissione, 8);
  page.drawText(dateEmissione, { x: (W - dateEmW) / 2, y, size: 8, font: italic, color: MED_GRAY });
  y -= 14;

  // ── NOTA INFORMATIVA ──────────────────────────────────────────────
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.4, color: LIGHT_GRAY });
  y -= 10;

  const notaText = 'Il presente documento riporta il rendiconto delle entrate e delle uscite del periodo di riferimento, redatto ai sensi dell\'Art. 14 dello Statuto associativo, in conformità con i principi di trasparenza amministrativa e correttezza contabile previsti per le associazioni non riconosciute ai sensi del Codice Civile.';
  // Word-wrap nota
  const notaWords = notaText.split(' ');
  let notaLine = '';
  const notaLines: string[] = [];
  for (const w of notaWords) {
    const candidate = notaLine ? `${notaLine} ${w}` : w;
    if (italic.widthOfTextAtSize(candidate, 7.5) <= CW) { notaLine = candidate; }
    else { if (notaLine) notaLines.push(notaLine); notaLine = w; }
  }
  if (notaLine) notaLines.push(notaLine);
  for (const line of notaLines) {
    page.drawText(line, { x: ML, y, size: 7.5, font: italic, color: MED_GRAY });
    y -= 11;
  }
  y -= 6;

  // Helper: draw section header
  function sectionHeader(title: string, yPos: number): number {
    page.drawRectangle({ x: ML, y: yPos - 2, width: CW, height: 16, color: PALE_GRAY });
    page.drawText(title, { x: ML + 5, y: yPos + 1, size: 8.5, font: bold, color: BLACK });
    page.drawText('Importo (€)', { x: W - MR - 70, y: yPos + 1, size: 8, font: bold, color: BLACK });
    return yPos - 16;
  }

  function tableRow(label: string, amount: number, yPos: number, isBold = false): number {
    const amtStr  = fmtEur(amount);
    const amtW    = (isBold ? bold : regular).widthOfTextAtSize(amtStr, 9);
    page.drawText(label,  { x: ML + 8, y: yPos, size: 9, font: isBold ? bold : regular, color: isBold ? BLACK : DARK_GRAY });
    page.drawText(amtStr, { x: W - MR - amtW, y: yPos, size: 9, font: isBold ? bold : regular, color: BLACK });
    page.drawLine({ start: { x: ML, y: yPos - 3 }, end: { x: W - MR, y: yPos - 3 }, thickness: 0.2, color: LIGHT_GRAY });
    return yPos - 14;
  }

  function totalRow(label: string, amount: number, yPos: number): number {
    page.drawRectangle({ x: ML, y: yPos - 3, width: CW, height: 15, color: PALE_GRAY });
    const amtStr = fmtEur(amount);
    const amtW   = bold.widthOfTextAtSize(amtStr, 9.5);
    page.drawText(label,  { x: ML + 5, y: yPos, size: 9, font: bold, color: BLACK });
    page.drawText(amtStr, { x: W - MR - amtW, y: yPos, size: 9.5, font: bold, color: BLACK });
    return yPos - 18;
  }

  // ── SEZIONE ENTRATE ──────────────────────────────────────────────
  page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: BLACK });
  y -= 4;
  y = sectionHeader('ENTRATE', y);
  y -= 4;

  // Build revenue rows from categoryBreakdown
  const revEntries = Object.entries(data.categoryBreakdown)
    .filter(([, row]) => row.entrate > 0)
    .sort((a, b) => b[1].entrate - a[1].entrate);

  if (revEntries.length === 0) {
    page.drawText('Nessuna entrata nel periodo.', { x: ML + 8, y, size: 9, font: italic, color: MED_GRAY });
    y -= 14;
  } else {
    for (const [name, row] of revEntries) {
      if (y < 130) break;
      y = tableRow(name, row.entrate, y);
    }
  }
  y -= 2;
  y = totalRow('TOTALE ENTRATE', data.entrate, y);
  y -= 10;

  // ── SEZIONE USCITE ───────────────────────────────────────────────
  if (y < 130) {
    // Not enough space — just skip to summary (in a real app we'd add a page)
  } else {
    page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: BLACK });
    y -= 4;
    y = sectionHeader('USCITE', y);
    y -= 4;

    const costEntries = Object.entries(data.categoryBreakdown)
      .filter(([, row]) => row.uscite > 0)
      .sort((a, b) => b[1].uscite - a[1].uscite);

    if (costEntries.length === 0) {
      page.drawText('Nessuna uscita nel periodo.', { x: ML + 8, y, size: 9, font: italic, color: MED_GRAY });
      y -= 14;
    } else {
      for (const [name, row] of costEntries) {
        if (y < 130) break;
        y = tableRow(name, row.uscite, y);
      }
    }
    y -= 2;
    y = totalRow('TOTALE USCITE', data.uscite, y);
    y -= 10;
  }

  // ── SEZIONE RIEPILOGO ────────────────────────────────────────────
  if (y > 130) {
    page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.5, color: BLACK });
    y -= 4;
    y = sectionHeader('RIEPILOGO', y);
    y -= 4;
    y = tableRow('Totale Entrate', data.entrate, y);
    y = tableRow('Totale Uscite', data.uscite, y);
    y -= 2;
    y = totalRow('RISULTATO DI PERIODO', data.saldoPeriodo, y);
    y -= 4;
    y = tableRow('Saldo Cumulativo Progressivo', data.saldoCumulativo, y, true);
    y -= 10;
  }

  // ── NOTA A PIÈ DI PAGINA ─────────────────────────────────────────
  const FOOTER_H  = 30;
  const SIG_H     = 90;
  const NOTE_H    = 40;
  const NOTE_Y    = FOOTER_H + SIG_H + NOTE_H + 6;

  if (y > NOTE_Y + 6) {
    page.drawLine({ start: { x: ML, y }, end: { x: W - MR, y }, thickness: 0.4, color: LIGHT_GRAY });
    y -= 10;
    const notaFineText = 'Il presente rendiconto è stato predisposto dal Consiglio Direttivo ai sensi dell\'Art. 14 dello Statuto e sarà sottoposto all\'approvazione dell\'Assemblea dei Membri. I dati riportati sono riferiti al periodo indicato e sono soggetti a verifica. L\'anno finanziario decorre dal 1 gennaio al 31 dicembre di ogni anno (Art. 14 Statuto).';
    const nfWords = notaFineText.split(' ');
    let nfLine = '';
    const nfLines: string[] = [];
    for (const w of nfWords) {
      const candidate = nfLine ? `${nfLine} ${w}` : w;
      if (italic.widthOfTextAtSize(candidate, 7) <= CW) { nfLine = candidate; }
      else { if (nfLine) nfLines.push(nfLine); nfLine = w; }
    }
    if (nfLine) nfLines.push(nfLine);
    for (const line of nfLines) {
      if (y < NOTE_Y - 4) break;
      page.drawText(line, { x: ML, y, size: 7, font: italic, color: MED_GRAY });
      y -= 10;
    }
  }

  // ── FIRME ────────────────────────────────────────────────────────
  const SIG_TOP = FOOTER_H + SIG_H;

  page.drawLine({ start: { x: ML, y: SIG_TOP + 4 }, end: { x: W - MR, y: SIG_TOP + 4 }, thickness: 0.5, color: BLACK });
  page.drawText('Il presente documento è sottoscritto dai membri del Consiglio Direttivo.', {
    x: ML, y: SIG_TOP - 4, size: 7.5, font: italic, color: MED_GRAY,
  });

  const sigData = [
    { role: 'Il Presidente',  name: 'Filippo Lombardi'     },
    { role: 'Consigliere',    name: 'Giacomo Gallo'        },
    { role: 'Consigliere',    name: 'Cristiano Michelotti' },
    { role: 'Consigliere',    name: 'Marcello Abbadati'    },
  ];
  const sigColW  = CW / 4;
  const sigLineY = SIG_TOP - 34;
  const sigNameY = sigLineY - 12;
  const sigRoleY = sigLineY - 22;

  sigData.forEach(({ role, name }, i) => {
    const fx      = ML + i * sigColW;
    const lineEnd = fx + sigColW - 12;
    page.drawLine({ start: { x: fx, y: sigLineY }, end: { x: lineEnd, y: sigLineY }, thickness: 0.6, color: BLACK });
    page.drawText(name, { x: fx, y: sigNameY, size: 7.5, font: regular, color: DARK_GRAY });
    page.drawText(role, { x: fx, y: sigRoleY, size: 7,   font: italic,  color: MED_GRAY  });
  });

  // ── FOOTER ───────────────────────────────────────────────────────
  page.drawLine({ start: { x: ML, y: FOOTER_H + 4 }, end: { x: W - MR, y: FOOTER_H + 4 }, thickness: 0.5, color: BLACK });
  const footerText = 'VIVO Wine Club — Associazione Culturale — C.F. 95023200223 — Sede legale: Via Conti Lodron 62, 38089 Storo (TN)';
  const footerW    = regular.widthOfTextAtSize(footerText, 7);
  page.drawText(footerText, {
    x: (W - footerW) / 2, y: FOOTER_H - 4,
    size: 7, font: regular, color: DARK_GRAY,
  });
  const pageNumText = 'Pagina 1 di 1';
  const pageNumW    = regular.widthOfTextAtSize(pageNumText, 7);
  page.drawText(pageNumText, {
    x: W - MR - pageNumW, y: FOOTER_H - 14,
    size: 7, font: regular, color: MED_GRAY,
  });

  return pdfDoc.save();
}
