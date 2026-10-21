'use client';

import { useState } from 'react';
import CrmPersone from '@/components/CrmPersone';
import { RecordTable } from '@/components/admin/RecordTable';
import { BORDEAUX, listaPersonalizzata } from '@/lib/crm-resources';

/**
 * Persone con una rubrica inventata, per giudicare il layout senza
 * mostrare milleQuattrocento indirizzi veri su una pagina senza login.
 *
 * I numeri sono costruiti per somigliare a quelli veri: un evento
 * grosso senza consensi perché precedente alla casella, due più
 * recenti con una quota di consensi, e qualcuno che è tornato.
 */

const EVENTI = [
  { slug: 'bottenago-lake-garda-jul-2026', n: 180, consenso: 0 },
  { slug: 'prime-alture-sep-2026', n: 120, consenso: 0.33 },
  { slug: 'vivo-wine-party-paris-oct-2026', n: 60, consenso: 0.19 },
];

function seed() {
  const rows: Record<string, unknown>[] = [];
  let i = 0;
  for (const ev of EVENTI) {
    for (let k = 0; k < ev.n; k++) {
      i += 1;
      const ricorrente = k % 17 === 0 && ev.slug !== 'bottenago-lake-garda-jul-2026';
      const events = ricorrente ? [ev.slug, 'bottenago-lake-garda-jul-2026'] : [ev.slug];
      const giorni = ev.slug.includes('jul') ? 111 : ev.slug.includes('sep') ? 50 : 5;
      const quando = new Date(Date.now() - giorni * 86400000).toISOString();
      rows.push({
        id: `p${i}`,
        email: `persona${i}@esempio.it`,
        name: `Nome Cognome ${i}`,
        first_purchase_at: quando,
        last_purchase_at: quando,
        total_events: events.length,
        events,
        consent_marketing: k / ev.n < ev.consenso,
      });
    }
  }
  return rows;
}

let installed = false;

function install() {
  if (installed || typeof window === 'undefined') return;
  installed = true;

  const customers = seed();
  const real = window.fetch.bind(window);
  const json = (b: unknown) =>
    new Response(JSON.stringify(b), { status: 200, headers: { 'Content-Type': 'application/json' } });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;

    if (url.includes('/api/crm/customers')) {
      return json({
        customers,
        total: customers.length,
        consenting: customers.filter((c) => c.consent_marketing).length,
      });
    }
    if (url.includes('/api/events/all')) {
      return json({
        events: [
          { slug: 'bottenago-lake-garda-jul-2026', title: 'Bottenago Lake Garda' },
          { slug: 'prime-alture-sep-2026', title: 'Prime Alture' },
          { slug: 'vivo-wine-party-paris-oct-2026', title: 'VIVO Wine Party Paris' },
        ],
      });
    }
    if (url.includes('/api/crm/bordeaux')) {
      return json({
        contacts: [
          { id: 'b1', company: 'Societe Agricole de Lafleur', name: 'Ralitsa Todorieva',
            email: 'ralitsa@esempio.org', phone: '+33 787613881',
            last_follow_up: '22/04/2026', note: 'Richiesta di visita',
            stage: 'talking', owner_email: null, next_action_at: '2026-10-18' },
          { id: 'b2', company: 'Chateau Prova', name: 'Jean Dupont',
            email: 'jean@esempio.fr', phone: '+33 600000000',
            last_follow_up: '', note: '', stage: 'new', owner_email: null, next_action_at: null },
          { id: 'b3', company: 'Domaine Esempio', name: 'Marie Martin',
            email: 'marie@esempio.fr', phone: '', last_follow_up: '10/09/2026',
            note: 'Interessati a ospitarci', stage: 'active', owner_email: null, next_action_at: null },
          { id: 'b4', company: 'Clos Finto', name: 'Paul Bernard',
            email: '', phone: '', last_follow_up: '', note: 'Non risponde da mesi',
            stage: 'lost', owner_email: null, next_action_at: null },
        ],
      });
    }
    if (url.includes('/api/crm/categories/cat1/contacts')) {
      return json({
        contacts: [
          { id: 'c1', first_name: 'Wiam', last_name: 'Wiwi', email: '', phone: '380 0000000',
            notes: 'Cantante, ha fatto X Factor nel 2022' },
          { id: 'c2', first_name: 'Luca', last_name: 'Sernesi', email: '', phone: '346 0000000',
            notes: 'Ha un\u2019agenzia di DJ e vuole collaborare' },
          { id: 'c3', first_name: 'Marta', last_name: 'Rossi', email: 'marta@esempio.it',
            phone: '', notes: '' },
        ],
      });
    }
    if (url.includes('/api/team/members')) {
      return json({ members: [{ name: 'Anna Rossi', email: 'anna@esempio.it' }] });
    }
    if (url.includes('/api/crm/send')) {
      return json({ sent: JSON.parse(String(init?.body ?? '{}')).recipients?.length ?? 0 });
    }
    return real(input as RequestInfo, init);
  };
}

export function MockCrm() {
  const [ready, setReady] = useState(false);
  if (!ready) {
    install();
    setReady(true);
  }
  return (
    <>
      <CrmPersone />
      <hr className="my-16 border-rule-paper" />
      <RecordTable resource={BORDEAUX} />
      <hr className="my-16 border-rule-paper" />
      <RecordTable resource={listaPersonalizzata('cat1', 'General')} />
    </>
  );
}
