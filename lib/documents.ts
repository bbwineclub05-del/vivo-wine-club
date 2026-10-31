/**
 * Quello che l'area riservata sa sui file.
 *
 * Prima l'API accettava cinque tipi MIME: PDF, Word e PowerPoint. Un
 * foglio Excel, una foto della cantina o un .zip venivano rifiutati con
 * "Formato non supportato", il che per una cartella documenti è un
 * limite difficile da spiegare.
 *
 * Qui il criterio si ribalta: si accetta tutto tranne ciò che è
 * eseguibile. Un elenco di cose permesse dimentica sempre qualcosa — i
 * browser, per esempio, dichiarano i .xlsx in almeno tre modi diversi e
 * a volte non li dichiarano affatto. Un elenco di cose vietate, invece,
 * deve solo coprire ciò che è pericoloso, che è un insieme piccolo e
 * che cambia poco.
 */

/** Il tetto per singolo file. Oltre, Supabase rifiuta comunque. */
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

/**
 * Estensioni rifiutate: programmi e script.
 *
 * Non c'è motivo per cui un documento del club sia un eseguibile, e
 * averli in archivio significa soltanto che un giorno qualcuno ne
 * scaricherà uno fidandosi del fatto che viene da noi.
 */
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'msi', 'com', 'scr', 'bat', 'cmd', 'pif', 'cpl', 'dll',
  'app', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'jar',
  'sh', 'bash', 'zsh', 'ps1', 'psm1', 'vbs', 'vbe', 'wsf', 'hta',
  'js', 'mjs', 'cjs', 'jse', 'reg', 'lnk', 'scpt',
]);

export function extensionOf(fileName: string) {
  const parts = fileName.toLowerCase().split('.');
  return parts.length > 1 ? parts.pop()! : '';
}

export function isBlocked(fileName: string) {
  return BLOCKED_EXTENSIONS.has(extensionOf(fileName));
}

/** Perché il file è stato rifiutato, o `null` se va bene. */
export function rejectReason(fileName: string, size: number): string | null {
  if (isBlocked(fileName)) {
    return `I file .${extensionOf(fileName)} sono programmi e non si possono caricare.`;
  }
  if (size > MAX_FILE_BYTES) {
    return `Il file pesa ${formatSize(size)}: il massimo è ${formatSize(MAX_FILE_BYTES)}.`;
  }
  if (size === 0) return 'Il file è vuoto.';
  return null;
}

/* ── Famiglie ─────────────────────────────────────────────────────── */

export type FileKind =
  | 'pdf' | 'doc' | 'sheet' | 'slides' | 'image'
  | 'archive' | 'text' | 'video' | 'audio' | 'other';

const KIND_BY_EXTENSION: Record<string, FileKind> = {
  pdf: 'pdf',

  doc: 'doc', docx: 'doc', odt: 'doc', rtf: 'doc', pages: 'doc',

  xls: 'sheet', xlsx: 'sheet', xlsm: 'sheet', ods: 'sheet',
  csv: 'sheet', tsv: 'sheet', numbers: 'sheet',

  ppt: 'slides', pptx: 'slides', odp: 'slides', key: 'slides',

  jpg: 'image', jpeg: 'image', png: 'image', gif: 'image', webp: 'image',
  heic: 'image', heif: 'image', avif: 'image', bmp: 'image', tiff: 'image',
  tif: 'image', svg: 'image',

  zip: 'archive', rar: 'archive', '7z': 'archive', tar: 'archive',
  gz: 'archive', bz2: 'archive',

  txt: 'text', md: 'text', json: 'text', xml: 'text', yml: 'text', yaml: 'text',

  mp4: 'video', mov: 'video', avi: 'video', mkv: 'video', webm: 'video',

  mp3: 'audio', wav: 'audio', m4a: 'audio', aac: 'audio', ogg: 'audio',
};

export function kindOf(fileName: string): FileKind {
  return KIND_BY_EXTENSION[extensionOf(fileName)] ?? 'other';
}

/** L'etichetta che si legge sotto il nome, es. "Foglio di calcolo". */
export const KIND_LABEL: Record<FileKind, string> = {
  pdf: 'PDF',
  doc: 'Documento',
  sheet: 'Foglio di calcolo',
  slides: 'Presentazione',
  image: 'Immagine',
  archive: 'Archivio',
  text: 'Testo',
  video: 'Video',
  audio: 'Audio',
  other: 'File',
};

/**
 * Un colore per famiglia. Serve a trovare il contratto in mezzo a venti
 * righe senza leggerle: la forma dell'icona si distingue male a colpo
 * d'occhio, il colore no.
 */
export const KIND_COLOR: Record<FileKind, string> = {
  pdf: '#B3261E',
  doc: '#1F5F8B',
  sheet: '#2F7A4F',
  slides: '#A3561A',
  image: '#5B3A8C',
  archive: '#7A5252',
  text: '#4A5568',
  video: '#B3261E',
  audio: '#5B3A8C',
  other: '#7A5252',
};

/* ── Tipi MIME ────────────────────────────────────────────────────── */

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  odt: 'application/vnd.oasis.opendocument.text',
  rtf: 'application/rtf',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xlsm: 'application/vnd.ms-excel.sheet.macroEnabled.12',
  ods: 'application/vnd.oasis.opendocument.spreadsheet',
  csv: 'text/csv',
  tsv: 'text/tab-separated-values',
  ppt: 'application/vnd.ms-powerpoint',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  odp: 'application/vnd.oasis.opendocument.presentation',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  avif: 'image/avif',
  bmp: 'image/bmp',
  tiff: 'image/tiff',
  tif: 'image/tiff',
  svg: 'image/svg+xml',
  zip: 'application/zip',
  rar: 'application/vnd.rar',
  '7z': 'application/x-7z-compressed',
  tar: 'application/x-tar',
  gz: 'application/gzip',
  txt: 'text/plain',
  md: 'text/markdown',
  json: 'application/json',
  xml: 'application/xml',
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  m4a: 'audio/mp4',
  ogg: 'audio/ogg',
};

export function mimeOf(fileName: string) {
  return MIME_BY_EXTENSION[extensionOf(fileName)] ?? 'application/octet-stream';
}

/**
 * I soli tipi che il browser può aprire nella scheda senza rischi.
 *
 * SVG è deliberatamente escluso pur essendo un'immagine: può contenere
 * script, e aprirlo sul nostro dominio significherebbe eseguirli lì.
 * Si scarica come tutti gli altri.
 */
const INLINE_SAFE = new Set([
  'application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp',
]);

export function canOpenInline(fileName: string) {
  return INLINE_SAFE.has(mimeOf(fileName));
}

/* ── Formattazione ────────────────────────────────────────────────── */

export function formatSize(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** "Relazione 2026.final.pdf" → "Relazione 2026.final" */
export function titleFromFileName(fileName: string) {
  const i = fileName.lastIndexOf('.');
  return (i > 0 ? fileName.slice(0, i) : fileName).replace(/[_-]+/g, ' ').trim();
}

/** Un nome che lo storage accetta senza sorprese. */
export function storageSafeName(fileName: string) {
  return fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
}
