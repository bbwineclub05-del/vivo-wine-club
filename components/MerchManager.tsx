'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, X, Loader2, Eye, EyeOff,
  Package, ShoppingBag, CheckCircle, Clock, ImagePlus, Palette, Truck, Type,
  Copy, Check as CheckIcon, MapPin, Phone, StickyNote,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import { useMobileOverlay } from '@/lib/useMobileOverlay';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ProductDetails {
  material?:   string;
  dimensions?: string;
  care?:       string;
  shipping?:   string;
}

interface Product {
  id:                string;
  title:             string;
  description:       string;
  price:             number;
  sizes:             string[];
  colors:            string[];
  images:            string[];
  visible:           boolean;
  shipping_cost:     number | null;
  slug:              string | null;
  details:           ProductDetails | null;
  stripe_product_id: string | null;
  stripe_price_id:   string | null;
  sort_order:        number;
  created_at:        string;
  // Joined by admin GET — first image of first variant used as card thumbnail
  product_variants?: { id: string; images: string[]; sort_order: number }[];
}

interface ProductVariant {
  id:           string;
  product_id:   string;
  color_name:   string;
  display_name: string | null;
  color_hex:    string;
  images:       string[];
  sort_order:   number;
  created_at:   string;
}

interface ProductTextVariant {
  id:         string;
  product_id: string;
  text_label: string;
  images:     string[];
  sort_order: number;
  created_at: string;
}

interface ProductCombination {
  text_variant_id:  string;
  color_variant_id: string;
  images:           string[];
}

interface OrderItem { name: string; qty: number; price: number }

interface MerchOrder {
  id:               string;
  stripe_session_id: string | null;
  customer_name:    string | null;
  customer_email:   string | null;
  items:            OrderItem[];
  total:            number;
  status:           'da_evadere' | 'evaso' | 'spedito';
  created_at:       string;
  // Shipping address
  shipping_line1:   string | null;
  shipping_line2:   string | null;
  shipping_city:    string | null;
  shipping_postal:  string | null;
  shipping_state:   string | null;
  shipping_country: string | null;
  phone:            string | null;
  delivery_notes:   string | null;
  // Shipment tracking
  carrier:          string | null;
  tracking_code:    string | null;
  tracking_url:     string | null;
  shipped_at:       string | null;
  shipping_notes:   string | null;
}

// ── Carrier tracking URL generators ───────────────────────────────────────────

const CARRIERS = ['GLS', 'BRT', 'DHL', 'UPS', 'FedEx', 'Poste Italiane', 'SDA', 'TNT', 'Altro'] as const;

const CARRIER_TRACKING: Partial<Record<string, (code: string) => string>> = {
  GLS:              c => `https://gls-group.eu/IT/it/localizzazione-spedizioni?match=${c}`,
  BRT:              c => `https://vas.brt.it/vas/sped_det_show.hsm?referer=sped_nuova_ric.hsm&Nspediz=${c}`,
  DHL:              c => `https://www.dhl.com/it-it/home/tracking.html?tracking-id=${c}`,
  UPS:              c => `https://www.ups.com/track?tracknum=${c}&loc=it_IT`,
  FedEx:            c => `https://www.fedex.com/fedextrack/?trknbr=${c}`,
  'Poste Italiane': c => `https://www.poste.it/cerca/index.html#/risultati-spedizioni/${c}`,
  SDA:              c => `https://tracciamento.sda.it/tracking.htm?q=${c}`,
  TNT:              c => `https://www.tnt.com/express/it_it/site/tracking.html?searchType=CON&cons=${c}`,
};

function autoTrackingUrl(carrier: string, code: string): string {
  return CARRIER_TRACKING[carrier]?.(code.trim()) ?? '';
}

const ALL_SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

// Maps Italian color names (lowercase) to hex for preview swatches
const COLOR_HEX: Record<string, string> = {
  nero: '#1a1a1a', bianco: '#f0ede8', bordeaux: '#6b1a2a', verde: '#2d5a27',
  rosso: '#cc2200', blu: '#1a3a6b', grigio: '#7a7a7a', beige: '#d4b896',
  marrone: '#6b3a2a', rosa: '#e8a0b0', arancio: '#e07820', arancione: '#e07820',
  giallo: '#d4b800', viola: '#6b2d6b', azzurro: '#4a9fd4', navy: '#1a2a4a',
  crema: '#f0e8d4', ecru: '#d4c9a8', lilla: '#c8a0d0', turchese: '#20b0c0',
  camel: '#c09060', khaki: '#c0b060', militare: '#4a5a2a', senape: '#d0a030',
  panna: '#f5ede0', silver: '#b0b0b0', oro: '#c9a84c', arancio_bruciato: '#c04820',
};

function colorHex(name: string): string {
  return COLOR_HEX[name.toLowerCase().replace(/\s+/g, '_')] ?? '#aaaaaa';
}

// ── Shared input styles ────────────────────────────────────────────────────────
const inp = 'w-full bg-[#fdf6f6] border border-[#eddada] text-[#1a0505] px-3.5 py-2.5 text-sm placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg';

// ── Image uploader ─────────────────────────────────────────────────────────────

