'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarPlus, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MemberCRM from '@/components/MemberCRM';
import CrmClienti from '@/components/CrmClienti';
import CrmSponsors from '@/components/CrmSponsors';
import CrmWine from '@/components/CrmWine';
import CrmBordeaux from '@/components/CrmBordeaux';
import CrmInfluencer from '@/components/CrmInfluencer';
import CrmCustomCategory from '@/components/CrmCustomCategory';
import EventEmailModalAdvanced from '@/components/EventEmailModalAdvanced';
import { useMobileOverlay, useOverlayBackClose } from '@/lib/useMobileOverlay';

/* ── Types ── */
type BuiltinTab = 'membri' | 'clienti' | 'sponsors' | 'vino' | 'bordeaux' | 'influencer';
type ActiveTab  = BuiltinTab | string; // string = custom category id

interface CustomCategory { id: string; name: string }

const BUILTIN_TABS: { id: BuiltinTab; label: string }[] = [
  { id: 'membri',      label: 'Membri'         },
  { id: 'clienti',    label: 'Clienti'        },
  { id: 'sponsors',   label: 'Sponsors'       },
  { id: 'vino',       label: 'Contatti Vino'  },
  { id: 'bordeaux',   label: 'Produttori BDX' },
  { id: 'influencer', label: 'Influencer'     },
];

const TAB_SUBTITLES: Record<BuiltinTab, string> = {
  membri:     'Lista membri e invio comunicazioni.',
  clienti:    'Banca dati automatica dei clienti che hanno acquistato biglietti — invio email e storico eventi.',
  sponsors:   'Gestione degli sponsor del club — contatti, siti web e note.',
  vino:       'Contatti del settore vitivinicolo — produttori, hospitality, industry.',
  bordeaux:   'Châteaux e produttori di Bordeaux — richieste visita e follow-up.',
  influencer: 'Creator e influencer — Instagram, TikTok e collaborazioni.',
};

