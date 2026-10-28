'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { Eye, EyeOff, ImagePlus, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import {
  ActionButton,
  EmptyState,
  Field,
  NewButton,
  PageHead,
  Sheet,
  TextArea,
  TextInput,
} from '@/components/admin/ui';

/**
 * Le convenzioni per i soci.
 *
 * Una sola cosa conta davvero qui: se il socio la vede o no. Quindi
 * l'occhio sulla riga accende e spegne la convenzione con un tocco,
 * senza aprire niente — era l'azione più frequente e stava dentro un
 * modulo da compilare.
 *
 * Le convenzioni scadute restano in elenco, separate: sono da
 * rinnovare, non da ritrovare.
 */

interface Discount {
  id: string;
  title: string;
  description: string | null;
  logo_url: string | null;
  code: string | null;
  partner: string | null;
  expires_at: string | null;
  visible: boolean;
  sort_order: number;
  created_at: string;
}

function today() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function fmtDate(iso: string | null) {
  if (!iso) return null;
  const [y, m, d] = iso.slice(0, 10).split('-');
  const mesi = ['gen', 'feb', 'mar', 'apr', 'mag', 'giu', 'lug', 'ago', 'set', 'ott', 'nov', 'dic'];
  return `${Number(d)} ${mesi[Number(m) - 1]} ${y}`;
}

function isExpired(d: Discount, now = today()) {
  return !!d.expires_at && d.expires_at.slice(0, 10) < now;
}

