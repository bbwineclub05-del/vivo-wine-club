'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Send } from 'lucide-react';
import { useLocale, useTranslations } from 'next-intl';
import ConsentCheckbox from '@/components/ConsentCheckbox';
import {
  AMBASSADOR_AREAS,
  AMBASSADOR_AREA_OTHER,
  AMBASSADOR_EVENT_TYPES,
  AMBASSADOR_LIMITS as L,
  normalizeAmbassadorLocale,
  type AmbassadorEventType,
} from '@/lib/ambassador';

interface FormState {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  area: string;
  area_other: string;
  experience: string;
  local_contacts: string;
  community: string;
  linkedin_url: string;
  social_links: string;
  motivation: string;
  availability: string;
  languages: string;
  website: string; // honeypot
}

const EMPTY: FormState = {
  first_name: '', last_name: '', email: '', phone: '', area: '', area_other: '',
  experience: '', local_contacts: '', community: '', linkedin_url: '', social_links: '',
  motivation: '', availability: '', languages: '', website: '',
};

const EVENT_TYPE_KEYS: Record<AmbassadorEventType, string> = {
  party:  'eventTypeParty',
  lounge: 'eventTypeLounge',
  visits: 'eventTypeVisits',
  other:  'eventTypeOther',
};

const inputBase =
  'w-full bg-white/70 border border-[#e8d5d5] text-[#1a0505] placeholder-[#7a4a4a]/50 px-5 py-4 focus:outline-none focus:border-[#731515]/50 transition-colors duration-300 rounded-lg [font-size:16px]';

