'use client';

import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import Link from 'next/link';
import {
  CONSENT_CHANGED_EVENT,
  OPEN_PREFERENCES_EVENT,
  getStoredConsent,
  saveConsent,
} from '@/lib/cookieConsent';
import { AGE_CHANGED_EVENT, getStoredAge, saveAge } from '@/lib/ageGate';
import { useTranslations } from 'next-intl';

/**
 * La prima cosa che si vede: l'età e i cookie, in una scheda sola.
 *
 * Erano due domande destinate a diventare due pannelli uno sopra
 * l'altro — la porta dei diciotto anni a schermo intero e, appena
 * chiusa, il banner dei cookie. Su un telefono sono due muri di fila
 * prima di aver visto una riga di sito. Qui si chiedono insieme e si
 * risponde una volta: l'età in alto, perché condiziona tutto il
 * resto, i cookie sotto, divisi da una riga.
 *
 * Chi è già passato di qui vede solo la parte che manca: un vecchio
 * visitatore con il consenso cookie già dato si trova solo la
 * domanda sull'età.
 */

/* ── Lo stato salvato, letto senza effetti ─────────────────────────
   `useSyncExternalStore` invece di leggere lo storage dentro a un
   `useEffect`: niente setState in montaggio, niente lampeggio del
   pannello a chi ha già risposto, e il server rende sempre `ssr`,
   quindi l'idratazione non trova mai due alberi diversi.            */

function subscribe(onChange: () => void) {
  window.addEventListener(CONSENT_CHANGED_EVENT, onChange);
  window.addEventListener(AGE_CHANGED_EVENT, onChange);
  window.addEventListener('storage', onChange);
  return () => {
    window.removeEventListener(CONSENT_CHANGED_EVENT, onChange);
    window.removeEventListener(AGE_CHANGED_EVENT, onChange);
    window.removeEventListener('storage', onChange);
  };
}

/** Una stringa, non un oggetto: React confronta per identità. */
function snapshot(): string {
  const consent = getStoredConsent();
  return `${getStoredAge() ?? ''}|${consent ? `${+consent.analytics}${+consent.marketing}` : ''}`;
}

const SSR = 'ssr';

