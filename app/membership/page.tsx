'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle } from 'lucide-react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const INPUT_CLASS =
  'w-full bg-white border border-[#e8d5d5] px-4 py-3 text-sm text-[#1a0505] placeholder-[#b09090] focus:outline-none focus:border-[#731515] transition-colors duration-200';
const LABEL_CLASS =
  'block text-[10px] tracking-[0.35em] text-[#7a4a4a] mb-2';

interface FormState {
  fullName: string;
  email: string;
  phone: string;
  city: string;
  age: string;
  source: string;
  motivation: string;
  experience: string;
}

const INITIAL: FormState = {
  fullName: '',
  email: '',
  phone: '',
  city: '',
  age: '',
  source: '',
  motivation: '',
  experience: '',
};

export default function MembershipPage() {
  const [form, setForm] = useState<FormState>(INITIAL);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  function set(field: keyof FormState) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(prev => ({ ...prev, [field]: e.target.value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // Simulate async submission
    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 900);
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-[115px]">

        {/* ── HERO ── */}
        <section className="relative overflow-hidden py-20 md:py-28">
          <div className="fog-center" />
          <div className="max-w-2xl mx-auto px-6 lg:px-10">

            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 mb-10 group"
            >
              <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
              BACK
            </Link>

            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-4">VIVO WINE CLUB</div>
            <h1
              className="text-[clamp(2.6rem,7vw,5rem)] font-light text-[#1a0505] leading-none section-title mb-5"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Apply for Membership
            </h1>
            <p
              className="text-base md:text-lg text-[#7a4a4a] font-light italic leading-relaxed"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Join a community of young wine lovers. Limited spots available.
            </p>
          </div>
        </section>

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
                  <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">APPLICATION RECEIVED</div>
                  <h2
                    className="text-3xl md:text-4xl font-light text-[#1a0505] mb-4"
                    style={{ fontFamily: 'var(--font-syne)' }}
                  >
                    Thank you, {form.fullName.split(' ')[0]}!
                  </h2>
                  <p
                    className="text-[#7a4a4a] leading-relaxed max-w-sm mx-auto"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    We&apos;ve received your application and will be in touch shortly.
                    We review every submission personally — stay close.
                  </p>
                </div>
                <Link
                  href="/"
                  className="mt-2 inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
                >
                  <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
                  BACK TO HOME
                </Link>
              </div>
            ) : (
              /* ── Form ── */
              <form onSubmit={handleSubmit} className="glass-card p-8 md:p-12 flex flex-col gap-7">

                {/* Row: Full Name + Email */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={LABEL_CLASS}>FULL NAME *</label>
                    <input
                      type="text"
                      required
                      placeholder="Your full name"
                      value={form.fullName}
                      onChange={set('fullName')}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>EMAIL *</label>
                    <input
                      type="email"
                      required
                      placeholder="your@email.com"
                      value={form.email}
                      onChange={set('email')}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {/* Row: Phone + City */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={LABEL_CLASS}>PHONE NUMBER</label>
                    <input
                      type="tel"
                      placeholder="+39 000 000 0000"
                      value={form.phone}
                      onChange={set('phone')}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>CITY OF RESIDENCE *</label>
                    <input
                      type="text"
                      required
                      placeholder="Milan, Paris, London…"
                      value={form.city}
                      onChange={set('city')}
                      className={INPUT_CLASS}
                    />
                  </div>
                </div>

                {/* Row: Age + How did you hear */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div>
                    <label className={LABEL_CLASS}>AGE *</label>
                    <input
                      type="number"
                      required
                      min={18}
                      max={99}
                      placeholder="e.g. 24"
                      value={form.age}
                      onChange={set('age')}
                      className={INPUT_CLASS}
                    />
                  </div>
                  <div>
                    <label className={LABEL_CLASS}>HOW DID YOU HEAR ABOUT US? *</label>
                    <select
                      required
                      value={form.source}
                      onChange={set('source')}
                      className={`${INPUT_CLASS} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23731515' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_1rem_center] pr-10`}
                    >
                      <option value="" disabled>Select an option</option>
                      <option value="Instagram">Instagram</option>
                      <option value="LinkedIn">LinkedIn</option>
                      <option value="TikTok">TikTok</option>
                      <option value="Friend">Friend</option>
                      <option value="Event">Event</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                {/* Wine experience */}
                <div>
                  <label className={LABEL_CLASS}>WINE EXPERIENCE *</label>
                  <select
                    required
                    value={form.experience}
                    onChange={set('experience')}
                    className={`${INPUT_CLASS} appearance-none bg-[url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23731515' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")] bg-no-repeat bg-[right_1rem_center] pr-10`}
                  >
                    <option value="" disabled>Select your level</option>
                    <option value="Beginner">Beginner — I&apos;m just starting to explore wine</option>
                    <option value="Intermediate">Intermediate — I know my way around a wine list</option>
                    <option value="Advanced">Advanced — I can identify regions, grapes and vintages</option>
                    <option value="Sommelier">Sommelier — professionally trained</option>
                  </select>
                </div>

                {/* Motivation */}
                <div>
                  <label className={LABEL_CLASS}>WHY DO YOU WANT TO JOIN VIVO WINE CLUB? *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Tell us about yourself and what draws you to the club…"
                    value={form.motivation}
                    onChange={set('motivation')}
                    className={`${INPUT_CLASS} resize-none`}
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {loading ? 'SENDING…' : 'SEND APPLICATION'}
                </button>

                <p
                  className="text-center text-[10px] tracking-[0.2em] text-[#7a4a4a]/60"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  We review every application personally. You&apos;ll hear from us within a few days.
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