function ImageUploader({
  images,
  onChange,
  token,
}: {
  images:   string[];
  onChange: (imgs: string[]) => void;
  token:    string;
}) {
  const [uploading, setUploading] = useState(false);
  const [uploadErr, setUploadErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadErr('');
    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'products');
        const res  = await fetch('/api/media/upload', {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    fd,
        });
        const data = await res.json();
        if (!res.ok || !data.url) {
          setUploadErr(data.error ?? 'Errore upload immagine');
          return;
        }
        uploaded.push(data.url);
      }
      onChange([...images, ...uploaded]);
    } catch {
      setUploadErr('Errore di rete durante l\'upload');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">IMMAGINI</label>

      {/* Existing images */}
      {images.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-3">
          {images.map((url, i) => (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-[#eddada] group">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
              >
                <X size={16} className="text-white" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload button */}
      <button
        type="button"
        onClick={() => fileRef.current?.click()}
        disabled={uploading}
        className="flex items-center gap-2 text-[10px] tracking-[0.25em] bg-white border border-dashed border-[#eddada] text-[#7a4a4a]/60 hover:border-[#731515]/40 hover:text-[#731515]/60 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 w-full justify-center"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
        {uploading ? 'UPLOAD IN CORSO…' : 'AGGIUNGI IMMAGINI'}
      </button>
      <input
        ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { setUploadErr(''); handleFiles(e.target.files); }}
      />
      {uploadErr && (
        <p className="text-[10px] text-[#731515] mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>{uploadErr}</p>
      )}
    </div>
  );
}

// ── Product modal (create / edit) ─────────────────────────────────────────────

function ProductModal({
  product,
  token,
  onClose,
  onSaved,
}: {
  product: Product | null;
  token:   string;
  onClose: () => void;
  onSaved: (p: Product) => void;
}) {
  const editing = !!product;

  const [title,           setTitle]           = useState(product?.title       ?? '');
  const [description,     setDescription]     = useState(product?.description ?? '');
  const [price,           setPrice]           = useState(product?.price       ?? '');
  const [sizes,           setSizes]           = useState<string[]>(product?.sizes  ?? []);
  const [visible,         setVisible]         = useState(product?.visible     ?? true);
  // shipping_cost: '' = inherit global, number string = override
  const [shippingCost,    setShippingCost]    = useState<string>(
    product?.shipping_cost != null ? String(product.shipping_cost) : ''
  );
  const [slug,            setSlug]            = useState(product?.slug ?? '');
  const [detailMaterial,   setDetailMaterial]   = useState(product?.details?.material   ?? '');
  const [detailDimensions, setDetailDimensions] = useState(product?.details?.dimensions ?? '');
  const [detailCare,       setDetailCare]       = useState(product?.details?.care       ?? '');
  const [detailShipping,   setDetailShipping]   = useState(product?.details?.shipping   ?? '');
  const [sizeQty,         setSizeQty]         = useState<Record<string, number>>({});
  const [saving,          setSaving]          = useState(false);
  const [error,           setError]           = useState('');

  function toSlug(v: string) {
    return v.toLowerCase().trim()
      .replace(/[àáäâ]/g, 'a').replace(/[èéëê]/g, 'e')
      .replace(/[ìíïî]/g, 'i').replace(/[òóöô]/g, 'o').replace(/[ùúüû]/g, 'u')
      .replace(/[^a-z0-9\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');
  }

  function handleTitleChange(v: string) {
    setTitle(v);
    // Auto-fill slug only when creating (not editing) and slug hasn't been manually changed
    if (!editing && !slug) setSlug(toSlug(v));
  }

  function toggleSize(s: string) {
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !price) { setError('Titolo e prezzo sono obbligatori'); return; }
    setError('');
    setSaving(true);

    try {
      const details: Record<string, string> = {};
      if (detailMaterial.trim())   details.material   = detailMaterial.trim();
      if (detailDimensions.trim()) details.dimensions = detailDimensions.trim();
      if (detailCare.trim())       details.care       = detailCare.trim();
      if (detailShipping.trim())   details.shipping   = detailShipping.trim();

      const body: Record<string, unknown> = {
        title, description, price: Number(price), sizes, visible,
        shipping_cost: shippingCost !== '' ? Number(shippingCost) : null,
        slug: slug.trim() || null,
        details: Object.keys(details).length > 0 ? details : null,
      };
      if (!editing) {
        // Include initial stock quantities for new products
        const initialStock: Record<string, number> = {};
        if (sizes.length > 0) {
          for (const s of sizes) initialStock[s] = sizeQty[s] ?? 0;
        } else {
          initialStock['_'] = sizeQty['_'] ?? 0;
        }
        body.initialStock = initialStock;
      }
      const url    = editing ? `/api/merch/products/${product!.id}` : '/api/merch/products';
      const method = editing ? 'PATCH' : 'POST';

      const res  = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Errore'); return; }
      onSaved(data.product);
      onClose();
    } catch { setError('Errore di rete.'); }
    finally  { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
        className="bg-white rounded-xl border border-[#eddada] shadow-xl w-full max-w-lg my-auto"
      >
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#eddada]">
          <h2 className="text-[15px] font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
            {editing ? 'Modifica prodotto' : 'Nuovo prodotto'}
          </h2>
          <button onClick={onClose} className="text-[#7a4a4a]/40 hover:text-[#7a4a4a]"><X size={18} /></button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TITOLO *</label>
            <input required value={title} onChange={e => handleTitleChange(e.target.value)}
              placeholder="es. Classic Tee" className={inp} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* Slug */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">SLUG URL</label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[11px] text-[#7a4a4a]/40 select-none pointer-events-none"
                style={{ fontFamily: 'var(--font-nunito)' }}>
                /wear-the-club/
              </span>
              <input value={slug} onChange={e => setSlug(toSlug(e.target.value))}
                placeholder="classic-tee"
                className={`${inp} pl-[108px]`}
                style={{ fontFamily: 'var(--font-nunito)' }} />
            </div>
            <p className="mt-1 text-[9px] text-[#7a4a4a]/45" style={{ fontFamily: 'var(--font-nunito)' }}>
              Usato nell&apos;URL della pagina prodotto. Auto-generato dal titolo.
            </p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DESCRIZIONE</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)}
              placeholder="Descrizione del prodotto…" rows={3}
              className={`${inp} resize-none`} style={{ fontFamily: 'var(--font-nunito)' }} />
          </div>

          {/* Price + Shipping */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">PREZZO (€) *</label>
              <input type="number" required min="0" step="0.01" value={price}
                onChange={e => setPrice(e.target.value)} placeholder="35.00"
                className={inp} style={{ fontFamily: 'var(--font-nunito)' }} />
            </div>
            <div>
              <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">SPEDIZIONE (€)</label>
              <input type="number" min="0" step="0.01" value={shippingCost}
                onChange={e => setShippingCost(e.target.value)}
                placeholder="— globale"
                className={inp} style={{ fontFamily: 'var(--font-nunito)' }} />
              <p className="mt-1 text-[9px] text-[#7a4a4a]/45" style={{ fontFamily: 'var(--font-nunito)' }}>
                Lascia vuoto per usare il costo globale
              </p>
            </div>
          </div>

          {/* Sizes */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">TAGLIE DISPONIBILI</label>
            <div className="flex flex-wrap gap-2">
              {ALL_SIZES.map(s => (
                <button key={s} type="button" onClick={() => toggleSize(s)}
                  className={`px-3 py-1.5 text-[11px] rounded-lg border transition-colors ${
                    sizes.includes(s)
                      ? 'bg-[#731515] text-white border-[#731515]'
                      : 'border-[#eddada] text-[#7a4a4a]/60 hover:border-[#731515]/40'
                  }`}>
                  {s}
                </button>
              ))}
            </div>
            {sizes.length === 0 && (
              <p className="text-[10px] text-[#7a4a4a]/40 mt-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                Nessuna taglia = prodotto senza taglia
              </p>
            )}
          </div>

          {/* Initial stock qty (only when creating) */}
          {!editing && (
            <div>
              <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">DISPONIBILITÀ INIZIALE</label>
              {sizes.length > 0 ? (
                <div className="flex flex-wrap gap-3">
                  {sizes.map(s => (
                    <div key={s} className="flex items-center gap-1.5">
                      <span className="text-[11px] text-[#7a4a4a] w-6 text-center" style={{ fontFamily: 'var(--font-nunito)' }}>{s}</span>
                      <input
                        type="number" min="0" step="1"
                        value={sizeQty[s] ?? 0}
                        onChange={e => setSizeQty(prev => ({ ...prev, [s]: Math.max(0, parseInt(e.target.value) || 0) }))}
                        className="w-16 px-2 py-1 text-[12px] border border-[#eddada] rounded-lg text-center"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>Quantità</span>
                  <input
                    type="number" min="0" step="1"
                    value={sizeQty['_'] ?? 0}
                    onChange={e => setSizeQty({ _: Math.max(0, parseInt(e.target.value) || 0) })}
                    className="w-20 px-2 py-1 text-[12px] border border-[#eddada] rounded-lg text-center"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Stock — only for products without color variants (stock per variant is managed in Varianti Colore) */}
          {editing && !product!.product_variants?.length && (
            <div>
              <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">DISPONIBILITÀ</label>
              <StockSection productId={product!.id} sizes={sizes} token={token} />
            </div>
          )}

          {/* Details section — Additional Info */}
          <div className="border-t border-[#eddada] pt-4">
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-3">ADDITIONAL INFO (pagina prodotto)</label>
            <div className="space-y-3">
              <div>
                <label className="block text-[9px] tracking-[0.3em] text-[#7a4a4a]/60 mb-1">TESSUTO / FABRIC</label>
                <textarea value={detailMaterial} onChange={e => setDetailMaterial(e.target.value)}
                  placeholder="es. 100% organic cotton, 200g/m² jersey"
                  rows={2} className={`${inp} resize-none`} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.3em] text-[#7a4a4a]/60 mb-1">DIMENSIONI / DIMENSIONS</label>
                <textarea value={detailDimensions} onChange={e => setDetailDimensions(e.target.value)}
                  placeholder="es. S: chest 96cm, length 70cm — M: chest 102cm, length 72cm"
                  rows={2} className={`${inp} resize-none`} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.3em] text-[#7a4a4a]/60 mb-1">CURA / CARE</label>
                <textarea value={detailCare} onChange={e => setDetailCare(e.target.value)}
                  placeholder="es. Machine wash 30°C, do not tumble dry"
                  rows={2} className={`${inp} resize-none`} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
              <div>
                <label className="block text-[9px] tracking-[0.3em] text-[#7a4a4a]/60 mb-1">SPEDIZIONE E RESI / SHIPPING & RETURNS</label>
                <textarea value={detailShipping} onChange={e => setDetailShipping(e.target.value)}
                  placeholder="es. Ships in 5–7 business days. Free returns within 30 days."
                  rows={2} className={`${inp} resize-none`} style={{ fontFamily: 'var(--font-nunito)' }} />
              </div>
            </div>
          </div>

          {/* Visible */}
          <div className="flex items-center justify-between py-2">
            <div>
              <p className="text-[12px] text-[#1a0505] font-medium" style={{ fontFamily: 'var(--font-nunito)' }}>
                Visibile nello shop
              </p>
              <p className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                Se disattivato il prodotto è nascosto ai clienti
              </p>
            </div>
            <button type="button" onClick={() => setVisible(v => !v)}>
              {visible
                ? <Eye size={20} className="text-[#731515]" />
                : <EyeOff size={20} className="text-[#7a4a4a]/30" />}
            </button>
          </div>

          {error && (
            <p className="text-[12px] text-[#731515] bg-[#fde8e8] border border-[#731515]/15 px-3 py-2 rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 bg-white border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.25em] hover:bg-[#fdf6f6] transition-colors rounded-lg">
              ANNULLA
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.25em] hover:bg-[#9b2323] disabled:opacity-55 transition-colors rounded-lg flex items-center justify-center gap-2">
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'SALVATAGGIO…' : editing ? 'SALVA' : 'CREA'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Stock section (reusable: for variant rows and no-variant products) ─────────

function StockSection({
  productId,
  sizes,
  token,
  variantId = null,
}: {
  productId: string;
  sizes:     string[];
  token:     string;
  variantId?: string | null;
}) {
  const [stock,   setStock]   = useState<Record<string, number | ''>>({});
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});
  const [loaded,  setLoaded]  = useState(false);

  useEffect(() => {
    fetch(`/api/merch/stock?product_id=${productId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => {
        const map: Record<string, number | ''> = {};
        for (const row of (d.stock ?? [])) {
          const key = `${row.variant_id ?? ''}|${row.size ?? ''}`;
          map[key] = row.quantity;
        }
        setStock(map);
      })
      .finally(() => setLoaded(true));
  }, [productId, token]);

  async function saveStock(variantId: string | null, size: string | null, qty: number | '') {
    if (qty === '') return;
    const key = `${variantId ?? ''}|${size ?? ''}`;
    setSaving(prev => ({ ...prev, [key]: true }));
    try {
      await fetch('/api/merch/stock', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ product_id: productId, variant_id: variantId, size, quantity: qty as number }),
      });
      setStock(prev => ({ ...prev, [key]: qty }));
    } finally {
      setSaving(prev => ({ ...prev, [key]: false }));
    }
  }

  if (!loaded) return <div className="flex justify-center py-4"><Loader2 size={16} className="animate-spin text-[#731515]/40" /></div>;

  const keys = sizes.length > 0 ? sizes.map(s => ({ label: s, vId: variantId, size: s })) : [{ label: 'Qtà', vId: variantId, size: null as null }];

  return (
    <div className="space-y-2">
      {keys.map(({ label, vId, size }) => {
        const key = `${vId ?? ''}|${size ?? ''}`;
        const qty = stock[key] ?? '';
        const busy = saving[key] ?? false;
        return (
          <div key={key} className="flex items-center gap-3">
            {sizes.length > 0 && (
              <span className="text-[11px] text-[#7a4a4a] w-8 shrink-0 text-center"
                style={{ fontFamily: 'var(--font-nunito)' }}>{label}</span>
            )}
            <input
              type="number" min="0" step="1"
              value={qty}
              placeholder="—"
              onChange={e => {
                const v = parseInt(e.target.value, 10);
                if (!isNaN(v) && v >= 0) setStock(prev => ({ ...prev, [key]: v }));
              }}
              className={`${inp} w-24 text-center ${
                qty === 0                                     ? 'border-red-400 text-red-700 bg-red-50' :
                typeof qty === 'number' && qty <= 3          ? 'border-orange-400 text-orange-700 bg-orange-50' :
                ''
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
            {qty === 0 && (
              <span className="text-[10px] text-red-600 font-semibold tracking-wide"
                style={{ fontFamily: 'var(--font-nunito)' }}>Esaurito</span>
            )}
            {typeof qty === 'number' && qty > 0 && qty <= 3 && (
              <span className="text-[10px] text-orange-600 font-semibold tracking-wide"
                style={{ fontFamily: 'var(--font-nunito)' }}>Scorte basse</span>
            )}
            <button
              type="button"
              disabled={busy || qty === ''}
              onClick={() => saveStock(vId, size, qty)}
              className="text-[10px] tracking-[0.2em] px-3 py-2 bg-[#731515] text-white rounded-lg hover:bg-[#9b2323] disabled:opacity-40 transition-colors flex items-center gap-1"
            >
              {busy ? <Loader2 size={11} className="animate-spin" /> : 'SALVA'}
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ── Variant Manager Modal ─────────────────────────────────────────────────────

function VariantManagerModal({
  product,
  token,
  onClose,
}: {
  product: Product;
  token:   string;
  onClose: () => void;
}) {
  const [variants,  setVariants]  = useState<ProductVariant[]>([]);
  const [loading,   setLoading]   = useState(true);
  const [expandedId, setExpandedId] = useState<string | 'new' | null>(null);

  // Load variants
  useEffect(() => {
    fetch(`/api/merch/products/${product.id}/variants`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setVariants(d.variants ?? []))
      .finally(() => setLoading(false));
  }, [product.id, token]);

  function handleSaved(v: ProductVariant) {
    setVariants(prev => {
      const exists = prev.find(x => x.id === v.id);
      return exists ? prev.map(x => x.id === v.id ? v : x) : [...prev, v];
    });
    setExpandedId(null);
  }

  function handleDeleted(id: string) {
    setVariants(prev => prev.filter(x => x.id !== id));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
        className="bg-white rounded-xl border border-[#eddada] shadow-xl w-full max-w-lg my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#eddada]">
          <div>
            <h2 className="text-[15px] font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              Varianti Colore
            </h2>
            <p className="text-[11px] text-[#7a4a4a]/60 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
              {product.title}
            </p>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/40 hover:text-[#7a4a4a]"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="animate-spin text-[#731515]/40" />
            </div>
          )}

          {!loading && variants.length === 0 && expandedId !== 'new' && (
            <div className="border border-dashed border-[#eddada] rounded-xl py-10 text-center">
              <Palette size={26} className="text-[#7a4a4a]/20 mx-auto mb-2" />
              <p className="text-[12px] text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                Nessuna variante. Aggiungine una.
              </p>
            </div>
          )}

          {/* Variant rows */}
          {!loading && variants.map(v => (
            <VariantRow
              key={v.id}
              variant={v}
              productId={product.id}
              sizes={product.sizes}
              token={token}
              expanded={expandedId === v.id}
              onExpand={() => setExpandedId(id => id === v.id ? null : v.id)}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ))}

          {/* New variant form */}
          {expandedId === 'new' && (
            <VariantRow
              variant={null}
              productId={product.id}
              sizes={product.sizes}
              token={token}
              expanded
              onExpand={() => setExpandedId(null)}
              onSaved={handleSaved}
              onDeleted={() => {}}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-5 pt-2 border-t border-[#eddada]">
          <button
            onClick={() => setExpandedId('new')}
            disabled={expandedId === 'new'}
            className="w-full flex items-center justify-center gap-2 text-[10px] tracking-[0.25em] bg-white border border-dashed border-[#731515]/30 text-[#731515]/70 hover:border-[#731515] hover:text-[#731515] py-2.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <Plus size={12} /> NUOVA VARIANTE
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Single variant row (collapsed + expandable editor) ─────────────────────────

function VariantRow({
  variant,
  productId,
  sizes,
  token,
  expanded,
  onExpand,
  onSaved,
  onDeleted,
}: {
  variant:   ProductVariant | null;
  productId: string;
  sizes:     string[];
  token:     string;
  expanded:  boolean;
  onExpand:  () => void;
  onSaved:   (v: ProductVariant) => void;
  onDeleted: (id: string)        => void;
}) {
  const isNew = !variant;

  const [name,        setName]        = useState(variant?.color_name   ?? '');
  const [displayName, setDisplayName] = useState(variant?.display_name ?? '');
  const [hex,         setHex]         = useState(variant?.color_hex    ?? '#731515');
  const [images,      setImages]      = useState<string[]>(variant?.images ?? []);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm,  setConfirm]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSave() {
    if (!name.trim()) { setError('Il nome del colore è obbligatorio'); return; }
    setError('');
    setSaving(true);
    try {
      const body = { color_name: name.trim(), display_name: displayName.trim() || null, color_hex: hex, images };
      const url    = isNew
        ? `/api/merch/products/${productId}/variants`
        : `/api/merch/products/${productId}/variants/${variant!.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Errore'); return; }
      onSaved(data.variant);
    } catch { setError('Errore di rete.'); }
    finally  { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/merch/products/${productId}/variants/${variant!.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted(variant!.id);
    } finally { setDeleting(false); setConfirm(false); }
  }

  return (
    <div className="border border-[#eddada] rounded-xl overflow-hidden">
      {/* Collapsed header (not shown for new variants) */}
      {!isNew && (
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#fdf8f8] transition-colors"
          onClick={onExpand}
        >
          {/* Swatch */}
          <span
            className="w-6 h-6 rounded-full border border-black/10 shrink-0"
            style={{ background: variant!.color_hex }}
          />
          <span className="flex-1 text-[13px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
            {variant!.display_name || variant!.color_name}
            {variant!.display_name && variant!.display_name !== variant!.color_name && (
              <span className="ml-1.5 text-[10px] text-[#7a4a4a]/40">({variant!.color_name})</span>
            )}
          </span>
          {variant!.images.length > 0 && (
            <span className="text-[10px] text-[#7a4a4a]/40">
              {variant!.images.length} img
            </span>
          )}
          {/* Tiny image previews */}
          <div className="flex gap-1">
            {variant!.images.slice(0, 3).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="w-8 h-8 rounded object-cover border border-[#eddada]" />
            ))}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onExpand(); }}
            className="text-[#7a4a4a]/30 hover:text-[#731515] transition-colors"
          >
            <Pencil size={13} />
          </button>
        </div>
      )}

      {/* Editor (expanded) */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={`px-4 py-4 space-y-3 ${!isNew ? 'border-t border-[#eddada] bg-[#fdf8f8]' : ''}`}>
              <p className="text-[9px] tracking-[0.4em] text-[#731515]">
                {isNew ? 'NUOVA VARIANTE' : 'MODIFICA VARIANTE'}
              </p>

              {/* Name + hex */}
              <div className="flex gap-3 items-end">
                <div className="flex-1">
                  <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOME COLORE</label>
                  <input
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="es. Nero, Bordeaux…"
                    className={inp}
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  />
                </div>
                <div>
                  <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">COLORE</label>
                  <div className="relative">
                    <input
                      type="color"
                      value={hex}
                      onChange={e => setHex(e.target.value)}
                      className="w-12 h-10 rounded-lg border border-[#eddada] cursor-pointer p-0.5 bg-white"
                      title="Scegli colore"
                    />
                  </div>
                </div>
              </div>

              {/* Display name (shown in cart/checkout) */}
              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">NOME NEL CARRELLO</label>
                <input
                  value={displayName}
                  onChange={e => setDisplayName(e.target.value)}
                  placeholder="es. Midnight Blue, Bordeaux Red… (lascia vuoto per usare il nome colore)"
                  className={inp}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
                <p className="mt-1 text-[9px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Appare nel carrello e nel checkout al posto del nome colore interno.
                </p>
              </div>

              {/* Images for this variant */}
              <ImageUploader images={images} onChange={setImages} token={token} />

              {/* Stock per size (or single qty if no sizes) — only for saved variants */}
              {!isNew && (
                <div>
                  <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">DISPONIBILITÀ</label>
                  <StockSection productId={productId} sizes={sizes} token={token} variantId={variant!.id} />
                </div>
              )}

              {error && (
                <p className="text-[12px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    onBlur={() => setConfirm(false)}
                    className={`px-3 py-2 text-[10px] tracking-[0.2em] rounded-lg border transition-colors ${
                      confirm ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-[#eddada] text-[#7a4a4a]/50 hover:text-red-500 hover:border-red-200'
                    }`}
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : confirm ? 'CONFERMA' : <Trash2 size={12} />}
                  </button>
                )}
                <button
                  onClick={onExpand}
                  className="flex-1 py-2 bg-white border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.2em] hover:bg-[#fdf6f6] transition-colors rounded-lg"
                >
                  ANNULLA
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-[#731515] text-white text-[10px] tracking-[0.2em] hover:bg-[#9b2323] disabled:opacity-55 transition-colors rounded-lg flex items-center justify-center gap-1.5"
                >
                  {saving && <Loader2 size={11} className="animate-spin" />}
                  {isNew ? 'CREA' : 'SALVA'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Combination colour row (auto-saves on image change) ───────────────────────

function CombinationColorRow({
  productId,
  textVariantId,
  colorVariant,
  initialImages,
  token,
}: {
  productId:     string;
  textVariantId: string;
  colorVariant:  ProductVariant;
  initialImages: string[];
  token:         string;
}) {
  const [images,  setImages]  = useState<string[]>(initialImages);
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [saveErr, setSaveErr] = useState('');

  async function handleChange(imgs: string[]) {
    setImages(imgs);
    setSaving(true);
    setSaved(false);
    setSaveErr('');
    try {
      const res  = await fetch(`/api/merch/products/${productId}/variant-combinations`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({
          text_variant_id:  textVariantId,
          color_variant_id: colorVariant.id,
          images:           imgs,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setSaveErr(data.error ?? `Errore ${res.status}`);
      } else {
        setSaved(true);
        setTimeout(() => setSaved(false), 2500);
      }
    } catch {
      setSaveErr('Errore di rete');
    } finally {
      setSaving(false);
    }
  }

  async function handleSave() {
    await handleChange(images);
  }

  const label = colorVariant.display_name || colorVariant.color_name;

  return (
    <div className="border border-[#eddada] rounded-lg p-3 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-4 h-4 rounded-full border border-black/10 shrink-0" style={{ background: colorVariant.color_hex }} />
        <span className="text-[11px] text-[#1a0505] flex-1" style={{ fontFamily: 'var(--font-nunito)' }}>{label}</span>
        {saving && <Loader2 size={10} className="animate-spin text-[#731515]/40" />}
        {saved && !saving && (
          <span className="text-[9px] text-green-600 tracking-[0.2em] flex items-center gap-1">
            <CheckCircle size={10} /> SALVATO
          </span>
        )}
      </div>
      <ImageUploader images={images} onChange={setImages} token={token} />
      {saveErr && (
        <p className="text-[10px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{saveErr}</p>
      )}
      <button
        type="button"
        disabled={saving}
        onClick={handleSave}
        className="w-full flex items-center justify-center gap-1.5 text-[10px] tracking-[0.25em] py-2 bg-[#731515] text-white rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors"
      >
        {saving ? <Loader2 size={10} className="animate-spin" /> : null}
        {saving ? 'SALVATAGGIO…' : 'SALVA'}
      </button>
    </div>
  );
}

// ── Text Variant Manager Modal ─────────────────────────────────────────────────

function TextVariantManagerModal({
  product,
  token,
  onClose,
}: {
  product: Product;
  token:   string;
  onClose: () => void;
}) {
  const [textVariants,  setTextVariants]  = useState<ProductTextVariant[]>([]);
  const [colorVariants, setColorVariants] = useState<ProductVariant[]>([]);
  const [combinations,  setCombinations]  = useState<ProductCombination[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [expandedId,    setExpandedId]    = useState<string | 'new' | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/merch/products/${product.id}/text-variants`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`/api/merch/products/${product.id}/variants`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()),
      fetch(`/api/merch/products/${product.id}/variant-combinations`, {
        headers: { Authorization: `Bearer ${token}` },
      }).then(r => r.json()).catch(() => ({ combinations: [] })),
    ]).then(([tvData, vData, combData]) => {
      setTextVariants(tvData.textVariants ?? []);
      setColorVariants(vData.variants ?? []);
      setCombinations(combData.combinations ?? []);
    }).finally(() => setLoading(false));
  }, [product.id, token]);


  function handleSaved(tv: ProductTextVariant) {
    setTextVariants(prev => {
      const exists = prev.find(x => x.id === tv.id);
      return exists ? prev.map(x => x.id === tv.id ? tv : x) : [...prev, tv];
    });
    setExpandedId(null);
  }

  function handleDeleted(id: string) {
    setTextVariants(prev => prev.filter(x => x.id !== id));
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 px-4 py-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }} transition={{ duration: 0.18 }}
        className="bg-white rounded-xl border border-[#eddada] shadow-xl w-full max-w-lg my-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-[#eddada]">
          <div>
            <h2 className="text-[15px] font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              Varianti Testo
            </h2>
            <p className="text-[11px] text-[#7a4a4a]/60 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
              {product.title}
            </p>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/40 hover:text-[#7a4a4a]"><X size={18} /></button>
        </div>

        <div className="px-6 py-5 space-y-3 max-h-[70vh] overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-10">
              <Loader2 size={22} className="animate-spin text-[#731515]/40" />
            </div>
          )}

          {!loading && textVariants.length === 0 && expandedId !== 'new' && (
            <div className="border border-dashed border-[#eddada] rounded-xl py-10 text-center">
              <Type size={26} className="text-[#7a4a4a]/20 mx-auto mb-2" />
              <p className="text-[12px] text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                Nessuna variante testo. Aggiungine una.
              </p>
            </div>
          )}

          {!loading && textVariants.map(tv => (
            <TextVariantRow
              key={tv.id}
              textVariant={tv}
              productId={product.id}
              token={token}
              colorVariants={colorVariants}
              combinations={combinations.filter(c => c.text_variant_id === tv.id)}
              expanded={expandedId === tv.id}
              onExpand={() => setExpandedId(id => id === tv.id ? null : tv.id)}
              onSaved={handleSaved}
              onDeleted={handleDeleted}
            />
          ))}

          {expandedId === 'new' && (
            <TextVariantRow
              textVariant={null}
              productId={product.id}
              token={token}
              colorVariants={[]}
              combinations={[]}
              expanded
              onExpand={() => setExpandedId(null)}
              onSaved={handleSaved}
              onDeleted={() => {}}
            />
          )}
        </div>

        <div className="px-6 pb-5 pt-2 border-t border-[#eddada]">
          <button
            onClick={() => setExpandedId('new')}
            disabled={expandedId === 'new'}
            className="w-full flex items-center justify-center gap-2 text-[10px] tracking-[0.25em] bg-white border border-dashed border-[#731515]/30 text-[#731515]/70 hover:border-[#731515] hover:text-[#731515] py-2.5 rounded-lg transition-colors disabled:opacity-40"
          >
            <Plus size={12} /> NUOVA VARIANTE TESTO
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Single text variant row ────────────────────────────────────────────────────

function TextVariantRow({
  textVariant,
  productId,
  token,
  colorVariants,
  combinations,
  expanded,
  onExpand,
  onSaved,
  onDeleted,
}: {
  textVariant:   ProductTextVariant | null;
  productId:     string;
  token:         string;
  colorVariants: ProductVariant[];
  combinations:  ProductCombination[];
  expanded:      boolean;
  onExpand:      () => void;
  onSaved:       (tv: ProductTextVariant) => void;
  onDeleted:     (id: string) => void;
}) {
  const isNew = !textVariant;

  const [label,    setLabel]    = useState(textVariant?.text_label ?? '');
  const [images,   setImages]   = useState<string[]>(textVariant?.images ?? []);
  const [saving,   setSaving]   = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirm,  setConfirm]  = useState(false);
  const [error,    setError]    = useState('');

  async function handleSave() {
    if (!label.trim()) { setError('Il testo è obbligatorio'); return; }
    setError('');
    setSaving(true);
    try {
      const body = { text_label: label.trim(), images };
      const url    = isNew
        ? `/api/merch/products/${productId}/text-variants`
        : `/api/merch/products/${productId}/text-variants/${textVariant!.id}`;
      const method = isNew ? 'POST' : 'PATCH';
      const res    = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Errore'); return; }
      onSaved(data.textVariant);
    } catch { setError('Errore di rete.'); }
    finally  { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    try {
      await fetch(`/api/merch/products/${productId}/text-variants/${textVariant!.id}`, {
        method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
      });
      onDeleted(textVariant!.id);
    } finally { setDeleting(false); setConfirm(false); }
  }

  return (
    <div className="border border-[#eddada] rounded-xl overflow-hidden">
      {!isNew && (
        <div
          className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-[#fdf8f8] transition-colors"
          onClick={onExpand}
        >
          <Type size={14} className="text-[#731515]/40 shrink-0" />
          <span className="flex-1 text-[13px] text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
            {textVariant!.text_label}
          </span>
          {textVariant!.images.length > 0 && (
            <span className="text-[10px] text-[#7a4a4a]/40">{textVariant!.images.length} img</span>
          )}
          <div className="flex gap-1">
            {textVariant!.images.slice(0, 3).map((url, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={url} alt="" className="w-8 h-8 rounded object-cover border border-[#eddada]" />
            ))}
          </div>
          <button
            onClick={e => { e.stopPropagation(); onExpand(); }}
            className="text-[#7a4a4a]/30 hover:text-[#731515] transition-colors"
          >
            <Pencil size={13} />
          </button>
        </div>
      )}

      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="overflow-hidden"
          >
            <div className={`px-4 py-4 space-y-3 ${!isNew ? 'border-t border-[#eddada] bg-[#fdf8f8]' : ''}`}>
              <p className="text-[9px] tracking-[0.4em] text-[#731515]">
                {isNew ? 'NUOVA VARIANTE TESTO' : 'MODIFICA VARIANTE TESTO'}
              </p>

              <div>
                <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">TESTO INCISO</label>
                <input
                  value={label}
                  onChange={e => setLabel(e.target.value)}
                  placeholder="es. Vivo, Amore, Salute…"
                  className={inp}
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
                <p className="mt-1 text-[9px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
                  Questo testo apparirà come opzione selezionabile nella pagina prodotto.
                </p>
              </div>

              <ImageUploader images={images} onChange={setImages} token={token} />

              {/* Per-colour combination images — only visible when editing an existing variant */}
              {!isNew && colorVariants.length > 0 && (
                <div className="pt-2">
                  <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">
                    IMMAGINI PER COLORE
                  </label>
                  <p className="text-[9px] text-[#7a4a4a]/50 mb-3" style={{ fontFamily: 'var(--font-nunito)' }}>
                    Carica un&apos;immagine specifica per ogni combinazione testo+colore. Viene mostrata quando il cliente seleziona entrambi.
                  </p>
                  <div className="space-y-2">
                    {colorVariants.map(cv => {
                      const combo = combinations.find(c => c.color_variant_id === cv.id);
                      return (
                        <CombinationColorRow
                          key={cv.id}
                          productId={productId}
                          textVariantId={textVariant!.id}
                          colorVariant={cv}
                          initialImages={combo?.images ?? []}
                          token={token}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-[12px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
              )}

              <div className="flex gap-2 pt-1">
                {!isNew && (
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    onBlur={() => setConfirm(false)}
                    className={`px-3 py-2 text-[10px] tracking-[0.2em] rounded-lg border transition-colors ${
                      confirm ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-[#eddada] text-[#7a4a4a]/50 hover:text-red-500 hover:border-red-200'
                    }`}
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : confirm ? 'CONFERMA' : <Trash2 size={12} />}
                  </button>
                )}
                <button
                  onClick={onExpand}
                  className="flex-1 py-2 bg-white border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.2em] hover:bg-[#fdf6f6] transition-colors rounded-lg"
                >
                  ANNULLA
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 py-2 bg-[#731515] text-white text-[10px] tracking-[0.2em] hover:bg-[#9b2323] disabled:opacity-55 transition-colors rounded-lg flex items-center justify-center gap-1.5"
                >
                  {saving && <Loader2 size={11} className="animate-spin" />}
                  {isNew ? 'CREA' : 'SALVA'}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ── Product card ───────────────────────────────────────────────────────────────

function ProductCard({
  product, token, onEdit, onDelete, onVariants, onTextVariants,
}: {
  product:         Product;
  token:           string;
  onEdit:          (p: Product) => void;
  onDelete:        (id: string) => void;
  onVariants:      (p: Product) => void;
  onTextVariants:  (p: Product) => void;
}) {
  const [deleting, setDeleting]   = useState(false);
  const [confirm,  setConfirm]    = useState(false);
  const [toggling, setToggling]   = useState(false);
  const [visible,  setVisible]    = useState(product.visible);

  async function handleDelete() {
    if (!confirm) { setConfirm(true); return; }
    setDeleting(true);
    await fetch(`/api/merch/products/${product.id}`, {
      method: 'DELETE', headers: { Authorization: `Bearer ${token}` },
    });
    onDelete(product.id);
  }

  async function toggleVisible() {
    setToggling(true);
    const res  = await fetch(`/api/merch/products/${product.id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body:    JSON.stringify({ visible: !visible }),
    });
    const data = await res.json();
    if (data.product) setVisible(data.product.visible);
    setToggling(false);
  }

  // Use first available image across all color variants; neutral placeholder if none
  const thumb = (product.product_variants ?? [])
    .flatMap(v => v.images)
    .find(Boolean) ?? '';

  return (
    <div className="border border-[#eddada] rounded-xl overflow-hidden bg-white group">
      {/* Thumb */}
      <div className="relative w-full aspect-square bg-[#fdf6f6] overflow-hidden">
        {thumb
          ? <img src={thumb} alt={product.title} className="w-full h-full object-cover" /> // eslint-disable-line @next/next/no-img-element
          : <div className="w-full h-full flex items-center justify-center">
              <Package size={32} className="text-[#7a4a4a]/20" />
            </div>
        }
        {!visible && (
          <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
            <span className="text-white text-[9px] tracking-[0.35em] font-medium">NASCOSTO</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <p className="text-[13px] font-medium text-[#1a0505] leading-snug" style={{ fontFamily: 'var(--font-nunito)' }}>
            {product.title}
          </p>
          <p className="text-[13px] font-semibold text-[#731515] shrink-0">€{Number(product.price).toFixed(2)}</p>
        </div>

        {product.sizes.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {product.sizes.map(s => (
              <span key={s} className="text-[9px] tracking-[0.2em] px-1.5 py-0.5 bg-[#e8e0e0] text-[#7a4a4a] rounded">{s}</span>
            ))}
          </div>
        )}
        {product.colors.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2 items-center">
            {product.colors.map(c => (
              <span key={c} title={c}
                className="w-4 h-4 rounded-full border border-black/10 shrink-0"
                style={{ background: colorHex(c) }} />
            ))}
            <span className="text-[9px] text-[#7a4a4a]/50 ml-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
              {product.colors.length} colori
            </span>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 mt-3">
          <button onClick={() => onEdit(product)}
            className="flex-1 flex items-center justify-center gap-1.5 text-[10px] tracking-[0.2em] bg-white border border-[#eddada] text-[#7a4a4a] py-2 rounded-lg hover:bg-[#fdf6f6] transition-colors">
            <Pencil size={11} /> MODIFICA
          </button>
          <button onClick={() => onVariants(product)}
            className="p-2 rounded-lg bg-white border border-[#eddada] text-[#7a4a4a]/50 hover:text-[#731515] hover:border-[#731515]/30 transition-colors"
            title="Varianti colore">
            <Palette size={13} />
          </button>
          <button onClick={() => onTextVariants(product)}
            className="p-2 rounded-lg bg-white border border-[#eddada] text-[#7a4a4a]/50 hover:text-[#731515] hover:border-[#731515]/30 transition-colors"
            title="Varianti testo">
            <Type size={13} />
          </button>
          <button onClick={toggleVisible} disabled={toggling}
            className="p-2 rounded-lg bg-white border border-[#eddada] text-[#7a4a4a]/50 hover:text-[#731515] hover:border-[#731515]/30 transition-colors"
            title={visible ? 'Nascondi' : 'Mostra'}>
            {toggling ? <Loader2 size={13} className="animate-spin" /> : visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button onClick={handleDelete} disabled={deleting} onBlur={() => setConfirm(false)}
            className={`p-2 rounded-lg border transition-colors ${confirm ? 'bg-red-50 border-red-200 text-red-600' : 'bg-white border-[#eddada] text-[#7a4a4a]/50 hover:text-red-500 hover:border-red-200'}`}
            title={confirm ? 'Conferma eliminazione' : 'Elimina'}>
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Copy-to-clipboard button ───────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  function doCopy() {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }
  return (
    <button
      onClick={doCopy}
      title="Copia indirizzo"
      className="ml-1 inline-flex items-center justify-center w-6 h-6 rounded text-[#7a4a4a]/40 hover:text-[#731515] hover:bg-[#fde8e8] transition-colors"
    >
      {copied ? <CheckIcon size={11} className="text-green-600" /> : <Copy size={11} />}
    </button>
  );
}

// ── Shipping modal ─────────────────────────────────────────────────────────────

function ShippingModal({ order, token, onClose, onSent }: {
  order:   MerchOrder;
  token:   string;
  onClose: () => void;
  onSent:  (updated: MerchOrder) => void;
}) {
  const todayStr = new Date().toISOString().slice(0, 10);

  const [carrier,       setCarrier]       = useState(order.carrier ?? '');
  const [customCarrier, setCustomCarrier] = useState('');
  const [trackingCode,  setTrackingCode]  = useState(order.tracking_code ?? '');
  const [trackingUrl,   setTrackingUrl]   = useState(order.tracking_url ?? '');
  const [shippedAt,     setShippedAt]     = useState(order.shipped_at ?? todayStr);
  const [notes,         setNotes]         = useState(order.shipping_notes ?? '');
  const [sending,       setSending]       = useState(false);
  const [error,         setError]         = useState('');
  const [urlManual,     setUrlManual]     = useState(false); // tracks if user manually edited URL

  // Auto-generate tracking URL when carrier + code change (unless user edited it manually)
  useEffect(() => {
    if (urlManual) return;
    const effectiveCarrier = carrier === 'Altro' ? customCarrier : carrier;
    if (effectiveCarrier && trackingCode && CARRIER_TRACKING[effectiveCarrier]) {
      setTrackingUrl(autoTrackingUrl(effectiveCarrier, trackingCode));
    }
  }, [carrier, customCarrier, trackingCode, urlManual]);

  const isReinvio = order.status === 'spedito';

  async function handleSend() {
    setError('');
    setSending(true);
    try {
      const effectiveCarrier = carrier === 'Altro' ? customCarrier : carrier;
      const res = await fetch(`/api/merch/orders/${order.id}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          carrier:        effectiveCarrier || null,
          tracking_code:  trackingCode.trim() || null,
          tracking_url:   trackingUrl.trim() || null,
          shipped_at:     shippedAt || null,
          shipping_notes: notes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore invio email');
      onSent(data.order as MerchOrder);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore sconosciuto');
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Panel */}
      <div className="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#eddada] overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#eddada] bg-[#fdf6f6]">
          <div className="flex items-center gap-2">
            <Truck size={16} className="text-[#731515]" />
            <span className="text-sm tracking-[0.2em] text-[#1a0505]">
              {isReinvio ? 'MODIFICA E REINVIA' : 'DATI DI SPEDIZIONE'}
            </span>
          </div>
          <button onClick={onClose} className="text-[#7a4a4a]/50 hover:text-[#731515] transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">

          {/* Corriere */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">CORRIERE</label>
            <select
              value={carrier}
              onChange={e => { setCarrier(e.target.value); setUrlManual(false); }}
              className={inp}
            >
              <option value="">— Seleziona corriere —</option>
              {CARRIERS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            {carrier === 'Altro' && (
              <input
                type="text"
                value={customCarrier}
                onChange={e => setCustomCarrier(e.target.value)}
                placeholder="Nome corriere"
                className={`${inp} mt-2`}
              />
            )}
          </div>

          {/* Codice tracciamento */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">CODICE TRACCIAMENTO</label>
            <input
              type="text"
              value={trackingCode}
              onChange={e => { setTrackingCode(e.target.value); setUrlManual(false); }}
              placeholder="Es. 12345678901234"
              className={inp}
            />
          </div>

          {/* Link tracciamento */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">
              LINK TRACCIAMENTO
              {carrier && carrier !== 'Altro' && CARRIER_TRACKING[carrier] && (
                <span className="ml-2 normal-case tracking-normal text-[#7a4a4a]/50">— auto-generato da {carrier}</span>
              )}
            </label>
            <input
              type="url"
              value={trackingUrl}
              onChange={e => { setTrackingUrl(e.target.value); setUrlManual(true); }}
              placeholder="https://..."
              className={inp}
            />
            {trackingUrl && (
              <a
                href={trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center gap-1 text-[10px] text-[#731515] hover:underline"
              >
                Verifica link ↗
              </a>
            )}
          </div>

          {/* Data spedizione */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">DATA SPEDIZIONE</label>
            <input
              type="date"
              value={shippedAt}
              onChange={e => setShippedAt(e.target.value)}
              className={inp}
            />
          </div>

          {/* Note aggiuntive */}
          <div>
            <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-1.5">
              NOTE AGGIUNTIVE <span className="normal-case tracking-normal text-[#7a4a4a]/40">— opzionale</span>
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Es. Pacco in 2 colli, suonare al piano 3…"
              rows={2}
              className={`${inp} resize-none`}
            />
          </div>

          {error && (
            <p className="text-[11px] text-[#731515] bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#eddada] bg-[#fdf6f6]">
          <button
            onClick={handleSend}
            disabled={sending}
            className="w-full flex items-center justify-center gap-2 py-3.5 bg-[#731515] text-white text-[11px] tracking-[0.3em] rounded-xl hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {sending
              ? <Loader2 size={14} className="animate-spin" />
              : <Truck size={14} />
            }
            {sending
              ? 'INVIO IN CORSO…'
              : isReinvio
              ? 'REINVIA EMAIL DI SPEDIZIONE'
              : 'INVIA EMAIL DI SPEDIZIONE'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Order row ──────────────────────────────────────────────────────────────────

function OrderRow({ order, token, onUpdated }: {
  order:     MerchOrder;
  token:     string;
  onUpdated: (o: MerchOrder) => void;
}) {
  const [saving,           setSaving]           = useState(false);
  const [showShippingModal, setShowShippingModal] = useState(false);
  // ShippingModal has no scroll lock of its own — use the full treatment.
  useMobileOverlay(showShippingModal, () => setShowShippingModal(false));

  const isSpedito = order.status === 'spedito';
  const isEvaso   = order.status === 'evaso';

  async function toggleStatus() {
    setSaving(true);
    // spedito → evaso, evaso → da_evadere, da_evadere → evaso
    const next = isSpedito ? 'evaso' : isEvaso ? 'da_evadere' : 'evaso';
    try {
      const res  = await fetch(`/api/merch/orders/${order.id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ status: next }),
      });
      const data = await res.json();
      if (data.order) onUpdated(data.order);
    } finally { setSaving(false); }
  }

  const date = new Date(order.created_at).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const time = new Date(order.created_at).toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit',
  });

  // Build full shipping address string for copy
  const addressParts = [
    order.shipping_line1,
    order.shipping_line2,
    [order.shipping_postal, order.shipping_city, order.shipping_state].filter(Boolean).join(' '),
    order.shipping_country,
  ].filter(Boolean);
  const fullAddress = addressParts.join(', ');

  const borderColor = isSpedito ? 'border-blue-200' : isEvaso ? 'border-green-200' : 'border-[#eddada]';
  const headerBg    = isSpedito ? 'bg-blue-50'     : isEvaso ? 'bg-green-50'    : 'bg-[#fdf6f6]';

  return (
    <>
      <div className={`border rounded-xl overflow-hidden transition-colors ${borderColor}`}>

        {/* ── Header bar: status + date ── */}
        <div className={`flex items-center justify-between gap-3 px-4 py-2.5 ${headerBg}`}>
          <button onClick={toggleStatus} disabled={saving}
            className={`flex items-center gap-1.5 text-[9px] tracking-[0.3em] font-medium px-3 py-1.5 rounded-full transition-colors ${
              isSpedito
                ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                : isEvaso
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
            }`}>
            {saving
              ? <Loader2 size={10} className="animate-spin" />
              : isSpedito ? <Truck size={10} />
              : isEvaso   ? <CheckCircle size={10} />
              :              <Clock size={10} />
            }
            {isSpedito ? 'SPEDITO' : isEvaso ? 'EVASO' : 'DA EVADERE'}
          </button>
          <span className="text-[10px] text-[#7a4a4a]/50" style={{ fontFamily: 'var(--font-nunito)' }}>
            {date} · {time}
          </span>
        </div>

        <div className="p-4 bg-white space-y-4">

          {/* ── Cliente ── */}
          <div className="flex flex-wrap gap-x-6 gap-y-1">
            <div>
              <p className="text-[8px] tracking-[0.35em] text-[#7a4a4a]/40 mb-0.5">CLIENTE</p>
              <p className="text-[13px] font-semibold text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
                {order.customer_name ?? '—'}
              </p>
            </div>
            {order.customer_email && (
              <div>
                <p className="text-[8px] tracking-[0.35em] text-[#7a4a4a]/40 mb-0.5">EMAIL</p>
                <p className="text-[12px] text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {order.customer_email}
                </p>
              </div>
            )}
            {order.phone && (
              <div>
                <p className="text-[8px] tracking-[0.35em] text-[#7a4a4a]/40 mb-0.5 flex items-center gap-1"><Phone size={8} /> TELEFONO</p>
                <p className="text-[12px] text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                  {order.phone}
                </p>
              </div>
            )}
          </div>

          {/* ── Indirizzo spedizione ── */}
          {fullAddress ? (
            <div>
              <p className="text-[8px] tracking-[0.35em] text-[#7a4a4a]/40 mb-1.5 flex items-center gap-1">
                <MapPin size={8} /> INDIRIZZO DI SPEDIZIONE
                <CopyButton text={fullAddress} />
              </p>
              <div className="bg-[#fdf6f6] border border-[#eddada] rounded-lg px-3 py-2.5 text-[12px] text-[#3a1a1a] leading-relaxed" style={{ fontFamily: 'var(--font-nunito)' }}>
                {order.shipping_line1 && <p>{order.shipping_line1}</p>}
                {order.shipping_line2 && <p>{order.shipping_line2}</p>}
                <p>{[order.shipping_postal, order.shipping_city, order.shipping_state].filter(Boolean).join(' ')}</p>
                {order.shipping_country && <p className="text-[#7a4a4a]/60">{order.shipping_country}</p>}
              </div>
            </div>
          ) : (
            <div>
              <p className="text-[8px] tracking-[0.35em] text-[#7a4a4a]/40 mb-1 flex items-center gap-1"><MapPin size={8} /> INDIRIZZO DI SPEDIZIONE</p>
              <p className="text-[11px] text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>Non disponibile (ordine precedente all&apos;aggiornamento)</p>
            </div>
          )}

          {/* ── Note di consegna ── */}
          {order.delivery_notes && (
            <div>
              <p className="text-[8px] tracking-[0.35em] text-[#7a4a4a]/40 mb-1 flex items-center gap-1"><StickyNote size={8} /> NOTE CONSEGNA</p>
              <p className="text-[12px] text-[#3a1a1a] bg-amber-50 border border-amber-200 rounded-lg px-3 py-2" style={{ fontFamily: 'var(--font-nunito)' }}>
                {order.delivery_notes}
              </p>
            </div>
          )}

          {/* ── Tracking dati (dopo spedizione) ── */}
          {isSpedito && (order.carrier || order.tracking_code) && (
            <div>
              <p className="text-[8px] tracking-[0.35em] text-blue-500/70 mb-1.5 flex items-center gap-1"><Truck size={8} /> TRACKING SPEDIZIONE</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 space-y-1.5" style={{ fontFamily: 'var(--font-nunito)' }}>
                {order.carrier && (
                  <p className="text-[12px] text-[#1a0505]"><span className="text-[#7a4a4a]/50">Corriere:</span> <strong>{order.carrier}</strong></p>
                )}
                {order.tracking_code && (
                  <p className="text-[12px] text-[#1a0505] font-mono">{order.tracking_code}</p>
                )}
                {order.tracking_url && (
                  <a
                    href={order.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-blue-600 hover:underline"
                  >
                    Traccia il pacco ↗
                  </a>
                )}
                {order.shipped_at && (
                  <p className="text-[11px] text-[#7a4a4a]/50">
                    Spedito il {new Date(order.shipped_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' })}
                  </p>
                )}
                {order.shipping_notes && (
                  <p className="text-[11px] text-[#7a4a4a] italic">{order.shipping_notes}</p>
                )}
              </div>
            </div>
          )}

          {/* ── Articoli ── */}
          <div>
            <p className="text-[8px] tracking-[0.35em] text-[#7a4a4a]/40 mb-1.5 flex items-center gap-1"><Package size={8} /> ARTICOLI</p>
            <div className="space-y-1">
              {order.items.map((item, i) => (
                <div key={i} className="flex items-center justify-between gap-2 text-[12px]" style={{ fontFamily: 'var(--font-nunito)' }}>
                  <span className="text-[#3a1a1a]">
                    <span className="font-semibold">{item.qty}×</span> {item.name}
                  </span>
                  <span className="text-[#7a4a4a]/60 shrink-0">€{Number(item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-end mt-2 pt-2 border-t border-[#eddada]">
              <span className="text-[14px] font-bold text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
                Totale: €{Number(order.total).toFixed(2)}
              </span>
            </div>
          </div>

          {/* ── Azione spedizione ── */}
          {order.customer_email && (
            <div className={`flex items-center justify-end pt-3 border-t ${isSpedito ? 'border-blue-100' : isEvaso ? 'border-green-100' : 'border-[#eddada]'}`}>
              <button
                onClick={() => setShowShippingModal(true)}
                disabled={!isEvaso && !isSpedito}
                title={!isEvaso && !isSpedito ? 'Segna come evaso prima di inviare la mail' : undefined}
                className={`flex items-center gap-1.5 text-[9px] tracking-[0.25em] px-3 py-1.5 rounded-full border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  isSpedito
                    ? 'border-blue-300 text-blue-700 hover:bg-blue-50'
                    : 'border-green-300 text-green-700 hover:bg-green-50'
                }`}
              >
                <Truck size={10} />
                {isSpedito ? 'REINVIA EMAIL' : 'INVIA MAIL SPEDIZIONE'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* ── Shipping modal ── */}
      {showShippingModal && (
        <ShippingModal
          order={order}
          token={token}
          onClose={() => setShowShippingModal(false)}
          onSent={updated => { onUpdated(updated); setShowShippingModal(false); }}
        />
      )}
    </>
  );
}

// ── Stock overview tab ────────────────────────────────────────────────────────

interface StockRow {
  id:         string;
  product_id: string;
  variant_id: string | null;
  size:       string | null;
  quantity:   number;
  updated_at: string;
  products: {
    title:  string;
    images: string[];
  } | null;
  product_variants: {
    color_name:   string;
    display_name: string | null;
    images:       string[];
    sort_order:   number;
  } | null;
}

interface AuditRow {
  id:         string;
  product_id: string;
  variant_id: string | null;
  size:       string | null;
  old_qty:    number;
  new_qty:    number;
  reason:     string;
  changed_by: string | null;
  created_at: string;
}

// Standard size ordering for display
const SIZE_ORDER = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '2XL'];
function sizeRank(s: string | null) {
  if (!s) return -1;
  const i = SIZE_ORDER.indexOf(s.toUpperCase());
  return i === -1 ? 99 : i;
}

function sortStockRows(rows: StockRow[]): StockRow[] {
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

function StockOverviewTab({ token }: { token: string }) {
  const [stock,   setStock]   = useState<StockRow[]>([]);
  const [log,     setLog]     = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editQty, setEditQty] = useState<Record<string, number>>({});
  const [saving,  setSaving]  = useState<Record<string, boolean>>({});

  function loadAll(tk: string) {
    return Promise.all([
      fetch('/api/merch/stock?all=true', { headers: { Authorization: `Bearer ${tk}` } })
        .then(r => r.json())
        .then(d => {
          const rows: StockRow[] = d.stock ?? [];
          setStock(rows);
          const map: Record<string, number> = {};
          for (const row of rows) map[row.id] = row.quantity;
          setEditQty(map);
        })
        .catch(() => {}),
      fetch('/api/merch/stock/log', { headers: { Authorization: `Bearer ${tk}` } })
        .then(r => r.json()).then(d => setLog(d.log ?? [])).catch(() => {}),
    ]);
  }

  useEffect(() => {
    loadAll(token).finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function saveQty(row: StockRow) {
    const qty = editQty[row.id];
    if (qty === undefined || qty === row.quantity) return; // no change
    setSaving(prev => ({ ...prev, [row.id]: true }));
    try {
      const res = await fetch('/api/merch/stock', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ product_id: row.product_id, variant_id: row.variant_id, size: row.size, quantity: qty }),
      });
      if (res.ok) {
        setStock(prev => prev.map(s => s.id === row.id ? { ...s, quantity: qty } : s));
        // Refresh audit log
        fetch('/api/merch/stock/log', { headers: { Authorization: `Bearer ${token}` } })
          .then(r => r.json()).then(d => setLog(d.log ?? [])).catch(() => {});
      }
    } finally {
      setSaving(prev => ({ ...prev, [row.id]: false }));
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <Loader2 size={24} className="animate-spin text-[#731515]/40" />
    </div>
  );

  const sorted  = sortStockRows(stock);
  const noStock = stock.filter(s => s.quantity === 0);
  const okStock = stock.filter(s => s.quantity > 0);

  // Group sorted rows by product_id to show product headers
  const groups: { productId: string; title: string; rows: StockRow[] }[] = [];
  for (const row of sorted) {
    const last = groups[groups.length - 1];
    if (last && last.productId === row.product_id) {
      last.rows.push(row);
    } else {
      groups.push({ productId: row.product_id, title: row.products?.title ?? row.product_id, rows: [row] });
    }
  }

  return (
    <div className="space-y-8">

      {/* Summary — 2 chips only (remove "Scorte basse") */}
      <div className="grid grid-cols-2 gap-4">
        <div className="border border-red-200 rounded-xl p-4 bg-red-50 text-center">
          <p className="text-2xl font-light text-red-600" style={{ fontFamily: 'var(--font-syne)' }}>{noStock.length}</p>
          <p className="text-[9px] tracking-[0.35em] text-red-400 mt-1">ESAURITI</p>
        </div>
        <div className="border border-green-200 rounded-xl p-4 bg-green-50 text-center">
          <p className="text-2xl font-light text-green-600" style={{ fontFamily: 'var(--font-syne)' }}>{okStock.length}</p>
          <p className="text-[9px] tracking-[0.35em] text-green-400 mt-1">DISPONIBILI</p>
        </div>
      </div>

      {/* Stock table */}
      {stock.length > 0 ? (
        <div>
          <p className="text-[9px] tracking-[0.35em] text-[#731515] mb-3">DISPONIBILITÀ PRODOTTI</p>
          <div className="border border-[#eddada] rounded-xl overflow-x-auto">
            <table className="w-full min-w-[440px] text-[12px]" style={{ fontFamily: 'var(--font-nunito)' }}>
              <thead>
                <tr className="bg-[#fdf6f6] border-b border-[#eddada]">
                  <th className="w-12" />
                  <th className="text-left px-3 py-2.5 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal">PRODOTTO / VARIANTE</th>
                  <th className="text-center px-3 py-2.5 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal w-16">TAGLIA</th>
                  <th className="text-right px-4 py-2.5 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal w-36">QUANTITÀ</th>
                </tr>
              </thead>
              <tbody>
                {groups.map(group => (
                  group.rows.map((row, rowIdx) => {
                    const qty       = editQty[row.id] ?? row.quantity;
                    const isBusy    = saving[row.id] ?? false;
                    const isDirty   = qty !== row.quantity;
                    const isZero    = row.quantity === 0;
                    const isLow     = row.quantity > 0 && row.quantity <= 3;
                    const thumb     = row.product_variants?.images?.[0] ?? row.products?.images?.[0] ?? null;
                    const varName   = row.product_variants?.display_name || row.product_variants?.color_name || null;
                    const isFirst   = rowIdx === 0;
                    const isLast    = rowIdx === group.rows.length - 1;
                    const rowBg     = isZero ? 'bg-red-50/50' : isLow ? 'bg-orange-50/50' : 'bg-white';

                    return (
                      <tr
                        key={row.id}
                        className={`${rowBg} ${isLast ? '' : 'border-b border-[#eddada]'}`}
                      >
                        {/* Thumbnail */}
                        <td className={`pl-3 py-1.5 ${isFirst ? 'pt-3' : ''} ${isLast ? 'pb-3' : ''}`}>
                          <div className="w-10 h-10 rounded-lg overflow-hidden bg-[#f5eded] shrink-0 flex items-center justify-center">
                            {thumb
                              ? <img src={thumb} alt="" className="w-full h-full object-cover" />
                              : <span className="text-lg opacity-20">🍷</span>
                            }
                          </div>
                        </td>

                        {/* Name + variant */}
                        <td className={`px-3 py-1.5 ${isFirst ? 'pt-3' : ''} ${isLast ? 'pb-3' : ''}`}>
                          <p className="text-[12px] font-medium text-[#1a0505] leading-tight">
                            {group.title}
                            {varName && (
                              <span className="font-normal text-[#7a4a4a]"> — {varName}</span>
                            )}
                          </p>
                        </td>

                        {/* Size */}
                        <td className={`px-3 py-1.5 text-center text-[#7a4a4a] ${isFirst ? 'pt-3' : ''} ${isLast ? 'pb-3' : ''}`}>
                          {row.size ?? <span className="text-[#7a4a4a]/30">—</span>}
                        </td>

                        {/* Editable quantity */}
                        <td className={`px-4 py-1.5 text-right ${isFirst ? 'pt-3' : ''} ${isLast ? 'pb-3' : ''}`}>
                          <div className="flex items-center justify-end gap-2">
                            <input
                              type="number"
                              min="0"
                              step="1"
                              value={qty}
                              onChange={e => {
                                const v = parseInt(e.target.value, 10);
                                if (!isNaN(v) && v >= 0) setEditQty(prev => ({ ...prev, [row.id]: v }));
                              }}
                              onBlur={() => saveQty(row)}
                              onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                              className={`w-16 text-center text-[12px] border rounded-lg px-2 py-1 focus:outline-none focus:border-[#731515]/50 transition-colors ${
                                isZero ? 'border-red-300 text-red-700 bg-red-50'
                                : isLow ? 'border-orange-300 text-orange-700 bg-orange-50'
                                : 'border-[#eddada] text-[#1a0505] bg-white'
                              }`}
                            />
                            {isBusy && <Loader2 size={11} className="animate-spin text-[#731515]/50 shrink-0" />}
                            {!isBusy && isDirty && (
                              <button
                                onClick={() => saveQty(row)}
                                className="text-[9px] tracking-[0.2em] px-2 py-1 bg-[#731515] text-white rounded-lg hover:bg-[#9b2323] transition-colors shrink-0"
                              >
                                OK
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-[10px] text-[#7a4a4a]/40 mt-2 text-right" style={{ fontFamily: 'var(--font-nunito)' }}>
            Modifica il numero e premi Invio o clicca fuori per salvare
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-[#eddada] rounded-xl p-12 text-center">
          <p className="text-sm text-[#7a4a4a]/40 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
            Nessun dato di stock ancora. Imposta le disponibilità nella sezione Prodotti.
          </p>
        </div>
      )}

      {/* Audit log */}
      {log.length > 0 && (
        <div>
          <p className="text-[9px] tracking-[0.35em] text-[#731515] mb-3">STORICO MODIFICHE STOCK</p>
          <div className="border border-[#eddada] rounded-xl overflow-x-auto">
            <table className="w-full min-w-[640px] text-[11px]" style={{ fontFamily: 'var(--font-nunito)' }}>
              <thead>
                <tr className="bg-[#fdf6f6] border-b border-[#eddada]">
                  <th className="text-left px-4 py-2 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal">DATA</th>
                  <th className="text-left px-4 py-2 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal">TAGLIA</th>
                  <th className="text-right px-4 py-2 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal">PRIMA</th>
                  <th className="text-right px-4 py-2 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal">DOPO</th>
                  <th className="text-left px-4 py-2 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal">MOTIVO</th>
                  <th className="text-left px-4 py-2 text-[9px] tracking-[0.3em] text-[#7a4a4a]/50 font-normal">DA</th>
                </tr>
              </thead>
              <tbody>
                {log.map(row => {
                  const delta = row.new_qty - row.old_qty;
                  const reasonLabel = row.reason === 'sale' ? '🛒 Vendita' : row.reason === 'oversell' ? '⚠ Oversell' : '✏ Manuale';
                  return (
                    <tr key={row.id} className={`border-b border-[#eddada] last:border-0 ${row.reason === 'oversell' ? 'bg-red-50/60' : 'bg-white'}`}>
                      <td className="px-4 py-2 text-[#7a4a4a]/60 whitespace-nowrap">
                        {new Date(row.created_at).toLocaleDateString('it-IT', { day: '2-digit', month: 'short' })}{' '}
                        {new Date(row.created_at).toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="px-4 py-2 text-[#7a4a4a]">{row.size ?? '—'}</td>
                      <td className="px-4 py-2 text-right text-[#7a4a4a]">{row.old_qty}</td>
                      <td className={`px-4 py-2 text-right font-medium ${delta > 0 ? 'text-green-700' : delta < 0 ? 'text-red-700' : 'text-[#7a4a4a]'}`}>
                        {delta > 0 ? `+${delta}` : delta} → {row.new_qty}
                      </td>
                      <td className="px-4 py-2 text-[#7a4a4a]">{reasonLabel}</td>
                      <td className="px-4 py-2 text-[#7a4a4a]/60 truncate max-w-[120px]">{row.changed_by ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MerchManager() {
  const [tab,      setTab]      = useState<'products' | 'orders' | 'stock'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders,   setOrders]   = useState<MerchOrder[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [token,    setToken]    = useState('');
  const [showModal,        setShowModal]        = useState(false);
  const [editing,          setEditing]          = useState<Product | null>(null);
  // ProductModal, VariantManagerModal and TextVariantManagerModal have no
  // scroll lock of their own — use the full treatment for all three.
  useMobileOverlay(showModal, () => { setShowModal(false); setEditing(null); });
  const [variantModal,     setVariantModal]     = useState<Product | null>(null);
  const [textVariantModal, setTextVariantModal] = useState<Product | null>(null);
  useMobileOverlay(!!variantModal, () => setVariantModal(null));
  useMobileOverlay(!!textVariantModal, () => setTextVariantModal(null));

  // ── Global shipping setting ──
  const [globalShipping,      setGlobalShipping]      = useState<string>('');
  const [shippingEditVal,     setShippingEditVal]      = useState<string>('');
  const [shippingEditing,     setShippingEditing]      = useState(false);
  const [shippingSaving,      setShippingSaving]       = useState(false);

  const loadProducts = useCallback(async (tk: string) => {
    const res  = await fetch('/api/merch/products', { headers: { Authorization: `Bearer ${tk}` } });
    const data = await res.json();
    if (data.products) setProducts(data.products);
  }, []);

  const loadOrders = useCallback(async (tk: string) => {
    const res  = await fetch('/api/merch/orders', { headers: { Authorization: `Bearer ${tk}` } });
    const data = await res.json();
    if (data.orders) setOrders(data.orders);
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) { setLoading(false); return; }
      setToken(session.access_token);
      const [,, settingsRes] = await Promise.all([
        loadProducts(session.access_token),
        loadOrders(session.access_token),
        fetch('/api/merch/settings').then(r => r.json()),
      ]);
      if (settingsRes?.shipping_cost != null) {
        const val = String(settingsRes.shipping_cost);
        setGlobalShipping(val);
        setShippingEditVal(val);
      }
      setLoading(false);
    });
  }, [loadProducts, loadOrders]);

  async function saveGlobalShipping() {
    setShippingSaving(true);
    try {
      await fetch('/api/merch/settings', {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ shipping_cost: Number(shippingEditVal) }),
      });
      setGlobalShipping(shippingEditVal);
      setShippingEditing(false);
    } finally { setShippingSaving(false); }
  }

  // ── Realtime subscriptions (orders + products + variants) ────────────────
  useEffect(() => {
    if (!token) return;
    supabase.realtime.setAuth(token);
    const channel = supabase
      .channel('merch_realtime')
      // Orders: granular state updates (avoid full refetch)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'merch_orders' },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            setOrders(prev => [payload.new as MerchOrder, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            setOrders(prev => prev.map(o => o.id === (payload.new as MerchOrder).id ? payload.new as MerchOrder : o));
          } else if (payload.eventType === 'DELETE') {
            setOrders(prev => prev.filter(o => o.id !== (payload.old as MerchOrder).id));
          }
        },
      )
      // Products + variants: full refetch (simpler, includes joined variant images)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        loadProducts(token);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_variants' }, () => {
        loadProducts(token);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'product_text_variants' }, () => {
        loadProducts(token);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [token, loadProducts]);

  function handleSaved(p: Product) {
    setProducts(prev => {
      const exists = prev.find(x => x.id === p.id);
      return exists ? prev.map(x => x.id === p.id ? p : x) : [p, ...prev];
    });
  }

  const daEvadere = orders.filter(o => o.status === 'da_evadere').length;
  const evaso     = orders.filter(o => o.status === 'evaso').length;
  const spedito   = orders.filter(o => o.status === 'spedito').length;

  return (
    <>
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[clamp(1.6rem,2.5vw,2.2rem)] font-light text-[#1a0505] leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-syne)' }}>Gestione Merch</h1>
          <p className="mt-2 text-sm text-[#7a4a4a]/70 font-light" style={{ fontFamily: 'var(--font-nunito)' }}>
            Prodotti dello shop e ordini ricevuti.
          </p>
          <div className="mt-5 h-px w-16 bg-[#731515]/30" />
        </div>
        {tab === 'products' && (
          <button onClick={() => { setEditing(null); setShowModal(true); }}
            className="flex items-center gap-2 text-[10px] tracking-[0.3em] text-white bg-[#731515] px-5 py-3 hover:bg-[#9b2323] transition-colors rounded-lg shrink-0 mt-1">
            <Plus size={13} /> NUOVO PRODOTTO
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-[#eddada]">
        {([
          { id: 'products', label: 'PRODOTTI',           icon: <Package size={13} /> },
          { id: 'orders',   label: `ORDINI${orders.length ? ` (${orders.length})` : ''}`, icon: <ShoppingBag size={13} /> },
          { id: 'stock',    label: 'STOCK',              icon: <CheckCircle size={13} /> },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-[0.3em] transition-colors border-b-2 -mb-px ${
              tab === t.id
                ? 'border-[#731515] text-[#731515]'
                : 'border-transparent text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
            }`}>
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {loading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 size={28} className="animate-spin text-[#731515]/40" />
        </div>
      )}

      {/* ── Products tab ── */}
      {!loading && tab === 'products' && (
        <>
          {/* Global shipping settings */}
          <div className="flex flex-wrap items-center justify-between gap-3 border border-[#eddada] rounded-xl px-4 py-3 mb-5 bg-white">
            <div className="flex items-center gap-3">
              <Truck size={14} className="text-[#731515]" />
              <span className="text-[11px] tracking-[0.2em] text-[#7a4a4a]">SPEDIZIONE GLOBALE</span>
              {!shippingEditing && (
                <span className="text-[13px] font-medium text-[#1a0505]">
                  {globalShipping !== '' ? `€${Number(globalShipping).toFixed(2)}` : '—'}
                </span>
              )}
            </div>
            {shippingEditing ? (
              <div className="flex items-center gap-2">
                <input type="number" min="0" step="0.01" value={shippingEditVal}
                  onChange={e => setShippingEditVal(e.target.value)}
                  className={`${inp} w-24 text-center`} />
                <button onClick={saveGlobalShipping} disabled={shippingSaving}
                  className="px-3 py-1.5 bg-[#731515] text-white text-[10px] tracking-[0.2em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 flex items-center gap-1">
                  {shippingSaving ? <Loader2 size={11} className="animate-spin" /> : 'SALVA'}
                </button>
                <button onClick={() => { setShippingEditing(false); setShippingEditVal(globalShipping); }}
                  className="px-3 py-1.5 bg-white border border-[#eddada] text-[#7a4a4a] text-[10px] rounded-lg hover:bg-[#fdf6f6]">
                  ANNULLA
                </button>
              </div>
            ) : (
              <button onClick={() => setShippingEditing(true)}
                className="p-2 rounded-lg text-[#7a4a4a]/50 hover:text-[#731515] hover:bg-[#fdf6f6] transition-colors">
                <Pencil size={13} />
              </button>
            )}
          </div>

          {products.length === 0 ? (
            <div className="border border-dashed border-[#eddada] rounded-xl p-16 text-center">
              <Package size={32} className="text-[#7a4a4a]/20 mx-auto mb-3" />
              <p className="text-sm text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                Nessun prodotto. Clicca &ldquo;Nuovo prodotto&rdquo; per iniziare.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map(p => (
                <ProductCard key={p.id} product={p} token={token}
                  onEdit={p => { setEditing(p); setShowModal(true); }}
                  onDelete={id => setProducts(prev => prev.filter(x => x.id !== id))}
                  onVariants={p => setVariantModal(p)}
                  onTextVariants={p => setTextVariantModal(p)}
                />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Orders tab ── */}
      {!loading && tab === 'orders' && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Totale',      value: orders.length, color: 'text-[#1a0505]' },
              { label: 'Da evadere',  value: daEvadere,     color: 'text-orange-600' },
              { label: 'Evasi',       value: evaso,         color: 'text-green-600'  },
              { label: 'Spediti',     value: spedito,       color: 'text-blue-600'   },
            ].map(s => (
              <div key={s.label} className="border border-[#eddada] rounded-xl p-4 text-center bg-white">
                <p className={`text-2xl font-light ${s.color}`} style={{ fontFamily: 'var(--font-syne)' }}>{s.value}</p>
                <p className="text-[9px] tracking-[0.35em] text-[#7a4a4a]/50 mt-1 uppercase">{s.label}</p>
              </div>
            ))}
          </div>

          {orders.length === 0 ? (
            <div className="border border-dashed border-[#eddada] rounded-xl p-16 text-center">
              <ShoppingBag size={32} className="text-[#7a4a4a]/20 mx-auto mb-3" />
              <p className="text-sm text-[#7a4a4a]/50 italic" style={{ fontFamily: 'var(--font-nunito)' }}>
                Nessun ordine ancora. Quando arrivano appaiono qui automaticamente.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map(o => (
                <OrderRow key={o.id} order={o} token={token}
                  onUpdated={u => setOrders(prev => prev.map(x => x.id === u.id ? u : x))} />
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Stock tab ── */}
      {!loading && tab === 'stock' && (
        <StockOverviewTab token={token} />
      )}

      {/* Product modal */}
      <AnimatePresence>
        {showModal && (
          <ProductModal
            product={editing} token={token}
            onClose={() => { setShowModal(false); setEditing(null); }}
            onSaved={handleSaved}
          />
        )}
      </AnimatePresence>

      {/* Variant manager modal */}
      <AnimatePresence>
        {variantModal && (
          <VariantManagerModal
            product={variantModal}
            token={token}
            onClose={() => setVariantModal(null)}
          />
        )}
      </AnimatePresence>

      {/* Text variant manager modal */}
      <AnimatePresence>
        {textVariantModal && (
          <TextVariantManagerModal
            product={textVariantModal}
            token={token}
            onClose={() => setTextVariantModal(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
