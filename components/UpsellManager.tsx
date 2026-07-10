'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, CalendarDays, ShoppingCart, Check, Loader2, BarChart3, Tag } from 'lucide-react';
import { supabase } from '@/lib/supabase';

/* ── Types ── */
interface Product {
  id: string;
  title: string;
  price: number;
  images: string[];
  slug: string;
  visible: boolean;
}

interface Event {
  slug: string;
  title: string;
  date: string;
}

type ContextTab = 'event' | 'merch';

/* ── Main component ── */
export default function UpsellManager() {
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [tab,         setTab]         = useState<ContextTab>('event');
  const [products,    setProducts]    = useState<Product[]>([]);
  const [events,      setEvents]      = useState<Event[]>([]);

  // Current selection
  const [targetSlug,      setTargetSlug]      = useState<string>(''); // '' = tutti
  const [checkedProducts, setCheckedProducts] = useState<Set<string>>(new Set());

  // Loading states
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [loadingEvents,   setLoadingEvents]   = useState(true);
  const [loadingConfig,   setLoadingConfig]   = useState(false);
  const [saving,          setSaving]          = useState(false);
  const [saveMsg,         setSaveMsg]         = useState<'ok' | 'err' | null>(null);

  // Analytics
  const [totalConfigs,    setTotalConfigs]    = useState(0);
  const [totalImpressions, setTotalImpressions] = useState(0);
  const [conversionRate,  setConversionRate]  = useState('0.0');
  const [loadingStats,    setLoadingStats]    = useState(true);

  /* ── Auth ── */
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setAccessToken(session.access_token);
    });
  }, []);

  const authH = useCallback((tok: string) => ({ Authorization: `Bearer ${tok}` }), []);

  /* ── Load products ── */
  useEffect(() => {
    if (!accessToken) return;
    setLoadingProducts(true);
    fetch('/api/merch/products', { headers: authH(accessToken) })
      .then(r => r.json())
      .then(j => setProducts((j.products ?? []).filter((p: Product) => p.visible !== false)))
      .catch(() => {})
      .finally(() => setLoadingProducts(false));
  }, [accessToken, authH]);

  /* ── Load events ── */
  useEffect(() => {
    setLoadingEvents(true);
    fetch('/api/events/all')
      .then(r => r.json())
      .then(j => setEvents(
        (j.events ?? [])
          .sort((a: Event, b: Event) => b.date.localeCompare(a.date))
          .slice(0, 30), // latest 30
      ))
      .catch(() => {})
      .finally(() => setLoadingEvents(false));
  }, []);

  /* ── Load analytics stats ── */
  useEffect(() => {
    if (!accessToken) return;
    setLoadingStats(true);
    Promise.all([
      fetch('/api/admin/upsell',           { headers: authH(accessToken) }).then(r => r.json()),
      fetch('/api/admin/upsell/analytics', { headers: authH(accessToken) }).then(r => r.json()),
    ]).then(([cfgData, analyticsData]) => {
      setTotalConfigs((cfgData.configs ?? []).length);
      const analytics: { config_id: string | null; impressions: number; added: number; converted: number }[] =
        analyticsData.analytics ?? [];
      const totalImp  = analytics.reduce((s, r) => s + r.impressions, 0);
      const totalConv = analytics.reduce((s, r) => s + r.converted,   0);
      setTotalImpressions(totalImp);
      setConversionRate(totalImp > 0 ? ((totalConv / totalImp) * 100).toFixed(1) : '0.0');
    }).catch(() => {})
      .finally(() => setLoadingStats(false));
  }, [accessToken, authH]);

  /* ── Load existing config whenever tab/target changes ── */
  useEffect(() => {
    if (!accessToken) return;
    setLoadingConfig(true);
    setCheckedProducts(new Set());

    fetch('/api/admin/upsell', { headers: authH(accessToken) })
      .then(r => r.json())
      .then(j => {
        const allConfigs: { product_id: string; context: string; target_slug: string | null }[] =
          j.configs ?? [];

        const relevantPids = allConfigs
          .filter(c =>
            c.context === tab &&
            (targetSlug ? c.target_slug === targetSlug : c.target_slug === null),
          )
          .map(c => c.product_id);

        setCheckedProducts(new Set(relevantPids));
      })
      .catch(() => {})
      .finally(() => setLoadingConfig(false));
  }, [accessToken, tab, targetSlug, authH]);

  /* ── Toggle product checkbox ── */
  function toggleProduct(productId: string) {
    setCheckedProducts(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId); else next.add(productId);
      return next;
    });
  }

  /* ── Save ── */
  async function handleSave() {
    if (!accessToken) return;
    setSaving(true);
    setSaveMsg(null);
    try {
      const res = await fetch('/api/admin/upsell', {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', ...authH(accessToken) },
        body:    JSON.stringify({
          context:     tab,
          target_slug: targetSlug || null,
          product_ids: Array.from(checkedProducts),
        }),
      });
      if (!res.ok) {
        setSaveMsg('err');
      } else {
        setSaveMsg('ok');
        // update total configs count
        setTotalConfigs(c => {
          void c; // refreshed next load
          return c;
        });
        setTimeout(() => setSaveMsg(null), 2000);
      }
    } catch {
      setSaveMsg('err');
    } finally {
      setSaving(false);
    }
  }

  /* ── Target options ── */
  const targetOptions: { value: string; label: string }[] =
    tab === 'event'
      ? [
          { value: '', label: 'Tutti gli eventi' },
          ...events.map(e => ({ value: e.slug, label: e.title })),
        ]
      : [
          { value: '', label: 'Tutti i prodotti' },
          ...products.map(p => ({ value: p.slug, label: p.title })),
        ];

  return (
    <div className="space-y-8">

      {/* ── Header ── */}
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-[#731515]" />
          <h2
            className="text-[clamp(1.4rem,2.2vw,1.9rem)] font-light text-[#1a0505] leading-none"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Upsell
          </h2>
        </div>
        <p className="text-sm text-[#7a4a4a]/70 font-light" style={{ fontFamily: 'var(--font-nunito)' }}>
          Seleziona quali prodotti mostrare come suggeriti nel checkout
        </p>
        <div className="mt-4 h-px w-16 bg-[#e8d5d5]" />
      </div>

      {/* ── Stats strip ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Upsell attivi', value: loadingStats ? '…' : totalConfigs, icon: Tag },
          { label: 'Impressioni',   value: loadingStats ? '…' : totalImpressions, icon: BarChart3 },
          { label: 'Conversione',   value: loadingStats ? '…' : `${conversionRate}%`, icon: ShoppingCart },
        ].map(({ label, value, icon: Icon }) => (
          <div key={label} className="bg-white border border-[#eddada] rounded-xl p-5 shadow-[0_1px_4px_rgba(107,26,26,0.06)]">
            <div className="flex items-center gap-2 mb-3">
              <Icon size={13} className="text-[#731515]" />
              <span className="text-[9px] tracking-[0.35em] text-[#731515] uppercase">{label}</span>
            </div>
            <div className="text-2xl font-light text-[#1a0505]" style={{ fontFamily: 'var(--font-syne)' }}>
              {value}
            </div>
          </div>
        ))}
      </div>

      {/* ── Context tabs ── */}
      <div className="flex gap-2">
        {([
          { key: 'event', label: 'Checkout Evento', icon: CalendarDays },
          { key: 'merch', label: 'Checkout Merch',  icon: ShoppingCart },
        ] as { key: ContextTab; label: string; icon: React.ElementType }[]).map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => { setTab(key); setTargetSlug(''); }}
            className={`flex items-center gap-2 px-5 py-2.5 text-[10px] tracking-[0.25em] rounded-lg transition-all duration-150 ${
              tab === key
                ? 'bg-[#731515] text-white shadow-sm'
                : 'border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515]'
            }`}
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            <Icon size={12} />
            {label}
          </button>
        ))}
      </div>

      {/* ── Target selector ── */}
      <div>
        <label className="block text-[9px] tracking-[0.3em] text-[#7a4a4a] mb-2">
          {tab === 'event' ? 'EVENTO' : 'PRODOTTO'}
        </label>
        {(tab === 'event' ? loadingEvents : loadingProducts) ? (
          <div className="flex items-center gap-2 text-[11px] text-[#7a4a4a]/50">
            <Loader2 size={12} className="animate-spin" /> Caricamento…
          </div>
        ) : (
          <select
            value={targetSlug}
            onChange={e => setTargetSlug(e.target.value)}
            className="w-full max-w-sm border border-[#e8d5d5] bg-white px-3 py-2.5 text-sm text-[#1a0505] focus:outline-none focus:border-[#731515] transition-colors rounded-lg"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            {targetOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
      </div>

      {/* ── Product checklist ── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="text-[9px] tracking-[0.35em] text-[#731515]">
            PRODOTTI DA SUGGERIRE
            {checkedProducts.size > 0 && (
              <span className="ml-2 text-[8px] bg-[#731515]/10 text-[#731515] px-2 py-0.5 rounded-full">
                {checkedProducts.size} selezionati
              </span>
            )}
          </div>
          {loadingConfig && <Loader2 size={12} className="animate-spin text-[#731515]" />}
        </div>

        {loadingProducts ? (
          <div className="flex items-center gap-2 py-8 text-[11px] text-[#7a4a4a]/50">
            <Loader2 size={13} className="animate-spin" /> Caricamento prodotti…
          </div>
        ) : products.length === 0 ? (
          <p className="text-sm text-[#7a4a4a]/50 py-6" style={{ fontFamily: 'var(--font-nunito)' }}>
            Nessun prodotto merch trovato. Aggiungi prima dei prodotti nella sezione Merch.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {products.map(product => {
              const isChecked = checkedProducts.has(product.id);
              const img = product.images?.[0];
              return (
                <label
                  key={product.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-150 select-none ${
                    isChecked
                      ? 'border-[#731515]/50 bg-[#fdf0f0] shadow-sm'
                      : 'border-[#e8d5d5] bg-white hover:border-[#731515]/30 hover:bg-[#fdf8f8]'
                  }`}
                >
                  {/* Checkbox */}
                  <div className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                    isChecked ? 'bg-[#731515] border-[#731515]' : 'border-[#e8d5d5]'
                  }`}>
                    {isChecked && <Check size={11} className="text-white" />}
                  </div>
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => toggleProduct(product.id)}
                    className="sr-only"
                  />

                  {/* Product thumbnail */}
                  <div className="shrink-0 w-12 h-12 rounded-lg overflow-hidden bg-[#fdf6f6] border border-[#e8d5d5]">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={img} alt={product.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart size={16} className="text-[#e8d5d5]" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-medium text-[#1a0505] truncate" style={{ fontFamily: 'var(--font-nunito)' }}>
                      {product.title}
                    </p>
                    <p className="text-[11px] text-[#731515]" style={{ fontFamily: 'var(--font-syne)' }}>
                      €{Number(product.price).toFixed(2)}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Save button ── */}
      <div className="flex items-center gap-4 pt-2">
        <motion.button
          onClick={handleSave}
          disabled={saving || loadingProducts || loadingConfig}
          whileTap={{ scale: 0.99 }}
          className="inline-flex items-center gap-2 px-6 py-3 bg-[#731515] text-white text-[10px] tracking-[0.3em] rounded-lg hover:bg-[#9b2323] disabled:opacity-50 transition-colors duration-200"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {saving ? (
            <><Loader2 size={12} className="animate-spin" /> SALVATAGGIO…</>
          ) : (
            <><Check size={12} /> SALVA CONFIGURAZIONE</>
          )}
        </motion.button>

        {saveMsg === 'ok' && (
          <motion.span
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
            className="text-[11px] text-emerald-600 flex items-center gap-1"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            <Check size={12} /> Salvato
          </motion.span>
        )}
        {saveMsg === 'err' && (
          <span className="text-[11px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
            Errore nel salvataggio
          </span>
        )}
      </div>

      {/* ── Help text ── */}
      <div className="text-[10px] text-[#7a4a4a]/50 leading-relaxed bg-[#fdf6f6] border border-[#e8d5d5] rounded-lg p-4" style={{ fontFamily: 'var(--font-nunito)' }}>
        <strong>Come funziona:</strong> Seleziona il contesto (Evento o Merch), poi scegli il target specifico oppure &ldquo;Tutti&rdquo;.
        Spunta i prodotti da mostrare come suggeriti nel checkout e clicca <strong>Salva</strong>.
        I prodotti spuntati appariranno nella sezione &ldquo;You might also like&rdquo; del checkout e nella pagina prodotto.
      </div>
    </div>
  );
}
