'use client';

/**
 * Anteprima dell'area del socio.
 *
 * Serve a due cose: guardarla senza farsi un secondo account — l'area
 * vera si apre solo a chi ha ruolo "socio" — e vederla com'è su un
 * telefono stando seduti al computer, dentro una cornice delle
 * dimensioni giuste. È una pagina di servizio, non fa parte del sito.
 */

import { Suspense, useEffect, useState } from 'react';
import { notFound } from 'next/navigation';
import { useSearchParams } from 'next/navigation';
import { Monitor, Smartphone } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import MemberPortal from '@/components/MemberPortal';

function Area() {
  const [token, setToken] = useState('');
  const [user, setUser] = useState<{ name?: string | null; email?: string | null }>({});
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setToken(session?.access_token ?? '');
      setUser({
        name: (session?.user.user_metadata?.full_name as string) ?? null,
        email: session?.user.email ?? null,
      });
      setPronto(true);
    });
  }, []);

  if (!pronto) return null;

  if (!token) {
    return (
      <div className="ds flex min-h-[100dvh] items-center justify-center bg-paper p-8 text-center">
        <p className="text-body text-on-paper-muted">
          Serve essere dentro: apri prima <a href="/members" className="underline">/members</a>.
        </p>
      </div>
    );
  }

  return <MemberPortal user={user} token={token} onLogout={() => { window.location.href = '/'; }} />;
}

function Cornice() {
  const params = useSearchParams();
  const dentro = params.get('schermo') === '1';
  const [telefono, setTelefono] = useState(true);

  // `?schermo=1` è la pagina vera dentro la cornice: niente cornice
  // dentro la cornice.
  if (dentro) return <Area />;

  return (
    <div className="ds min-h-[100dvh] bg-paper-soft">
      <div className="mx-auto flex max-w-[1100px] flex-col items-center gap-5 px-5 py-8">
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div>
            <p className="ds-display text-[22px] leading-none tracking-[-0.02em]">Area del socio</p>
            <p className="mt-2 text-fine text-on-paper-muted">
              Anteprima. Cambia lingua dal sito e ricarica per vederla in inglese o francese.
            </p>
          </div>

          <div className="flex gap-2">
            {[
              { id: true, label: 'Telefono', Icon: Smartphone },
              { id: false, label: 'Computer', Icon: Monitor },
            ].map(({ id, label, Icon }) => (
              <button
                key={label}
                onClick={() => setTelefono(id)}
                aria-pressed={telefono === id}
                className={`inline-flex min-h-[44px] items-center gap-2 rounded-full border px-4 text-fine font-medium transition-colors ${
                  telefono === id ? 'border-accent bg-accent text-paper' : 'border-rule-paper text-on-paper'
                }`}
              >
                <Icon size={16} strokeWidth={1.9} />
                {label}
              </button>
            ))}
          </div>
        </div>

        {telefono ? (
          // 390 × 844: un iPhone, le stesse misure su cui è disegnata.
          <div className="rounded-[42px] border-[10px] border-ink bg-ink p-0 shadow-2xl">
            <iframe
              src="/anteprima-socio?schermo=1"
              title="Area del socio su telefono"
              className="block h-[844px] w-[390px] rounded-[32px] bg-paper"
            />
          </div>
        ) : (
          <div className="w-full overflow-hidden rounded-2xl border border-rule-paper bg-paper">
            <iframe
              src="/anteprima-socio?schermo=1"
              title="Area del socio su computer"
              className="block h-[820px] w-full bg-paper"
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default function AnteprimaSocio() {
  /* Pagina di servizio: in produzione non esiste. Serve a guardare i
     pezzi del sito mentre si lavora, non a chi visita il sito. */
  if (process.env.NODE_ENV !== 'development') notFound();

  return (
    <Suspense>
      <Cornice />
    </Suspense>
  );
}
