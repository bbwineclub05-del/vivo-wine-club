'use client';

import { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CalendarPlus, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MemberCRM from '@/components/MemberCRM';
import CrmPersone from '@/components/CrmPersone';
import { RecordTable } from '@/components/admin/RecordTable';
import { SPONSORS, CANTINE, BORDEAUX, INFLUENCER, listaPersonalizzata } from '@/lib/crm-resources';
import EventInvite from '@/components/admin/EventInvite';
import { useMobileOverlay, useOverlayBackClose } from '@/lib/useMobileOverlay';
import { ActionButton } from '@/components/admin/ui';

/* ── Types ── */
type BuiltinTab = 'membri' | 'persone' | 'sponsors' | 'vino' | 'bordeaux' | 'influencer';
type ActiveTab  = BuiltinTab | string; // string = custom category id

interface CustomCategory {
  id: string;
  name: string;
  /** Quanti contatti contiene. */
  contacts?: number;
  /** Quanti di quelli esistono soltanto qui: è ciò che si perde davvero. */
  onlyHere?: number;
}

const BUILTIN_TABS: { id: BuiltinTab; label: string }[] = [
  { id: 'membri',      label: 'Membri'         },
  { id: 'persone',    label: 'Persone'        },
  { id: 'sponsors',   label: 'Sponsors'       },
  { id: 'vino',       label: 'Cantine'        },
  { id: 'bordeaux',   label: 'Bordeaux'       },
  { id: 'influencer', label: 'Influencer'     },
];

const TAB_SUBTITLES: Record<BuiltinTab, string> = {
  membri:     'Chi ha la membership del club.',
  persone:    'Chi è passato dagli eventi del club. Filtra per evento o per gruppo e scrivi a tutti insieme.',
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
  // EventInvite blocca lo scorrimento da sé: qui solo la chiusura col tasto indietro.
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

  /**
   * L'avviso dice quello che succede davvero a questa lista, non una
   * formula uguale per tutte. Quasi sempre i contatti di una lista
   * stanno anche in Persone — quelli nati da un biglietto ci sono di
   * sicuro — e in quel caso non si perde niente. Quando invece
   * qualcuno esiste solo lì, lo si scrive con il suo numero.
   */
  async function handleDeleteCategory(id: string, name: string) {
    const cat = customCats.find(c => c.id === id);
    const contacts = cat?.contacts ?? 0;
    const onlyHere = cat?.onlyHere ?? 0;

    const message =
      contacts === 0
        ? `Eliminare la lista "${name}"? È vuota.`
        : onlyHere === 0
          ? `Eliminare la lista "${name}"?\n\nI suoi ${contacts} contatti restano in Persone: si elimina solo la lista.`
          : `Eliminare la lista "${name}"?\n\nContiene ${contacts} contatti, e ${onlyHere} ${onlyHere === 1 ? 'esiste' : 'esistono'} soltanto qui: ${onlyHere === 1 ? 'quello andrebbe perso' : 'quelli andrebbero persi'} per sempre.`;

    if (!confirm(message)) return;
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
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="ds-display text-[26px] leading-none tracking-[-0.03em] lg:text-[32px]">
            CRM
          </h1>
          <p className="mt-2.5 max-w-[62ch] text-body text-on-paper-muted">{subtitle}</p>
        </div>

        <ActionButton variant="quiet" onClick={() => setShowEventModal(true)}>
          <CalendarPlus size={17} strokeWidth={1.9} />
          Invita a un evento
        </ActionButton>
      </header>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 min-w-max items-center">
          {/* Built-in tabs */}
          {BUILTIN_TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              aria-pressed={activeTab === tab.id}
              className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border px-4 text-fine font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-accent bg-accent text-paper'
                  : 'border-rule-paper text-on-paper hover:border-accent/40'
              }`}
            >
              {tab.label}
            </button>
          ))}

          {/* Custom category tabs */}
          {customCats.map(cat => (
            <div key={cat.id} className="relative group/cattab">
              <button
                onClick={() => setActiveTab(cat.id)}
                aria-pressed={activeTab === cat.id}
                className={`inline-flex min-h-[44px] shrink-0 items-center whitespace-nowrap rounded-full border py-0 pl-4 pr-9 text-fine font-medium transition-colors ${
                  activeTab === cat.id
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule-paper text-on-paper hover:border-accent/40'
                }`}
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
            title="Nuova lista"
            aria-label="Nuova lista"
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-dashed border-rule-paper text-on-paper-muted transition-colors hover:border-accent/50 hover:text-accent"
          >
            <Plus size={17} strokeWidth={2} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'membri'     && <MemberCRM />}
        {activeTab === 'persone'    && <CrmPersone />}
        {activeTab === 'sponsors'   && <RecordTable resource={SPONSORS} />}
        {activeTab === 'vino'       && <RecordTable resource={CANTINE} />}
        {activeTab === 'bordeaux'   && <RecordTable resource={BORDEAUX} />}
        {activeTab === 'influencer' && <RecordTable resource={INFLUENCER} />}
        {activeCustom && (
          <RecordTable
            key={activeCustom.id}
            resource={listaPersonalizzata(activeCustom.id, activeCustom.name)}
          />
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showEventModal && (
          <EventInvite
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
