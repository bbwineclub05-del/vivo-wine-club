'use client';

import { useState } from 'react';
import FinanceManager from '@/components/FinanceManager';
import BilancioManager from '@/components/BilancioManager';

/**
 * Finance con un registro inventato, per giudicare il layout e vedere
 * i calcoli muoversi senza toccare i soldi veri del club.
 *
 * I nomi e le cifre qui dentro non sono reali: sono costruiti per
 * coprire tutti e quattro i tipi di movimento e far comparire sia un
 * creditore sia un debitore. Vive solo nell'anteprima di sviluppo.
 */

type Row = {
  id: string; date: string; description: string; amount: number;
  entry_type: 'expense' | 'income' | 'reimbursement' | 'contribution';
  member_email: string | null; budget_category: string | null;
  notes: string | null; registered_by_name: string | null; created_at: string;
};

const MEMBERS = [
  { name: 'Anna Rossi', email: 'anna@esempio.it' },
  { name: 'Bruno Verdi', email: 'bruno@esempio.it' },
  { name: 'Carla Bianchi', email: 'carla@esempio.it' },
];

const SEED: [string, string, number, Row['entry_type'], string | null, string | null][] = [
  ['2026-10-16', 'Incasso porta Wine Party',   1240,   'income',        null,                'Incassi Door'],
  ['2026-10-16', 'Fotografo',                   150,   'expense',       'anna@esempio.it',   'Marketing e Comunicazione'],
  ['2026-10-16', 'Vino per la degustazione',    420.5, 'expense',       null,                'Catering e Food'],
  ['2026-10-14', 'Stampe e volantini',           63.4, 'expense',       'anna@esempio.it',   'Marketing e Comunicazione'],
  ['2026-10-12', 'Cash bar serata',             310,   'income',        'bruno@esempio.it',  'Incassi Door'],
  ['2026-10-10', 'Affitto location',           800,    'expense',       null,                'Affitto location'],
  ['2026-10-08', 'Rimborso ad Anna',             63.4, 'reimbursement', 'anna@esempio.it',   null],
  ['2026-09-28', 'Trasporto casse',              67,   'expense',       'carla@esempio.it',  'Trasporti'],
  ['2026-09-27', 'Versamento di Carla',          67,   'contribution',  'carla@esempio.it',  null],
  ['2026-09-20', 'Quote membership settembre',  980,   'income',        null,                'Quote Membership'],
  ['2026-09-15', 'Merch: stock magliette',      301,   'expense',       'bruno@esempio.it',  'Forniture e Materiali'],
];

const CATEGORIES = [
  { id: '1', name: 'Affitto location', type: 'cost' as const },
  { id: '2', name: 'Catering e Food', type: 'cost' as const },
  { id: '3', name: 'Marketing e Comunicazione', type: 'cost' as const },
  { id: '4', name: 'Trasporti', type: 'cost' as const },
  { id: '5', name: 'Forniture e Materiali', type: 'cost' as const },
  { id: '6', name: 'Incassi Door', type: 'revenue' as const },
  { id: '7', name: 'Quote Membership', type: 'revenue' as const },
];

let installed = false;

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  let rows: Row[] = SEED.map(([date, description, amount, entry_type, member_email, cat], i) => ({
    id: `r${i}`, date, description, amount, entry_type, member_email,
    budget_category: cat, notes: null, registered_by_name: 'anteprima',
    created_at: new Date().toISOString(),
  }));

  const real = window.fetch.bind(window);
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), { status, headers: { 'Content-Type': 'application/json' } });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (!url.includes('/api/finance/')) return real(input as RequestInfo, init);

    const method = (init?.method ?? 'GET').toUpperCase();
    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const id = url.split('/entries/')[1]?.split(/[?/]/)[0] ?? '';

    const amountOf = (v: unknown) => Number(String(v).replace(',', '.'));

    if (method === 'GET') return json({ entries: rows, members: MEMBERS, categories: CATEGORIES });
    if (method === 'POST') {
      const r: Row = {
        id: `r${Date.now()}`, date: body.date, description: body.description,
        amount: amountOf(body.amount), entry_type: body.entry_type,
        member_email: body.member_email ?? null, budget_category: body.category ?? null,
        notes: body.notes ?? null, registered_by_name: 'anteprima',
        created_at: new Date().toISOString(),
      };
      rows = [r, ...rows];
      return json({ entry: r });
    }
    if (method === 'PATCH') {
      rows = rows.map((r) =>
        r.id === id
          ? { ...r, ...body, amount: body.amount !== undefined ? amountOf(body.amount) : r.amount,
              budget_category: body.category ?? r.budget_category }
          : r,
      );
      return json({ entry: rows.find((r) => r.id === id) });
    }
    if (method === 'DELETE') {
      rows = rows.filter((r) => r.id !== id);
      return json({ ok: true });
    }
    return json({ error: 'non disponibile' }, 400);
  };
}

export function MockFinance() {
  const [ready, setReady] = useState(false);
  if (!ready) {
    install();
    setReady(true);
  }
  // Bilancio legge lo stesso endpoint, quindi l'intercettazione vale
  // anche per lui.
  return (
    <>
      <FinanceManager isAdmin />
      <hr className="my-16 border-rule-paper" />
      <BilancioManager />
    </>
  );
}
