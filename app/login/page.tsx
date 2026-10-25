'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import { SLOGAN_LINES } from '@/lib/brand';

/**
 * L'ingresso.
 *
 * Prima era una fotografia di un tavolo apparecchiato con sopra un
 * velo bordeaux, e accanto un modulo in inglese con le etichette in
 * maiuscolo spaziato. La fotografia non diceva niente che il sito non
 * dicesse gia' meglio altrove.
 *
 * Adesso la prima cosa che si legge e' lo slogan, grande quanto lo
 * schermo lo consente, con il logo sotto: chi arriva qui sa dove
 * sta, e chi ci torna ogni giorno vede la stessa cosa del sito da
 * cui e' entrato. Il modulo e' tre campi.
 *
 * Sul telefono lo slogan sta sopra e il modulo sotto, uno dietro
 * l'altro; sul desktop a fianco, perche' schermo c'e'.
 */
export default function LoginPage() {
  const t = useTranslations('login');
  const { user, login } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mostraPw, setMostraPw] = useState(false);
  const [errore, setErrore] = useState('');
  const [attesa, setAttesa] = useState(false);
  const [resetMandato, setResetMandato] = useState(false);
  const [resetAttesa, setResetAttesa] = useState(false);

  useEffect(() => {
    if (user) router.replace('/members');
  }, [user, router]);

  async function passwordDimenticata() {
    if (!email) {
      setErrore(t('emailFirst'));
      return;
    }
    setResetAttesa(true);
    await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'https://vivowineclub.com/auth/callback',
    });
    setResetAttesa(false);
    setResetMandato(true);
  }

  async function entra(e: React.FormEvent) {
    e.preventDefault();
    setErrore('');
    setAttesa(true);
    const ok = await login(email, password);
    if (ok) {
      router.push('/members');
      return;
    }
    setErrore(t('wrong'));
    setAttesa(false);
  }

  const campo =
    'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body text-on-paper ' +
    'placeholder:text-on-paper-muted/50 transition-colors focus:border-accent/50 focus:outline-none [font-size:16px]';

  return (
    <div className="ds min-h-[100dvh] bg-paper text-on-paper lg:grid lg:grid-cols-2">
      {/* ── Lo slogan, e sotto il logo ── */}
      <section className="ds-on-ink flex flex-col justify-center bg-ink px-gutter py-14 text-on-ink md:px-10 lg:min-h-[100dvh] lg:py-20">
        <h1 className="ds-display text-[clamp(2.75rem,8.5vw,5.5rem)] leading-[0.95] tracking-[-0.04em]">
          {SLOGAN_LINES.map((riga) => (
            <span key={riga} className="block">
              {riga}
            </span>
          ))}
        </h1>

        <Image
          src="/logobianco.png"
          alt="Vivo Wine Club"
          width={420}
          height={280}
          priority
          className="mt-10 h-auto w-[clamp(11rem,34vw,20rem)]"
        />
      </section>

      {/* ── Il modulo ── */}
      <section className="flex flex-col px-gutter py-10 md:px-10 lg:min-h-[100dvh] lg:justify-center lg:py-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 self-start text-fine text-on-paper-muted transition-colors hover:text-accent"
        >
          <ArrowLeft size={15} strokeWidth={1.9} />
          {t('back')}
        </Link>

        <div className="mt-10 w-full max-w-[26rem] lg:mt-12">
          <h2 className="ds-display text-title">{t('title')}</h2>
          <p className="mt-3 text-body text-on-paper-muted">{t('subtitle')}</p>

          <form onSubmit={entra} className="mt-8 flex flex-col gap-4">
            <label className="block">
              <span className="mb-2 block text-fine font-medium">{t('email')}</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@esempio.com"
                className={campo}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-fine font-medium">{t('password')}</span>
              <span className="relative block">
                <input
                  type={mostraPw ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className={`${campo} pr-12`}
                />
                <button
                  type="button"
                  onClick={() => setMostraPw((v) => !v)}
                  aria-label={mostraPw ? t('hide') : t('show')}
                  className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-on-paper-muted transition-colors hover:text-accent"
                >
                  {mostraPw ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                </button>
              </span>
            </label>

            {errore && (
              <p role="alert" className="rounded-2xl border border-accent/35 bg-accent/5 px-4 py-3 text-fine text-accent">
                {errore}
              </p>
            )}

            <button
              type="submit"
              disabled={attesa}
              className="mt-1 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-accent px-6 text-fine font-medium text-paper transition-colors hover:bg-accent-lift disabled:opacity-55"
            >
              {attesa && <Loader2 size={16} className="animate-spin" />}
              {attesa ? t('entering') : t('enter')}
            </button>

            <div className="text-center">
              {resetMandato ? (
                <p className="text-fine text-on-paper-muted">{t('resetSent')}</p>
              ) : (
                <button
                  type="button"
                  onClick={passwordDimenticata}
                  disabled={resetAttesa}
                  className="min-h-[44px] text-fine text-on-paper-muted underline underline-offset-2 transition-colors hover:text-accent disabled:opacity-50"
                >
                  {resetAttesa ? t('sending') : t('forgot')}
                </button>
              )}
            </div>
          </form>

          <p className="mt-8 text-fine text-on-paper-muted">
            {t('noAccount')}{' '}
            <Link href="/membership" className="text-accent underline underline-offset-2">
              {t('join')}
            </Link>
          </p>
        </div>
      </section>
    </div>
  );
}
