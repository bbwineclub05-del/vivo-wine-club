'use client';

import { useState } from 'react';
import DocumentManager from '@/components/DocumentManager';

/**
 * Documenti con un archivio finto, per poter giudicare il layout senza
 * credenziali e senza toccare i file veri del club.
 *
 * Vive solo dentro l'anteprima di sviluppo: intercetta `fetch` per le
 * rotte /api/documents e risponde da un archivio in memoria. Tutto il
 * resto del componente è quello vero, comprese le sue chiamate.
 */

const FOLDERS = [
  { id: 'f1', name: 'Statuto', color: '#731515', count: 0 },
  { id: 'f2', name: 'Pitch', color: '#A3561A', count: 0 },
  { id: 'f3', name: 'Contratti', color: '#1F5F8B', count: 0 },
  { id: 'f4', name: 'Verbali', color: '#5B3A8C', count: 0 },
];

const DOCS = [
  ['Statuto VIVO APS Registrato', 'Statuto_VIVO_Wine_Club_APS_Registrato.pdf', 1973556, 'f1'],
  ['Atto Costitutivo', 'Atto_Costitutivo_VIVO.pdf', 98848, 'f1'],
  ['Certificato Codice Fiscale', 'Denominazione_CF_VIVO.pdf', 28879, 'f1'],
  ['Partner Deck 2026', 'VIVO_Wine_Club_Presentation.pptx', 741998, 'f2'],
  ['Progetto Fondazione Sanpaolo', 'Proposta_Contributo.pdf', 17209, 'f2'],
  ['Budget eventi 2026', 'Budget_Eventi_2026.xlsx', 184320, 'f3'],
  ['Informativa Privacy liberale', 'All_B_Informativa_Privacy.pdf', 367506, 'f3'],
  ['Delibera 19.05.2026', 'Delibera_19_05_2026.pdf', 123359, 'f4'],
  ['Foto allestimento Magazzini', 'allestimento-magazzini.jpg', 2411008, null],
  ['Terms of Service', 'Terms_of_Service_EN.docx', 16142, null],
  ['Materiali grafici evento', 'materiali-wine-party.zip', 8912896, null],
] as const;

function seed() {
  return DOCS.map(([title, file_name, file_size, folder_id], i) => ({
    id: `d${i}`,
    title,
    description: i === 0 ? 'Versione registrata presso l’Agenzia delle Entrate.' : null,
    category: 'Altro',
    folder_id,
    file_path: `mock/${file_name}`,
    file_name,
    file_size,
    uploaded_by: i % 2 ? 'filippo.lombardi890@gmail.com' : 'giacomogallo1310@gmail.com',
    created_at: new Date(Date.now() - i * 86400000 * 9).toISOString(),
  }));
}

let installed = false;

function install() {
  // Il primo render avviene anche sul server, dove `window` non esiste:
  // lì non c'è niente da intercettare e si esce subito.
  if (installed || typeof window === 'undefined') return;
  installed = true;

  let docs = seed();
  let folders = [...FOLDERS];
  const real = window.fetch.bind(window);

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method ?? 'GET').toUpperCase();
    if (!url.includes('/api/documents')) return real(input as RequestInfo, init);

    const body = init?.body ? JSON.parse(String(init.body)) : {};
    const idFrom = (prefix: string) => url.split(prefix)[1]?.split(/[?/]/)[0] ?? '';

    if (url.includes('/api/documents/folders')) {
      if (method === 'GET') return json({ folders, loose: docs.filter((d) => !d.folder_id).length });
      if (method === 'POST') {
        const f = { id: `f${Date.now()}`, name: body.name, color: body.color, count: 0 };
        folders = [...folders, f];
        return json({ folder: f });
      }
      const fid = idFrom('/folders/');
      if (method === 'PATCH') {
        folders = folders.map((f) => (f.id === fid ? { ...f, ...body } : f));
        return json({ folder: folders.find((f) => f.id === fid) });
      }
      if (method === 'DELETE') {
        const released = docs.filter((d) => d.folder_id === fid).length;
        folders = folders.filter((f) => f.id !== fid);
        docs = docs.map((d) => (d.folder_id === fid ? { ...d, folder_id: null } : d));
        return json({ ok: true, released });
      }
    }

    if (url.endsWith('/api/documents') && method === 'GET') return json({ documents: docs });

    const did = idFrom('/api/documents/');
    if (did && method === 'PATCH') {
      docs = docs.map((d) => (d.id === did ? { ...d, ...body } : d));
      return json({ document: docs.find((d) => d.id === did) });
    }
    if (did && method === 'DELETE') {
      docs = docs.filter((d) => d.id !== did);
      return json({ ok: true });
    }

    return json({ error: 'Non disponibile nell’anteprima.' }, 400);
  };
}

export function MockDocuments() {
  const [ready, setReady] = useState(false);
  if (!ready) {
    install();
    setReady(true);
  }
  return <DocumentManager token="anteprima" isAdmin />;
}
