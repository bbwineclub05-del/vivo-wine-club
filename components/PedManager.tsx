'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar as CalendarIcon,
  Check,
  List,
  Palette,
  Paperclip,
  Pencil,
  Trash2,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import {
  ActionButton,
  EmptyState,
  Field,
  NewButton,
  PageHead,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from '@/components/admin/ui';
import {
  Calendar,
  longDay,
  ymd,
  type CalendarItem,
  type CalendarSource,
} from '@/components/admin/Calendar';

/**
 * The editorial plan.
 *
 * The old version painted every entry in its platform's brand colour
 * inside a month grid, which on a phone gave you seven columns of
 * fifty-pixel confetti and no way to answer "what are we posting on
 * Instagram this week".
 *
 * Here the platforms *are* the calendars: each one is a toggle at the
 * top, exactly like a shared calendar in the app everybody already has
 * on their phone. Turn off the four you don't care about and the month
 * becomes readable. The club's events sit on the same grid, because the
 * whole point of a content plan is to post around them.
 */

type PedStatus = 'planned' | 'published';

interface PedEntry {
  id: string;
  date: string;
  title: string;
  description: string | null;
  platform: string;
  content_type: string;
  status: PedStatus;
  assigned_to: string | null;
  notes: string | null;
  media_url: string | null;
  created_at: string;
}

interface CalEvent {
  id: string;
  title: string;
  date: string | null;
  time: string | null;
  location: string | null;
  type: string | null;
  section: string | null;
  status: string | null;
  slug: string | null;
}

interface TeamMember {
  name: string;
  email: string;
}

const PLATFORMS = ['Instagram', 'TikTok', 'LinkedIn', 'Newsletter', 'Sito Web', 'Altro'];
const CONTENT_TYPES = ['Post', 'Reel', 'Story', 'Articolo', 'Email', 'Video', 'Foto', 'Altro'];

/**
 * Each platform keeps the colour people already associate with it —
 * that is the one place where borrowed brand colour earns its keep,
 * because it is read at a glance and never as a word.
 */
const PLATFORM_COLOR: Record<string, string> = {
  Instagram: '#C13584',
  TikTok: '#0F0F0F',
  LinkedIn: '#0A66C2',
  Newsletter: '#731515',
  'Sito Web': '#3F4B5B',
  Altro: '#7A5252',
};

const EVENTS_SOURCE = '__events';

const MONTHS = [
  'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre',
];

function monthLabel(date: string) {
  const [y, m] = date.slice(0, 10).split('-');
  return `${MONTHS[Number(m) - 1]} ${y}`;
}

function colorOfPlatform(p: string) {
  return PLATFORM_COLOR[p] ?? PLATFORM_COLOR.Altro;
}

/**
 * I colori dei formati, e perche' ce ne vogliono due serie.
 *
 * Dentro Instagram il colore del social non divide niente: e' tutto
 * rosa. Quello che si vuole sapere a colpo d'occhio li' dentro e'
 * un'altra cosa — quanti reel, quante storie, quanti post — e allora
 * il colore deve dirlo.
 *
 * Quindi: nel piano generale colora il canale, dentro un canale
 * colora il formato. Non sono due sistemi che litigano, e' lo stesso
 * sistema che risponde alla domanda che ha senso dove sei.
 *
 * Questi sono i colori di partenza. Si cambiano dal pulsante
 * "Colori", e restano cambiati per tutti: un piano editoriale lo
 * guardano in cinque, e cinque legende diverse sono peggio di una
 * brutta.
 */
const TYPE_COLOR_DEFAULT: Record<string, string> = {
  Post: '#2F6F4E',
  Reel: '#B5483C',
  Story: '#C98A1E',
  Articolo: '#3F4B5B',
  Email: '#7A4A9E',
  Video: '#1F6F8B',
  Foto: '#A3561A',
  Altro: '#7A5252',
};

/** La tavolozza da cui si sceglie: colori che si distinguono fra loro
 *  anche su uno schermo piccolo e con poca luce. */
const TAVOLOZZA = [
  '#2F6F4E', '#B5483C', '#C98A1E', '#3F4B5B', '#7A4A9E',
  '#1F6F8B', '#A3561A', '#731515', '#4A7A2F', '#7A5252',
];

/* ─────────────────────────────────────────────
   I colori dei formati
───────────────────────────────────────────── */
/**
 * Si sceglie un colore per formato, e resta scelto per tutti.
 *
 * Una tavolozza di dieci invece di un selettore libero: dieci colori
 * scelti per distinguersi fra loro anche su un telefono con poca luce
 * valgono piu' di sedici milioni fra cui prendere due verdi uguali. E
 * si tocca, non si trascina, che su un telefono e' tutta un'altra
 * cosa.
 */
function FoglioColori({
  token,
  valori,
  onClose,
  onSaved,
}: {
  token: string;
  valori: Record<string, string>;
  onClose: () => void;
  onSaved: (c: Record<string, string>) => void;
}) {
  const [scelta, setScelta] = useState<Record<string, string>>(() => {
    const base: Record<string, string> = {};
    for (const t of CONTENT_TYPES) base[t] = valori[t] ?? TYPE_COLOR_DEFAULT[t] ?? TYPE_COLOR_DEFAULT.Altro;
    return base;
  });
  const [salvando, setSalvando] = useState(false);
  const [errore, setErrore] = useState('');

  async function salva() {
    setErrore('');
    setSalvando(true);
    try {
      const r = await fetch('/api/ped/colori', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ colori: scelta }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error ?? 'Errore.');
      onSaved(d.colori ?? scelta);
      onClose();
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Sheet
      open
      title="I colori dei formati"
      onClose={onClose}
      footer={
        <ActionButton onClick={salva} disabled={salvando} className="w-full">
          {salvando ? 'Salvo…' : 'Salva per tutti'}
        </ActionButton>
      }
    >
      <p className="text-body text-on-paper-muted">
        Dentro un canale il calendario colora il formato, non il social: su Instagram sarebbe
        tutto dello stesso colore. Questi colori li vede tutto il team.
      </p>

      <div className="mt-6 flex flex-col gap-5">
        {CONTENT_TYPES.map((t) => (
          <div key={t}>
            <p className="mb-2 flex items-center gap-2 text-fine font-medium">
              <span
                aria-hidden="true"
                className="h-3 w-3 shrink-0 rounded-full"
                style={{ backgroundColor: scelta[t] }}
              />
              {t}
            </p>
            <div className="flex flex-wrap gap-2">
              {TAVOLOZZA.map((c) => (
                <button
                  key={c}
                  onClick={() => setScelta((p) => ({ ...p, [t]: c }))}
                  aria-label={`${t}: ${c}`}
                  aria-pressed={scelta[t] === c}
                  className={`h-10 w-10 shrink-0 rounded-full border-2 transition-transform ${
                    scelta[t] === c ? 'scale-110 border-on-paper' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {errore && <p className="mt-5 text-fine font-medium text-accent">{errore}</p>}
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   One entry, as a row
───────────────────────────────────────────── */
function EntryRow({
  entry,
  onToggle,
  onOpen,
  showDate = true,
}: {
  entry: PedEntry;
  onToggle: (e: PedEntry) => void;
  onOpen: (e: PedEntry) => void;
  showDate?: boolean;
}) {
  const published = entry.status === 'published';
  const color = colorOfPlatform(entry.platform);

  return (
    <div className="flex items-stretch rounded-2xl border border-rule-paper transition-colors hover:border-accent/35">
      <button
        onClick={() => onToggle(entry)}
        aria-label={published ? 'Segna da pubblicare' : 'Segna pubblicato'}
        aria-pressed={published}
        className="grid w-[52px] shrink-0 place-items-center rounded-l-2xl"
      >
        <span
          className={`grid h-[26px] w-[26px] place-items-center rounded-full border-2 transition-colors ${
            published ? 'border-accent bg-accent text-paper' : 'border-rule-paper'
          }`}
        >
          {published && <Check size={15} strokeWidth={3} />}
        </span>
      </button>

      <button onClick={() => onOpen(entry)} className="min-w-0 flex-1 py-3 pr-3 text-left">
        <span className={`block text-body ${published ? 'opacity-55' : ''}`}>{entry.title}</span>
        <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-fine text-on-paper-muted">
          {showDate && <span>{longDay(entry.date.slice(0, 10))}</span>}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
            {entry.platform}
          </span>
          <span>{entry.content_type}</span>
          {entry.assigned_to && <span>{entry.assigned_to}</span>}
          {entry.media_url && (
            <span className="inline-flex items-center gap-1">
              <Paperclip size={12} strokeWidth={1.8} />
              Allegato
            </span>
          )}
        </span>
      </button>
    </div>
  );
}

/* ─────────────────────────────────────────────
   Entry detail
───────────────────────────────────────────── */
function EntryDetail({
  entry,
  onClose,
  onEdit,
  onDelete,
  onToggle,
}: {
  entry: PedEntry | null;
  onClose: () => void;
  onEdit: (e: PedEntry) => void;
  onDelete: (e: PedEntry) => void;
  onToggle: (e: PedEntry) => void;
}) {
  const [confirmId, setConfirmId] = useState<string | null>(null);
  useOverlayBackClose(!!entry, onClose);

  if (!entry) return null;
  const published = entry.status === 'published';
  const confirming = confirmId === entry.id;

  return (
    <Sheet
      open
      title="Contenuto"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2.5">
          <ActionButton onClick={() => onToggle(entry)} className="flex-1">
            <Check size={17} strokeWidth={2} />
            {published ? 'Da pubblicare' : 'Pubblicato'}
          </ActionButton>
          <ActionButton variant="quiet" onClick={() => onEdit(entry)}>
            <Pencil size={16} strokeWidth={1.8} />
            Modifica
          </ActionButton>
          <ActionButton
            variant="danger"
            onClick={() => (confirming ? onDelete(entry) : setConfirmId(entry.id))}
          >
            <Trash2 size={16} strokeWidth={1.8} />
            {confirming ? 'Confermi?' : 'Elimina'}
          </ActionButton>
        </div>
      }
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-fine font-medium"
          style={{ backgroundColor: `${colorOfPlatform(entry.platform)}16`, color: colorOfPlatform(entry.platform) }}
        >
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: colorOfPlatform(entry.platform) }}
          />
          {entry.platform}
        </span>
        <span className="text-fine text-on-paper-muted">{entry.content_type}</span>
      </div>

      <h3 className="ds-display text-[22px] leading-tight tracking-[-0.02em]">{entry.title}</h3>

      {entry.description && (
        <p className="mt-3 whitespace-pre-wrap text-body text-on-paper-muted">{entry.description}</p>
      )}

      <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper">
        {[
          { k: 'Data', v: longDay(entry.date.slice(0, 10)) },
          { k: 'Stato', v: published ? 'Pubblicato' : 'Da pubblicare' },
          { k: 'Responsabile', v: entry.assigned_to || '—' },
        ].map((r) => (
          <div key={r.k} className="flex flex-wrap gap-x-4 gap-y-1 bg-paper px-4 py-3">
            <dt className="min-w-[110px] text-fine text-on-paper-muted">{r.k}</dt>
            <dd className="text-body">{r.v}</dd>
          </div>
        ))}
      </dl>

      {entry.notes && (
        <div className="mt-5">
          <p className="mb-1.5 text-fine font-medium">Note interne</p>
          <p className="whitespace-pre-wrap text-body text-on-paper-muted">{entry.notes}</p>
        </div>
      )}

      {/* The old form uploaded an attachment and then never showed it
          anywhere. Here it is. */}
      {entry.media_url && (
        <a
          href={entry.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex min-h-[48px] items-center gap-2 rounded-full border border-rule-paper px-4 text-fine font-medium transition-colors hover:border-accent/40"
        >
          <Paperclip size={16} strokeWidth={1.8} />
          Apri l&apos;allegato
        </a>
      )}
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   New / edit entry
───────────────────────────────────────────── */
function EntryForm({
  token,
  members,
  editTarget,
  defaultDate,
  defaultPlatform,
  recenti,
  onClose,
  onSaved,
}: {
  token: string;
  members: TeamMember[];
  editTarget?: PedEntry | null;
  defaultDate?: string;
  /** La piattaforma che si sta guardando: quasi sempre quella giusta. */
  defaultPlatform?: string;
  /** Da cui ricopiare, per non riscrivere ogni volta le stesse cose. */
  recenti: PedEntry[];
  onClose: () => void;
  onSaved: (e: PedEntry) => void;
}) {
  const isEdit = !!editTarget;
  const [form, setForm] = useState(() => ({
    date: editTarget?.date.slice(0, 10) ?? defaultDate ?? ymd(new Date()),
    title: editTarget?.title ?? '',
    description: editTarget?.description ?? '',
    platform: editTarget?.platform ?? defaultPlatform ?? 'Instagram',
    content_type: editTarget?.content_type ?? 'Post',
    assigned_to: editTarget?.assigned_to ?? '',
    notes: editTarget?.notes ?? '',
  }));
  const [file, setFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set<K extends keyof typeof form>(k: K, v: (typeof form)[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  /* Riprende tutto tranne la data: quella l'hai gia' scelta tu
     aprendo il giorno, ed e' l'unica cosa che di sicuro cambia fra un
     contenuto e il successivo. */
  function riprendi(e: PedEntry) {
    setForm((p) => ({
      ...p,
      title: e.title,
      description: e.description ?? '',
      platform: e.platform,
      content_type: e.content_type,
      assigned_to: e.assigned_to ?? '',
      notes: e.notes ?? '',
    }));
  }

  /**
   * `assigned_to` is a free-text column, and years of typing have left
   * it holding "Cristiano", "Cris", "Cri", "Elly" and "ELLY" for four
   * people. The picker writes the team member's full name from now on,
   * while still offering whatever string is already on the row so that
   * opening an old entry and saving it doesn't silently wipe the name.
   */
  const legacyName =
    form.assigned_to && !members.some((m) => m.name === form.assigned_to) ? form.assigned_to : null;

  async function submit() {
    if (!form.date || !form.title.trim()) {
      setError('Servono almeno la data e il titolo.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      let res: Response;
      if (isEdit && editTarget) {
        // JSON on edit, multipart on create: both exactly as the API
        // expects them today.
        res = await fetch(`/api/ped/${editTarget.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            date: form.date,
            title: form.title.trim(),
            description: form.description.trim() || null,
            platform: form.platform,
            content_type: form.content_type,
            assigned_to: form.assigned_to.trim() || null,
            notes: form.notes.trim() || null,
          }),
        });
      } else {
        const fd = new FormData();
        fd.append('date', form.date);
        fd.append('title', form.title.trim());
        fd.append('platform', form.platform);
        fd.append('content_type', form.content_type);
        fd.append('status', 'planned');
        if (form.description.trim()) fd.append('description', form.description.trim());
        if (form.assigned_to.trim()) fd.append('assigned_to', form.assigned_to.trim());
        if (form.notes.trim()) fd.append('notes', form.notes.trim());
        if (file) fd.append('file', file);
        res = await fetch('/api/ped', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: fd,
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      onSaved(data.entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      title={isEdit ? 'Modifica contenuto' : 'Nuovo contenuto'}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton onClick={submit} disabled={saving} className="flex-[2]">
            {saving ? 'Salvo…' : isEdit ? 'Salva' : 'Aggiungi'}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <TextInput
          autoFocus
          value={form.title}
          onChange={(e) => set('title', e.target.value)}
          placeholder="Cosa pubblichiamo?"
          className="!py-4 !text-[19px]"
        />

        {/* Da cui ripartire.
            Un piano editoriale e' fatto di cose che tornano: la stessa
            rubrica ogni martedi', lo stesso formato per la stessa
            persona. Riscriverla da capo ogni volta e' il motivo per cui
            su un telefono nessuno la compila.
            Una fila che scorre col dito e non va a capo: su uno schermo
            stretto tre suggerimenti incolonnati mangerebbero mezzo
            modulo prima che si veda un campo. */}
        {!isEdit && recenti.length > 0 && (
          <div>
            <p className="mb-2 text-fine font-medium text-on-paper-muted">Riparti da</p>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {recenti.map((r) => (
                <button
                  key={r.id}
                  onClick={() => riprendi(r)}
                  className="inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-full border border-rule-paper px-3.5 text-fine transition-colors hover:border-accent/40"
                >
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: colorOfPlatform(r.platform) }}
                  />
                  <span className="max-w-[26ch] truncate">{r.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Platforms as tappable chips rather than a dropdown: it is the
            field people change most, and here it takes one tap. */}
        <Field label="Piattaforma">
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((p) => {
              const on = form.platform === p;
              const color = colorOfPlatform(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => set('platform', p)}
                  aria-pressed={on}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-full border px-3.5 text-fine font-medium transition-colors"
                  style={{
                    backgroundColor: on ? color : 'transparent',
                    borderColor: on ? color : 'var(--color-rule-paper)',
                    color: on ? '#FDFBFA' : 'var(--color-on-paper)',
                  }}
                >
                  <span
                    className="h-2 w-2 shrink-0 rounded-full"
                    style={{ backgroundColor: on ? '#FDFBFA' : color }}
                  />
                  {p}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Tipo">
          <div className="flex flex-wrap gap-2">
            {CONTENT_TYPES.map((c) => {
              const on = form.content_type === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => set('content_type', c)}
                  aria-pressed={on}
                  className={`inline-flex min-h-[44px] items-center rounded-full border px-3.5 text-fine font-medium transition-colors ${
                    on
                      ? 'border-accent bg-accent text-paper'
                      : 'border-rule-paper text-on-paper hover:border-accent/40'
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </Field>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Data">
            <TextInput type="date" value={form.date} onChange={(e) => set('date', e.target.value)} />
          </Field>

          <Field label="Responsabile" hint="(opzionale)">
            <Select value={form.assigned_to} onChange={(e) => set('assigned_to', e.target.value)}>
              <option value="">Nessuno</option>
              {members.map((m) => (
                <option key={m.email} value={m.name}>
                  {m.name}
                </option>
              ))}
              {legacyName && <option value={legacyName}>{legacyName}</option>}
            </Select>
          </Field>
        </div>

        <Field label="Descrizione" hint="(opzionale)">
          <TextArea
            rows={3}
            value={form.description}
            onChange={(e) => set('description', e.target.value)}
            placeholder="Copy, concept, riferimenti…"
          />
        </Field>

        <Field label="Note interne" hint="(opzionale)">
          <TextArea
            rows={2}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="Promemoria per il team…"
          />
        </Field>

        {!isEdit && (
          <Field label="Allegato" hint="(opzionale, solo alla creazione)">
            <input
              type="file"
              accept="image/*,video/*,application/pdf"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full text-body text-on-paper-muted file:mr-3 file:min-h-[44px] file:rounded-full file:border-0 file:bg-accent file:px-4 file:text-fine file:font-medium file:text-paper"
            />
          </Field>
        )}

        {error && <p className="text-fine font-medium text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Manager
───────────────────────────────────────────── */
export default function PedManager() {
  const [entries, setEntries] = useState<PedEntry[]>([]);
  const [events, setEvents] = useState<CalEvent[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState('');

  const [tab, setTab] = useState<'calendar' | 'list'>('calendar');
  const [listFilter, setListFilter] = useState<'todo' | 'published' | 'all'>('todo');
  const [detail, setDetail] = useState<PedEntry | null>(null);
  const [formFor, setFormFor] = useState<{ edit?: PedEntry | null; date?: string } | null>(null);
  /* Quale piano si sta guardando. Vuoto = tutti insieme.
     Il team media non lavora sul piano del club: lavora su Instagram,
     oppure su TikTok. Un piano solo con dentro tutto li' costringe a
     filtrare con gli occhi ogni volta che apre la pagina. */
  const [canale, setCanale] = useState('');
  /* I colori dei formati, come li ha lasciati il team. Finche' non
     arrivano valgono quelli di partenza: un calendario grigio mentre
     si aspetta una risposta e' peggio di uno con i colori sbagliati
     per mezzo secondo. */
  const [coloriTipo, setColoriTipo] = useState<Record<string, string>>({});
  const [apriColori, setApriColori] = useState(false);
  const coloreTipo = useCallback(
    (t: string) => coloriTipo[t] ?? TYPE_COLOR_DEFAULT[t] ?? TYPE_COLOR_DEFAULT.Altro,
    [coloriTipo],
  );

  // In the parent, not in the sheet: see the note in TaskBoard.
  useOverlayBackClose(!!formFor, () => setFormFor(null));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const tk = session?.access_token ?? '';
      setToken(tk);
      const [pedRes, evRes, memRes, colRes] = await Promise.all([
        fetch('/api/ped', { headers: { Authorization: `Bearer ${tk}` } }),
        fetch('/api/events/all'),
        fetch('/api/team/members', { headers: { Authorization: `Bearer ${tk}` } }),
        fetch('/api/ped/colori', { headers: { Authorization: `Bearer ${tk}` } }),
      ]);
      if (colRes.ok) {
        const j = await colRes.json().catch(() => ({}));
        if (j.colori) setColoriTipo(j.colori);
      }
      const ped = await pedRes.json().catch(() => ({}));
      setEntries(ped.entries ?? []);
      if (evRes.ok) {
        const j = await evRes.json().catch(() => ({}));
        if (Array.isArray(j.events)) setEvents(j.events);
      }
      if (memRes.ok) {
        const j = await memRes.json().catch(() => ({}));
        if (Array.isArray(j.members)) setMembers(j.members);
      }
    } catch {
      /* silent */
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  /* ── Mutations ── */
  const toggle = useCallback(
    async (entry: PedEntry) => {
      const next: PedStatus = entry.status === 'published' ? 'planned' : 'published';
      setEntries((prev) => prev.map((e) => (e.id === entry.id ? { ...e, status: next } : e)));
      setDetail((d) => (d && d.id === entry.id ? { ...d, status: next } : d));
      const res = await fetch(`/api/ped/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) {
        setEntries((prev) =>
          prev.map((e) => (e.id === entry.id ? { ...e, status: entry.status } : e)),
        );
        setDetail((d) => (d && d.id === entry.id ? { ...d, status: entry.status } : d));
      }
    },
    [token],
  );

  const remove = useCallback(
    async (entry: PedEntry) => {
      const res = await fetch(`/api/ped/${entry.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setEntries((prev) => prev.filter((e) => e.id !== entry.id));
        setDetail(null);
      }
    },
    [token],
  );

  function handleSaved(entry: PedEntry) {
    setEntries((prev) => {
      const i = prev.findIndex((e) => e.id === entry.id);
      if (i >= 0) {
        const next = [...prev];
        next[i] = entry;
        return next;
      }
      return [...prev, entry];
    });
    setFormFor(null);
    setDetail((d) => (d && d.id === entry.id ? entry : d));
  }

  /* Un posto solo da cui pesca tutto il resto. */
  const visibili = useMemo(
    () => (canale ? entries.filter((e) => e.platform === canale) : entries),
    [entries, canale],
  );

  /* I suggerimenti: gli ultimi scritti, uno per titolo.
     Se stai guardando un canale sono i suoi, perche' e' li' che stai
     lavorando. Sei: su un telefono la fila si scorre col dito, e oltre
     la mezza dozzina si cerca invece di scegliere. */
  const recenti = useMemo(() => {
    const visti = new Set<string>();
    return [...visibili]
      .sort((a, b) => (b.created_at ?? '').localeCompare(a.created_at ?? ''))
      .filter((e) => {
        const k = e.title.trim().toLowerCase();
        if (!k || visti.has(k)) return false;
        visti.add(k);
        return true;
      })
      .slice(0, 6);
  }, [visibili]);

  /* ── Calendar: one source per platform in use, plus the events ── */
  const sources = useMemo<CalendarSource[]>(() => {
    /* Dentro un canale il colore del social non divide niente: e'
       tutto dello stesso colore. Li' dentro colora il formato, che e'
       la domanda che ci si fa davvero guardando un mese di Instagram. */
    const list: CalendarSource[] = canale
      ? CONTENT_TYPES.filter((t) => visibili.some((e) => e.content_type === t)).map((t) => ({
          key: t,
          label: t,
          color: coloreTipo(t),
        }))
      : PLATFORMS.filter((p) => visibili.some((e) => e.platform === p)).map((p) => ({
          key: p,
          label: p,
          color: colorOfPlatform(p),
        }));
    if (events.length) list.push({ key: EVENTS_SOURCE, label: 'Eventi VIVO', color: '#A3561A' });
    return list;
  }, [visibili, events, canale, coloreTipo]);

  const calendarItems = useMemo<CalendarItem[]>(() => {
    const out: CalendarItem[] = visibili.map((e) => ({
      id: `ped-${e.id}`,
      date: e.date.slice(0, 10),
      title: e.title,
      source: canale
        ? (CONTENT_TYPES.includes(e.content_type) ? e.content_type : 'Altro')
        : (PLATFORMS.includes(e.platform) ? e.platform : 'Altro'),
      detail: [e.content_type, e.assigned_to].filter(Boolean).join(' · ') || null,
      done: e.status === 'published',
    }));
    for (const ev of events) {
      if (!ev.date) continue;
      out.push({
        id: `event-${ev.id}`,
        date: ev.date.slice(0, 10),
        time: ev.time,
        title: ev.title,
        source: EVENTS_SOURCE,
        detail: ev.location ?? null,
      });
    }
    return out;
  }, [visibili, events, canale]);

  /* ── List: newest month first, and inside it by date ── */
  const months = useMemo(() => {
    const kept = visibili.filter((e) =>
      listFilter === 'all'
        ? true
        : listFilter === 'published'
          ? e.status === 'published'
          : e.status !== 'published',
    );
    const map: Record<string, PedEntry[]> = {};
    for (const e of kept) {
      const key = e.date.slice(0, 7);
      (map[key] ??= []).push(e);
    }
    return Object.entries(map)
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([key, list]) => ({
        key,
        label: monthLabel(`${key}-01`),
        list: list.sort((a, b) => a.date.localeCompare(b.date)),
      }));
  }, [visibili, listFilter]);

  const todoCount = visibili.filter((e) => e.status !== 'published').length;

  return (
    <div>
      <PageHead
        title="Piano editoriale"
        subtitle="Cosa esce, dove e quando, accanto agli eventi del club."
        action={
          <div className="flex flex-wrap gap-2.5">
            <ActionButton variant="quiet" onClick={() => setApriColori(true)}>
              <Palette size={16} strokeWidth={1.9} />
              Colori
            </ActionButton>
            <NewButton label="Nuovo contenuto" onClick={() => setFormFor({})} />
          </div>
        }
      />

      {/* I piani, uno per canale.
          Chi fa i contenuti non lavora sul piano del club: lavora su
          Instagram, oppure su TikTok. Un piano solo con dentro tutto
          costringe a filtrare con gli occhi a ogni apertura. Qui e' un
          tocco, e vale per il calendario e per l'elenco insieme.
          Compaiono solo i canali che hanno qualcosa dentro: un
          pulsante che apre sempre il vuoto e' un pulsante che si
          impara a saltare. */}
      <div className="-mx-1 mb-4 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {[{ id: '', label: 'Tutto', n: entries.length }, ...PLATFORMS
          .map((p) => ({ id: p, label: p, n: entries.filter((e) => e.platform === p).length }))
          .filter((p) => p.n > 0)].map((c) => {
          const on = canale === c.id;
          const colore = c.id ? colorOfPlatform(c.id) : null;
          return (
            <button
              key={c.id || 'tutto'}
              onClick={() => setCanale(c.id)}
              aria-pressed={on}
              className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 whitespace-nowrap rounded-full border px-3.5 text-fine font-medium transition-colors ${
                on ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
              }`}
            >
              {colore && (
                <span
                  aria-hidden="true"
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: on ? 'currentColor' : colore }}
                />
              )}
              {c.label}
              <span className={on ? 'opacity-70' : 'text-on-paper-muted'}>{c.n}</span>
            </button>
          );
        })}
      </div>

      {/* La legenda, solo dentro un canale e solo da leggere.
          Qui il colore ha appena cambiato significato — non e' piu' il
          social, e' il formato — e un colore che cambia senso senza
          dirlo e' un colore che confonde. Non e' un filtro: di comandi
          ce ne sono gia' abbastanza. */}
      {canale && sources.some((x) => x.key !== EVENTS_SOURCE) && (
        <div className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-fine text-on-paper-muted">
          {sources.filter((x) => x.key !== EVENTS_SOURCE).map((x) => (
            <span key={x.key} className="inline-flex items-center gap-1.5">
              <span
                aria-hidden="true"
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: x.color }}
              />
              {x.label}
            </span>
          ))}
        </div>
      )}

      <div className="mb-5 flex rounded-full border border-rule-paper p-1 lg:w-fit">
        {(
          [
            { id: 'calendar', label: 'Calendario', Icon: CalendarIcon },
            { id: 'list', label: 'Elenco', Icon: List },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-pressed={tab === t.id}
            className={`inline-flex min-h-[46px] flex-1 items-center justify-center gap-2 rounded-full text-fine font-medium transition-colors lg:flex-none lg:px-8 ${
              tab === t.id ? 'bg-accent text-paper' : 'text-on-paper-muted hover:text-on-paper'
            }`}
          >
            <t.Icon size={16} strokeWidth={1.8} />
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : tab === 'calendar' ? (
        <Calendar
          items={calendarItems}
          sources={sources}
          onItemClick={(item) => {
            const e = entries.find((x) => `ped-${x.id}` === item.id);
            if (e) setDetail(e);
          }}
          onDayAdd={(date) => setFormFor({ date })}
          addLabel="Contenuto"
          emptyDayLabel="Niente in programma questo giorno."
          /* L'elenco ce l'ha gia' la linguetta qui sopra, e i canali
             sono i pulsanti grandi in cima: tenerli anche dentro il
             calendario vuol dire due comandi per la stessa cosa. */
          views={['month', 'week']}
          showSources={false}
        />
      ) : (
        <div className="flex flex-col gap-7">
          <div className="flex rounded-full border border-rule-paper p-1 lg:w-fit">
            {(
              [
                { id: 'todo', label: `Da pubblicare${todoCount ? ` · ${todoCount}` : ''}` },
                { id: 'published', label: 'Pubblicati' },
                { id: 'all', label: 'Tutti' },
              ] as const
            ).map((f) => (
              <button
                key={f.id}
                onClick={() => setListFilter(f.id)}
                aria-pressed={listFilter === f.id}
                className={`min-h-[44px] flex-1 rounded-full px-3 text-fine font-medium transition-colors lg:flex-none lg:px-7 ${
                  listFilter === f.id ? 'bg-paper-soft text-on-paper' : 'text-on-paper-muted'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {months.length === 0 ? (
            <EmptyState
              title={canale ? `Niente su ${canale}` : 'Niente da mostrare'}
              body={
                /* Col filtro acceso il vuoto non vuol dire che il
                   piano e' vuoto: vuol dire che quel canale lo e'. */
                canale
                  ? listFilter === 'todo'
                    ? `Nessun contenuto ${canale} in attesa di pubblicazione.`
                    : `Nessun contenuto per ${canale}. Gli altri canali li trovi su «Tutto».`
                  : listFilter === 'todo'
                    ? 'Nessun contenuto in attesa di pubblicazione.'
                    : 'Aggiungi un contenuto e comparirà qui, raggruppato per mese.'
              }
              action={<NewButton label="Nuovo contenuto" onClick={() => setFormFor({})} />}
            />
          ) : (
            months.map((m) => (
              <section key={m.key}>
                <h3 className="mb-2.5 flex items-baseline gap-2 text-subtitle font-medium">
                  {m.label}
                  <span className="text-fine font-normal text-on-paper-muted">{m.list.length}</span>
                </h3>
                <div className="flex flex-col gap-1.5">
                  {m.list.map((e) => (
                    <EntryRow key={e.id} entry={e} onToggle={toggle} onOpen={setDetail} />
                  ))}
                </div>
              </section>
            ))
          )}
        </div>
      )}

      <EntryDetail
        entry={detail}
        onClose={() => setDetail(null)}
        onEdit={(e) => {
          setDetail(null);
          setFormFor({ edit: e });
        }}
        onDelete={remove}
        onToggle={toggle}
      />

      {apriColori && (
        <FoglioColori
          token={token}
          valori={coloriTipo}
          onClose={() => setApriColori(false)}
          onSaved={setColoriTipo}
        />
      )}

      {formFor && (
        <EntryForm
          token={token}
          members={members}
          editTarget={formFor.edit}
          defaultDate={formFor.date}
          defaultPlatform={canale || undefined}
          recenti={recenti}
          onClose={() => setFormFor(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
