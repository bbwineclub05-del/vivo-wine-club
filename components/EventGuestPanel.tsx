'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, FileDown, Loader2, Plus, Star, Trash2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ActionButton, EmptyState, SearchField } from '@/components/admin/ui';
import { scaricaBlobGenerato } from '@/lib/scarica';

/**
 * Chi si è iscritto a un evento, e chi è entrato.
 *
 * Si usa in piedi sulla porta, con una mano sola: il tondo del
 * check-in è il bersaglio più grande della schermata, i contatori
 * stanno in alto e restano lì mentre la lista scorre.
 *
 * Il verde smeraldo che segnava i presenti è diventato il bordeaux
 * del club: era l'unico verde in tutta l'area riservata.
 */

interface Guest {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string | null;
  checked_in: boolean;
  checked_in_at?: string | null;
  created_at: string;
  partner_code?: string | null;
  referral_reward_unlocked?: boolean;
  referral_reward_code?: string | null;
}

interface Props {
  event: { id: string; slug: string; title: string; guest_list_enabled: boolean };
  accessToken: string;
  onGuestEnabled: () => void;
}

function oraIscrizione(iso: string) {
  return new Date(iso).toLocaleString('it-IT', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function EventGuestPanel({ event, accessToken, onGuestEnabled }: Props) {
  const [ospiti, setOspiti] = useState<Guest[]>([]);
  const [caricando, setCaricando] = useState(false);
  const [attivando, setAttivando] = useState(false);
  const [conferma, setConferma] = useState(false);
  const [eliminando, setEliminando] = useState(false);
  const [cerca, setCerca] = useState('');
  const [inCorso, setInCorso] = useState<Set<string>>(new Set());
  const [esportando, setEsportando] = useState(false);
  const [esitoPdf, setEsitoPdf] = useState('');
  const [partner, setPartner] = useState<Map<string, string>>(new Map());

  const carica = useCallback(() => {
    setCaricando(true);
    fetch(`/api/events/${event.slug}/guests`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => r.json())
      .then((j) => setOspiti(Array.isArray(j.guests) ? j.guests : []))
      .catch(console.error)
      .finally(() => setCaricando(false));
  }, [event.slug, accessToken]);

  useEffect(() => {
    if (!event.guest_list_enabled) return;
    carica();
    fetch(`/api/events/${event.slug}/partners`, { headers: { Authorization: `Bearer ${accessToken}` } })
      .then((r) => (r.ok ? r.json() : { partners: [] }))
      .then((j) => setPartner(new Map((j.partners ?? []).map((p: { code: string; name: string }) => [p.code, p.name]))))
      .catch(() => {});
  }, [event.guest_list_enabled, event.slug, accessToken, carica]);

  /* Due telefoni sulla stessa porta: chi segna una presenza la fa
     comparire anche sull'altro, senza ricaricare niente. */
  useEffect(() => {
    if (!event.guest_list_enabled) return;
    supabase.realtime.setAuth(accessToken);

    const channel = supabase
      .channel(`event_guests_modal_${event.slug}`)
      .on(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        'postgres_changes' as any,
        { event: '*', schema: 'public', table: 'event_guests', filter: `event_slug=eq.${event.slug}` },
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (payload: any) => {
          if (payload.eventType === 'INSERT') {
            const nuovo = payload.new as Guest;
            setOspiti((prev) => (prev.some((g) => g.id === nuovo.id) ? prev : [...prev, nuovo]));
          } else if (payload.eventType === 'UPDATE') {
            const agg = payload.new as Guest;
            setOspiti((prev) => prev.map((g) => (g.id === agg.id ? { ...g, ...agg } : g)));
            setInCorso((prev) => {
              const n = new Set(prev);
              n.delete(agg.id);
              return n;
            });
          } else if (payload.eventType === 'DELETE') {
            const via = payload.old as { id: string };
            setOspiti((prev) => prev.filter((g) => g.id !== via.id));
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [accessToken, event.slug, event.guest_list_enabled]);

  async function attivaLista() {
    setAttivando(true);
    try {
      const res = await fetch(`/api/events/${event.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ guest_list_enabled: true }),
      });
      if (res.ok) onGuestEnabled();
    } finally {
      setAttivando(false);
    }
  }

  async function eliminaLista() {
    setEliminando(true);
    try {
      const res = await fetch(`/api/events/${event.slug}/guests`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        setConferma(false);
        onGuestEnabled();
      }
    } finally {
      setEliminando(false);
    }
  }

  async function segnaPresenza(guest: Guest) {
    if (inCorso.has(guest.id)) return;
    setInCorso((prev) => new Set(prev).add(guest.id));
    setOspiti((prev) => prev.map((g) => (g.id === guest.id ? { ...g, checked_in: !g.checked_in } : g)));

    try {
      await fetch(`/api/events/${event.slug}/guests/${guest.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ checked_in: !guest.checked_in }),
      });
    } catch {
      setOspiti((prev) => prev.map((g) => (g.id === guest.id ? { ...g, checked_in: guest.checked_in } : g)));
    } finally {
      // Il realtime di solito ha già pulito: questa è la rete di sicurezza.
      setTimeout(() => {
        setInCorso((prev) => {
          const n = new Set(prev);
          n.delete(guest.id);
          return n;
        });
      }, 2000);
    }
  }

  async function esportaPdf() {
    if (esportando || ospiti.length === 0) return;
    setEsportando(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const ordinati = [...ospiti].sort(
        (a, b) =>
          (a.last_name || '').localeCompare(b.last_name || '', 'it') ||
          (a.first_name || '').localeCompare(b.first_name || '', 'it'),
      );
      const presenti = ordinati.filter((g) => g.checked_in).length;
      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

      doc.setFontSize(16);
      doc.text(`Lista invitati: ${event.title}`, 14, 20);
      doc.setFontSize(9);
      doc.text(`Generato: ${new Date().toLocaleString('it-IT')}`, 14, 28);
      doc.text(
        `Iscritti: ${ordinati.length}   Presenti: ${presenti}   Assenti: ${ordinati.length - presenti}`,
        14,
        34,
      );

      autoTable(doc, {
        startY: 40,
        head: [['#', 'Cognome', 'Nome', 'Email', 'Telefono', 'Iscrizione', 'Presente']],
        body: ordinati.map((g, i) => [
          i + 1,
          g.last_name || '',
          g.first_name || '',
          g.email || '',
          g.phone || '',
          g.created_at ? new Date(g.created_at).toLocaleDateString('it-IT') : '',
          g.checked_in ? 'SI' : '',
        ]),
        styles: { fontSize: 7.5, cellPadding: 2 },
        headStyles: { fillColor: [115, 21, 21], textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [253, 249, 249] },
        columnStyles: {
          0: { halign: 'center', cellWidth: 8 },
          5: { halign: 'center', cellWidth: 22 },
          6: { halign: 'center', cellWidth: 18 },
        },
      });

      // Non `doc.save()`: quel metodo crea un link e lo clicca, e il
      // nome del file lo decide il browser — che a volte lo ignora e
      // salva l'id del blob. Il PDF fa un giro dal server e torna
      // indietro con il nome scritto nell'intestazione.
      const esito = await scaricaBlobGenerato(
        doc.output('blob'),
        `lista_invitati_${event.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`,
        accessToken,
      );
      setEsitoPdf(esito.ok ? '' : esito.messaggio ?? 'Non sono riuscito a scaricare la lista.');
    } catch (err) {
      console.error('[lista invitati PDF]', err);
      setEsitoPdf('Non sono riuscito a creare il PDF.');
    } finally {
      setEsportando(false);
    }
  }

  /* ── Lista non ancora attiva ─────────────────────────────────── */
  if (!event.guest_list_enabled) {
    return (
      <div className="px-4 py-10 sm:px-6">
        <EmptyState
          title="Nessuna lista"
          body="Attivala per raccogliere le iscrizioni dalla pagina pubblica dell’evento."
          action={
            <ActionButton onClick={attivaLista} disabled={attivando}>
              {attivando ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} strokeWidth={2} />}
              {attivando ? 'Attivo…' : 'Crea la lista'}
            </ActionButton>
          }
        />
      </div>
    );
  }

  const visibili = ospiti
    .filter((g) => {
      const q = cerca.trim().toLowerCase();
      if (!q) return true;
      return (
        g.first_name.toLowerCase().includes(q) ||
        g.last_name.toLowerCase().includes(q) ||
        g.email.toLowerCase().includes(q) ||
        (g.phone ?? '').includes(q)
      );
    })
    .sort(
      (a, b) =>
        a.last_name.localeCompare(b.last_name, 'it', { sensitivity: 'base' }) ||
        a.first_name.localeCompare(b.first_name, 'it', { sensitivity: 'base' }),
    );

  const presenti = ospiti.filter((g) => g.checked_in).length;

  return (
    <div className="ds">
      {/* Resta in alto mentre la lista scorre: alla porta serve sempre
          il conto dei presenti e la ricerca. */}
      <div className="sticky top-0 z-10 border-b border-rule-paper bg-paper px-4 py-4 sm:px-6">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <p className="text-body">
            <span className="ds-numeric text-[22px] font-medium">{ospiti.length}</span>{' '}
            <span className="text-on-paper-muted">{ospiti.length === 1 ? 'iscritto' : 'iscritti'}</span>
          </p>
          <p className="text-body">
            <span className="ds-numeric text-[22px] font-medium text-accent">{presenti}</span>{' '}
            <span className="text-on-paper-muted">{presenti === 1 ? 'presente' : 'presenti'}</span>
          </p>

          <div className="ml-auto flex items-center gap-2">
            <ActionButton variant="quiet" onClick={esportaPdf} disabled={esportando || ospiti.length === 0}>
              {esportando ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} strokeWidth={1.8} />}
              PDF
            </ActionButton>
            <ActionButton variant="danger" onClick={() => setConferma((v) => !v)}>
              <Trash2 size={15} strokeWidth={1.8} />
              <span className="sr-only sm:not-sr-only">Elimina lista</span>
            </ActionButton>
          </div>
        </div>

        {esitoPdf && (
          <p className="mt-3 rounded-2xl border border-rule-paper px-4 py-3 text-fine text-on-paper-muted">
            {esitoPdf}
          </p>
        )}

        {conferma && (
          <div className="mt-3 flex flex-wrap items-center gap-3 rounded-2xl border border-accent/35 bg-accent/5 px-4 py-3">
            <p className="min-w-[16ch] flex-1 text-fine text-on-paper">
              Elimino la lista? Spariscono tutti gli iscritti e il modulo dalla pagina pubblica.
            </p>
            <div className="flex gap-2">
              <ActionButton variant="danger" onClick={eliminaLista} disabled={eliminando}>
                {eliminando ? <Loader2 size={15} className="animate-spin" /> : null}
                {eliminando ? 'Elimino…' : 'Elimina'}
              </ActionButton>
              <ActionButton variant="quiet" onClick={() => setConferma(false)} disabled={eliminando}>
                Annulla
              </ActionButton>
            </div>
          </div>
        )}

        <div className="mt-3">
          <SearchField value={cerca} onChange={setCerca} placeholder="Cerca nome, cognome o email" />
        </div>
      </div>

      {caricando ? (
        <div className="flex justify-center py-14">
          <Loader2 size={22} className="animate-spin text-accent/50" />
        </div>
      ) : visibili.length === 0 ? (
        <div className="px-4 py-10 sm:px-6">
          <EmptyState
            title={cerca ? 'Nessun risultato' : 'Ancora nessun iscritto'}
            body={cerca ? 'Prova a cercare altro.' : 'Compariranno qui appena qualcuno si iscrive.'}
          />
        </div>
      ) : (
        <ul>
          {visibili.map((guest, i) => {
            const attesa = inCorso.has(guest.id);
            return (
              <li
                key={guest.id}
                className={`flex items-center gap-3 border-b border-rule-paper px-4 py-3.5 last:border-0 sm:gap-4 sm:px-6 ${
                  guest.checked_in ? 'bg-accent/5' : ''
                }`}
              >
                <span className="ds-numeric w-6 shrink-0 select-none text-right text-fine text-on-paper-muted/50">
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1">
                  {guest.partner_code && partner.has(guest.partner_code) && (
                    <p className="text-fine text-on-paper-muted">{partner.get(guest.partner_code)}</p>
                  )}
                  <p className="flex items-center gap-1.5 truncate text-body font-medium">
                    {guest.last_name} {guest.first_name}
                    {guest.referral_reward_unlocked && (
                      <Star
                        size={14}
                        className="shrink-0 fill-amber-400 text-amber-500"
                        aria-label={`Premio referral${guest.referral_reward_code ? `: ${guest.referral_reward_code}` : ''}`}
                      />
                    )}
                  </p>
                  <p className="mt-0.5 flex flex-wrap gap-x-3 truncate text-fine text-on-paper-muted">
                    <span>{guest.email}</span>
                    {guest.phone && <span>{guest.phone}</span>}
                    <span>{oraIscrizione(guest.created_at)}</span>
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => segnaPresenza(guest)}
                  disabled={attesa}
                  aria-pressed={guest.checked_in}
                  aria-label={guest.checked_in ? 'Togli la presenza' : 'Segna come presente'}
                  style={{ touchAction: 'manipulation' }}
                  className={`grid h-12 w-12 shrink-0 place-items-center rounded-full border transition-colors active:scale-95 ${
                    guest.checked_in
                      ? 'border-accent bg-accent text-paper'
                      : 'border-rule-paper text-on-paper-muted/40 hover:border-accent/50 hover:text-accent'
                  }`}
                >
                  {attesa ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <Check size={20} strokeWidth={guest.checked_in ? 2.5 : 1.6} />
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
