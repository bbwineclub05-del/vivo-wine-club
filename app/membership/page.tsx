'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BackButton from '@/components/BackButton';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { useTranslations } from 'next-intl';

const INPUT_CLASS =
  'w-full bg-white border border-[#e8d5d5] px-4 py-3 text-sm text-[#1a0505] placeholder-[#b09090] focus:outline-none focus:border-[#731515] transition-colors duration-200 rounded-lg';
const LABEL_CLASS =
  'block text-[10px] tracking-[0.35em] text-[#7a4a4a] mb-2';

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

// Max date = 18 years ago, min date = 100 years ago
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


export default function MembershipPage() {
  const t = useTranslations('membership');
  const [form, setForm] = useState<FormState>(INITIAL);
  const [confirmEmail, setConfirmEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const emailsMatch = form.email.length > 0 && form.email === confirmEmail;

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!emailsMatch) return;
    setLoading(true);
    await fetch('/api/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name:          form.fullName,
        email:         form.email,
        phone:         form.phone,
        city:          form.city,
        date_of_birth: form.dateOfBirth,
        source:        form.source,
        experience:    form.experience,
        motivation:    form.motivation,
      }),
    });
    setLoading(false);
    setSubmitted(true);
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">

        {/* ── HERO IMAGE ── */}
        <div className="relative w-full h-[200px] sm:h-[280px] md:h-[350px]">
          <Image
            src="/vigna.jpg"
            alt="Apply for Membership — Vivo Wine Club"
            fill
            className="object-cover"
            priority
            sizes="100vw"
          />
          {/* Bordeaux overlay */}
          <div className="absolute inset-0 bg-[#731515]/60" />
          {/* Centered text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
            <div className="text-[10px] tracking-[0.5em] text-white/70 mb-4">{t('vivoLabel')}</div>
            <h1
              className="text-[clamp(2rem,5vw,4rem)] font-light text-white leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              {t('heading')}
            </h1>
            <p
              className="mt-4 text-sm md:text-base text-white/75 font-light italic max-w-lg leading-relaxed"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {t('subtitle')}
            </p>
          </div>
          {/* Back link — top left */}
          <div className="absolute top-6 left-6 md:left-10 z-10">
            <BackButton className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-white/70 hover:text-white transition-colors duration-300" />
          </div>
        </div>

        {/* ── FORM / CONFIRMATION ── */}
        <section className="relative overflow-hidden pb-32">
          <div className="fog-left" style={{ top: '10%' }} />
          <div className="fog-right" style={{ top: '40%' }} />

          <div className="max-w-2xl mx-auto px-6 lg:px-10">
            <div className="w-full h-px bg-gradient-to-r from-[#731515]/30 via-[#731515]/10 to-transparent mb-14" />

            {submitted ? (
              /* ── Confirmation ── */
              <div className="glass-card p-10 md:p-14 flex flex-col items-center text-center gap-6">
                <CheckCircle size={48} className="text-[#731515]" strokeWidth={1.2} />
                <div>
                  <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">{t('applicationReceived')}</div>
                  <h2
                    className="text-3xl md:text-4xl font-light text-[#1a0505] mb-4"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    {t('thankYouHeading', { name: form.fullName.split(' ')[0] })}
                  </h2>
                  <p
                    className="text-[#7a4a4a] leading-relaxed max-w-sm mx-auto"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {t('thankYouBody')}
                  </p>
                </div>
                <Link
                  href="/"
                  className="mt-2 inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
                >
                  <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
                  {t('backToHome')}
                </Link>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleSubmit} className="glass-card p-8 md:p-12 flex flex-col gap-7">

                {/* Full Name */}
                <div>
                  <label className={LABEL_CLASS}>{t('labelFullName')}</label>
                  <input
                    type="text"
                    required
                    placeholder={t('placeholderFullName')}
                    value={form.fullName}
                    onChange={set('fullName')}
                    className={INPUT_CLASS}
                  />
                </div>

                {/* Email + Confirm Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={LABEL_CLASS}>{t('labelEmail')}</label>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={set('email')}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>{t('labelConfirmEmail')}</label>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      autoComplete="off"
                      value={confirmEmail}
                      onChange={e => setConfirmEmail(e.target.value)}
                      className={`${INPUT_CLASS} ${confirmEmail.length > 0 && form.email !== confirmEmail ? 'border-[#731515]' : ''}`}
                    />
                    {confirmEmail.length > 0 && form.email !== confirmEmail && (
                      <p className="mt-1.5 text-[10px] text-[#731515]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        {t('emailMismatch')}
                      </p>
                    )}
                  </div>
                </div>

                {/* Row: Phone + City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={LABEL_CLASS}>{t('labelPhone')}</label>
                    <input
                      type="tel"
                      placeholder="+39 000 000 0000"
                      value={form.phone}
                      onChange={set('phone')}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>{t('labelCity')}</label>
                    <input
                      type="text"
                      required
                      placeholder={t('placeholderCity')}
                      value={form.city}
                      onChange={set('city')}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {/* Row: Date of Birth + How did you hear */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={LABEL_CLASS}>{t('labelDob')}</label>
                    <input
                      type="date"
                      required
                      min={minDobDate()}
                      max={maxDobDate()}
                      value={form.dateOfBirth}
                      onChange={set('dateOfBirth')}
                      className={`${INPUT_CLASS} [color-scheme:light]`}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>{t('labelSource')}</label>
                    <select
                      required
                      value={form.source}
                      onChange={set('source')}
                      className={`${INPUT_CLASS} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23731515' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_1rem_center] pr-10`}
                    >
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

                {/* Wine experience */}
                <div>
                  <label className={LABEL_CLASS}>{t('labelExperience')}</label>
                  <select
                    required
                    value={form.experience}
                    onChange={set('experience')}
                    className={`${INPUT_CLASS} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23731515' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_1rem_center] pr-10`}
                  >
                    <option value="" disabled>{t('selectLevel')}</option>
                    <option value="Beginner">{t('expBeginner')}</option>
                    <option value="Intermediate">{t('expIntermediate')}</option>
                    <option value="Advanced">{t('expAdvanced')}</option>
                    <option value="Sommelier">{t('expSommelier')}</option>
                  </select>
                </div>

                {/* Motivation */}
                <div>
                  <label className={LABEL_CLASS}>{t('labelMotivation')}</label>
                  <textarea
                    required
                    rows={4}
                    placeholder={t('placeholderMotivation')}
                    value={form.motivation}
                    onChange={set('motivation')}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading || !emailsMatch}
                  className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300 rounded-lg"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {loading ? t('sending') : t('sendApplication')}
                </button>

                <p
                  className="text-center text-[10px] tracking-[0.2em] text-[#7a4a4a]/60"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {t('reviewNote')}
                </p>
              </form>
            )}
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
