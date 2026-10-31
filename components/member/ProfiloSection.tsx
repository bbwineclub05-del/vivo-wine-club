'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Camera, Loader2, LogOut } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Head, Panel } from '@/components/member/MemberShell';
import { resizeImage } from '@/lib/image-resize';

/**
 * I tuoi dati, e nient'altro.
 *
 * Prima erano due voci separate — profilo e impostazioni — con dentro
 * gli stessi tre campi e un cambio password. Sono la stessa cosa.
 */

export default function ProfiloSection({
  token, user, onLogout,
}: {
  token: string;
  user: { name?: string | null; email?: string | null };
  onLogout: () => void;
}) {
  const t = useTranslations('member');
  const [avatar, setAvatar] = useState<string | null>(null);
  const [nome, setNome] = useState(user.name ?? '');
  const [telefono, setTelefono] = useState('');
  const [citta, setCitta] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [messaggio, setMessaggio] = useState('');
  const [errore, setErrore] = useState('');
  const [caricando, setCaricando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [pwd, setPwd] = useState('');
  const [pwd2, setPwd2] = useState('');
  const [pwdMsg, setPwdMsg] = useState('');

  const carica = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/member/profile', { headers: { Authorization: `Bearer ${token}` } });
      const d = await res.json();
      if (d.profile?.avatar_url) setAvatar(d.profile.avatar_url);
      if (d.profile?.phone) setTelefono(d.profile.phone);
      if (d.profile?.city) setCitta(d.profile.city);
      if (d.profile?.full_name) setNome(d.profile.full_name);
    } catch {
      /* i campi restano come sono */
    }
  }, [token]);

  useEffect(() => { carica(); }, [carica]);

  async function salva() {
    setSalvando(true);
    setErrore('');
    setMessaggio('');
    try {
      if (nome.trim() && nome.trim() !== (user.name ?? '')) {
        const { error } = await supabase.auth.updateUser({ data: { full_name: nome.trim() } });
        if (error) throw error;
      }
      const res = await fetch('/api/member/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ full_name: nome.trim(), phone: telefono.trim() || null, city: citta.trim() || null }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Salvataggio fallito.');
      setMessaggio(t('salvato'));
    } catch (e) {
      setErrore(e instanceof Error ? e.message : 'Errore.');
    } finally {
      setSalvando(false);
    }
  }

  async function cambiaFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setCaricando(true);
    setErrore('');
    try {
      const fd = new FormData();
      fd.append('file', await resizeImage(file, { maxSide: 800 }));
      const res = await fetch('/api/member/profile/avatar', {
        method: 'POST', body: fd, headers: { Authorization: `Bearer ${token}` },
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error ?? 'Caricamento fallito.');
      if (d.url) setAvatar(d.url);
    } catch (err) {
      setErrore(err instanceof Error ? err.message : 'Errore.');
    } finally {
      setCaricando(false);
    }
  }

  async function cambiaPassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdMsg('');
    if (pwd.length < 8) { setPwdMsg(t('passwordCorta')); return; }
    if (pwd !== pwd2) { setPwdMsg(t('passwordDiverse')); return; }
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setPwdMsg(error ? error.message : t('passwordAggiornata'));
    if (!error) { setPwd(''); setPwd2(''); }
  }

  const iniziali = (nome || user.email || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const campo =
    'w-full rounded-2xl border border-rule-paper bg-paper px-4 py-3.5 text-body placeholder:text-on-paper-muted/60 focus:border-accent/50 focus:outline-none [font-size:16px]';

  return (
    <>
      <Head title={t('profiloTitolo')} />

      <Panel className="mb-4">
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            {avatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatar} alt="" className="h-16 w-16 rounded-full object-cover" />
            ) : (
              <span className="grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-body font-medium text-accent">
                {iniziali}
              </span>
            )}
            <button
              onClick={() => fileRef.current?.click()}
              disabled={caricando}
              aria-label={t('cambiaFoto')}
              className="absolute -bottom-0.5 -right-0.5 grid h-7 w-7 place-items-center rounded-full bg-accent text-paper"
            >
              {caricando ? <Loader2 size={13} className="animate-spin" /> : <Camera size={13} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={cambiaFoto} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-body font-medium">{nome || t('socio')}</p>
            <p className="truncate text-fine text-on-paper-muted">{user.email}</p>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3">
          <input className={campo} value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t('nomeCognome')} />
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={campo} value={telefono} onChange={(e) => setTelefono(e.target.value)} placeholder={t('telefono')} />
            <input className={campo} value={citta} onChange={(e) => setCitta(e.target.value)} placeholder={t('citta')} />
          </div>
        </div>

        {errore && <p className="mt-3 text-fine font-medium text-accent">{errore}</p>}
        {messaggio && <p className="mt-3 text-fine text-on-paper-muted">{messaggio}</p>}

        <button
          onClick={salva}
          disabled={salvando}
          className="mt-4 inline-flex min-h-[48px] items-center rounded-full bg-accent px-6 text-fine font-medium text-paper disabled:opacity-50"
        >
          {salvando ? t('salvo') : t('salva')}
        </button>
      </Panel>

      <Panel className="mb-4">
        <p className="mb-3 text-body font-medium">{t('password')}</p>
        <form onSubmit={cambiaPassword} className="flex flex-col gap-3">
          <input className={campo} type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder={t('nuovaPassword')} />
          <input className={campo} type="password" value={pwd2} onChange={(e) => setPwd2(e.target.value)} placeholder={t('ripetila')} />
          {pwdMsg && <p className="text-fine text-on-paper-muted">{pwdMsg}</p>}
          <button
            type="submit"
            className="inline-flex min-h-[48px] items-center self-start rounded-full border border-rule-paper px-6 text-fine font-medium"
          >
            {t('aggiorna')}
          </button>
        </form>
      </Panel>

      <button
        onClick={onLogout}
        className="inline-flex min-h-[48px] items-center gap-2 rounded-full border border-rule-paper px-5 text-fine font-medium text-on-paper-muted"
      >
        <LogOut size={16} strokeWidth={1.8} />
        {t('esci')}
      </button>
    </>
  );
}
