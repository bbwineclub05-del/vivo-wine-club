'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Lock } from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { eventDateLabel, type EventData } from '@/lib/events';
import CheckoutForm from './CheckoutForm';

/**
 * La porta degli eventi riservati.
 *
 * Si chiede l'email dell'iscrizione, non il numero di tessera: il
 * numero nessuno se lo ricorda, e chi se lo ricorda puo' girarlo a un
 * amico. L'email e' quella a cui arrivano il biglietto e il QR, quindi
 * prestarla vuol dire restare fuori al proprio posto.
 *
 * Nessuna password. Sarebbe piu' severa, ma meta' dei soci non l'ha
 * mai impostata, e una porta che tiene fuori anche i soci non e' una
 * porta: e' un muro.
 *
 * Chi e' gia' entrato nell'area riservata non vede niente di tutto
 * questo — la sua email la sappiamo e la verifichiamo da soli.
 *
 * Questo e' il cartello. La serratura e' nel checkout, sul server,
 * dove non la si puo' togliere dal browser.
 */
export default function SoloSoci({
  event,
  partnerCode,
}: {
  event: EventData;
  partnerCode?: string;
}) {
  const [email, setEmail] = useState('');
  const [verificando, setVerificando] = useState(false);
  const [esito, setEsito] = useState<'ignoto' | 'socio' | 'estraneo'>('ignoto');
  const [nome, setNome] = useState<string | null>(null);
  /* Finche' non sappiamo se c'e' una sessione aperta non si mostra ne'
     la porta ne' il modulo: un socio gia' dentro vedrebbe comparire e
     sparire una richiesta di email che non lo riguarda. */
  const [pronto, setPronto] = useState(false);

  const verifica = useCallback(async (indirizzo: string) => {
    setVerificando(true);
    try {
      const res = await fetch('/api/memberships/verifica', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: indirizzo }),
      });
      const d = await res.json();
      if (d.socio) {
        setNome(d.nome ?? null);
        setEmail(indirizzo);
        setEsito('socio');
        return;
      }
      setEsito('estraneo');
    } catch {
      setEsito('estraneo');
    } finally {
      setVerificando(false);
    }
  }, []);

  useEffect(() => {
    let vivo = true;
    supabase.auth.getSession().then(async ({ data }) => {
      const suo = data.session?.user?.email;
      if (suo) await verifica(suo);
      if (vivo) setPronto(true);
    });
    return () => { vivo = false; };
  }, [verifica]);

  if (!pronto) return <div className="min-h-[60vh]" />;

  if (esito === 'socio') {
    return (
      <CheckoutForm
        event={event}
        partnerCode={partnerCode}
        emailIniziale={email}
        benvenuto={nome}
      />
    );
  }

  return (
    <div className="mx-auto w-full max-w-[560px] px-5 py-16 lg:px-10">
      <span className="inline-flex items-center gap-2 rounded-full border border-rule-paper px-3 py-1.5 text-fine font-medium text-accent">
        <Lock size={13} strokeWidth={1.8} />
        Solo soci
      </span>

      <h1 className="ds-display mt-6 text-[clamp(1.8rem,5vw,2.4rem)] leading-tight tracking-[-0.03em]">
        {event.title}
      </h1>
      <p className="mt-3 text-body text-on-paper-muted">
        {eventDateLabel(event)} · {event.locationFull || event.location}
      </p>

      <p className="mt-8 text-body text-on-paper-muted">
        Questo evento è riservato ai soci del club. Scrivi l’email con cui ti sei iscritto: se la
        tessera è in corso, si prosegue con l’acquisto.
      </p>

      <form
        className="mt-6"
        onSubmit={(e) => {
          e.preventDefault();
          verifica(email);
        }}
      >
        <label htmlFor="email-socio" className="text-fine font-medium text-on-paper-muted">
          Email
        </label>
        <input
          id="email-socio"
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setEsito('ignoto'); }}
          placeholder="tu@email.com"
          className="mt-2 min-h-[52px] w-full rounded-xl border border-rule-paper bg-paper px-4 text-body [font-size:16px] focus:border-accent focus:outline-none"
        />

        <button
          type="submit"
          disabled={verificando || !email.includes('@')}
          className="mt-4 inline-flex min-h-[52px] w-full items-center justify-center rounded-full bg-accent px-6 text-fine font-medium text-paper disabled:opacity-45"
        >
          {verificando ? 'Controllo…' : 'Continua'}
        </button>
      </form>

      {esito === 'estraneo' && (
        <div className="mt-6 rounded-2xl border border-rule-paper p-5">
          <p className="text-body">Con questa email non risulta una tessera in corso.</p>
          <p className="mt-2 text-fine text-on-paper-muted">
            Può darsi che ti sia iscritto con un altro indirizzo: prova quello. Se la tessera è
            scaduta la puoi rinnovare, e se non sei ancora socio puoi diventarlo adesso — poi
            torni qui.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/membership"
              className="inline-flex min-h-[48px] items-center rounded-full bg-accent px-5 text-fine font-medium text-paper no-underline"
            >
              Diventa socio
            </Link>
            <Link
              href="/membership/rinnova"
              className="inline-flex min-h-[48px] items-center rounded-full border border-rule-paper px-5 text-fine font-medium no-underline"
            >
              Rinnova
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
