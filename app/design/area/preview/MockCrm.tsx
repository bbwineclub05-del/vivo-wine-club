'use client';

import { useState } from 'react';
import CrmPersone from '@/components/CrmPersone';
import { RecordTable } from '@/components/admin/RecordTable';
import { BORDEAUX, listaPersonalizzata } from '@/lib/crm-resources';
import EventInvite from '@/components/admin/EventInvite';
import MembershipHub from '@/components/MembershipHub';
import DiscountManager from '@/components/DiscountManager';
import UpsellManager from '@/components/UpsellManager';

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
    if (url.includes('/api/events/guest-counts')) {
      return json({
        events: [
          { slug: 'bottenago-lake-garda-jul-2026', title: 'Bottenago Lake Garda', count: 538 },
          { slug: 'prime-alture-sep-2026', title: 'Prime Alture', count: 394 },
          { slug: 'vivo-wine-party-paris-oct-2026', title: 'VIVO Wine Party Paris', count: 118 },
        ],
      });
    }
    if (url.includes('/api/crm/members')) {
      return json({ members: [
        { email: 'membro1@esempio.it', name: 'Membro Uno' },
        { email: 'membro2@esempio.it', name: 'Membro Due' },
      ] });
    }
    if (url.includes('/api/discounts')) {
      return json({ discounts: [
        { id:'d1', title:'10% da Il Canto del Gallo', partner:'Il Canto del Gallo',
          description:'Mostra la tessera al momento del conto.', code:null, logo_url:null,
          expires_at:'2027-12-31', visible:true, sort_order:0, created_at:'x' },
        { id:'d2', title:'Due calici al prezzo di uno', partner:'Enoteca Prova',
          description:null, code:'VIVO2X1', logo_url:null,
          expires_at:'2026-09-30', visible:true, sort_order:1, created_at:'x' },
        { id:'d3', title:'Sconto spedizioni', partner:'Corriere Prova', description:null,
          code:'SPED', logo_url:null, expires_at:null, visible:false, sort_order:2, created_at:'x' },
      ] });
    }
    if (url.includes('/api/merch/products')) {
      return json({ products: [
        { id:'p1', title:'T-shirt VIVO', price:25, images:[], slug:'t', visible:true },
        { id:'p2', title:'Cappellino', price:18, images:[], slug:'c', visible:true },
        { id:'p3', title:'Tote bag', price:12, images:[], slug:'b', visible:true },
        { id:'p4', title:'Calice serigrafato', price:9, images:[], slug:'g', visible:true },
      ] });
    }
    if (url.includes('/api/admin/upsell/analytics')) {
      return json({ analytics: [
        { config_id:'u1', impressions:7593, added:4, removed:3, kept:1 },
      ], totalEvents: 7600 });
    }
    if (url.includes('/api/admin/upsell')) {
      return json({ configs: [
        { id:'u1', product_id:'p1', context:'event', target_slug:null },
        { id:'u2', product_id:'p3', context:'event', target_slug:null },
      ] });
    }
    if (url.includes('/api/memberships')) {
      return json({ memberships: [
        { id:'m1', email:'anna@esempio.it', full_name:'Anna Rossi', member_id:'VIVO-A1B2',
          tier:'founding', started_at:'2026-01-01', expires_at:'2026-12-31',
          standard_price_cents:3000, offer_price_cents:2000, offer_expires_at:'2026-12-31',
          cancelled_at:null, reminded_30_at:null, reminded_7_at:null, reminded_0_at:null, user_id:null,
          payments:[{id:'p1',amount_cents:0,period_start:'2026-01-01',period_end:'2026-12-31',status:'waived',paid_at:'x'}] },
        { id:'m2', email:'bruno@esempio.it', full_name:'Bruno Verdi', member_id:'VIVO-C3D4',
          tier:'standard', started_at:'2027-01-05', expires_at:'2027-12-31',
          standard_price_cents:3000, offer_price_cents:null, offer_expires_at:null,
          cancelled_at:null, reminded_30_at:null, reminded_7_at:null, reminded_0_at:null, user_id:null,
          payments:[{id:'p2',amount_cents:3000,period_start:'2027-01-05',period_end:'2027-12-31',status:'paid',paid_at:'x'}] },
      ] });
    }
    if (url.includes('/api/collaboration-applications')) {
      return json({ applications: [
        { id:'a1', kind:'ambassador', first_name:'Marta', last_name:'Bianchi', email:'marta@esempio.it',
          city:'Torino', instagram:'@marta', stage:'new', message:'Vorrei portare VIVO a Torino.' },
        { id:'a2', kind:'creator', first_name:'Luca', last_name:'Neri', email:'luca@esempio.it',
          instagram:'@lucaneri', followers:42000, stage:'contacted', message:'Faccio contenuti sul vino.' },
        { id:'a3', kind:'company', company:'Cantina Prova', first_name:'Elena', last_name:'Russo',
          email:'elena@esempio.it', role:'Marketing', stage:'new', message:'Vorremmo collaborare.' },
      ] });
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

function Invito() {
  const [aperto, setAperto] = useState(false);
  return (
    <div className="mt-16 border-t border-rule-paper pt-8">
      <button
        onClick={() => setAperto(true)}
        className="min-h-[48px] rounded-full bg-accent px-5 text-fine font-medium text-paper"
      >
        Apri "Invita a un evento"
      </button>
      {aperto && (
        <EventInvite
          accessToken="anteprima"
          customCategories={[{ id: 'cat1', name: 'General' }]}
          onClose={() => setAperto(false)}
        />
      )}
    </div>
  );
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
      <hr className="my-16 border-rule-paper" />
      <MembershipHub />
      <hr className="my-16 border-rule-paper" />
      <DiscountManager token="anteprima" />
      <hr className="my-16 border-rule-paper" />
      <UpsellManager />
      <Invito />
    </>
  );
}
