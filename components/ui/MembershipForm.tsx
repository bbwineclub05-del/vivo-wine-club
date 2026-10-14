'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { motion, useReducedMotion } from 'framer-motion';

import { Button } from '@/components/ui/Button';
import ConsentCheckbox from '@/components/ConsentCheckbox';

const fieldClass =
  'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body text-on-paper ' +
  'placeholder:text-on-paper-muted/60 transition-colors focus:border-accent/50 focus:outline-none [font-size:16px]';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  dateOfBirth: string;
  source: string;
  motivation: string;
  experience: string;
}

const INITIAL: FormState = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  dateOfBirth: '',
  source: '',
  motivation: '',
  experience: '',
};

// Applicants must be 18; 100 years is the sane floor for a date picker.
function maxDobDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 18);
  return d.toISOString().split('T')[0];
}
function minDobDate() {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 100);
  return d.toISOString().split('T')[0];
}

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 block text-fine font-medium text-on-paper">
      {children}
    </label>
  );
}

export function MembershipForm() {
  const t = useTranslations('membership');
  const tc = useTranslations('consent');
  const reduce = useReducedMotion();

  const [form, setForm] = useState<FormState>(INITIAL);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // consentPrivacy and consentAge block submit; consentMarketing never does.
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentAge, setConsentAge] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

  const emailsMatch = form.email.length > 0 && form.email === confirmEmail;
  const canSubmit = emailsMatch && consentPrivacy && consentAge;

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.fullName,
        email: form.email,
        phone: form.phone,
        city: form.city,
        date_of_birth: form.dateOfBirth,
        source: form.source,
        experience: form.experience,
        motivation: form.motivation,
        consent_privacy: consentPrivacy,
        consent_age: consentAge,
        consent_marketing: consentMarketing,
      }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <>
{submitted ? (
  <motion.div
    initial={reduce ? false : { opacity: 0, y: 14 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
    className="rounded-2xl border border-accent/25 bg-paper-soft p-8"
    role="status"
  >
    <h2 className="ds-display text-title">
      {t('thankYouHeading', { name: form.fullName.split(' ')[0] })}
    </h2>
    <p className="mt-4 text-lead text-on-paper-muted">{t('thankYouBody')}</p>
    <Link
      href="/"
      className="ds-link mt-6 inline-flex min-h-[48px] items-center gap-2 text-body no-underline hover:text-accent"
    >
      <ArrowLeft size={16} strokeWidth={1.75} />
      {t('backToHome')}
    </Link>
  </motion.div>
) : (
  <form onSubmit={handleSubmit} className="flex flex-col gap-5">
    <div>
      <Label htmlFor="m-name">{t('labelFullName')}</Label>
      <input id="m-name" type="text" required placeholder={t('placeholderFullName')}
        value={form.fullName} onChange={set('fullName')} className={fieldClass} autoComplete="name" />
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <Label htmlFor="m-email">{t('labelEmail')}</Label>
        <input id="m-email" type="email" required placeholder="your@email.com"
          value={form.email} onChange={set('email')} className={fieldClass} autoComplete="email" />
      </div>
      <div>
        <Label htmlFor="m-email2">{t('labelConfirmEmail')}</Label>
        <input id="m-email2" type="email" required placeholder="your@email.com" autoComplete="off"
          value={confirmEmail} onChange={(e) => setConfirmEmail(e.target.value)}
          className={`${fieldClass} ${confirmEmail.length > 0 && !emailsMatch ? 'border-accent' : ''}`} />
        {confirmEmail.length > 0 && !emailsMatch && (
          <p className="mt-2 text-fine text-accent">{t('emailMismatch')}</p>
        )}
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <Label htmlFor="m-phone">{t('labelPhone')}</Label>
        <input id="m-phone" type="tel" placeholder="+39 000 000 0000"
          value={form.phone} onChange={set('phone')} className={fieldClass} autoComplete="tel" />
      </div>
      <div>
        <Label htmlFor="m-city">{t('labelCity')}</Label>
        <input id="m-city" type="text" required placeholder={t('placeholderCity')}
          value={form.city} onChange={set('city')} className={fieldClass} />
      </div>
    </div>

    <div className="grid gap-5 sm:grid-cols-2">
      <div>
        <Label htmlFor="m-dob">{t('labelDob')}</Label>
        <input id="m-dob" type="date" required min={minDobDate()} max={maxDobDate()}
          value={form.dateOfBirth} onChange={set('dateOfBirth')}
          className={`${fieldClass} [color-scheme:light]`} />
      </div>
      <div>
        <Label htmlFor="m-source">{t('labelSource')}</Label>
        <select id="m-source" required value={form.source} onChange={set('source')}
          className={`${fieldClass} cursor-pointer appearance-none ${form.source === '' ? 'text-on-paper-muted/60' : ''}`}>
          <option value="" disabled>{t('selectOption')}</option>
          <option value="Instagram">{t('sourceInstagram')}</option>
          <option value="LinkedIn">{t('sourceLinkedin')}</option>
          <option value="TikTok">{t('sourceTiktok')}</option>
          <option value="Friend">{t('sourceFriend')}</option>
          <option value="Event">{t('sourceEvent')}</option>
          <option value="Other">{t('sourceOther')}</option>
        </select>
      </div>
    </div>

    <div>
      <Label htmlFor="m-exp">{t('labelExperience')}</Label>
      <select id="m-exp" required value={form.experience} onChange={set('experience')}
        className={`${fieldClass} cursor-pointer appearance-none ${form.experience === '' ? 'text-on-paper-muted/60' : ''}`}>
        <option value="" disabled>{t('selectLevel')}</option>
        <option value="Beginner">{t('expBeginner')}</option>
        <option value="Intermediate">{t('expIntermediate')}</option>
        <option value="Advanced">{t('expAdvanced')}</option>
        <option value="Sommelier">{t('expSommelier')}</option>
      </select>
    </div>

    <div>
      <Label htmlFor="m-motivation">{t('labelMotivation')}</Label>
      <textarea id="m-motivation" required rows={4} placeholder={t('placeholderMotivation')}
        value={form.motivation} onChange={set('motivation')} className={`${fieldClass} resize-none`} />
    </div>

    <div className="flex flex-col gap-3">
      <ConsentCheckbox
        id="membership-consent-privacy"
        required
        checked={consentPrivacy}
        onChange={setConsentPrivacy}
        label={tc.rich('privacyRequired', {
          privacyLink: (chunks) => (
            <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="ds-link">
              {chunks}
            </a>
          ),
        })}
      />
      <ConsentCheckbox
        id="membership-consent-age"
        required
        checked={consentAge}
        onChange={setConsentAge}
        label={tc('ageConfirmation')}
      />
      <ConsentCheckbox
        id="membership-consent-marketing"
        required={false}
        checked={consentMarketing}
        onChange={setConsentMarketing}
        label={tc('marketingOptional')}
      />
    </div>

    <Button type="submit" size="lg" disabled={loading || !canSubmit} className="self-start">
      {loading ? t('sending') : t('sendApplication')}
    </Button>

    <p className="text-fine text-on-paper-muted">{t('reviewNote')}</p>
  </form>
)}
    </>
  );
}
