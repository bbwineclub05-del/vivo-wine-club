'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Calendar, CreditCard, User, LogOut, ArrowRight, Wine, KeyRound } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

const PLACEHOLDER_EVENTS = [
  { title: 'Wine Lounge — Milan',   date: 'May 10, 2026',  location: 'Milan, Italy'   },
  { title: 'Wine Party Vol. 3',     date: 'Jun 7, 2026',   location: 'Turin, Italy'   },
  { title: 'Winery Visit — Barolo', date: 'Jul 19, 2026',  location: 'Barolo, Italy'  },
];

export default function MembersPage() {
  const { user, logout } = useAuth();
  const router = useRouter();

  const [newPassword, setNewPassword]     = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwStatus, setPwStatus]           = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [pwError, setPwError]             = useState('');

  async function handlePasswordUpdate(e: React.FormEvent) {
    e.preventDefault();
    setPwError('');
    if (newPassword !== confirmPassword) {
      setPwError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setPwError('Password must be at least 6 characters.');
      return;
    }
    setPwStatus('loading');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      setPwError(error.message);
      setPwStatus('error');
    } else {
      setPwStatus('success');
      setNewPassword('');
      setConfirmPassword('');
    }
  }

  // Guard: redirect to login if not authenticated
  useEffect(() => {
    if (user === null) {
      // Give Supabase time to restore the session before redirecting
      const t = setTimeout(() => router.replace('/login'), 500);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  // Show nothing until hydration resolves
  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16 bg-[#fdf6f6]">

        {/* ── HERO STRIP ── */}
        <section className="relative overflow-hidden py-16 md:py-20 bg-white border-b border-[#e8d5d5]">
          <div className="fog-center" />
          <div className="max-w-5xl mx-auto px-6 lg:px-10 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-6"
            >
              <div>
                <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">MEMBERS AREA</div>
                <h1
                  className="text-[clamp(2rem,6vw,4rem)] font-light text-[#1a0505] leading-none"
                  style={{ fontFamily: 'var(--font-syne)' }}
                >
                  {user.name ? (
                    <>Ciao,<br /><span className="text-[#731515]">{user.name}!</span></>
                  ) : (
                    <>Ciao!</>
                  )}
                </h1>
                <p
                  className="mt-4 text-sm text-[#7a4a4a] font-light italic"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {user.email}
                </p>
              </div>

              <button
                onClick={handleLogout}
                className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 border border-[#e8d5d5] hover:border-[#731515]/30 px-5 py-3 self-start sm:self-auto"
              >
                <LogOut size={12} />
                LOG OUT
              </button>
            </motion.div>
          </div>
        </section>

        {/* ── DASHBOARD GRID ── */}
        <section className="py-16 md:py-20">
          <div className="max-w-5xl mx-auto px-6 lg:px-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

              {/* MY EVENTS */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="md:col-span-2 bg-white border border-[#e8d5d5] p-8"
              >
                <div className="flex items-center justify-between mb-7">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-[#731515]/8 flex items-center justify-center">
                      <Calendar size={15} className="text-[#731515]" />
                    </div>
                    <h2
                      className="text-[10px] tracking-[0.4em] text-[#1a0505]"
                    >
                      MY EVENTS
                    </h2>
                  </div>
                  <Link
                    href="/events"
                    className="text-[9px] tracking-[0.25em] text-[#731515] hover:text-[#aa4848] transition-colors flex items-center gap-1 group"
                  >
                    SEE ALL
                    <ArrowRight size={10} className="group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>

                <div className="flex flex-col divide-y divide-[#e8d5d5]">
                  {PLACEHOLDER_EVENTS.map((ev) => (
                    <div key={ev.title} className="py-4 flex items-center justify-between gap-4">
                      <div>
                        <div
                          className="text-sm font-medium text-[#1a0505]"
                          style={{ fontFamily: 'var(--font-syne)' }}
                        >
                          {ev.title}
                        </div>
                        <div
                          className="text-xs text-[#7a4a4a]/70 mt-0.5"
                          style={{ fontFamily: 'var(--font-nunito)' }}
                        >
                          {ev.date} · {ev.location}
                        </div>
                      </div>
                      <span className="shrink-0 text-[9px] tracking-[0.2em] px-3 py-1 border border-[#731515]/20 text-[#731515]">
                        REGISTERED
                      </span>
                    </div>
                  ))}
                </div>

                <p
                  className="mt-5 text-xs text-[#7a4a4a]/50 italic"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  * Event registration will be available when the platform launches.
                </p>
              </motion.div>

              {/* MY MEMBERSHIP */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
                className="bg-white border border-[#e8d5d5] p-8 flex flex-col"
              >
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-8 h-8 bg-[#731515]/8 flex items-center justify-center">
                    <CreditCard size={15} className="text-[#731515]" />
                  </div>
                  <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">
                    MY MEMBERSHIP
                  </h2>
                </div>

                <div className="flex-1 flex flex-col gap-4">
                  <div className="bg-gradient-to-br from-[#731515] to-[#4a0d0d] p-5 text-white">
                    <div className="text-[9px] tracking-[0.3em] text-white/60 mb-2">TIER</div>
                    <div
                      className="text-xl font-light"
                      style={{ fontFamily: 'var(--font-syne)' }}
                    >
                      Founder
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      <Wine size={12} className="text-white/50" />
                      <span className="text-[10px] text-white/60 tracking-wider">CO-FOUNDER</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    {[
                      'Full access to all events',
                      'Exclusive winery visits',
                      'Members-only experiences',
                      'Vivo merch access',
                      'Priority everything',
                    ].map((benefit) => (
                      <div key={benefit} className="flex items-center gap-2.5 text-xs text-[#7a4a4a]" style={{ fontFamily: 'var(--font-nunito)' }}>
                        <span className="w-1 h-1 rounded-full bg-[#731515] shrink-0" />
                        {benefit}
                      </div>
                    ))}
                  </div>
                </div>

                <p
                  className="mt-6 text-xs text-[#7a4a4a]/50 italic"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  * Full membership management coming soon.
                </p>
              </motion.div>

              {/* MY PROFILE */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.26, ease: [0.16, 1, 0.3, 1] }}
                className="md:col-span-2 lg:col-span-3 bg-white border border-[#e8d5d5] p-8"
              >
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-8 h-8 bg-[#731515]/8 flex items-center justify-center">
                    <User size={15} className="text-[#731515]" />
                  </div>
                  <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">
                    MY PROFILE
                  </h2>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { label: 'FULL NAME',   value: user.name,  placeholder: true },
                    { label: 'EMAIL',       value: user.email, placeholder: false },
                    { label: 'MEMBER SINCE', value: '2026',    placeholder: true },
                  ].map(({ label, value, placeholder }) => (
                    <div key={label}>
                      <div className="text-[9px] tracking-[0.35em] text-[#731515] mb-2">{label}</div>
                      <div
                        className={`text-sm ${placeholder ? 'text-[#7a4a4a]/50 italic' : 'text-[#1a0505]'}`}
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      >
                        {value}
                      </div>
                    </div>
                  ))}
                </div>

                <p
                  className="mt-7 text-xs text-[#7a4a4a]/50 italic"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  * Profile editing will be available when the platform launches.
                </p>
              </motion.div>

              {/* CHANGE PASSWORD */}
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.34, ease: [0.16, 1, 0.3, 1] }}
                className="md:col-span-2 lg:col-span-3 bg-white border border-[#e8d5d5] p-8"
              >
                <div className="flex items-center gap-3 mb-7">
                  <div className="w-8 h-8 bg-[#731515]/8 flex items-center justify-center">
                    <KeyRound size={15} className="text-[#731515]" />
                  </div>
                  <h2 className="text-[10px] tracking-[0.4em] text-[#1a0505]">
                    CHANGE PASSWORD
                  </h2>
                </div>

                {pwStatus === 'success' ? (
                  <motion.p
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="text-sm text-[#2d6e2d] bg-[#2d6e2d]/8 border border-[#2d6e2d]/20 px-4 py-3 max-w-md"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Password updated successfully.
                  </motion.p>
                ) : (
                  <form onSubmit={handlePasswordUpdate} className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
                    <div>
                      <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">
                        NEW PASSWORD
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={newPassword}
                        onChange={(e) => { setNewPassword(e.target.value); setPwStatus('idle'); }}
                        className="w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-4 py-3 text-sm placeholder:text-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] tracking-[0.35em] text-[#731515] mb-2">
                        CONFIRM PASSWORD
                      </label>
                      <input
                        type="password"
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => { setConfirmPassword(e.target.value); setPwStatus('idle'); }}
                        className="w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-4 py-3 text-sm placeholder:text-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      {pwError && (
                        <p
                          className="text-xs text-[#731515]"
                          style={{ fontFamily: 'var(--font-nunito)' }}
                        >
                          {pwError}
                        </p>
                      )}
                      <button
                        type="submit"
                        disabled={pwStatus === 'loading'}
                        className="w-full py-3 bg-[#731515] text-white text-[10px] tracking-[0.3em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300"
                      >
                        {pwStatus === 'loading' ? 'UPDATING…' : 'UPDATE PASSWORD'}
                      </button>
                    </div>
                  </form>
                )}
              </motion.div>

            </div>
          </div>
        </section>

      </main>
      <Footer />
    </>
  );
}
