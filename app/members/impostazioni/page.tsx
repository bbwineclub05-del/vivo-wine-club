'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/lib/supabase';
import MemberPortal from '@/components/MemberPortal';

function ImpostazioniInner() {
  const { user, logout } = useAuth();
  const router           = useRouter();
  const [token, setToken] = useState('');

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return; }
      setToken(session.access_token);
    });
  }, [router]);

  useEffect(() => {
    if (user === null) {
      const t = setTimeout(() => router.replace('/login'), 500);
      return () => clearTimeout(t);
    }
  }, [user, router]);

  if (!user || !token) return null;

  async function handleLogout() {
    await logout();
    router.push('/');
  }

  return (
    <MemberPortal
      user={{ name: user.name, email: user.email }}
      token={token}
      onLogout={handleLogout}
      initialSection="settings"
    />
  );
}

export default function ImpostazioniPage() {
  return (
    <Suspense>
      <ImpostazioniInner />
    </Suspense>
  );
}
