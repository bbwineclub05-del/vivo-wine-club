'use client';

import { useState } from 'react';
import { pixel } from '@/lib/pixel';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, User, Mail, Phone, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import ReferralShare from '@/components/ReferralShare';

interface Props {
  eventSlug:     string;
  eventTitle:    string;
  eventDate:     string;   // e.g. "12 LUG 2026"
  eventLocation: string;
  refCode?:      string;   // incoming ?ref= from URL (user referral)
  partnerCode?:  string;   // incoming ?partner= from URL (organisation tracking)
}

const INPUT_CLS =
  'w-full bg-white border border-[#e8d5d5] text-[#1a0505] px-4 py-3 placeholder:text-[#7a4a4a]/35 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 rounded-lg';

export default function EventGuestForm({ eventSlug, eventTitle, eventDate, eventLocation, refCode, partnerCode }: Props) {
  const t = useTranslations('events');
  const [form, setForm]           = useState({ first_name: '', last_name: '', email: '', phone: '' });
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState(false);
  const [error,   setError]       = useState('');
  const [myRefCode,         setMyRefCode]         = useState<string | null>(null);
  const [refUses,           setRefUses]           = useState(0);
  const [refRewardUnlocked, setRefRewardUnlocked] = useState(false);
  const [refRewardCode,     setRefRewardCode]     = useState<string | null>(null);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(p => ({ ...p, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch(`/api/events/${eventSlug}/guests`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ ...form, partner_code: partnerCode ?? null }),
      });
      const json = await res.json();

      if (!res.ok) {
        setError(json.error ?? 'Errore durante l\'iscrizione. Riprova.');
        return;
      }

      // Referral code arrives inline with the registration response
      if (json.referral?.code) {
        setMyRefCode(json.referral.code);
        setRefUses(json.referral.uses ?? 0);
        setRefRewardUnlocked(json.referral.reward_unlocked ?? false);
        setRefRewardCode(json.referral.reward_code ?? null);
      }

      pixel.lead({ content_name: eventTitle });
      setSuccess(true);

      // Attribute an incoming referral (if ?ref= was in the URL) — fire-and-forget
      if (refCode) {
        const email = form.email.trim().toLowerCase();
        fetch('/api/referral/use', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ ref_code: refCode, used_by_email: email, event_slug: eventSlug }),
        }).catch(() => {/* non-fatal */});
      }
    } catch {
      setError('Errore di connessione. Controlla la rete e riprova.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div id="guest-form" className="mt-12 bg-white border border-[#eddada] rounded-xl p-6 sm:p-8">
      {/* Header */}
      <div className="mb-6">
        <div className="text-[9px] tracking-[0.5em] text-[#731515] mb-2">{t('guestListLabel')}</div>
        <h2
          className="text-2xl font-light text-[#1a0505] leading-tight"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          {t('guestListHeading')}
        </h2>
        <p
          className="text-sm text-[#7a4a4a]/70 mt-2 leading-relaxed"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {t('guestListSubtitle')}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {success ? (
          /* ── Success state ── */
          <motion.div
            key="success"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center gap-4 py-8 text-center"
          >
            <div className="w-14 h-14 rounded-full bg-[#f5f0f0] flex items-center justify-center">
              <CheckCircle size={28} className="text-[#731515]" strokeWidth={1.25} />
            </div>
            <div>
              <p
                className="text-base font-medium text-[#1a0505] mb-1"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                {t('registrationSuccessTitle')}
              </p>
              <p
                className="text-sm text-[#7a4a4a]/70 leading-relaxed"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {t('registrationSuccessMsg', { title: eventTitle })}
              </p>
            </div>
            <div className="mt-2 px-5 py-3 bg-[#fdf6f6] border border-[#eddada] rounded-lg text-sm text-[#7a4a4a] w-full max-w-xs text-left space-y-1">
              <p className="text-[10px] tracking-[0.3em] text-[#731515] mb-2">{t('registrationSummary')}</p>
              <p style={{ fontFamily: 'var(--font-nunito)' }}>{eventDate} · {eventLocation}</p>
            </div>
            <p
              className="text-[11px] text-[#7a4a4a]/45 text-center"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('spamNote')}
            </p>
            {/* Referral share widget — code arrives with the registration response */}
            {myRefCode && (
              <ReferralShare
                referralCode={myRefCode}
                eventSlug={eventSlug}
                eventTitle={eventTitle}
                initialUses={refUses}
                initialRewardUnlocked={refRewardUnlocked}
                initialRewardCode={refRewardCode}
              />
            )}
          </motion.div>
        ) : (
          /* ── Form ── */
          <motion.form
            key="form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-4"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* First name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.3em] text-[#731515] flex items-center gap-1.5">
                  <User size={10} />
                  {t('fieldFirstName')} *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="given-name"
                  value={form.first_name}
                  onChange={set('first_name')}
                  placeholder="Marco"
                  className={INPUT_CLS}
                  style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
                />
              </div>

              {/* Last name */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.3em] text-[#731515] flex items-center gap-1.5">
                  <User size={10} />
                  {t('fieldLastName')} *
                </label>
                <input
                  type="text"
                  required
                  autoComplete="family-name"
                  value={form.last_name}
                  onChange={set('last_name')}
                  placeholder="Rossi"
                  className={INPUT_CLS}
                  style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
                />
              </div>

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.3em] text-[#731515] flex items-center gap-1.5">
                  <Mail size={10} />
                  EMAIL *
                </label>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={form.email}
                  onChange={set('email')}
                  placeholder="marco@example.com"
                  className={INPUT_CLS}
                  style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
                />
              </div>

              {/* Phone */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] tracking-[0.3em] text-[#731515] flex items-center gap-1.5">
                  <Phone size={10} />
                  {t('fieldPhone')}
                </label>
                <input
                  type="tel"
                  autoComplete="tel"
                  value={form.phone}
                  onChange={set('phone')}
                  placeholder="+39 333 000 0000"
                  className={INPUT_CLS}
                  style={{ fontFamily: 'var(--font-nunito)', fontSize: '16px' }}
                />
              </div>
            </div>

            {error && (
              <motion.p
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-xs text-[#731515] bg-[#731515]/8 border border-[#731515]/20 px-4 py-3 rounded-lg"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                {error}
              </motion.p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="mt-1 w-full sm:w-auto sm:self-start inline-flex items-center justify-center gap-2 px-8 py-3.5 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#9b2323] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300 rounded-lg"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {loading ? (
                <>
                  <Loader2 size={13} className="animate-spin" />
                  {t('submittingRegistration')}
                </>
              ) : t('submitRegistration')}
            </button>

            <p
              className="text-[11px] text-[#7a4a4a]/50"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('registrationNote')}
            </p>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
