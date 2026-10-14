'use client';

import { useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';
import { Button } from '@/components/ui/Button';
import ConsentCheckbox from '@/components/ConsentCheckbox';

const PROJECT_TYPES = [
  { value: 'single', key: 'fTypeSingle' },
  { value: 'campaign', key: 'fTypeCampaign' },
  { value: 'ongoing', key: 'fTypeOngoing' },
  { value: 'event', key: 'fTypeEvent' },
  { value: 'other', key: 'fTypeOther' },
] as const;

const EMPTY = {
  company: '',
  contact_name: '',
  email: '',
  phone: '',
  project_type: '',
  message: '',
  website: '', // honeypot
};

const fieldClass =
  'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body text-on-paper ' +
  'placeholder:text-on-paper-muted/60 transition-colors ' +
  'focus:border-accent/50 focus:outline-none [font-size:16px]';

function Label({ htmlFor, children, hint }: { htmlFor: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-fine font-medium text-on-paper">
      {children}
      {hint && <span className="ml-2 font-normal text-on-paper-muted">{hint}</span>}
    </label>
  );
}

export function BrandLeadForm() {
  const t = useTranslations('site.brands');
  const tc = useTranslations('consent');
  const locale = useLocale();
  const reduce = useReducedMotion();

  const [form, setForm] = useState(EMPTY);
  const [consent, setConsent] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set =
    (key: keyof typeof EMPTY) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [key]: e.target.value }));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (!consent) {
      setError(tc('requiredError'));
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/brand-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, consent_privacy: true, locale }),
      });
      if (res.status === 400) throw new Error(t('errInvalid'));
      if (!res.ok) throw new Error(t('errGeneric'));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errGeneric'));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="rounded-2xl border border-accent/25 bg-paper-soft p-8 text-center"
        role="status"
      >
        <p className="ds-display text-title">{t('okTitle')}</p>
        <p className="mt-3 text-body text-on-paper-muted">{t('okBody')}</p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate={false}>
      <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
        <label htmlFor="bl-website">Website</label>
        <input id="bl-website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="bl-company">{t('fCompany')} *</Label>
          <input id="bl-company" required maxLength={160} autoComplete="organization"
            value={form.company} onChange={set('company')} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="bl-name">{t('fName')} *</Label>
          <input id="bl-name" required maxLength={120} autoComplete="name"
            value={form.contact_name} onChange={set('contact_name')} className={fieldClass} />
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <Label htmlFor="bl-email">{t('fEmail')} *</Label>
          <input id="bl-email" type="email" required maxLength={200} autoComplete="email"
            value={form.email} onChange={set('email')} className={fieldClass} />
        </div>
        <div>
          <Label htmlFor="bl-phone" hint={t('fOptional')}>{t('fPhone')}</Label>
          <input id="bl-phone" type="tel" maxLength={40} autoComplete="tel"
            value={form.phone} onChange={set('phone')} className={fieldClass} />
        </div>
      </div>

      <div>
        <Label htmlFor="bl-type">{t('fType')} *</Label>
        <div className="relative">
          <select id="bl-type" required value={form.project_type} onChange={set('project_type')}
            className={`${fieldClass} cursor-pointer appearance-none pr-12 ${form.project_type === '' ? 'text-on-paper-muted/60' : ''}`}>
            <option value="" disabled>{t('fTypePlaceholder')}</option>
            {PROJECT_TYPES.map((p) => (
              <option key={p.value} value={p.value}>{t(p.key)}</option>
            ))}
          </select>
          <span className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
            <svg width="11" height="7" viewBox="0 0 10 6" fill="none" aria-hidden="true">
              <path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </span>
        </div>
      </div>

      <div>
        <Label htmlFor="bl-message">{t('fMessage')} *</Label>
        <textarea id="bl-message" required rows={5} maxLength={3000}
          value={form.message} onChange={set('message')} className={`${fieldClass} resize-none`} />
      </div>

      <ConsentCheckbox
        id="brand-lead-consent"
        required
        checked={consent}
        onChange={setConsent}
        label={tc.rich('privacyRequired', {
          privacyLink: (chunks) => (
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="ds-link">
              {chunks}
            </a>
          ),
        })}
      />

      {error && (
        <p role="alert" className="text-fine text-accent">
          {error}
        </p>
      )}

      <Button type="submit" size="lg" disabled={loading} className="self-start">
        {loading ? t('fSending') : t('fSubmit')}
      </Button>
    </form>
  );
}
