'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronRight,
  Download,
  ExternalLink,
  File as FileIcon,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Folder,
  FolderPlus,
  MoveRight,
  Pencil,
  Presentation,
  Trash2,
  Upload,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { scaricaConModulo } from '@/lib/scarica';
import { useOverlayBackClose } from '@/lib/useMobileOverlay';
import {
  ActionButton,
  EmptyState,
  Field,
  PageHead,
  SearchField,
  Select,
  Sheet,
  TextArea,
  TextInput,
} from '@/components/admin/ui';
import {
  KIND_COLOR,
  KIND_LABEL,
  canOpenInline,
  formatSize,
  kindOf,
  mimeOf,
  rejectReason,
  titleFromFileName,
  type FileKind,
} from '@/lib/documents';

/**
 * Documenti.
 *
 * Due cose non andavano, e nessuna delle due era estetica. La prima: le
 * cartelle erano sei parole scritte nel codice, quindi per aggiungerne
 * una serviva una modifica al sito. La seconda: si potevano caricare
 * solo PDF, Word e PowerPoint — un Excel o la foto di una fattura
 * venivano respinti da un archivio che si chiama "Documenti".
 *
 * Ora le cartelle stanno in una tabella e si creano da qui, e si carica
 * qualunque cosa tranne i programmi. I file vanno nello storage
 * direttamente dal browser, senza passare dal nostro server: è l'unico
 * modo perché un PowerPoint da venti megabyte arrivi davvero una volta
 * pubblicato.
 */

interface Doc {
  id: string;
  title: string;
  description: string | null;
  category: string | null;
  folder_id: string | null;
  file_path: string;
  file_name: string;
  file_size: number | null;
  uploaded_by: string;
  created_at: string;
}

interface FolderRow {
  id: string;
  name: string;
  color: string;
  count: number;
}

const FOLDER_COLORS = [
  '#731515', '#A3561A', '#1F5F8B', '#2F7A4F', '#5B3A8C', '#7A5252',
];

const KIND_ICON: Record<FileKind, React.ComponentType<{ size?: number; strokeWidth?: number }>> = {
  pdf: FileText,
  doc: FileText,
  sheet: FileSpreadsheet,
  slides: Presentation,
  image: FileImage,
  archive: FileArchive,
  text: FileText,
  video: FileVideo,
  audio: FileAudio,
  other: FileIcon,
};

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' });
}

/* ─────────────────────────────────────────────
   Un file, come riga
───────────────────────────────────────────── */
function DocRow({ doc, onOpen }: { doc: Doc; onOpen: (d: Doc) => void }) {
  const kind = kindOf(doc.file_name);
  const Icon = KIND_ICON[kind];
  const color = KIND_COLOR[kind];

  return (
    <button
      onClick={() => onOpen(doc)}
      className="flex min-h-[68px] w-full items-center gap-3 rounded-2xl border border-rule-paper px-3 text-left transition-colors hover:border-accent/40 hover:bg-paper-soft"
    >
      <span
        className="grid h-11 w-11 shrink-0 place-items-center rounded-xl"
        style={{ backgroundColor: `${color}14`, color }}
      >
        <Icon size={20} strokeWidth={1.7} />
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-body">{doc.title}</span>
        <span className="mt-0.5 block truncate text-fine text-on-paper-muted">
          {KIND_LABEL[kind]} · {formatSize(doc.file_size)} · {fmtDate(doc.created_at)}
        </span>
      </span>

      <ChevronRight size={18} strokeWidth={1.7} className="shrink-0 text-on-paper-muted" />
    </button>
  );
}

