'use client';

import { useState } from 'react';
import { ActionButton, PageHead } from '@/components/admin/ui';
import EventGuestPanel from '@/components/EventGuestPanel';
import EventPartnerPanel from '@/components/EventPartnerPanel';
import EventScanner from '@/components/EventScanner';

/**
 * I pannelli di un evento, fuori dal login.
 *
 * Il token è vuoto, quindi ogni chiamata fallisce e si vedono gli
 * stati vuoti e la struttura: è quello che serve per controllare il
 * layout a larghezza di telefono senza toccare un evento vero.
 * Come le altre anteprime, vive solo in sviluppo.
 */

const EVENTO = {
  id: 'evento-finto',
  slug: 'evento-finto',
  title: 'Evento di prova',
  date: '2026-12-31',
  guest_list_enabled: true,
};

export function MockEventi() {
  const [scheda, setScheda] = useState<'invitati' | 'partner'>('invitati');
  const [scanner, setScanner] = useState(false);

  return (
    <>
      <PageHead title="Eventi (finto)" subtitle="I pannelli di un evento inventato, per guardare il layout." />

      <div className="mb-5 flex flex-wrap gap-2">
        {(
          [
            { id: 'invitati' as const, label: 'Invitati' },
            { id: 'partner' as const, label: 'Partner' },
          ]
        ).map((t) => (
          <button
            key={t.id}
            onClick={() => setScheda(t.id)}
            aria-pressed={scheda === t.id}
            className={`min-h-[44px] rounded-full border px-4 text-fine font-medium transition-colors ${
              scheda === t.id ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
            }`}
          >
            {t.label}
          </button>
        ))}
        <ActionButton variant="quiet" onClick={() => setScanner(true)}>
          Apri lo scanner
        </ActionButton>
      </div>

      <div className="overflow-hidden rounded-2xl border border-rule-paper">
        {scheda === 'invitati' ? (
          <EventGuestPanel event={EVENTO} accessToken="" onGuestEnabled={() => undefined} />
        ) : (
          <EventPartnerPanel event={EVENTO} accessToken="" />
        )}
      </div>

      {scanner && <EventScanner event={EVENTO} accessToken="" onClose={() => setScanner(false)} />}
    </>
  );
}
