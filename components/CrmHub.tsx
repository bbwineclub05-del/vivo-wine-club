'use client';

import { useCallback, useEffect, useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { CalendarPlus, Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MemberCRM from '@/components/MemberCRM';
import CrmPersone from '@/components/CrmPersone';
import { RecordTable } from '@/components/admin/RecordTable';
import { SPONSORS, CANTINE, BORDEAUX, INFLUENCER, listaPersonalizzata } from '@/lib/crm-resources';
import EventInvite from '@/components/admin/EventInvite';
import { useMobileOverlay, useOverlayBackClose } from '@/lib/useMobileOverlay';
import { ActionButton, Field, Sheet, TextInput } from '@/components/admin/ui';

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

/**
 * Una lista nuova nel CRM.
 *
 * Era una finestrella fatta a mano, con le etichette in maiuscolo da
 * nove pixel e i colori scritti a mano: l'ultimo angolo del CRM
 * rimasto al vecchio stile, e si vedeva solo aprendolo. Adesso e' il
 * foglio di tutta l'area riservata, quindi si chiude col tasto
 * indietro del telefono come tutti gli altri.
 */
function NuovaCategoria({
  onConfirm,
  onClose,
}: {
  onConfirm: (name: string) => Promise<void>;
  onClose: () => void;
}) {
  const [nome, setNome] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salva() {
    if (!nome.trim()) return;
    setSalvando(true);
    try {
      await onConfirm(nome.trim());
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet
      open
      title="Nuova lista"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton onClick={salva} disabled={!nome.trim() || salvando} className="flex-1">
            <Plus size={16} strokeWidth={2} />
            {salvando ? 'Creo…' : 'Crea la lista'}
          </ActionButton>
        </div>
      }
    >
      <Field label="Come si chiama" hint="es. Ristoranti, DJ, Location">
        <TextInput
          autoFocus
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') salva();
          }}
          placeholder="Nome della lista"
        />
      </Field>

      <p className="mt-4 text-fine text-on-paper-muted">
        Diventa una scheda qui sopra, accanto alle altre. I contatti che ci metti dentro
        restano comunque in Persone.
      </p>
    </Sheet>
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
  const [daEliminare,       setDaEliminare]       = useState<CustomCategory | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAccessToken(data.session?.access_token ?? null);
    });
  }, []);

  /**
   * Le liste del CRM.
   *
   * Il caricamento sta dentro l'effetto e non in una funzione
   * chiamata dall'effetto: cosi' React vede che lo stato cambia solo
   * dopo la risposta, e non all'istante del montaggio. E se la
   * sezione viene chiusa mentre la richiesta e' in volo, la risposta
   * non va a scrivere su un componente che non c'e' piu'.
   */
  const loadCats = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/crm/categories', { headers: { Authorization: `Bearer ${accessToken}` } });
      const j = await res.json();
      setCustomCats(j.categories ?? []);
    } catch { /* non-fatal */ }
  }, [accessToken]);

  useEffect(() => {
    if (!accessToken) return;
    let vivo = true;
    (async () => {
      try {
        const res = await fetch('/api/crm/categories', { headers: { Authorization: `Bearer ${accessToken}` } });
        const j = await res.json();
        if (vivo) setCustomCats(j.categories ?? []);
      } catch { /* non-fatal */ }
    })();
    return () => {
      vivo = false;
    };
  }, [accessToken]);

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
  /**
   * Cosa succede davvero eliminando una lista.
   *
   * Prima stava dentro un `confirm()` del browser — una finestra
   * grigia di sistema, fuori posto e che su alcuni telefoni si puo'
   * silenziare. Ora e' un foglio come gli altri, e il testo e' lo
   * stesso perche' quello era gia' scritto bene.
   */
  function conseguenze(cat: CustomCategory): string {
    const contacts = cat.contacts ?? 0;
    const onlyHere = cat.onlyHere ?? 0;
    if (contacts === 0) return 'È vuota: non si perde niente.';
    if (onlyHere === 0)
      return `I suoi ${contacts} contatti restano in Persone: si elimina solo la lista.`;
    return `Contiene ${contacts} contatti, e ${onlyHere} ${onlyHere === 1 ? 'esiste' : 'esistono'} soltanto qui: ${onlyHere === 1 ? 'quello andrebbe perso' : 'quelli andrebbero persi'} per sempre.`;
  }

  async function handleDeleteCategory(id: string) {
    setDeletingCat(id);
    await fetch(`/api/crm/categories/${id}`, {
      method:  'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    setDeletingCat(null);
    setDaEliminare(null);
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
              {/* Si vedeva solo passandoci sopra col mouse, ed era
                  grande dieci pixel: col dito non esisteva. */}
              <button
                onClick={() => setDaEliminare(cat)}
                disabled={deletingCat === cat.id}
                aria-label={`Elimina la lista ${cat.name}`}
                className={`absolute right-1 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-full transition-colors disabled:opacity-40 ${
                  activeTab === cat.id
                    ? 'text-paper/70 hover:bg-paper/15 hover:text-paper'
                    : 'text-on-paper-muted/60 hover:bg-paper-soft hover:text-accent'
                }`}
              >
                <X size={14} strokeWidth={2} />
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
          <NuovaCategoria key="add-cat-modal" onConfirm={handleCreateCategory} onClose={() => setShowAddCatModal(false)} />
        )}
      </AnimatePresence>

      {/* Eliminare una lista: cosa si perde, scritto prima di farlo. */}
      {daEliminare && (
        <Sheet
          open
          title={daEliminare.name}
          onClose={() => setDaEliminare(null)}
          footer={
            <div className="flex gap-3">
              <ActionButton variant="quiet" onClick={() => setDaEliminare(null)} className="flex-1">
                Annulla
              </ActionButton>
              <ActionButton
                variant="danger"
                onClick={() => handleDeleteCategory(daEliminare.id)}
                disabled={deletingCat === daEliminare.id}
                className="flex-1"
              >
                {deletingCat === daEliminare.id ? 'Elimino…' : 'Elimina la lista'}
              </ActionButton>
            </div>
          }
        >
          <p className="text-body">Elimino questa lista?</p>
          <p className="mt-2 text-body text-on-paper-muted">{conseguenze(daEliminare)}</p>
        </Sheet>
      )}
    </div>
  );
}
