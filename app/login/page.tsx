'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();

  const [email, setEmail]             = useState('');
  const [password, setPassword]       = useState('');
  const [showPw, setShowPw]           = useState(false);
  const [error, setError]             = useState('');
  const [loading, setLoading]         = useState(false);
  const [resetSent, setResetSent]     = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  useEffect(() => {
    if (user) router.replace('/members');
  }, [user, router]);

  async function handleForgotPassword() {
    if (!email) {
      setError('Enter your email address above, then click "Forgot password?".');
      return;
    }
    setResetLoading(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://vivowineclub.com/auth/callback',
    });
    setResetLoading(false);
    setResetSent(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    const ok = await login(email, password);
    if (ok) {
      router.push('/members');
    } else {
      setError('Incorrect email or password. Please try again.');
      setLoading(false);
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
            href="/"
            className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
          >
            <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
            BACK TO HOMEPAGE
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
            {/* Logo */}
            <div className="flex justify-center mb-6">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo.svg" alt="Vivo Wine Club" className="h-[120px] w-auto object-contain" style={{ imageRendering: '-webkit-optimize-contrast' }} />
            </div>

            {/* Header */}
            <div className="mb-10">
              <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">MEMBERS AREA</div>
              <h1
                className="text-3xl font-light text-[#1a0505] mb-2 leading-tight"
                style={{ fontFamily: 'var(--font-syne)' }}
              >
                Welcome back.
              </h1>
              <p
                className="text-sm text-[#7a4a4a] font-light italic"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Sign in to access exclusive benefits.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-[10px] tracking-[0.3em] text-[#731515]">EMAIL</label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-white border border-[#e8d5d5] text-[#1a0505] px-4 py-3 text-sm placeholder:text-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 rounded-lg"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-[10px] tracking-[0.3em] text-[#731515]">PASSWORD</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-white border border-[#e8d5d5] text-[#1a0505] px-4 py-3 pr-11 text-sm placeholder:text-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200 rounded-lg"
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
                disabled={loading}
                className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300 mt-1 rounded-lg"
              >
                {loading ? 'SIGNING IN…' : 'SIGN IN'}
              </button>

              <div className="text-center">
                {resetSent ? (
                  <p
                    className="text-xs text-[#731515]"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    Reset link sent — check your inbox.
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={resetLoading}
                    className="text-xs text-[#7a4a4a]/60 hover:text-[#731515] transition-colors duration-200 underline underline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: 'var(--font-nunito)' }}
                  >
                    {resetLoading ? 'Sending…' : 'Forgot password?'}
                  </button>
                )}
              </div>
            </form>

            <p
              className="text-center text-xs text-[#7a4a4a]/60 mt-8"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Not a member yet?{' '}
              <Link href="/membership" className="text-[#731515] hover:underline underline-offset-2">
                Apply for membership
              </Link>
            </p>
          </motion.div>
        </div>
      </div>

    </div>
  );
}
