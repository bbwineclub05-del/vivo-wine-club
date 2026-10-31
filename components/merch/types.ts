/**
 * Le forme dei dati del merch, in un posto solo.
 *
 * Stavano in cima a un file da duemilacinquecento righe insieme a
 * tutto il resto. Qui le leggono i cinque pezzi in cui quel file si è
 * diviso, senza che nessuno se le ridichiari per conto suo.
 */

export interface ProductDetails {
  material?: string;
  dimensions?: string;
  care?: string;
  shipping?: string;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  sizes: string[];
  colors: string[];
  images: string[];
  visible: boolean;
  shipping_cost: number | null;
  slug: string | null;
  details: ProductDetails | null;
  stripe_product_id: string | null;
  stripe_price_id: string | null;
  sort_order: number;
  created_at: string;
  /** Unito dalla GET admin: serve la prima foto come copertina. */
  product_variants?: { id: string; images: string[]; sort_order: number }[];
}

export interface ProductVariant {
  id: string;
  product_id: string;
  color_name: string;
  display_name: string | null;
  color_hex: string;
  images: string[];
  sort_order: number;
  created_at: string;
}

export interface ProductTextVariant {
  id: string;
  product_id: string;
  text_label: string;
  images: string[];
  sort_order: number;
  created_at: string;
}

export interface ProductCombination {
  text_variant_id: string;
  color_variant_id: string;
  images: string[];
}

export interface OrderItem {
  name: string;
  qty: number;
  price: number;
}

export type OrderStatus = 'da_evadere' | 'evaso' | 'spedito';

export interface MerchOrder {
  id: string;
  stripe_session_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  items: OrderItem[];
  total: number;
  status: OrderStatus;
  created_at: string;
  shipping_line1: string | null;
  shipping_line2: string | null;
  shipping_city: string | null;
  shipping_postal: string | null;
  shipping_state: string | null;
  shipping_country: string | null;
  phone: string | null;
  delivery_notes: string | null;
  carrier: string | null;
  tracking_code: string | null;
  tracking_url: string | null;
  shipped_at: string | null;
  shipping_notes: string | null;
}

export interface StockRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  size: string | null;
  quantity: number;
  updated_at: string;
  products: { title: string; images: string[] } | null;
  product_variants: {
    color_name: string;
    display_name: string | null;
    images: string[];
    sort_order: number;
  } | null;
}

export interface AuditRow {
  id: string;
  product_id: string;
  variant_id: string | null;
  size: string | null;
  old_qty: number;
  new_qty: number;
  reason: string;
  changed_by: string | null;
  created_at: string;
}

/* ── Corrieri ─────────────────────────────────────────────────────── */

export const CARRIERS = [
  'GLS', 'BRT', 'DHL', 'UPS', 'FedEx', 'Poste Italiane', 'SDA', 'TNT', 'Altro',
] as const;

export const CARRIER_TRACKING: Partial<Record<string, (code: string) => string>> = {
  GLS: (c) => `https://gls-group.eu/IT/it/localizzazione-spedizioni?match=${c}`,
  BRT: (c) => `https://vas.brt.it/vas/sped_det_show.hsm?referer=sped_nuova_ric.hsm&Nspediz=${c}`,
  DHL: (c) => `https://www.dhl.com/it-it/home/tracking.html?tracking-id=${c}`,
  UPS: (c) => `https://www.ups.com/track?tracknum=${c}&loc=it_IT`,
  FedEx: (c) => `https://www.fedex.com/fedextrack/?trknbr=${c}`,
  'Poste Italiane': (c) => `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${c}`,
  SDA: (c) => `https://tracciamento.sda.it/tracking.htm?q=${c}`,
  TNT: (c) => `https://www.tnt.com/express/it_it/site/tracking.html?searchType=CON&cons=${c}`,
};

export function autoTrackingUrl(carrier: string, code: string): string {
  return CARRIER_TRACKING[carrier]?.(code.trim()) ?? '';
}

/* ── Taglie e colori ──────────────────────────────────────────────── */

export const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL'];

export function sizeRank(s: string | null): number {
  if (!s) return -1;
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  return i === -1 ? 99 : i;
}

/** Le giacenze come le leggerebbe una persona: prodotto, colore, taglia. */
export function sortStockRows(rows: StockRow[]): StockRow[] {
  return [...rows].sort((a, b) => {
    const ta = (a.products?.title ?? '').toLowerCase();
    const tb = (b.products?.title ?? '').toLowerCase();
    if (ta !== tb) return ta.localeCompare(tb);
    const va = a.product_variants?.sort_order ?? 0;
    const vb = b.product_variants?.sort_order ?? 0;
    if (va !== vb) return va - vb;
    return sizeRank(a.size) - sizeRank(b.size);
  });
}

const COLOR_HEX: Record<string, string> = {
  nero: '#1a1a1a', bianco: '#f0ede8', bordeaux: '#6b1a2a', verde: '#2d5a27',
  rosso: '#cc2200', blu: '#1a3a6b', grigio: '#7a7a7a', beige: '#d4b896',
  marrone: '#6b3a2a', rosa: '#e8a0b0', arancio: '#e07820', arancione: '#e07820',
  giallo: '#d4b800', viola: '#6b2d6b', azzurro: '#4a9fd4', navy: '#1a2a4a',
  crema: '#f0e8d4', ecru: '#d4c9a8', lilla: '#c8a0d0', turchese: '#20b0c0',
  camel: '#c09060', khaki: '#c0b060', militare: '#4a5a2a', senape: '#d0a030',
  panna: '#f5ede0', silver: '#b0b0b0', oro: '#c9a84c', arancio_bruciato: '#c04820',
};

export function colorHex(name: string): string {
  return COLOR_HEX[name.toLowerCase().replace(/\s+/g, '_')] ?? '#aaaaaa';
}

/* ── Formattazione ────────────────────────────────────────────────── */

export function euro(n: number): string {
  return `${Number(n).toFixed(2).replace('.', ',')} €`;
}

export function dataOra(iso: string): string {
  const d = new Date(iso);
  return `${d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })} · ${d.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Lo slug di un titolo, per l'URL della pagina prodotto. */
export function toSlug(v: string): string {
  return v
    .toLowerCase()
    .trim()
    .replace(/[àáäâ]/g, 'a')
    .replace(/[èéëê]/g, 'e')
    .replace(/[ìíïî]/g, 'i')
    .replace(/[òóöô]/g, 'o')
    .replace(/[ùúüû]/g, 'u')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}
