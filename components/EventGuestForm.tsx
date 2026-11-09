'use client';

import { useState } from 'react';
import { pixel } from '@/lib/pixel';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ConsentCheckbox from '@/components/ConsentCheckbox';

interface Props {
  eventSlug:       string;
  eventTitle:      string;
  eventDate:       string;   // e.g. "12 LUG 2026"
  eventLocation:   string;
  partnerCode?:    string;   // incoming ?partner= from URL (organisation tracking)
  showRouteOption?: boolean; // true only for Vivo Wine Ride
  eventPrice?:     number;   // >0 means "pagamento all'ingresso" (list-only events with price)
}

/**
 * Il modulo della lista invitati, nel sistema del sito.
 *
 * Era rimasto scritto nella lingua di prima: colori battuti a mano,
 * caratteri dichiarati riga per riga, etichette in maiuscoletto
 * spaziato con un'iconcina davanti a ognuna. In mezzo a una pagina
 * rifatta si vedeva, e sembrava un pezzo di un altro sito.
 *
 * Adesso usa gli stessi campi della pagina di acquisto: stesso
 * bordo, stesso raggio, stesse etichette. Le icone accanto a "Nome"
 * e "Email" non le ho rimesse — un'iconcina davanti alla parola
 * "Email" non dice niente che la parola non dica gia'.
 *
 * Il funzionamento non cambia di una riga: cambia come si vede.
 */
const CAMPO =
  'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body ' +
  'placeholder:text-on-paper-muted/50 focus:border-accent/50 focus:outline-none [font-size:16px]';

function Campo({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-fine font-medium">{label}</span>
      {children}
    </label>
  );
}

export default function EventGuestForm({ eventSlug, eventTitle, eventDate, eventLocation, partnerCode, showRouteOption, eventPrice = 0 }: Props) {
  const t  = useTranslations('events');
  const tc = useTranslations('consent');
  const [form, setForm]           = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [routeOption, setRouteOption] = useState<'40km' | '80km' | null>(null);
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error,   setError]       = useState('');

  // Consent — consentPrivacy is REQUIRED (blocks submit); consentMarketing is OPTIONAL (never blocks submit)
  const [consentPrivacy, setConsentPrivacy]     = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    // Validate route option for Wine Ride
    if (showRouteOption && !routeOption) {
      setError(t('routeOptionRequired'));
      return;
    }

    // Privacy Policy consent is REQUIRED — block submit if not checked
    if (!consentPrivacy) {
      setError(tc('requiredError'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch(`/api/events/${eventSlug}/guests`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          ...form,
          partner_code:      partnerCode ?? null,
          route_option:      showRouteOption ? routeOption : null,
          consent_privacy:   consentPrivacy,
          consent_marketing: consentMarketing,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Errore durante l\'iscrizione. Riprova.');
        return;
      }

      pixel.lead({ content_name: eventTitle });
      setSuccess(true);
    } catch {
      setError('Errore di connessione. Controlla la rete e riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="guest-form" className="rounded-2xl border border-rule-paper p-6 sm:p-8">
      <div className="mb-7">
        <p className="text-fine font-medium uppercase tracking-[0.14em] text-accent">
          {t('guestListLabel')}
        </p>
        <h2 className="ds-display mt-2 text-[22px] leading-tight tracking-[-0.02em]">
          {t('guestListHeading')}
        </h2>
        <p className="mt-2 max-w-[52ch] text-body text-on-paper-muted">{t('guestListSubtitle')}</p>

        {eventPrice > 0 && (
          <p className="mt-4 rounded-2xl border border-rule-paper px-4 py-3 text-body">
            <span className="ds-numeric font-medium">€{eventPrice}</span>
            <span className="text-on-paper-muted"> · {t('paymentAtDoorNote')}</span>
          </p>
        )}
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          /* ── Fatto ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-5 py-6 text-center"
          >
            <span className="grid h-12 w-12 place-items-center rounded-full bg-accent text-paper">
              <Check size={22} strokeWidth={2.2} />
            </span>
            <div>
              <p className="ds-display text-[20px] leading-tight tracking-[-0.02em]">
                {t('registrationSuccessTitle')}
              </p>
              <p className="mt-2 max-w-[44ch] text-body text-on-paper-muted">
                {t('registrationSuccessMsg', { title: eventTitle })}
              </p>
            </div>

            <dl className="w-full max-w-xs rounded-2xl border border-rule-paper px-5 py-4 text-left">
              <dt className="text-fine font-medium uppercase tracking-[0.14em] text-accent">
                {t('registrationSummary')}
              </dt>
              <dd className="mt-2 text-body">{eventDate} · {eventLocation}</dd>
              {showRouteOption && routeOption && (
                <dd className="mt-1 text-body font-medium">
                  {routeOption === '40km' ? t('routeOption40') : t('routeOption80')}
                </dd>
              )}
              {eventPrice > 0 && (
                <dd className="mt-1 text-body font-medium">
                  €{eventPrice} · {t('paymentAtDoor')}
                </dd>
              )}
            </dl>

            <p className="text-fine text-on-paper-muted">{t('spamNote')}</p>
          </motion.div>
        ) : (
          /* ── Il modulo ── */
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-5"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Campo label={t('fieldFirstName')}>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={set('first_name')}
                  placeholder="Marco"
                  className={CAMPO}
                />
              </Campo>

              <Campo label={t('fieldLastName')}>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={set('last_name')}
                  placeholder="Rossi"
                  className={CAMPO}
                />
              </Campo>

              <Campo label="Email">
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="marco@example.com"
                  className={CAMPO}
                />
              </Campo>

              <Campo label={t('fieldPhone')}>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+39 333 000 0000"
                  className={CAMPO}
                />
              </Campo>
            </div>

            {/* ── Il percorso: solo per il Wine Ride ── */}
            {showRouteOption && (
              <div>
                <p className="mb-2 text-fine font-medium">{t('routeOptionLabel')}</p>
                <div className="grid grid-cols-2 gap-3">
                  {(['40km', '80km'] as const).map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setRouteOption(opt)}
                      aria-pressed={routeOption === opt}
                      className={`flex min-h-[76px] flex-col items-center justify-center gap-1 rounded-2xl border transition-colors ${
                        routeOption === opt
                          ? 'border-accent bg-accent text-paper'
                          : 'border-rule-paper hover:border-accent/40'
                      }`}
                    >
                      <span className="ds-display ds-numeric text-[26px] leading-none">
                        {opt === '40km' ? '40' : '80'}
                      </span>
                      <span className="text-fine uppercase tracking-[0.14em] opacity-70">km</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Consensi ── */}
            <div className="flex flex-col gap-3">
              <ConsentCheckbox
                id="guest-consent-privacy"
                required
                checked={consentPrivacy}
                onChange={setConsentPrivacy}
                label={tc.rich('privacyRequired', {
                  privacyLink: (chunks) => (
                    <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-accent">
                      {chunks}
                    </a>
                  ),
                })}
              />
              <ConsentCheckbox
                id="guest-consent-marketing"
                required={false}
                checked={consentMarketing}
                onChange={setConsentMarketing}
                label={tc('newsletterOptional')}
              />
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-accent/30 bg-accent/5 px-4 py-3 text-fine font-medium text-accent"
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading || !consentPrivacy}
              className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-full bg-accent px-7 text-fine font-medium text-paper transition-opacity hover:opacity-90 disabled:opacity-45 sm:w-auto sm:self-start"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  {t('submittingRegistration')}
                </>
              ) : t('submitRegistration')}
            </button>

            <p className="text-fine text-on-paper-muted">{t('registrationNote')}</p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
