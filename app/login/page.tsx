'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/lib/auth';

export default function LoginPage() {
  const { user, login } = useAuth();
  const router = useRouter();

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw]     = useState(false);
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  // Redirect if already logged in
  useEffect(() => {
    if (user) router.replace('/members');
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    // Simulate a brief network delay
    await new Promise((r) => setTimeout(r, 600));
    const ok = login(email, password);
    if (ok) {
      router.push('/members');
    } else {
      setError('Incorrect email or password. Please try again.');
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#fdf6f6] flex flex-col">

      {/* Top bar */}
      <div className="px-8 pt-8">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-[10px] tracking-[0.3em] text-[#7a4a4a] hover:text-[#731515] transition-colors duration-300 group"
        >
          <ArrowLeft size={13} className="group-hover:-translate-x-0.5 transition-transform duration-300" />
          BACK TO SITE
        </Link>
      </div>

      {/* Centered card */}
      <div className="flex-1 flex items-center justify-center px-6 py-16">
        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md"
        >
          {/* Logo */}
          <div className="flex justify-center mb-10">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Vivo Wine Club" className="h-20 w-auto object-contain" />
          </div>

          {/* Header */}
          <div className="text-center mb-10">
            <div className="text-[10px] tracking-[0.5em] text-[#731515] mb-3">MEMBERS AREA</div>
            <h1
              className="text-3xl font-light text-[#1a0505] mb-3 leading-tight"
              style={{ fontFamily: 'var(--font-syne)' }}
            >
              Welcome back.
            </h1>
            <p
              className="text-sm text-[#7a4a4a] font-light italic"
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              Access your exclusive benefits and upcoming events.
            </p>
          </div>

          {/* Card */}
          <div className="bg-white border border-[#e8d5d5] p-8 shadow-sm">

            <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              {/* Email */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="email"
                  className="text-[10px] tracking-[0.3em] text-[#731515]"
                >
                  EMAIL
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-4 py-3 text-sm placeholder:text-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                />
              </div>

              {/* Password */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-[10px] tracking-[0.3em] text-[#731515]"
                >
                  PASSWORD
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPw ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-[#fdf6f6] border border-[#e8d5d5] text-[#1a0505] px-4 py-3 pr-11 text-sm placeholder:text-[#7a4a4a]/40 focus:outline-none focus:border-[#731515]/50 transition-colors duration-200"
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

              {/* Error */}
              {error && (
                <motion.p
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-xs text-[#731515] bg-[#731515]/8 border border-[#731515]/20 px-4 py-3"
                  style={{ fontFamily: 'var(--font-nunito)' }}
                >
                  {error}
                </motion.p>
              )}

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-4 bg-[#731515] text-white text-[11px] tracking-[0.35em] hover:bg-[#aa4848] disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-300 mt-1"
              >
                {loading ? 'SIGNING IN…' : 'SIGN IN'}
              </button>

            </form>

            {/* Forgot password */}
            <div className="mt-5 text-center">
              <button
                type="button"
                onClick={() => alert('Please contact us at info@vivowineclub.it to reset your password.')}
                className="text-xs text-[#7a4a4a]/60 hover:text-[#731515] transition-colors duration-200 underline underline-offset-2"
                style={{ fontFamily: 'var(--font-nunito)' }}
              >
                Forgot password?
              </button>
            </div>

          </div>

          {/* Not a member yet */}
          <p
            className="text-center text-xs text-[#7a4a4a]/60 mt-7"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Not a member yet?{' '}
            <Link
              href="/membership"
              className="text-[#731515] hover:underline underline-offset-2 transition-colors"
            >
              Apply for membership
            </Link>
          </p>

        </motion.div>
      </div>

    </div>
  );
}
