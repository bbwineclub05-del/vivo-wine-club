'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft, CheckCircle } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export default function ResetPasswordPage() {
  const router = useRouter();

  const [password, setPassword]               = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPw, setShowPw]                   = useState(false);
  const [showConfirmPw, setShowConfirmPw]     = useState(false);
  const [error, setError]                     = useState('');
  const [success, setSuccess]                 = useState(false);
  const [loading, setLoading]                 = useState(false);
  const [tokenReady, setTokenReady]           = useState(false);

  useEffect(() => {
    async function initSession() {
      // ── Path 1: PKCE flow ──────────────────────────────────────────────
      // Supabase (v2 default) redirects to /auth/callback?code=xxx, which
      // forwards here as /reset-password?code=xxx.
      // exchangeCodeForSession uses the PKCE verifier from localStorage.
      const searchParams = new URLSearchParams(window.location.search);
      const code = searchParams.get('code');

      if (code) {
        const { error: pkceError } = await supabase.auth.exchangeCodeForSession(code);
        if (pkceError) {
          setError('This reset link has expired or is invalid. Please request a new one.');
        } else {
          setTokenReady(true);
        }
        return;
      }

      // ── Path 2: implicit flow fallback ─────────────────────────────────
      // Older Supabase config or manually constructed links may still send
      // #access_token=…&refresh_token=…&type=recovery in the hash.
      const hash       = window.location.hash.substring(1);
      const hashParams = new URLSearchParams(hash);
      const accessToken  = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const type         = hashParams.get('type');

      if (accessToken && refreshToken && type === 'recovery') {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token:  accessToken,
          refresh_token: refreshToken,
        });
        if (sessionError) {
          setError('This reset link has expired or is invalid. Please request a new one.');
        } else {
          setTokenReady(true);
        }
        return;
      }

      // Nothing found.
      setError('No valid reset token found. Please request a new password reset link.');
    }

    initSession();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match. Please try again.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setError(updateError.message || 'Failed to update password. Please try again.');
      setLoading(false);
    } else {
      setSuccess(true);
      setTimeout(() => router.push('/members'), 2000);
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Left column: image ── */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <Image
          src="/tavolo.jpg"
          alt="Vivo Wine Club"
          fill
          className="object-cover"
          priority
          sizes="50vw"
        />
        <div className="absolute inset-0 bg-[#731515]/60" />
        {/* Logo watermark bottom-left */}
        <div className="absolute bottom-10 left-10 z-10">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Vivo Wine Club" className="h-14 w-auto object-contain opacity-80" style={{ imageRendering: '-webkit-optimize-contrast' }} />
        </div>
      </div>

      {/* ── Right column: form ── */}
      <div className="w-full lg:w-1/2 flex flex-col bg-[#fdf6f6]">

        {/* Back link */}
        <div className="px-8 pt-8 shrink-0">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
            BACK TO LOGIN
          </Link>
        </div>

        {/* Centered form */}
        <div className="flex-1 flex items-center justify-center px-8 py-12">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            className="w-full max-w-sm"
          >
            {/* Logo — mobile only */}
            <div className="flex justify-center mb-10 lg:hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Vivo Wine Club" className="h-16 w-auto object-contain" style={{ imageRendering: '-webkit-optimize-contrast' }} />
            </div>

            {/* Header */}
            <div className="mb-10">
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">MEMBERS AREA</div>
              <h1
                className="text-3xl font-light text-[#1a0505] mb-2 leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Reset your password.
              </h1>
              <p
                className="text-sm text-[#7a4a4a] font-light italic"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Choose a new password for your account.
              </p>
            </div>

            <AnimatePresence mode="wait">
              {success ? (
                /* ── Success state ── */
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                  className="flex flex-col items-center gap-4 py-6 text-center"
                >
                  <CheckCircle size={40} className="text-[#731515]" strokeWidth={1.25} />
                  <p
                    className="text-sm text-[#1a0505]"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Password updated successfully.
                  </p>
                  <p
                    className="text-xs text-[#7a4a4a]/70"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Redirecting you to the members area…
                  </p>
                </motion.div>
              ) : (
                /* ── Form ── */
                <motion.form
                  key="form"
                  onSubmit={handleSubmit}
                  className="flex flex-col gap-5"
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="password" className="text-[10px] tracking-[0.3em] text-[#731515]">
                      NEW PASSWORD
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        type={showPw ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={!tokenReady && !error}
                        className="w-full bg-white border border-[#e8d5d5] text-[#1a0505] px-4 py-3 pr-11 text-sm placeholder:text-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPw((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a4a4a]/50 hover:text-[#731515] transition-colors"
                        aria-label={showPw ? 'Hide password' : 'Show password'}
                      >
                        {showPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label htmlFor="confirmPassword" className="text-[10px] tracking-[0.3em] text-[#731515]">
                      CONFIRM PASSWORD
                    </label>
                    <div className="relative">
                      <input
                        id="confirmPassword"
                        type={showConfirmPw ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        disabled={!tokenReady && !error}
                        className="w-full bg-white border border-[#e8d5d5] text-[#1a0505] px-4 py-3 pr-11 text-sm placeholder:text-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg"
                        style={{ fontFamily: 'var(--font-nunito)' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPw((v) => !v)}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#7a4a4a]/50 hover:text-[#731515] transition-colors"
                        aria-label={showConfirmPw ? 'Hide password' : 'Show password'}
                      >
                        {showConfirmPw ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <motion.p
                      initial={{ opacity: 0, y: -6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-xs text-[#731515] bg-[#731515]/8 border border-[#731515]/20 px-4 py-3 rounded-lg"
                      style={{ fontFamily: 'var(--font-nunito)' }}
                    >
                      {error}
                    </motion.p>
                  )}

                  <button
                    type="submit"
                    disabled={loading || (!tokenReady && !error)}
                    className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300 mt-1 rounded-lg"
                  >
                    {loading ? 'UPDATING…' : 'UPDATE PASSWORD'}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