/* ── Add category modal ── */
function AddCategoryModal({
  onConfirm,
  onClose,
}: {
  onConfirm: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try { await onConfirm(name.trim()); }
    finally { setSaving(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="bg-white w-full max-w-sm rounded-xl shadow-xl p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="text-[10px] tracking-[0.35em] text-[#731515]">NUOVA CATEGORIA CRM</div>
          <button onClick={onClose} className="text-[#7a4a4a]/40 hover:text-[#731515] transition-colors"><X size={16} /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-[9px] tracking-[0.25em] text-[#7a4a4a]/60 mb-2">NOME CATEGORIA</label>
            <input
              ref={inputRef}
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="es. Ristoranti, DJ, Location…"
              className="w-full border border-[#e8d5d5] bg-[#fdf6f6] px-3 py-2.5 text-sm text-[#1a0505] placeholder-[#c0a0a0] focus:outline-none focus:border-[#731515]/50 transition-colors rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}
            />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 border border-[#e8d5d5] text-[10px] tracking-[0.2em] text-[#7a4a4a] hover:border-[#731515]/30 transition-colors rounded-lg">
              ANNULLA
            </button>
            <button
              type="submit"
              disabled={!name.trim() || saving}
              className="flex-1 py-2.5 bg-[#731515] text-white text-[10px] tracking-[0.2em] hover:bg-[#aa4848] disabled:opacity-40 transition-colors rounded-lg flex items-center justify-center gap-1.5"
            >
              <Plus size={12} />
              {saving ? 'CREAZIONE…' : 'CREA'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

/* ── Main component ── */
export default function CrmHub() {
  const [activeTab, setActiveTab]   = useState<ActiveTab>('membri');
  const [customCats, setCustomCats] = useState<CustomCategory[]>([]);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [showEventModal,    setShowEventModal]    = useState(false);
  const [showAddCatModal,   setShowAddCatModal]   = useState(false);
  // EventEmailModalAdvanced already locks scroll on its own — only add back-close.
  useOverlayBackClose(showEventModal, () => setShowEventModal(false));
  // AddCategoryModal has no scroll lock of its own — use the full treatment.
  useMobileOverlay(showAddCatModal, () => setShowAddCatModal(false));
  const [deletingCat,       setDeletingCat]       = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
    });
  }, []);

  const loadCats = async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/crm/categories', { headers: { Authorization: `Bearer ${accessToken}` } });
      const j = await res.json();
      setCustomCats(j.categories ?? []);
    } catch { /* non-fatal */ }
  };

  useEffect(() => { loadCats(); }, [accessToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleCreateCategory(name: string) {
    const res = await fetch('/api/crm/categories', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
      body:    JSON.stringify({ name }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error ?? `Errore ${res.status}`);
    }
    const created: CustomCategory = (await res.json()).category;
    setShowAddCatModal(false);
    // Refresh list and switch to new tab
    const listRes = await fetch('/api/crm/categories', { headers: { Authorization: `Bearer ${accessToken}` } });
    const j = await listRes.json();
    const cats: CustomCategory[] = j.categories ?? [];
    setCustomCats(cats);
    if (created?.id) setActiveTab(created.id);
  }

  async function handleDeleteCategory(id: string, name: string) {
    if (!confirm(`Eliminare la categoria "${name}" e tutti i suoi contatti?`)) return;
    setDeletingCat(id);
    await fetch(`/api/crm/categories/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setDeletingCat(null);
    if (activeTab === id) setActiveTab('membri');
    await loadCats();
  }

  const activeBuiltin = BUILTIN_TABS.find(t => t.id === activeTab);
  const activeCustom  = customCats.find(c => c.id === activeTab);
  const subtitle = activeBuiltin
    ? TAB_SUBTITLES[activeBuiltin.id]
    : activeCustom
      ? `Categoria personalizzata: ${activeCustom.name}`
      : '';

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-2">
        <div>
          <h1
            className="text-[clamp(1.6rem,2.5vw,2.2rem)] font-light text-[#1a0505] leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            CRM
          </h1>
          <p className="mt-2 text-sm text-[#7a4a4a]/70 font-light" style={{ fontFamily: 'var(--font-nunito)' }}>
            {subtitle}
          </p>
          <div className="mt-5 h-px w-16 bg-[#e8d5d5]" />
        </div>

        {/* Nuovo Evento button — always visible */}
        <button
          onClick={() => setShowEventModal(true)}
          className="self-start sm:self-auto flex items-center gap-2 px-4 py-2.5 border border-[#731515]/40 text-[#731515] bg-white hover:bg-[#fdf0f0] text-[9px] tracking-[0.25em] transition-colors rounded-lg shrink-0"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          <CalendarPlus size={13} />
          NUOVO EVENTO
        </button>
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 min-w-max items-center">
          {/* Built-in tabs */}
          {BUILTIN_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-[11px] tracking-[0.2em] whitespace-nowrap transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-[#731515] text-white shadow-sm'
                  : 'bg-white border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {tab.label}
              {tab.id === 'influencer' && (
                <span className={`ml-1.5 text-[8px] px-1 py-0.5 rounded tracking-[0.1em] ${
                  activeTab === tab.id ? 'bg-white/20 text-white' : 'bg-[#731515]/10 text-[#731515]'
                }`}>
                  NEW
                </span>
              )}
            </button>
          ))}

          {/* Custom category tabs */}
          {customCats.map(cat => (
            <div key={cat.id} className="relative group/cattab">
              <button
                onClick={() => setActiveTab(cat.id)}
                className={`px-4 py-2 pr-7 rounded-lg text-[11px] tracking-[0.2em] whitespace-nowrap transition-all duration-150 ${
                  activeTab === cat.id
                    ? 'bg-[#731515] text-white shadow-sm'
                    : 'bg-white border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515]'
                }`}
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {cat.name}
              </button>
              {/* Delete custom category button */}
              <button
                onClick={() => handleDeleteCategory(cat.id, cat.name)}
                disabled={deletingCat === cat.id}
                title={`Elimina categoria "${cat.name}"`}
                className={`absolute right-1.5 top-1/2 -translate-y-1/2 p-0.5 rounded transition-all disabled:opacity-40 ${
                  activeTab === cat.id
                    ? 'text-white/60 hover:text-white'
                    : 'text-[#7a4a4a]/30 hover:text-red-500 opacity-0 group-hover/cattab:opacity-100'
                }`}
              >
                <X size={10} />
              </button>
            </div>
          ))}

          {/* Add category button */}
          <button
            onClick={() => setShowAddCatModal(true)}
            title="Aggiungi nuova categoria CRM"
            className="flex items-center justify-center w-8 h-8 rounded-lg border border-dashed border-[#c0a0a0]/60 text-[#7a4a4a]/50 hover:border-[#731515]/50 hover:text-[#731515] hover:bg-[#fdf6f6] transition-all"
          >
            <Plus size={14} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'membri'     && <MemberCRM />}
        {activeTab === 'clienti'    && <CrmClienti />}
        {activeTab === 'sponsors'   && <CrmSponsors />}
        {activeTab === 'vino'       && <CrmWine />}
        {activeTab === 'bordeaux'   && <CrmBordeaux />}
        {activeTab === 'influencer' && <CrmInfluencer />}
        {activeCustom && (
          <CrmCustomCategory key={activeCustom.id} categoryId={activeCustom.id} accessToken={accessToken} />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEventModal && (
          <EventEmailModalAdvanced
            key="event-modal"
            accessToken={accessToken}
            customCategories={customCats}
            onClose={() => setShowEventModal(false)}
          />
        )}
        {showAddCatModal && (
          <AddCategoryModal key="add-cat-modal" onConfirm={handleCreateCategory} onClose={() => setShowAddCatModal(false)} />
        )}
      </AnimatePresence>
    </div>
  );
}