/* ─────────────────────────────────────────────
   Dettaglio del file
───────────────────────────────────────────── */
function DocDetail({
  doc,
  folders,
  isAdmin,
  token,
  onClose,
  onChanged,
  onDeleted,
}: {
  doc: Doc | null;
  folders: FolderRow[];
  isAdmin: boolean;
  token: string;
  onClose: () => void;
  onChanged: (d: Doc) => void;
  onDeleted: (id: string) => void;
}) {
  const [busy, setBusy] = useState('');
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [draftTitle, setDraftTitle] = useState('');
  const [error, setError] = useState('');
  useOverlayBackClose(!!doc, onClose);

  useEffect(() => {
    setRenaming(false);
    setError('');
    setDraftTitle(doc?.title ?? '');
  }, [doc]);

  if (!doc) return null;

  const kind = kindOf(doc.file_name);
  const Icon = KIND_ICON[kind];
  const color = KIND_COLOR[kind];
  const inlineable = canOpenInline(doc.file_name);
  const confirming = confirmId === doc.id;

  /**
   * Il file si prende con fetch e non con un semplice link, perché la
   * rotta vuole il token nell'intestazione e un tag <a> non può
   * mandarlo. Da qui si ricava un blob locale.
   */
  async function fetchBlob(inline: boolean) {
    const res = await fetch(`/api/documents/${doc!.id}/download${inline ? '?inline=1' : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Impossibile scaricare il file.');
    const raw = await res.blob();
    // Il tipo viene ricalcolato qui dall'estensione: un blob creato con
    // un tipo arbitrario erediterebbe la nostra origine quando lo si
    // apre, e non è una cosa da lasciare al caso.
    return new Blob([raw], { type: mimeOf(doc!.file_name) });
  }

  async function download() {
    setBusy('download');
    setError('');
    try {
      const esito = scaricaConModulo(`/api/documents/${doc!.id}/download`, { token });
      if (!esito.ok) setError(esito.messaggio ?? 'Non sono riuscito a scaricare il file.');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setBusy('');
    }
  }

  async function openInline() {
    // La scheda si apre subito, prima della richiesta: aperta dopo,
    // il browser la considererebbe non richiesta dall'utente e la
    // bloccherebbe.
    const tab = window.open('', '_blank');
    setBusy('open');
    setError('');
    try {
      const blob = await fetchBlob(true);
      const url = URL.createObjectURL(blob);
      if (tab) tab.location.href = url;
      setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (e) {
      tab?.close();
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setBusy('');
    }
  }

  async function patch(body: Record<string, unknown>) {
    setBusy('save');
    setError('');
    try {
      const res = await fetch(`/api/documents/${doc!.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      onChanged(data.document);
      setRenaming(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setBusy('');
    }
  }

  async function remove() {
    setBusy('delete');
    setError('');
    try {
      const res = await fetch(`/api/documents/${doc!.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Errore.');
      }
      onDeleted(doc!.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
      setBusy('');
    }
  }

  return (
    <Sheet
      open
      title="Documento"
      onClose={onClose}
      footer={
        <div className="flex flex-wrap gap-2.5">
          <ActionButton onClick={download} disabled={!!busy} className="flex-1">
            <Download size={17} strokeWidth={1.9} />
            {busy === 'download' ? 'Scarico…' : 'Scarica'}
          </ActionButton>
          {inlineable && (
            <ActionButton variant="quiet" onClick={openInline} disabled={!!busy}>
              <ExternalLink size={16} strokeWidth={1.8} />
              Apri
            </ActionButton>
          )}
          {isAdmin && (
            <ActionButton
              variant="danger"
              onClick={() => (confirming ? remove() : setConfirmId(doc.id))}
              disabled={!!busy}
            >
              <Trash2 size={16} strokeWidth={1.8} />
              {confirming ? 'Confermi?' : 'Elimina'}
            </ActionButton>
          )}
        </div>
      }
    >
      <div className="flex items-start gap-3">
        <span
          className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl"
          style={{ backgroundColor: `${color}14`, color }}
        >
          <Icon size={26} strokeWidth={1.6} />
        </span>
        <div className="min-w-0 flex-1">
          {renaming ? (
            <div className="flex flex-col gap-2.5">
              <TextInput
                autoFocus
                value={draftTitle}
                onChange={(e) => setDraftTitle(e.target.value)}
                placeholder="Titolo del documento"
              />
              <div className="flex gap-2">
                <ActionButton
                  onClick={() => patch({ title: draftTitle })}
                  disabled={busy === 'save' || !draftTitle.trim()}
                >
                  Salva
                </ActionButton>
                <ActionButton variant="quiet" onClick={() => setRenaming(false)}>
                  Annulla
                </ActionButton>
              </div>
            </div>
          ) : (
            <>
              <h3 className="ds-display text-[21px] leading-tight tracking-[-0.02em]">
                {doc.title}
              </h3>
              <button
                onClick={() => setRenaming(true)}
                className="mt-1.5 inline-flex items-center gap-1.5 text-fine font-medium text-accent"
              >
                <Pencil size={13} strokeWidth={1.9} />
                Rinomina
              </button>
            </>
          )}
        </div>
      </div>

      {doc.description && (
        <p className="mt-4 whitespace-pre-wrap text-body text-on-paper-muted">{doc.description}</p>
      )}

      <dl className="mt-6 grid gap-px overflow-hidden rounded-2xl border border-rule-paper bg-rule-paper">
        {[
          { k: 'Nome file', v: doc.file_name },
          { k: 'Tipo', v: KIND_LABEL[kind] },
          { k: 'Dimensione', v: formatSize(doc.file_size) },
          { k: 'Caricato il', v: fmtDate(doc.created_at) },
          { k: 'Da', v: doc.uploaded_by },
        ].map((r) => (
          <div key={r.k} className="flex flex-wrap gap-x-4 gap-y-1 bg-paper px-4 py-3">
            <dt className="min-w-[110px] shrink-0 text-fine text-on-paper-muted">{r.k}</dt>
            <dd className="min-w-0 break-words text-body">{r.v}</dd>
          </div>
        ))}
      </dl>

      <div className="mt-5">
        <Field label="Cartella">
          <Select
            value={doc.folder_id ?? ''}
            onChange={(e) => patch({ folder_id: e.target.value || null })}
            disabled={busy === 'save'}
          >
            <option value="">Fuori da ogni cartella</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      {!inlineable && (
        <p className="mt-4 text-fine text-on-paper-muted">
          Questo tipo di file non si apre nel browser: va scaricato e aperto
          con l&apos;applicazione che lo gestisce.
        </p>
      )}

      {error && <p className="mt-4 text-fine font-medium text-accent">{error}</p>}
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Caricamento
───────────────────────────────────────────── */
type QueueItem = {
  id: string;
  file: File;
  title: string;
  state: 'waiting' | 'uploading' | 'done' | 'error';
  error?: string;
};

function UploadSheet({
  initialFiles,
  folders,
  defaultFolder,
  token,
  onClose,
  onUploaded,
}: {
  initialFiles: File[];
  folders: FolderRow[];
  defaultFolder: string;
  token: string;
  onClose: () => void;
  onUploaded: (d: Doc) => void;
}) {
  const [queue, setQueue] = useState<QueueItem[]>(() =>
    initialFiles.map((file, i) => ({
      id: `${Date.now()}-${i}`,
      file,
      title: titleFromFileName(file.name),
      state: rejectReason(file.name, file.size) ? 'error' : 'waiting',
      error: rejectReason(file.name, file.size) ?? undefined,
    })),
  );
  const [folderId, setFolderId] = useState(defaultFolder);
  const [description, setDescription] = useState('');
  const [running, setRunning] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const list = Array.from(files);
    setQueue((prev) => [
      ...prev,
      ...list.map((file, i) => {
        const reason = rejectReason(file.name, file.size);
        return {
          id: `${Date.now()}-${prev.length + i}`,
          file,
          title: titleFromFileName(file.name),
          state: (reason ? 'error' : 'waiting') as QueueItem['state'],
          error: reason ?? undefined,
        };
      }),
    ]);
  }

  const pending = queue.filter((q) => q.state === 'waiting');

  /**
   * Un file alla volta, di proposito: in parallelo su una connessione
   * mobile si ottiene soltanto che falliscano tutti insieme, e qui
   * l'ordine conta meno della certezza che ciò che è passato sia
   * passato davvero.
   */
  async function run() {
    setRunning(true);
    for (const item of queue) {
      if (item.state !== 'waiting') continue;
      setQueue((p) => p.map((q) => (q.id === item.id ? { ...q, state: 'uploading' } : q)));
      try {
        // 1. il server decide il percorso e firma
        const signRes = await fetch('/api/documents/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ fileName: item.file.name, size: item.file.size }),
        });
        const sign = await signRes.json();
        if (!signRes.ok) throw new Error(sign.error ?? 'Errore.');

        // 2. il file va allo storage senza passare dal nostro server
        const up = await supabase.storage
          .from(sign.bucket)
          .uploadToSignedUrl(sign.path, sign.token, item.file);
        if (up.error) throw new Error(up.error.message);

        // 3. si registra la riga
        const docRes = await fetch('/api/documents', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({
            title: item.title.trim() || item.file.name,
            description: description.trim() || null,
            folder_id: folderId || null,
            file_path: sign.path,
            file_name: item.file.name,
            file_size: item.file.size,
          }),
        });
        const doc = await docRes.json();
        if (!docRes.ok) throw new Error(doc.error ?? 'Errore.');

        onUploaded(doc.document);
        setQueue((p) => p.map((q) => (q.id === item.id ? { ...q, state: 'done' } : q)));
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Errore.';
        setQueue((p) => p.map((q) => (q.id === item.id ? { ...q, state: 'error', error: msg } : q)));
      }
    }
    setRunning(false);
  }

  const allDone = queue.length > 0 && queue.every((q) => q.state === 'done');

  return (
    <Sheet
      open
      title={queue.length > 1 ? `Carica ${queue.length} file` : 'Carica un file'}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            {allDone ? 'Chiudi' : 'Annulla'}
          </ActionButton>
          <ActionButton
            onClick={run}
            disabled={running || pending.length === 0}
            className="flex-[2]"
          >
            {running
              ? 'Carico…'
              : pending.length === 0
                ? 'Niente da caricare'
                : `Carica ${pending.length} file`}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <Field label="Cartella di destinazione">
          <Select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
            <option value="">Fuori da ogni cartella</option>
            {folders.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </Select>
        </Field>

        <div>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <button
            onClick={() => inputRef.current?.click()}
            className="flex min-h-[56px] w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-rule-paper text-fine font-medium transition-colors hover:border-accent/50"
          >
            <Upload size={17} strokeWidth={1.8} />
            Aggiungi altri file
          </button>
        </div>

        {queue.length > 0 && (
          <div className="flex flex-col gap-2">
            {queue.map((q) => {
              const kind = kindOf(q.file.name);
              const Icon = KIND_ICON[kind];
              return (
                <div
                  key={q.id}
                  className="flex items-start gap-3 rounded-2xl border border-rule-paper p-3"
                >
                  <span
                    className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: `${KIND_COLOR[kind]}14`, color: KIND_COLOR[kind] }}
                  >
                    <Icon size={18} strokeWidth={1.7} />
                  </span>

                  <div className="min-w-0 flex-1">
                    {q.state === 'waiting' ? (
                      <TextInput
                        value={q.title}
                        onChange={(e) =>
                          setQueue((p) =>
                            p.map((x) => (x.id === q.id ? { ...x, title: e.target.value } : x)),
                          )
                        }
                        placeholder="Titolo"
                        className="!py-2.5"
                      />
                    ) : (
                      <p className="truncate text-body">{q.title}</p>
                    )}
                    <p className="mt-1 truncate text-fine text-on-paper-muted">
                      {q.file.name} · {formatSize(q.file.size)}
                    </p>
                    {q.state === 'uploading' && (
                      <p className="mt-1 text-fine text-on-paper-muted">Caricamento…</p>
                    )}
                    {q.state === 'done' && (
                      <p className="mt-1 text-fine font-medium text-accent">Caricato</p>
                    )}
                    {q.state === 'error' && (
                      <p className="mt-1 text-fine font-medium text-accent">{q.error}</p>
                    )}
                  </div>

                  {q.state === 'waiting' && (
                    <button
                      onClick={() => setQueue((p) => p.filter((x) => x.id !== q.id))}
                      aria-label="Togli dalla lista"
                      className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-on-paper-muted hover:bg-paper-soft"
                    >
                      <Trash2 size={16} strokeWidth={1.8} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <Field label="Descrizione" hint="(opzionale, vale per tutti i file di questo caricamento)">
          <TextArea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A cosa servono questi file…"
          />
        </Field>

        <p className="text-fine text-on-paper-muted">
          Si carica qualunque tipo di file (PDF, Word, Excel, PowerPoint,
          immagini, archivi) fino a 50 MB l&apos;uno. Sono esclusi solo i
          programmi eseguibili.
        </p>
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Nuova cartella / rinomina
───────────────────────────────────────────── */
function FolderSheet({
  target,
  token,
  onClose,
  onSaved,
}: {
  target: FolderRow | 'new';
  token: string;
  onClose: () => void;
  onSaved: (f: FolderRow) => void;
}) {
  const isNew = target === 'new';
  const [name, setName] = useState(isNew ? '' : target.name);
  const [color, setColor] = useState(isNew ? FOLDER_COLORS[0] : target.color);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    if (!name.trim()) {
      setError('Serve un nome.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const res = await fetch(
        isNew ? '/api/documents/folders' : `/api/documents/folders/${target.id}`,
        {
          method: isNew ? 'POST' : 'PATCH',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ name: name.trim(), color }),
        },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Errore.');
      onSaved({ count: isNew ? 0 : target.count, ...data.folder });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet
      open
      title={isNew ? 'Nuova cartella' : 'Rinomina cartella'}
      onClose={onClose}
      footer={
        <div className="flex gap-2.5">
          <ActionButton variant="quiet" onClick={onClose} className="flex-1">
            Annulla
          </ActionButton>
          <ActionButton onClick={save} disabled={saving} className="flex-[2]">
            {saving ? 'Salvo…' : isNew ? 'Crea' : 'Salva'}
          </ActionButton>
        </div>
      }
    >
      <div className="flex flex-col gap-5">
        <TextInput
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome della cartella"
          className="!py-4 !text-[19px]"
        />

        <Field label="Colore">
          <div className="flex flex-wrap gap-2.5">
            {FOLDER_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setColor(c)}
                aria-label={`Colore ${c}`}
                aria-pressed={color === c}
                className={`h-11 w-11 rounded-full border-2 transition-transform ${
                  color === c ? 'scale-110 border-on-paper' : 'border-transparent'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>

        {error && <p className="text-fine font-medium text-accent">{error}</p>}
      </div>
    </Sheet>
  );
}

/* ─────────────────────────────────────────────
   Archivio
───────────────────────────────────────────── */
export default function DocumentManager({
  token,
  isAdmin,
}: {
  token: string;
  isAdmin: boolean;
}) {
  const [docs, setDocs] = useState<Doc[]>([]);
  const [folders, setFolders] = useState<FolderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [liveToken, setLiveToken] = useState(token);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  const [detail, setDetail] = useState<Doc | null>(null);
  const [uploadFiles, setUploadFiles] = useState<File[] | null>(null);
  const [folderSheet, setFolderSheet] = useState<FolderRow | 'new' | null>(null);
  const [deletingFolder, setDeletingFolder] = useState(false);
  const [dragging, setDragging] = useState(false);

  useOverlayBackClose(!!uploadFiles, () => setUploadFiles(null));
  useOverlayBackClose(!!folderSheet, () => setFolderSheet(null));

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Il token arriva come prop, ma lo si rilegge dalla sessione:
      // quello passato è stato letto al montaggio della pagina e i
      // token di accesso scadono dopo un'ora. Il client Supabase ne
      // tiene uno valido, quindi conviene chiederlo a lui.
      const { data: { session } } = await supabase.auth.getSession();
      const live = session?.access_token || token;
      setLiveToken(live);
      const headers = { Authorization: `Bearer ${live}` };
      const [docsRes, foldersRes] = await Promise.all([
        fetch('/api/documents', { headers }),
        fetch('/api/documents/folders', { headers }),
      ]);

      const docsJson = await docsRes.json().catch(() => ({}));
      if (!docsRes.ok) throw new Error(docsJson.error ?? 'Impossibile caricare i documenti.');
      setDocs(docsJson.documents ?? []);

      if (foldersRes.ok) {
        const f = await foldersRes.json().catch(() => ({}));
        setFolders(f.folders ?? []);
      } else {
        // La tabella delle cartelle potrebbe non esistere ancora: in quel
        // caso i file si vedono lo stesso, tutti insieme.
        setFolders([]);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Si carica comunque: la sessione la legge `load` da sé, quindi non
  // dipende dal fatto che il prop sia già arrivato.
  useEffect(() => {
    load();
  }, [load]);

  /* ── Conteggi sempre derivati dai documenti, mai dal server ── */
  const foldersWithCounts = useMemo(
    () =>
      folders.map((f) => ({
        ...f,
        count: docs.filter((d) => d.folder_id === f.id).length,
      })),
    [folders, docs],
  );

  const current = openFolder ? foldersWithCounts.find((f) => f.id === openFolder) ?? null : null;

  const searching = query.trim().length > 0;

  const visibleDocs = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      return docs.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.file_name.toLowerCase().includes(q) ||
          (d.description ?? '').toLowerCase().includes(q),
      );
    }
    return docs.filter((d) => (openFolder ? d.folder_id === openFolder : !d.folder_id));
  }, [docs, query, openFolder]);

  /* ── Trascinare file sopra la pagina ── */
  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = Array.from(e.dataTransfer.files ?? []);
    if (files.length) setUploadFiles(files);
  }

  async function deleteFolder(f: FolderRow) {
    const res = await fetch(`/api/documents/folders/${f.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${liveToken}` },
    });
    if (res.ok) {
      setFolders((p) => p.filter((x) => x.id !== f.id));
      setDocs((p) => p.map((d) => (d.folder_id === f.id ? { ...d, folder_id: null } : d)));
      setOpenFolder(null);
      setDeletingFolder(false);
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={dragging ? 'rounded-3xl outline-2 outline-dashed outline-accent/50' : ''}
    >
      <PageHead
        title="Documenti"
        subtitle="L'archivio del club: statuti, contratti, preventivi e tutto il resto."
        action={
          <ActionButton onClick={() => setUploadFiles([])}>
            <Upload size={17} strokeWidth={1.9} />
            Carica
          </ActionButton>
        }
      />

      <div className="mb-5">
        <SearchField value={query} onChange={setQuery} placeholder="Cerca in tutti i documenti" />
      </div>

      {/* Briciole: si vede sempre dove si è e come tornare su. */}
      {!searching && (
        <div className="mb-4 flex min-h-[44px] flex-wrap items-center gap-1.5 text-fine">
          <button
            onClick={() => setOpenFolder(null)}
            className={openFolder ? 'font-medium text-accent' : 'text-on-paper-muted'}
          >
            Tutti i documenti
          </button>
          {current && (
            <>
              <ChevronRight size={14} strokeWidth={1.8} className="text-on-paper-muted" />
              <span className="font-medium">{current.name}</span>
            </>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-20">
          <span className="h-6 w-6 animate-spin rounded-full border-2 border-accent border-t-transparent" />
        </div>
      ) : error ? (
        <EmptyState
          title="Non riesco a leggere l'archivio"
          body={error}
          action={<ActionButton onClick={load}>Riprova</ActionButton>}
        />
      ) : (
        <div className="flex flex-col gap-8">
          {/* ── Le cartelle, solo alla radice ── */}
          {!searching && !openFolder && (
            <section>
              <h3 className="mb-3 text-subtitle font-medium">Cartelle</h3>
              <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
                {foldersWithCounts.map((f) => (
                  <button
                    key={f.id}
                    onClick={() => setOpenFolder(f.id)}
                    className="flex min-h-[104px] flex-col items-start gap-2 rounded-2xl border border-rule-paper p-3.5 text-left transition-colors hover:border-accent/40 hover:bg-paper-soft"
                  >
                    <span
                      className="grid h-10 w-10 place-items-center rounded-xl"
                      style={{ backgroundColor: `${f.color}16`, color: f.color }}
                    >
                      <Folder size={20} strokeWidth={1.7} />
                    </span>
                    <span className="mt-auto min-w-0 w-full">
                      <span className="block truncate text-body">{f.name}</span>
                      <span className="block text-fine text-on-paper-muted">
                        {f.count === 1 ? '1 file' : `${f.count} file`}
                      </span>
                    </span>
                  </button>
                ))}

                <button
                  onClick={() => setFolderSheet('new')}
                  className="flex min-h-[104px] flex-col items-start gap-2 rounded-2xl border border-dashed border-rule-paper p-3.5 text-left transition-colors hover:border-accent/50"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-paper-soft text-on-paper-muted">
                    <FolderPlus size={20} strokeWidth={1.7} />
                  </span>
                  <span className="mt-auto text-body text-on-paper-muted">Nuova cartella</span>
                </button>
              </div>
            </section>
          )}

          {/* ── Azioni sulla cartella aperta ── */}
          {!searching && current && (
            <div className="flex flex-wrap gap-2.5">
              <ActionButton variant="quiet" onClick={() => setFolderSheet(current)}>
                <Pencil size={16} strokeWidth={1.8} />
                Rinomina
              </ActionButton>
              {isAdmin && (
                <ActionButton
                  variant="danger"
                  onClick={() => (deletingFolder ? deleteFolder(current) : setDeletingFolder(true))}
                >
                  <Trash2 size={16} strokeWidth={1.8} />
                  {deletingFolder
                    ? current.count > 0
                      ? `Confermi? ${current.count} file restano in archivio`
                      : 'Confermi?'
                    : 'Elimina cartella'}
                </ActionButton>
              )}
            </div>
          )}

          {/* ── I file ── */}
          <section>
            <h3 className="mb-3 flex items-baseline gap-2 text-subtitle font-medium">
              {searching
                ? 'Risultati'
                : current
                  ? current.name
                  : 'Fuori da ogni cartella'}
              <span className="text-fine font-normal text-on-paper-muted">
                {visibleDocs.length}
              </span>
            </h3>

            {visibleDocs.length === 0 ? (
              <EmptyState
                title={searching ? 'Nessun risultato' : 'Niente qui dentro'}
                body={
                  searching
                    ? 'Prova con una parola del titolo o del nome del file.'
                    : 'Trascina qui i file, oppure usa il pulsante Carica in alto.'
                }
                action={
                  searching ? undefined : (
                    <ActionButton onClick={() => setUploadFiles([])}>
                      <Upload size={17} strokeWidth={1.9} />
                      Carica
                    </ActionButton>
                  )
                }
              />
            ) : (
              <div className="flex flex-col gap-1.5">
                {visibleDocs.map((d) => (
                  <DocRow key={d.id} doc={d} onOpen={setDetail} />
                ))}
              </div>
            )}

            {searching && (
              <p className="mt-4 flex items-center gap-1.5 text-fine text-on-paper-muted">
                <MoveRight size={14} strokeWidth={1.8} />
                La ricerca guarda dentro tutte le cartelle.
              </p>
            )}
          </section>
        </div>
      )}

      <DocDetail
        doc={detail}
        folders={foldersWithCounts}
        isAdmin={isAdmin}
        token={liveToken}
        onClose={() => setDetail(null)}
        onChanged={(d) => {
          setDocs((p) => p.map((x) => (x.id === d.id ? d : x)));
          setDetail(d);
        }}
        onDeleted={(id) => {
          setDocs((p) => p.filter((x) => x.id !== id));
          setDetail(null);
        }}
      />

      {uploadFiles && (
        <UploadSheet
          initialFiles={uploadFiles}
          folders={foldersWithCounts}
          defaultFolder={openFolder ?? ''}
          token={liveToken}
          onClose={() => setUploadFiles(null)}
          onUploaded={(d) => setDocs((p) => [d, ...p])}
        />
      )}

      {folderSheet && (
        <FolderSheet
          target={folderSheet}
          token={liveToken}
          onClose={() => setFolderSheet(null)}
          onSaved={(f) => {
            setFolders((p) => {
              const i = p.findIndex((x) => x.id === f.id);
              if (i >= 0) {
                const next = [...p];
                next[i] = f;
                return next;
              }
              return [...p, f].sort((a, b) => a.name.localeCompare(b.name));
            });
            setFolderSheet(null);
          }}
        />
      )}
    </div>
  );
}
