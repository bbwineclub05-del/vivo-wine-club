'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import Link from 'next/link';

/**
 * Iscriversi al club.
 *
 * Non è più una candidatura da valutare: una tessera si compra. Sono
 * spariti i campi che servivano a decidere se accettare qualcuno —
 * motivazione, esperienza con il vino — perché non c'è più niente da
 * decidere, e tenerli avrebbe solo allungato un modulo che adesso
 * serve a incassare.
 *
 * Fino al 31 dicembre si diventa soci subito. Dal 2027 si passa dal
 * pagamento, e la tessera vale dal momento in cui Stripe conferma.
 */

const FIELD =
  'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body text-on-paper ' +
  'placeholder:text-on-paper-muted/60 transition-colors focus:border-accent/50 focus:outline-none [font-size:16px]';

/** Si entra da maggiorenni; cent'anni è il fondo sensato di un calendario. */
function maxDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
}
function minDob() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return d.toISOString().split('T')[0];
}

/**
 * La data nella lingua della pagina.
 *
 * I nomi dei mesi erano scritti in italiano dentro il codice, quindi
 * un inglese leggeva "31 dicembre 2026" in mezzo a una frase inglese.
 * Qui gira nel browser, dove i dati di localizzazione ci sono sempre.
 */
function fmtDate(iso: string, locale: string) {
  const d = new Date(`${iso.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-fine font-medium text-on-paper">
      {children}
    </label>
  );
}

interface Done {
  name: string;
  memberId: string;
  expires: string;
}

export function MembershipForm() {
  const t = useTranslations('membership');
  const tc = useTranslations('consent');
  const locale = useLocale();
  const reduce = useReducedMotion();

  const [form, setForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    city: '',
    dateOfBirth: '',
    source: '',
  });
  const [confirmEmail, setConfirmEmail] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [age, setAge] = useState(false);
  const [marketing, setMarketing] = useState(false);

  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<Done | null>(null);
  const [error, setError] = useState('');

  const emailsMatch = form.email.length > 0 && form.email === confirmEmail;
  const canSubmit = emailsMatch && privacy && age && !loading;

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((p) => ({ ...p, [field]: e.target.value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/memberships', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.fullName,
          email: form.email,
          phone: form.phone,
          city: form.city,
          date_of_birth: form.dateOfBirth || null,
          source: form.source,
          consent_privacy: privacy,
          consent_marketing: marketing,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 409) {
        setError(t('alreadyMember'));
        return;
      }
      if (!res.ok) throw new Error(data.error ?? t('errGeneric'));

      // Nel periodo gratuito si è soci subito. Altrimenti si passa dal
      // pagamento, e la tessera diventa valida quando Stripe conferma.
      if (data.dueNowCents > 0) {
        const pay = await fetch('/api/memberships/checkout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ membershipId: data.membership.id }),
        });
        const payData = await pay.json().catch(() => ({}));
        if (!pay.ok || !payData.url) throw new Error(payData.error ?? t('errGeneric'));
        window.location.href = payData.url;
        return;
      }

      setDone({
        name: form.fullName.split(' ')[0],
        memberId: data.memberId,
        expires: data.membership.expires_at,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errGeneric'));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <p className="ds-display text-[28px] leading-tight tracking-[-0.02em]">
          {t('welcomeHeading', { name: done.name })}
        </p>
        <p className="mt-4 text-lead text-on-paper-muted">
          {t('welcomeBody', { memberId: done.memberId, expires: fmtDate(done.expires, locale) })}
        </p>
        <p className="mt-3 text-body text-on-paper-muted">{t('welcomeNext')}</p>
        <Link
          href="/"
          className="mt-8 inline-flex min-h-[52px] items-center rounded-full border border-rule-paper px-6 text-fine font-medium transition-colors hover:border-accent/40"
        >
          {t('backToHome')}
        </Link>
      </motion.div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-6">
      {/* Quanto costa, prima dei campi: è la domanda che uno si fa. */}
      <div className="rounded-2xl border border-rule-paper p-5">
        <p className="ds-display text-[22px] leading-none tracking-[-0.02em]">{t('priceFree')}</p>
        <p className="mt-2.5 text-body text-on-paper-muted">{t('priceFreeNote')}</p>
      </div>

      <div>
        <Label htmlFor="m-name">{t('labelFullName')}</Label>
        <input
          id="m-name"
          type="text"
          required
          placeholder={t('placeholderFullName')}
          value={form.fullName}
          onChange={set('fullName')}
          className={FIELD}
          autoComplete="name"
        />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="m-email">{t('labelEmail')}</Label>
          <input
            id="m-email"
            type="email"
            required
            placeholder="your@email.com"
            value={form.email}
            onChange={set('email')}
            className={FIELD}
            autoComplete="email"
          />
        </div>
        <div>
          <Label htmlFor="m-email2">{t('labelConfirmEmail')}</Label>
          <input
            id="m-email2"
            type="email"
            required
            placeholder="your@email.com"
            autoComplete="off"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            className={FIELD}
          />
          {confirmEmail.length > 0 && !emailsMatch && (
            <p className="mt-2 text-fine text-accent">{t('emailMismatch')}</p>
          )}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="m-phone">{t('labelPhone')}</Label>
          <input
            id="m-phone"
            type="tel"
            placeholder="+39 000 000 0000"
            value={form.phone}
            onChange={set('phone')}
            className={FIELD}
            autoComplete="tel"
          />
        </div>
        <div>
          <Label htmlFor="m-city">{t('labelCity')}</Label>
          <input
            id="m-city"
            type="text"
            required
            placeholder={t('placeholderCity')}
            value={form.city}
            onChange={set('city')}
            className={FIELD}
          />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="m-dob">{t('labelDob')}</Label>
          <input
            id="m-dob"
            type="date"
            required
            min={minDob()}
            max={maxDob()}
            value={form.dateOfBirth}
            onChange={set('dateOfBirth')}
            className={FIELD}
          />
        </div>
        <div>
          <Label htmlFor="m-source">{t('labelSource')}</Label>
          <select id="m-source" value={form.source} onChange={set('source')} className={FIELD}>
            <option value="">{t('selectOption')}</option>
            <option value="Instagram">{t('sourceInstagram')}</option>
            <option value="TikTok">{t('sourceTiktok')}</option>
            <option value="LinkedIn">{t('sourceLinkedin')}</option>
            <option value="Friend">{t('sourceFriend')}</option>
            <option value="Event">{t('sourceEvent')}</option>
            <option value="Other">{t('sourceOther')}</option>
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={privacy}
            onChange={(e) => setPrivacy(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
          />
          <span className="text-fine text-on-paper-muted">
            {tc.rich('privacyRequired', {
              privacyLink: (c) => (
                <a href="/privacy-policy" className="underline">
                  {c}
                </a>
              ),
            })}
          </span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={age}
            onChange={(e) => setAge(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
          />
          <span className="text-fine text-on-paper-muted">{tc('ageConfirmation')}</span>
        </label>
        <label className="flex cursor-pointer items-start gap-3">
          <input
            type="checkbox"
            checked={marketing}
            onChange={(e) => setMarketing(e.target.checked)}
            className="mt-1 h-5 w-5 shrink-0 accent-[var(--color-accent)]"
          />
          <span className="text-fine text-on-paper-muted">{tc('marketingOptional')}</span>
        </label>
      </div>

      {error && <p className="text-fine font-medium text-accent">{error}</p>}

      <button
        type="submit"
        disabled={!canSubmit}
        className="inline-flex min-h-[56px] items-center justify-center self-start rounded-full bg-accent px-8 text-fine font-medium text-paper transition-colors hover:bg-accent-lift disabled:opacity-50"
      >
        {loading ? t('joining') : t('join')}
      </button>
    </form>
  );
}
