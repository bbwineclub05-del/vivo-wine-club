'use client';

import { useMemo, useState } from 'react';
import { AdminShell } from '@/components/admin/AdminShell';
import {
  ActionButton, Column, DataList, EmptyState, Field, FilterPills, NewButton,
  PageHead, SearchField, Select, Sheet, StatusPill, TextArea, TextInput, Toolbar,
} from '@/components/admin/ui';
import type { AdminRole } from '@/lib/admin-nav';

/* Fake rows, shaped like a real section so the layout is judged on
   realistic content rather than on lorem ipsum. */
type Row = {
  id: string;
  title: string;
  place: string;
  date: string;
  guests: number;
  status: 'aperto' | 'sold out' | 'concluso';
};

const ROWS: Row[] = [
  { id: '1', title: 'Wine Party · Paris', place: 'Louvre, Parigi', date: '16 ott 2026', guests: 148, status: 'sold out' },
  { id: '2', title: 'Wine Visit · Ornellaia', place: 'Bolgheri', date: '30 ott 2026', guests: 24, status: 'aperto' },
  { id: '3', title: 'Wine Lounge · Brescia', place: 'Al Bicèr 2', date: '11 nov 2026', guests: 38, status: 'aperto' },
  { id: '4', title: 'Wine Visit · Ca’ del Bosco', place: 'Franciacorta', date: '23 nov 2026', guests: 20, status: 'aperto' },
  { id: '5', title: 'Wine Party · Oltrepò', place: 'Prime Alture, Casteggio', date: '27 set 2026', guests: 820, status: 'concluso' },
];

const TONE = { aperto: 'good', 'sold out': 'warn', concluso: 'off' } as const;

export default function AdminShellPreview() {
  const [role, setRole] = useState<AdminRole>('board');
  const [active, setActive] = useState('events');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'tutti' | Row['status']>('tutti');
  const [open, setOpen] = useState(false);

  const rows = useMemo(
    () =>
      ROWS.filter(
        (r) =>
          (filter === 'tutti' || r.status === filter) &&
          (query === '' || `${r.title} ${r.place}`.toLowerCase().includes(query.toLowerCase())),
      ),
    [query, filter],
  );

  const columns: Column<Row>[] = [
    { key: 'title', label: 'Evento', primary: true, render: (r) => r.title },
    { key: 'place', label: 'Luogo', render: (r) => <span className="text-on-paper-muted">{r.place}</span> },
    { key: 'date', label: 'Data', render: (r) => <span className="ds-numeric">{r.date}</span> },
    {
      key: 'guests',
      label: 'Iscritti',
      align: 'right',
      render: (r) => <span className="ds-numeric">{r.guests}</span>,
    },
    {
      key: 'status',
      label: 'Stato',
      align: 'right',
      render: (r) => <StatusPill tone={TONE[r.status]}>{r.status}</StatusPill>,
    },
  ];

  return (
    <AdminShell
      role={role}
      active={active}
      onNavigate={setActive}
      userName="Giacomo"
      pendingApplications={3}
    >
      <div className="mx-auto max-w-[1180px] px-5 py-7 lg:px-10 lg:py-10">
        <PageHead
          title="Eventi"
          subtitle="Esempio di sezione costruita con i pezzi comuni. I dati sono finti, lo stile è quello definitivo."
          action={<NewButton label="Nuovo evento" onClick={() => setOpen(true)} />}
        />

        <Toolbar>
          <SearchField value={query} onChange={setQuery} placeholder="Cerca un evento" />
          <FilterPills
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'tutti', label: 'Tutti', count: ROWS.length },
              { value: 'aperto', label: 'Aperti', count: ROWS.filter((r) => r.status === 'aperto').length },
              { value: 'sold out', label: 'Sold out' },
              { value: 'concluso', label: 'Conclusi' },
            ]}
          />
        </Toolbar>

        <DataList
          items={rows}
          columns={columns}
          getKey={(r) => r.id}
          onRowClick={() => setOpen(true)}
          empty={
            <EmptyState
              title="Nessun evento"
              body="Nessun risultato per questa ricerca. Prova a cambiare filtro."
              action={<ActionButton variant="quiet" onClick={() => { setQuery(''); setFilter('tutti'); }}>Azzera i filtri</ActionButton>}
            />
          }
        />

        <div className="mt-10">
          <p className="text-fine font-medium text-on-paper-muted">Cambia ruolo</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {(['board', 'staff'] as AdminRole[]).map((r) => (
              <button
                key={r}
                onClick={() => setRole(r)}
                className={`min-h-[48px] rounded-full border px-5 text-fine font-medium transition-colors ${
                  role === r ? 'border-accent bg-accent text-paper' : 'border-rule-paper hover:border-accent/40'
                }`}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      </div>

      <Sheet
        open={open}
        title="Nuovo evento"
        onClose={() => setOpen(false)}
        footer={
          <div className="flex gap-3">
            <ActionButton variant="quiet" onClick={() => setOpen(false)} className="flex-1">
              Annulla
            </ActionButton>
            <ActionButton onClick={() => setOpen(false)} className="flex-1">
              Salva
            </ActionButton>
          </div>
        }
      >
        <div className="space-y-5">
          <Field label="Titolo">
            <TextInput placeholder="Wine Party · Paris" />
          </Field>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Data">
              <TextInput type="date" />
            </Field>
            <Field label="Formato">
              <Select defaultValue="">
                <option value="" disabled>Scegli</option>
                <option>Wine Party</option>
                <option>Wine Lounge</option>
                <option>Winery Visit</option>
              </Select>
            </Field>
          </div>
          <Field label="Luogo">
            <TextInput placeholder="Nome e indirizzo" />
          </Field>
          <Field label="Note" hint="(facoltativo)">
            <TextArea rows={4} placeholder="Qualcosa da ricordare su questa serata" />
          </Field>
        </div>
      </Sheet>
    </AdminShell>
  );
}
