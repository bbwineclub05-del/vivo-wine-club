'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus, Pencil, Trash2, X, Loader2, Eye, EyeOff,
  Package, ShoppingBag, CheckCircle, Clock, ImagePlus, Palette, Truck,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
);

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface OrderItem { name: string; qty: number; price: number }

interface MerchOrder {
  id:               string;
  stripe_session_id: string | null;
  customer_name:    string | null;
  customer_email:   string | null;
  items:            OrderItem[];
  total:            number;
  status:           'da_evadere' | 'evaso';
  created_at:       string;
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
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
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
        if (data.url) uploaded.push(data.url);
      }
      onChange([...images, ...uploaded]);
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
        className="flex items-center gap-2 text-[10px] tracking-[0.25em] border border-dashed border-[#eddada] text-[#7a4a4a]/60 hover:border-[#731515]/40 hover:text-[#731515]/60 px-4 py-2.5 rounded-lg transition-colors disabled:opacity-50 w-full justify-center"
      >
        {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
        {uploading ? 'UPLOAD IN CORSO…' : 'AGGIUNGI IMMAGINI'}
      </button>
      <input
        ref={fileRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => handleFiles(e.target.files)}
      />
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

  const [title,        setTitle]        = useState(product?.title       ?? '');
  const [description,  setDescription]  = useState(product?.description ?? '');
  const [price,        setPrice]        = useState(product?.price       ?? '');
  const [sizes,        setSizes]        = useState<string[]>(product?.sizes  ?? []);
  const [visible,      setVisible]      = useState(product?.visible     ?? true);
  // shipping_cost: '' = inherit global, number string = override
  const [shippingCost, setShippingCost] = useState<string>(
    product?.shipping_cost != null ? String(product.shipping_cost) : ''
  );
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');

  function toggleSize(s: string) {
    setSizes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !price) { setError('Titolo e prezzo sono obbligatori'); return; }
    setError('');
    setSaving(true);

    try {
      const body = {
        title, description, price: Number(price), sizes, visible,
        shipping_cost: shippingCost !== '' ? Number(shippingCost) : null,
      };
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
            <input required value={title} onChange={e => setTitle(e.target.value)}
              placeholder="es. Classic Tee" className={inp} style={{ fontFamily: 'var(--font-nunito)' }} />
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

          {/* Stock — only for products without color variants (stock per variant is managed in Varianti Colore) */}
          {editing && product!.colors.length === 0 && (
            <div>
              <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">DISPONIBILITÀ</label>
              <StockSection productId={product!.id} sizes={sizes} token={token} />
            </div>
          )}

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
            <p className="text-[12px] text-[#731515] bg-[#731515]/6 border border-[#731515]/15 px-3 py-2 rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}>{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.25em] hover:bg-[#fdf6f6] transition-colors rounded-lg">
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
              className={`${inp} w-24 text-center`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
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
            className="w-full flex items-center justify-center gap-2 text-[10px] tracking-[0.25em] border border-dashed border-[#731515]/30 text-[#731515]/70 hover:border-[#731515] hover:text-[#731515] py-2.5 rounded-lg transition-colors disabled:opacity-40"
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
                      confirm ? 'bg-red-50 border-red-200 text-red-600' : 'border-[#eddada] text-[#7a4a4a]/50 hover:text-red-500 hover:border-red-200'
                    }`}
                  >
                    {deleting ? <Loader2 size={12} className="animate-spin" /> : confirm ? 'CONFERMA' : <Trash2 size={12} />}
                  </button>
                )}
                <button
                  onClick={onExpand}
                  className="flex-1 py-2 border border-[#eddada] text-[#7a4a4a] text-[10px] tracking-[0.2em] hover:bg-white transition-colors rounded-lg"
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
  product, token, onEdit, onDelete, onVariants,
}: {
  product:    Product;
  token:      string;
  onEdit:     (p: Product) => void;
  onDelete:   (id: string) => void;
  onVariants: (p: Product) => void;
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

  // Prefer product-level image; fall back to first variant that has images
  const thumb = product.images[0]
    || (product.product_variants ?? []).find(v => v.images.length > 0)?.images[0]
    || '';

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
              <span key={s} className="text-[9px] tracking-[0.2em] px-1.5 py-0.5 bg-[#7a4a4a]/8 text-[#7a4a4a] rounded">{s}</span>
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
            className="flex-1 flex items-center justify-center gap-1.5 text-[10px] tracking-[0.2em] border border-[#eddada] text-[#7a4a4a] py-2 rounded-lg hover:bg-[#fdf6f6] transition-colors">
            <Pencil size={11} /> MODIFICA
          </button>
          <button onClick={() => onVariants(product)}
            className="p-2 rounded-lg border border-[#eddada] text-[#7a4a4a]/50 hover:text-[#731515] hover:border-[#731515]/30 transition-colors"
            title="Varianti colore">
            <Palette size={13} />
          </button>
          <button onClick={toggleVisible} disabled={toggling}
            className="p-2 rounded-lg border border-[#eddada] text-[#7a4a4a]/50 hover:text-[#731515] hover:border-[#731515]/30 transition-colors"
            title={visible ? 'Nascondi' : 'Mostra'}>
            {toggling ? <Loader2 size={13} className="animate-spin" /> : visible ? <Eye size={13} /> : <EyeOff size={13} />}
          </button>
          <button onClick={handleDelete} disabled={deleting} onBlur={() => setConfirm(false)}
            className={`p-2 rounded-lg border transition-colors ${confirm ? 'bg-red-50 border-red-200 text-red-600' : 'border-[#eddada] text-[#7a4a4a]/50 hover:text-red-500 hover:border-red-200'}`}
            title={confirm ? 'Conferma eliminazione' : 'Elimina'}>
            {deleting ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
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
  const [mailSending,      setMailSending]      = useState(false);
  const [mailSent,         setMailSent]         = useState(false);
  const [mailError,        setMailError]        = useState('');

  async function toggleStatus() {
    setSaving(true);
    const next = order.status === 'evaso' ? 'da_evadere' : 'evaso';
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

  async function sendShippingEmail() {
    setMailSending(true);
    setMailError('');
    try {
      const res = await fetch(`/api/merch/orders/${order.id}`, {
        method:  'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const d = await res.json();
        setMailError(d.error ?? 'Errore invio mail');
      } else {
        setMailSent(true);
      }
    } catch {
      setMailError('Errore di rete');
    } finally {
      setMailSending(false);
    }
  }

  const date = new Date(order.created_at).toLocaleDateString('it-IT', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
  const time = new Date(order.created_at).toLocaleTimeString('it-IT', {
    hour: '2-digit', minute: '2-digit',
  });

  const isEvaso = order.status === 'evaso';

  return (
    <div className={`border rounded-xl p-4 transition-colors ${isEvaso ? 'border-green-200 bg-green-50/30' : 'border-[#eddada] bg-white'}`}>
      <div className="flex items-start gap-4 flex-wrap">

        {/* Status button */}
        <button onClick={toggleStatus} disabled={saving}
          className={`shrink-0 flex items-center gap-1.5 text-[9px] tracking-[0.3em] font-medium px-3 py-1.5 rounded-full transition-colors ${
            isEvaso
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-orange-100 text-orange-700 hover:bg-orange-200'
          }`}>
          {saving
            ? <Loader2 size={10} className="animate-spin" />
            : isEvaso ? <CheckCircle size={10} /> : <Clock size={10} />}
          {isEvaso ? 'EVASO' : 'DA EVADERE'}
        </button>

        {/* Customer */}
        <div className="flex-1 min-w-[150px]">
          <p className="text-[13px] font-medium text-[#1a0505]" style={{ fontFamily: 'var(--font-nunito)' }}>
            {order.customer_name ?? '—'}
          </p>
          <p className="text-[11px] text-[#7a4a4a]/60" style={{ fontFamily: 'var(--font-nunito)' }}>
            {order.customer_email ?? '—'}
          </p>
        </div>

        {/* Items */}
        <div className="flex-1 min-w-[160px]">
          {order.items.map((item, i) => (
            <p key={i} className="text-[11.5px] text-[#3a1a1a]" style={{ fontFamily: 'var(--font-nunito)' }}>
              <span className="font-medium">{item.qty}×</span> {item.name}
              <span className="text-[#7a4a4a]/50 ml-1">€{Number(item.price).toFixed(2)}</span>
            </p>
          ))}
        </div>

        {/* Total + date */}
        <div className="text-right shrink-0">
          <p className="text-[14px] font-semibold text-[#731515]">€{Number(order.total).toFixed(2)}</p>
          <p className="text-[10px] text-[#7a4a4a]/50 mt-0.5" style={{ fontFamily: 'var(--font-nunito)' }}>
            {date} {time}
          </p>
        </div>
      </div>

      {/* Shipping email button — only when order is evased and customer has an email */}
      {isEvaso && order.customer_email && (
        <div className="mt-3 pt-3 border-t border-green-100 flex items-center justify-between gap-3 flex-wrap">
          <div>
            {mailError && (
              <p className="text-[10px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>{mailError}</p>
            )}
            {mailSent && (
              <p className="text-[10px] text-green-700 flex items-center gap-1" style={{ fontFamily: 'var(--font-nunito)' }}>
                <CheckCircle size={10} /> Mail di spedizione inviata
              </p>
            )}
          </div>
          <button
            onClick={sendShippingEmail}
            disabled={mailSending || mailSent}
            className="flex items-center gap-1.5 text-[9px] tracking-[0.25em] px-3 py-1.5 rounded-full border transition-colors disabled:opacity-50 disabled:cursor-not-allowed border-green-300 text-green-700 hover:bg-green-50"
          >
            {mailSending
              ? <Loader2 size={10} className="animate-spin" />
              : <CheckCircle size={10} />}
            {mailSent ? 'INVIATA' : 'INVIA MAIL SPEDIZIONE'}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────

export default function MerchManager() {
  const [tab,      setTab]      = useState<'products' | 'orders'>('products');
  const [products, setProducts] = useState<Product[]>([]);
  const [orders,   setOrders]   = useState<MerchOrder[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [token,    setToken]    = useState('');
  const [showModal,    setShowModal]    = useState(false);
  const [editing,      setEditing]      = useState<Product | null>(null);
  const [variantModal, setVariantModal] = useState<Product | null>(null);

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
        {(['products', 'orders'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`flex items-center gap-2 px-4 py-2.5 text-[11px] tracking-[0.3em] transition-colors border-b-2 -mb-px ${
              tab === t
                ? 'border-[#731515] text-[#731515]'
                : 'border-transparent text-[#7a4a4a]/50 hover:text-[#7a4a4a]'
            }`}>
            {t === 'products' ? <Package size={13} /> : <ShoppingBag size={13} />}
            {t === 'products' ? 'PRODOTTI' : `ORDINI${orders.length ? ` (${orders.length})` : ''}`}
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
                  className="px-3 py-1.5 border border-[#eddada] text-[#7a4a4a] text-[10px] rounded-lg hover:bg-[#fdf6f6]">
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
          <div className="grid grid-cols-3 gap-4 mb-6">
            {[
              { label: 'Totale',      value: orders.length, color: 'text-[#1a0505]' },
              { label: 'Da evadere',  value: daEvadere,     color: 'text-orange-600' },
              { label: 'Evasi',       value: evaso,         color: 'text-green-600'  },
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
    </>
  );
}