function Switch({ label, desc, on, onChange, locked }: {
  label: string;
  desc: string;
  on: boolean;
  onChange?: (v: boolean) => void;
  locked?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-fine font-medium">{label}</p>
        <p className="mt-0.5 text-fine text-on-ink-muted">{desc}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={locked}
        onClick={() => onChange?.(!on)}
        className={`mt-0.5 flex h-6 w-11 shrink-0 items-center rounded-full p-0.5 transition-colors ${
          on ? 'bg-accent' : 'bg-on-ink/20'
        } ${locked ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <span
          className={`h-5 w-5 rounded-full bg-on-ink transition-transform ${on ? 'translate-x-5' : 'translate-x-0'}`}
        />
      </button>
    </div>
  );
}

export default function EntryGate() {
  const t = useTranslations('cookieBanner');
  const tAge = useTranslations('ageGate');

  const stato = useSyncExternalStore(subscribe, snapshot, () => SSR);

  const [dettagli, setDettagli] = useState(false);
  const [analytics, setAnalytics] = useState(false);
  const [marketing, setMarketing] = useState(false);
  /** Riaperto dal link "Gestisci cookie" anche se è già stato risposto. */
  const [riaperto, setRiaperto] = useState(false);

  useEffect(() => {
    function apri() {
      const corrente = getStoredConsent();
      setAnalytics(corrente?.analytics ?? false);
      setMarketing(corrente?.marketing ?? false);
      setDettagli(true);
      setRiaperto(true);
    }
    window.addEventListener(OPEN_PREFERENCES_EVENT, apri);
    return () => window.removeEventListener(OPEN_PREFERENCES_EVENT, apri);
  }, []);

  const chiudi = useCallback(() => {
    setDettagli(false);
    setRiaperto(false);
  }, []);

  if (stato === SSR) return null;

  const [eta, consenso] = stato.split('|');

  /* Chi ha detto di non avere diciotto anni non vede il sito. Finché
     la scheda resta aperta: la risposta sta in sessionStorage. */
  if (eta === 'no') {
    return (
      <div className="ds ds-on-ink fixed inset-0 z-[10001] grid place-items-center bg-ink px-gutter text-on-ink">
        <div className="max-w-[34ch] text-center">
          <p className="ds-display text-title">{tAge('deniedTitle')}</p>
          <p className="mt-4 text-body text-on-ink-muted">{tAge('deniedBody')}</p>
        </div>
      </div>
    );
  }

  const serveEta = eta !== 'yes';
  const serveCookie = consenso === '';
  if (!serveEta && !serveCookie && !riaperto) return null;

  function accettaTutti() {
    saveConsent({ analytics: true, marketing: true });
    setAnalytics(true);
    setMarketing(true);
    chiudi();
  }

  function rifiuta() {
    saveConsent({ analytics: false, marketing: false });
    setAnalytics(false);
    setMarketing(false);
    chiudi();
  }

  function salva() {
    saveConsent({ analytics, marketing });
    chiudi();
  }

  const primario =
    'inline-flex min-h-[48px] w-full items-center justify-center rounded-full bg-accent px-5 text-fine font-medium text-paper transition-colors hover:bg-accent-lift';
  const secondario =
    'inline-flex min-h-[48px] flex-1 items-center justify-center rounded-full border border-on-ink/20 px-4 text-fine text-on-ink transition-colors hover:border-on-ink/45';

  return (
    <div
      role="dialog"
      aria-modal="false"
      aria-label={serveEta ? tAge('title') : t('title')}
      className="ds ds-on-ink fixed inset-x-0 bottom-0 z-[10000] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[23rem]"
    >
      <div className="max-h-[82vh] overflow-y-auto rounded-t-3xl border border-rule-ink bg-ink px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-6 text-on-ink shadow-[0_10px_50px_rgba(0,0,0,0.45)] sm:rounded-3xl sm:px-6 sm:pb-6">
        {serveEta && (
          <section>
            <p className="text-fine uppercase tracking-[0.24em] text-rose">{tAge('title')}</p>
            <p className="mt-3 text-body">{tAge('question')}</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <button type="button" onClick={() => saveAge('yes')} className={primario}>
                {tAge('yes')}
              </button>
              <button type="button" onClick={() => saveAge('no')} className={`${secondario} w-full`}>
                {tAge('no')}
              </button>
            </div>
          </section>
        )}

        {(serveCookie || riaperto) && (
          <section className={serveEta ? 'mt-6 border-t border-rule-ink pt-6' : ''}>
            <p className="text-fine uppercase tracking-[0.24em] text-rose">{t('title')}</p>
            <p className="mt-3 text-body text-on-ink-muted">{t('description')}</p>
            <Link
              href="/cookie-policy"
              className="mt-2 inline-block text-fine text-rose underline underline-offset-2 hover:text-on-ink"
            >
              {t('policyLink')}
            </Link>

            {dettagli && (
              <div className="mt-5 flex flex-col gap-4 border-t border-rule-ink pt-5">
                <Switch label={t('technicalTitle')} desc={t('technicalDesc')} on locked />
                <Switch
                  label={t('analyticsTitle')}
                  desc={t('analyticsDesc')}
                  on={analytics}
                  onChange={setAnalytics}
                />
                <Switch
                  label={t('marketingTitle')}
                  desc={t('marketingDesc')}
                  on={marketing}
                  onChange={setMarketing}
                />
              </div>
            )}

            <div className="mt-5 flex flex-col gap-2.5">
              {dettagli ? (
                <button type="button" onClick={salva} className={primario}>
                  {t('save')}
                </button>
              ) : (
                <>
                  <button type="button" onClick={accettaTutti} className={primario}>
                    {t('acceptAll')}
                  </button>
                  <div className="flex gap-2.5">
                    <button type="button" onClick={rifiuta} className={secondario}>
                      {t('rejectNonEssential')}
                    </button>
                    <button type="button" onClick={() => setDettagli(true)} className={secondario}>
                      {t('customize')}
                    </button>
                  </div>
                </>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