function Label({ htmlFor, children, hint }: { htmlFor?: string; children: React.ReactNode; hint?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-[10px] tracking-[0.3em] text-[#731515] mb-2">
      {children}
      {hint && <span className="ml-2 tracking-normal text-[11px] text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>{hint}</span>}
    </label>
  );
}

export default function AmbassadorForm() {
  const t = useTranslations('ambassador');
  const tc = useTranslations('consent');
  const locale = normalizeAmbassadorLocale(useLocale());

  const [form, setForm] = useState<FormState>(EMPTY);
  const [eventTypes, setEventTypes] = useState<AmbassadorEventType[]>([]);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentAge, setConsentAge] = useState(false);
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const set = (field: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const toggleEventType = (type: AmbassadorEventType) =>
    setEventTypes((prev) => (prev.includes(type) ? prev.filter((v) => v !== type) : [...prev, type]));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (eventTypes.length === 0) { setError(t('errorEventTypes')); return; }
    if (!consentPrivacy)         { setError(tc('requiredError')); return; }
    if (!consentAge)             { setError(t('errorAge')); return; }

    setLoading(true);
    try {
      const res = await fetch('/api/ambassador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          area_other: form.area === AMBASSADOR_AREA_OTHER ? form.area_other : '',
          event_types: eventTypes,
          consent_privacy: consentPrivacy,
          consent_age: consentAge,
          locale,
        }),
      });
      if (res.status === 429) throw new Error(t('errorRateLimit'));
      if (res.status === 400) throw new Error(t('errorInvalid'));
      if (!res.ok) throw new Error(t('errorGeneric'));
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('errorGeneric'));
    } finally {
      setLoading(false);
    }
  };

  const font = { fontFamily: 'var(--font-nunito)' };

  if (sent) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="p-8 border border-[#731515]/30 bg-[#731515]/5 text-center rounded-lg"
      >
        <div className="text-[10px] tracking-[0.4em] text-[#731515] mb-3">{t('successEyebrow')}</div>
        <p className="text-base text-[#1a0505] font-light" style={font}>{t('successBody')}</p>
        <p className="text-sm text-[#7a4a4a] mt-2" style={font}>
          {t('successEmail')} <strong>{form.email}</strong>.
        </p>
      </motion.div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-6">
      {/* Honeypot — hidden from people, left empty by real users */}
      <div aria-hidden="true" className="absolute -left-[9999px] w-px h-px overflow-hidden">
        <label htmlFor="amb-website">Website</label>
        <input id="amb-website" type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={set('website')} />
      </div>

      {/* Name */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amb-first-name">{t('fieldFirstName')} *</Label>
          <input id="amb-first-name" type="text" required maxLength={L.name} autoComplete="given-name"
            value={form.first_name} onChange={set('first_name')} className={inputBase} style={font} />
        </div>
        <div>
          <Label htmlFor="amb-last-name">{t('fieldLastName')} *</Label>
          <input id="amb-last-name" type="text" required maxLength={L.name} autoComplete="family-name"
            value={form.last_name} onChange={set('last_name')} className={inputBase} style={font} />
        </div>
      </div>

      {/* Contacts */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amb-email">{t('fieldEmail')} *</Label>
          <input id="amb-email" type="email" required maxLength={L.email} autoComplete="email"
            value={form.email} onChange={set('email')} className={inputBase} style={font} />
        </div>
        <div>
          <Label htmlFor="amb-phone" hint={t('optional')}>{t('fieldPhone')}</Label>
          <input id="amb-phone" type="tel" maxLength={L.phone} autoComplete="tel"
            value={form.phone} onChange={set('phone')} className={inputBase} style={font} />
        </div>
      </div>

      {/* Area */}
      <div>
        <Label htmlFor="amb-area">{t('fieldArea')} *</Label>
        <div className="relative">
          <select id="amb-area" required value={form.area} onChange={set('area')}
            className={`${inputBase} appearance-none cursor-pointer ${form.area === '' ? 'text-[#7a4a4a]/50' : 'text-[#1a0505]'}`}
            style={font}
          >
            <option value="" disabled>{t('areaPlaceholder')}</option>
            {AMBASSADOR_AREAS.map((a) => (
              <option key={a.value} value={a.value} className="bg-white text-[#1a0505]">{a.label[locale]}</option>
            ))}
            <option value={AMBASSADOR_AREA_OTHER} className="bg-white text-[#1a0505]">{t('areaOther')}</option>
          </select>
          <div className="pointer-events-none absolute right-5 top-1/2 -translate-y-1/2">
            <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
              <path d="M1 1l4 4 4-4" stroke="#731515" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        </div>
        {form.area === AMBASSADOR_AREA_OTHER && (
          <input type="text" required maxLength={L.areaOther} aria-label={t('areaOtherPlaceholder')}
            placeholder={t('areaOtherPlaceholder')} value={form.area_other} onChange={set('area_other')}
            className={`${inputBase} mt-3`} style={font} />
        )}
      </div>

      {/* Event types */}
      <fieldset>
        <legend className="block text-[10px] tracking-[0.3em] text-[#731515] mb-3">{t('fieldEventTypes')} *</legend>
        <div className="flex flex-wrap gap-3">
          {AMBASSADOR_EVENT_TYPES.map((type) => {
            const active = eventTypes.includes(type);
            return (
              <label key={type}
                className={`cursor-pointer select-none px-5 py-2.5 rounded-full border text-[11px] tracking-[0.25em] transition-colors duration-300 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[#731515] ${
                  active ? 'bg-[#731515] border-[#731515] text-white' : 'bg-white/70 border-[#e8d5d5] text-[#731515] hover:border-[#731515]/50'
                }`}
              >
                <input type="checkbox" className="sr-only" checked={active} onChange={() => toggleEventType(type)} />
                {t(EVENT_TYPE_KEYS[type])}
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Experience */}
      <div>
        <Label htmlFor="amb-experience">{t('fieldExperience')} *</Label>
        <textarea id="amb-experience" required rows={5} maxLength={L.longText} placeholder={t('experiencePlaceholder')}
          value={form.experience} onChange={set('experience')} className={`${inputBase} resize-none`} style={font} />
      </div>

      {/* Local contacts */}
      <div>
        <Label htmlFor="amb-contacts" hint={t('optional')}>{t('fieldLocalContacts')}</Label>
        <textarea id="amb-contacts" rows={3} maxLength={L.mediumText} placeholder={t('localContactsPlaceholder')}
          value={form.local_contacts} onChange={set('local_contacts')} className={`${inputBase} resize-none`} style={font} />
      </div>

      {/* Community */}
      <div>
        <Label htmlFor="amb-community" hint={t('optional')}>{t('fieldCommunity')}</Label>
        <textarea id="amb-community" rows={3} maxLength={L.mediumText} placeholder={t('communityPlaceholder')}
          value={form.community} onChange={set('community')} className={`${inputBase} resize-none`} style={font} />
      </div>

      {/* Profiles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amb-linkedin" hint={t('recommended')}>{t('fieldLinkedin')}</Label>
          <input id="amb-linkedin" type="url" inputMode="url" maxLength={L.linkedin} placeholder="https://www.linkedin.com/in/…"
            pattern="https://([a-zA-Z0-9\-]+\.)*linkedin\.com(/.*)?"
            title={t('linkedinHint')}
            value={form.linkedin_url} onChange={set('linkedin_url')} className={inputBase} style={font} />
        </div>
        <div>
          <Label htmlFor="amb-social" hint={t('optional')}>{t('fieldSocial')}</Label>
          <input id="amb-social" type="text" maxLength={L.social} placeholder={t('socialPlaceholder')}
            value={form.social_links} onChange={set('social_links')} className={inputBase} style={font} />
        </div>
      </div>

      {/* Motivation */}
      <div>
        <Label htmlFor="amb-motivation">{t('fieldMotivation')} *</Label>
        <textarea id="amb-motivation" required rows={5} maxLength={L.longText} placeholder={t('motivationPlaceholder')}
          value={form.motivation} onChange={set('motivation')} className={`${inputBase} resize-none`} style={font} />
      </div>

      {/* Availability + languages */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label htmlFor="amb-availability">{t('fieldAvailability')} *</Label>
          <input id="amb-availability" type="text" required maxLength={L.availability} placeholder={t('availabilityPlaceholder')}
            value={form.availability} onChange={set('availability')} className={inputBase} style={font} />
        </div>
        <div>
          <Label htmlFor="amb-languages">{t('fieldLanguages')} *</Label>
          <input id="amb-languages" type="text" required maxLength={L.languages} placeholder={t('languagesPlaceholder')}
            value={form.languages} onChange={set('languages')} className={inputBase} style={font} />
        </div>
      </div>

      {/* Consent */}
      <div className="flex flex-col gap-3">
        <ConsentCheckbox
          id="ambassador-consent-age"
          required
          checked={consentAge}
          onChange={setConsentAge}
          label={tc('ageConfirmation')}
        />
        <ConsentCheckbox
          id="ambassador-consent-privacy"
          required
          checked={consentPrivacy}
          onChange={setConsentPrivacy}
          label={tc.rich('privacyRequired', {
            privacyLink: (chunks) => (
              <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" className="underline hover:text-[#731515] transition-colors">
                {chunks}
              </a>
            ),
          })}
        />
      </div>

      {error && (
        <p role="alert" className="text-center text-xs text-[#731515]" style={font}>{error}</p>
      )}

      <motion.button
        type="submit"
        disabled={loading}
        whileTap={{ scale: 0.99 }}
        className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.4em] flex items-center justify-center gap-3 hover:bg-[#9b2323] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300 rounded-lg"
      >
        <Send size={13} />
        {loading ? t('sending') : t('submit')}
      </motion.button>
    </form>
  );
}
