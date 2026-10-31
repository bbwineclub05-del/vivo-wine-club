'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { ArrowLeft, Check, Eye, EyeOff, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SLOGAN_LINES } from '@/lib/brand';

/**
 * La nuova password.
 *
 * Ci si arriva dal link ricevuto per email, che porta con se' la
 * sessione: senza quella non si puo' cambiare niente, e la pagina lo
 * dice invece di mostrare un modulo che fallirebbe al salvataggio.
 *
 * Il link puo' arrivare in due forme, a seconda di come e'
 * configurato Supabase: un `code` nell'indirizzo, oppure la sessione
 * gia' fatta dopo il cancelletto. Le gestiamo tutte e due, perche'
 * cambiare quella configurazione un giorno non deve rompere il
 * recupero password senza che nessuno se ne accorga.
 */
export default function ResetPasswordPage() {
  const t = useTranslations('reset');
  const router = useRouter();

  const [password, setPassword] = useState('');
  const [conferma, setConferma] = useState('');
  const [mostra, setMostra] = useState(false);
  const [errore, setErrore] = useState('');
  const [fatto, setFatto] = useState(false);
  const [attesa, setAttesa] = useState(false);
  const [pronto, setPronto] = useState(false);

  useEffect(() => {
    async function apriSessione() {
      const params = new URLSearchParams(window.location.search);
      const code = params.get('code');

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) setErrore(t('expired'));
        else setPronto(true);
        return;
      }

      const hash = new URLSearchParams(window.location.hash.slice(1));
      const access = hash.get('access_token');
      const refresh = hash.get('refresh_token');

      if (access && refresh) {
        const { error } = await supabase.auth.setSession({
          access_token: access,
          refresh_token: refresh,
        });
        if (error) setErrore(t('expired'));
        else setPronto(true);
        return;
      }

      // Nessuna delle due: magari la sessione c'e' gia', perche' il
      // client l'ha presa dall'indirizzo prima che arrivassimo qui.
      const { data } = await supabase.auth.getSession();
      if (data.session) setPronto(true);
      else setErrore(t('noToken'));
    }

    apriSessione();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function salva(e: React.FormEvent) {
    e.preventDefault();
    setErrore('');

    if (password !== conferma) {
      setErrore(t('mismatch'));
      return;
    }
    if (password.length < 8) {
      setErrore(t('tooShort'));
      return;
    }

    setAttesa(true);
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setErrore(error.message || t('failed'));
      setAttesa(false);
      return;
    }
    setFatto(true);
    setTimeout(() => router.push('/members'), 1800);
  }

  const campo =
    'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body text-on-paper ' +
    'placeholder:text-on-paper-muted/50 transition-colors focus:border-accent/50 focus:outline-none [font-size:16px]';

  return (
    <div className="ds min-h-[100dvh] bg-paper text-on-paper lg:grid lg:grid-cols-2">
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

      <section className="flex flex-col px-gutter py-10 md:px-10 lg:min-h-[100dvh] lg:justify-center lg:py-20">
        <Link
          href="/login"
          className="inline-flex items-center gap-2 self-start text-fine text-on-paper-muted transition-colors hover:text-accent"
        >
          <ArrowLeft size={15} strokeWidth={1.9} />
          {t('back')}
        </Link>

        <div className="mt-10 w-full max-w-[26rem] lg:mt-12">
          {fatto ? (
            <>
              <span className="grid h-14 w-14 place-items-center rounded-full bg-accent text-paper">
                <Check size={26} strokeWidth={2.2} />
              </span>
              <h2 className="ds-display mt-6 text-title">{t('doneTitle')}</h2>
              <p className="mt-3 text-body text-on-paper-muted">{t('doneBody')}</p>
            </>
          ) : (
            <>
              <h2 className="ds-display text-title">{t('title')}</h2>
              <p className="mt-3 text-body text-on-paper-muted">{t('subtitle')}</p>

              {!pronto && errore ? (
                <div className="mt-8">
                  <p className="rounded-2xl border border-accent/35 bg-accent/5 px-4 py-3 text-fine text-accent">
                    {errore}
                  </p>
                  <Link
                    href="/login"
                    className="mt-5 inline-flex min-h-[52px] items-center justify-center rounded-full bg-accent px-6 text-fine font-medium text-paper"
                  >
                    {t('askAgain')}
                  </Link>
                </div>
              ) : (
                <form onSubmit={salva} className="mt-8 flex flex-col gap-4">
                  <label className="block">
                    <span className="mb-2 block text-fine font-medium">{t('newPassword')}</span>
                    <span className="relative block">
                      <input
                        type={mostra ? 'text' : 'password'}
                        required
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`${campo} pr-12`}
                      />
                      <button
                        type="button"
                        onClick={() => setMostra((v) => !v)}
                        aria-label={mostra ? t('hide') : t('show')}
                        className="absolute right-2 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full text-on-paper-muted transition-colors hover:text-accent"
                      >
                        {mostra ? <EyeOff size={17} strokeWidth={1.8} /> : <Eye size={17} strokeWidth={1.8} />}
                      </button>
                    </span>
                    <span className="mt-2 block text-fine text-on-paper-muted">{t('rule')}</span>
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-fine font-medium">{t('repeat')}</span>
                    <input
                      type={mostra ? 'text' : 'password'}
                      required
                      autoComplete="new-password"
                      value={conferma}
                      onChange={(e) => setConferma(e.target.value)}
                      placeholder="••••••••"
                      className={campo}
                    />
                  </label>

                  {errore && (
                    <p role="alert" className="rounded-2xl border border-accent/35 bg-accent/5 px-4 py-3 text-fine text-accent">
                      {errore}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={attesa || !pronto}
                    className="mt-1 inline-flex min-h-[52px] items-center justify-center gap-2 rounded-full bg-accent px-6 text-fine font-medium text-paper transition-colors hover:bg-accent-lift disabled:opacity-55"
                  >
                    {attesa && <Loader2 size={16} className="animate-spin" />}
                    {attesa ? t('saving') : t('save')}
                  </button>
                </form>
              )}
            </>
          )}
        </div>
      </section>
    </div>
  );
}
