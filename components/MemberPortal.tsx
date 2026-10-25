'use client';

import { useState } from 'react';
import DiscountsView from '@/components/DiscountsView';
import { useTranslations } from 'next-intl';
import { Head, MemberShell, type MemberSection } from '@/components/member/MemberShell';
import TesseraSection from '@/components/member/TesseraSection';
import EventiSection from '@/components/member/EventiSection';
import CantineSection from '@/components/member/CantineSection';
import SelectionSection from '@/components/member/SelectionSection';
import MerchPanel from '@/components/member/MerchPanel';
import ProfiloSection from '@/components/member/ProfiloSection';

/**
 * L'area del socio.
 *
 * Era lunga milleduecento righe, in inglese, con sette voci di menù
 * che si somigliavano — "My Events" e "Upcoming Events", "My Profile"
 * e "Settings" — e non diceva da nessuna parte cosa dà la tessera. Chi
 * paga trenta euro ha il diritto di leggere in dieci secondi cosa ha
 * comprato.
 *
 * Cinque posti: la tessera con tutto quello che comprende, gli eventi,
 * le cantine con i contatti, i vantaggi, il profilo. Ogni sezione si
 * monta quando la si apre e poi resta: tornando indietro non si
 * riscarica tutto da capo.
 */

interface Props {
  user: { name?: string | null; email?: string | null };
  token: string;
  onLogout: () => void;
  /** Da dove partire: /members/impostazioni apre direttamente il profilo. */
  initialSection?: MemberSection;
}

function VantaggiHead() {
  const t = useTranslations('member');
  return <Head title={t('vantaggiTitolo')} subtitle={t('vantaggiSottotitolo')} />;
}

export default function MemberPortal({ user, token, onLogout, initialSection = 'tessera' }: Props) {
  const [section, setSection] = useState<MemberSection>(initialSection);
  // Le sezioni già aperte restano montate: il passaggio da una
  // all'altra non rifà le stesse chiamate ogni volta.
  const [viste, setViste] = useState<MemberSection[]>([initialSection]);

  function vai(s: MemberSection) {
    setSection(s);
    setViste((v) => (v.includes(s) ? v : [...v, s]));
  }

  const mostra = (s: MemberSection) => (section === s ? '' : 'hidden');

  return (
    <MemberShell active={section} onNavigate={vai} userName={user.name ?? user.email} onLogout={onLogout}>
      {viste.includes('tessera') && (
        <div className={mostra('tessera')}>
          <TesseraSection token={token} name={user.name ?? ''} />
        </div>
      )}

      {viste.includes('eventi') && (
        <div className={mostra('eventi')}>
          <EventiSection token={token} />
        </div>
      )}

      {viste.includes('cantine') && (
        <div className={mostra('cantine')}>
          <CantineSection />
        </div>
      )}

      {viste.includes('selection') && (
        <div className={mostra('selection')}>
          <SelectionSection token={token} />
        </div>
      )}

      {viste.includes('vantaggi') && (
        <div className={mostra('vantaggi')}>
          <VantaggiHead />
          {/* Il vantaggio che si usa più spesso, in cima. */}
          <div className="mb-5">
            <MerchPanel token={token} />
          </div>
          <DiscountsView token={token} />
        </div>
      )}

      {viste.includes('profilo') && (
        <div className={mostra('profilo')}>
          <ProfiloSection token={token} user={user} onLogout={onLogout} />
        </div>
      )}
    </MemberShell>
  );
}
