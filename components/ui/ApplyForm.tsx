'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

/**
 * Candidarsi per lavorare con il club.
 *
 * Prima c'erano tre moduli su tre pagine — aziende, ambassador,
 * creator — con tre forme diverse, e nessuno dei tre chiedeva alla
 * persona chi fosse: si arrivava davanti a dei campi e basta.
 *
 * Qui la prima cosa è la domanda, e i campi che compaiono dopo sono
 * solo quelli che riguardano la risposta. Un creator non si vede
 * chiedere la ragione sociale, un'azienda non si vede chiedere i
 * follower.
 */

type Kind = 'ambassador' | 'company' | 'creator' | 'staff';

const KINDS: Kind[] = ['ambassador', 'company', 'creator', 'staff'];

/** Quali campi mostrare, per ciascuna risposta. */
const FIELDS: Record<Kind, string[]> = {
  ambassador: ['city', 'country', 'instagram'],
  company: ['company', 'role', 'website'],
  creator: ['city', 'instagram', 'tiktok', 'followers'],
  staff: ['city', 'role'],
};

const INPUT =
  'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body text-on-paper ' +
  'placeholder:text-on-paper-muted/60 transition-colors focus:border-accent/50 focus:outline-none [font-size:16px]';

export function ApplyForm({ initialKind }: { initialKind?: Kind }) {
  const t = useTranslations('site.apply');
  const tc = useTranslations('consent');
  const locale = useLocale();

  const [kind, setKind] = useState<Kind | null>(initialKind ?? null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [privacy, setPrivacy] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  function set(k: string, v: string) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!kind) return;
    if (!privacy) {
      setError(tc('requiredError'));
      return;
    }
    setError('');
    setSending(true);
    try {
      const res = await fetch('/api/collaboration-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          kind,
          locale,
          consent_privacy: true,
          consent_marketing: marketing,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t('error'));
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('error'));
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="rounded-3xl border border-rule-paper px-6 py-12 text-center">
        <p className="ds-display text-[26px] leading-tight tracking-[-0.02em]">{t('doneTitle')}</p>
        <p className="mx-auto mt-3 max-w-[44ch] text-lead text-on-paper-muted">{t('doneBody')}</p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-8">
      {/* La domanda, prima di tutto il resto. */}
      <fieldset>
        <legend className="text-lead text-on-paper">{t('question')}</legend>
        <div className="mt-5 grid gap-2.5 sm:grid-cols-2">
          {KINDS.map((k) => {
            const on = kind === k;
            return (
              <button
                key={k}
                type="button"
                onClick={() => setKind(k)}
                aria-pressed={on}
                className={`rounded-2xl border p-4 text-left transition-colors ${
                  on
                    ? 'border-accent bg-accent text-paper'
                    : 'border-rule-paper hover:border-accent/40'
                }`}
              >
                <span className="block text-subtitle font-medium">{t(`kind.${k}.label`)}</span>
                <span
                  className={`mt-1 block text-fine ${on ? 'text-paper/80' : 'text-on-paper-muted'}`}
                >
                  {t(`kind.${k}.hint`)}
                </span>
              </button>
            );
          })}
        </div>
      </fieldset>

      {kind && (
        <>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-2 block text-fine font-medium">{t('firstName')}</span>
              <input
                required
                value={form.first_name ?? ''}
                onChange={(e) => set('first_name', e.target.value)}
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-fine font-medium">{t('lastName')}</span>
              <input
                required
                value={form.last_name ?? ''}
                onChange={(e) => set('last_name', e.target.value)}
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-fine font-medium">{t('email')}</span>
              <input
                required
                type="email"
                value={form.email ?? ''}
                onChange={(e) => set('email', e.target.value)}
                placeholder="your@email.com"
                className={INPUT}
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-fine font-medium">{t('phone')}</span>
              <input
                type="tel"
                value={form.phone ?? ''}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+39 000 000 0000"
                className={INPUT}
              />
            </label>

            {FIELDS[kind].map((f) => (
              <label key={f} className="block">
                <span className="mb-2 block text-fine font-medium">{t(`field.${f}`)}</span>
                <input
                  type={f === 'followers' ? 'text' : f === 'website' ? 'url' : 'text'}
                  inputMode={f === 'followers' ? 'numeric' : undefined}
                  value={form[f] ?? ''}
                  onChange={(e) => set(f, e.target.value)}
                  placeholder={
                    f === 'instagram' || f === 'tiktok'
                      ? '@'
                      : f === 'website'
                        ? 'https://'
                        : undefined
                  }
                  className={INPUT}
                />
              </label>
            ))}
          </div>

          <label className="block">
            <span className="mb-2 block text-fine font-medium">{t(`message.${kind}`)}</span>
            <textarea
              required
              rows={5}
              value={form.message ?? ''}
              onChange={(e) => set('message', e.target.value)}
              className={`${INPUT} resize-none`}
            />
          </label>

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
            disabled={sending}
            className="inline-flex min-h-[56px] items-center justify-center self-start rounded-full bg-accent px-8 text-fine font-medium text-paper transition-colors hover:bg-accent-lift disabled:opacity-50"
          >
            {sending ? t('sending') : t('submit')}
          </button>
        </>
      )}
    </form>
  );
}