/* ─────────────────────────────────────────────
   Modulo
───────────────────────────────────────────── */
function DiscountSheet({
  target,
  token,
  onClose,
  onSaved,
}: {
  target: Discount | 'new';
  token: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = target === 'new';
  const current = isNew ? null : target;

  const [form, setForm] = useState({
    title: current?.title ?? '',
    partner: current?.partner ?? '',
    description: current?.description ?? '',
    code: current?.code ?? '',
    expires_at: current?.expires_at?.slice(0, 10) ?? '',
    logo_url: current?.logo_url ?? '',
    visible: current?.visible ?? true,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function upload(file: File) {
    setUploading(true);
    setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('folder', 'discounts');
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error ?? 'Caricamento non riuscito.');
      set('logo_url', data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    if (!form.title.trim()) {
      setError('Serve un titolo.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res = await fetch(isNew ? '/api/discounts' : `/api/discounts/${current!.id}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: form.title.trim(),
          partner: form.partner.trim() || null,
          description: form.description.trim() || null,
          code: form.code.trim() || null,
          expires_at: form.expires_at || null,
          logo_url: form.logo_url || null,
          visible: form.visible,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      title={isNew ? 'Nuova convenzione' : 'Modifica convenzione'}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton onClick={save} disabled={saving} className="flex-[2]">
            {saving ? 'Salvo…' : 'Salva'}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <TextInput
          autoFocus
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="10% da Il Canto del Gallo"
          className="!py-4 !text-[19px]"
        />

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Partner">
            <TextInput
              value={form.partner}
              onChange={(e) => set('partner', e.target.value)}
              placeholder="Chi offre lo sconto"
            />
          </Field>
          <Field label="Codice" hint="(se serve)">
            <TextInput
              value={form.code}
              onChange={(e) => set('code', e.target.value)}
              placeholder="VIVO10"
            />
          </Field>
        </div>

        <Field label="Come funziona">
          <TextArea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Cosa deve fare il socio per usarlo…"
          />
        </Field>

        <Field label="Scade il" hint="(lascia vuoto se non scade)">
          <TextInput
            type="date"
            value={form.expires_at}
            onChange={(e) => set('expires_at', e.target.value)}
          />
        </Field>

        {/* Non un `Field`: quello e' una `<label>`, e un pulsante dentro
            una label fa partire due volte lo stesso selettore di file —
            uno apre, l'altro chiude, e sembra che il pulsante sia rotto.
            Qui la label *e'* il pulsante, come si fa da sempre. */}
        <div>
          <p className="mb-2 text-fine font-medium text-on-paper">Logo</p>
          <div className="flex items-center gap-3">
            {form.logo_url ? (
              <span className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-rule-paper">
                <Image src={form.logo_url} alt="" fill sizes="64px" className="object-contain" />
              </span>
            ) : (
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-xl border border-dashed border-rule-paper text-on-paper-muted">
                <ImagePlus size={20} strokeWidth={1.7} />
              </span>
            )}

            <div className="flex flex-wrap gap-2">
              <label
                className={`inline-flex min-h-[48px] cursor-pointer items-center gap-2 rounded-full border border-rule-paper px-5 text-fine font-medium transition-colors hover:border-accent/40 ${
                  uploading ? 'pointer-events-none opacity-45' : ''
                }`}
              >
                {uploading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} strokeWidth={1.8} />}
                {uploading ? 'Carico…' : form.logo_url ? 'Cambia' : 'Carica'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) upload(f);
                    e.target.value = '';
                  }}
                />
              </label>

              {form.logo_url && (
                <ActionButton variant="quiet" onClick={() => set('logo_url', '')}>
                  Togli
                </ActionButton>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => set('visible', !form.visible)}
          aria-pressed={form.visible}
          className={`inline-flex min-h-[48px] items-center gap-2 self-start rounded-full border px-4 text-fine font-medium transition-colors ${
            form.visible ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
          }`}
        >
          {form.visible ? <Eye size={16} strokeWidth={1.8} /> : <EyeOff size={16} strokeWidth={1.8} />}
          {form.visible ? 'Visibile ai soci' : 'Nascosta'}
        </button>

        {error && <p className="text-fine font-medium text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Convenzioni
───────────────────────────────────────────── */
export default function DiscountManager({ token }: { token: string }) {
  const [rows, setRows] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [liveToken, setLiveToken] = useState(token);
  const [sheet, setSheet] = useState<Discount | 'new' | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  useOverlayBackClose(!!sheet, () => setSheet(null));

  const load = useCallback(async () => {
    setError('');
    try {
      // La sessione si rilegge qui: il token che arriva come prop è
      // stato letto al montaggio della pagina e dopo un'ora scade.
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const live = session?.access_token || token;
      setLiveToken(live);

      const res = await fetch('/api/discounts', { headers: { Authorization: `Bearer ${live}` } });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? 'Impossibile leggere le convenzioni.');
      setRows(json.discounts ?? json ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  /** Accende e spegne la visibilità: un tocco, senza aprire niente. */
  async function toggle(d: Discount) {
    setBusyId(d.id);
    setRows((p) => p.map((x) => (x.id === d.id ? { ...x, visible: !x.visible } : x)));
    const res = await fetch(`/api/discounts/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${liveToken}` },
      body: JSON.stringify({ visible: !d.visible }),
    });
    if (!res.ok) {
      // Rimettere com'era: un interruttore che mente è peggio di uno lento.
      setRows((p) => p.map((x) => (x.id === d.id ? { ...x, visible: d.visible } : x)));
    }
    setBusyId(null);
  }

  async function remove(d: Discount) {
    setBusyId(d.id);
    const res = await fetch(`/api/discounts/${d.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${liveToken}` },
    });
    if (res.ok) setRows((p) => p.filter((x) => x.id !== d.id));
    setBusyId(null);
    setConfirmId(null);
  }

  const now = today();
  const { attive, scadute } = useMemo(() => {
    const attive: Discount[] = [];
    const scadute: Discount[] = [];
    for (const d of rows) (isExpired(d, now) ? scadute : attive).push(d);
    return { attive, scadute };
  }, [rows, now]);

  const visibili = attive.filter((d) => d.visible).length;
  const nascoste = attive.length - visibili;

  // Un conteggio per gruppo invece di "1 su 3": il totale mescolava le
  // scadute, che stanno in un elenco a parte e i soci non vedono.
  const riepilogo = [
    `${visibili} ${visibili === 1 ? 'visibile' : 'visibili'} ai soci`,
    nascoste > 0 && `${nascoste} ${nascoste === 1 ? 'nascosta' : 'nascoste'}`,
    scadute.length > 0 && `${scadute.length} ${scadute.length === 1 ? 'scaduta' : 'scadute'}`,
  ]
    .filter(Boolean)
    .join(' · ');

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  function Card({ d }: { d: Discount }) {
    const expired = isExpired(d, now);
    const confirming = confirmId === d.id;
    return (
      <div
        className={`flex items-start gap-3 rounded-2xl border border-rule-paper p-3.5 ${
          expired || !d.visible ? 'opacity-60' : ''
        }`}
      >
        {d.logo_url ? (
          <span className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl border border-rule-paper">
            <Image src={d.logo_url} alt="" fill sizes="48px" className="object-contain" />
          </span>
        ) : (
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-paper-soft text-on-paper-muted">
            <ImagePlus size={18} strokeWidth={1.7} />
          </span>
        )}

        <div className="min-w-0 flex-1">
          <p className="truncate text-body">{d.title}</p>
          <p className="mt-0.5 flex flex-wrap items-center gap-x-3 text-fine text-on-paper-muted">
            {d.partner && <span className="truncate">{d.partner}</span>}
            {d.code && <span className="tabular-nums">{d.code}</span>}
            {d.expires_at && (
              <span className={expired ? 'font-medium text-accent' : ''}>
                {expired ? 'scaduta il' : 'fino al'} {fmtDate(d.expires_at)}
              </span>
            )}
          </p>

          <div className="mt-2.5 flex flex-wrap gap-2">
            <button
              onClick={() => toggle(d)}
              disabled={busyId === d.id}
              aria-pressed={d.visible}
              className={`inline-flex min-h-[40px] items-center gap-2 rounded-full border px-3.5 text-fine font-medium transition-colors disabled:opacity-50 ${
                d.visible ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
              }`}
            >
              {d.visible ? <Eye size={15} strokeWidth={1.8} /> : <EyeOff size={15} strokeWidth={1.8} />}
              {d.visible ? 'Visibile' : 'Nascosta'}
            </button>
            <button
              onClick={() => setSheet(d)}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-rule-paper px-3.5 text-fine font-medium transition-colors hover:border-accent/40"
            >
              <Pencil size={15} strokeWidth={1.8} />
              Modifica
            </button>
            <button
              onClick={() => (confirming ? remove(d) : setConfirmId(d.id))}
              disabled={busyId === d.id}
              className="inline-flex min-h-[40px] items-center gap-2 rounded-full border border-accent/40 px-3.5 text-fine font-medium text-accent transition-colors hover:bg-accent/5 disabled:opacity-50"
            >
              <Trash2 size={15} strokeWidth={1.8} />
              {confirming ? 'Confermi?' : 'Elimina'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <PageHead
        title="Convenzioni"
        subtitle={riepilogo}
        action={<NewButton label="Nuova convenzione" onClick={() => setSheet('new')} />}
      />

      {error ? (
        <EmptyState
          title="Non riesco a leggere le convenzioni"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="Nessuna convenzione"
          body="Gli sconti e le convenzioni che i soci trovano nella loro area."
          action={
            <ActionButton onClick={() => setSheet('new')}>
              <Plus size={17} strokeWidth={2} />
              Nuova convenzione
            </ActionButton>
          }
        />
      ) : (
        <div className="flex flex-col gap-8">
          <section>
            <div className="flex flex-col gap-2">
              {attive.map((d) => (
                <Card key={d.id} d={d} />
              ))}
            </div>
          </section>

          {scadute.length > 0 && (
            <section>
              <h3 className="mb-2.5 flex items-baseline gap-2 text-subtitle font-medium">
                Scadute
                <span className="text-fine font-normal text-on-paper-muted">{scadute.length}</span>
              </h3>
              <p className="mb-3 text-fine text-on-paper-muted">
                Restano qui perché sono da rinnovare, non da ritrovare. I soci non le vedono.
              </p>
              <div className="flex flex-col gap-2">
                {scadute.map((d) => (
                  <Card key={d.id} d={d} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {sheet && (
        <DiscountSheet
          target={sheet}
          token={liveToken}
          onClose={() => setSheet(null)}
          onSaved={() => {
            setSheet(null);
            load();
          }}
        />
      )}
    </div>
  );
}
