'use client';

import { useState } from 'react';
import MemberCRM from '@/components/MemberCRM';
import CrmClienti from '@/components/CrmClienti';
import CrmSponsors from '@/components/CrmSponsors';
import CrmWine from '@/components/CrmWine';
import CrmBordeaux from '@/components/CrmBordeaux';
import CrmInfluencer from '@/components/CrmInfluencer';

type CrmTab = 'membri' | 'clienti' | 'sponsors' | 'vino' | 'bordeaux' | 'influencer';

const TABS: { id: CrmTab; label: string }[] = [
  { id: 'membri',     label: 'Membri'          },
  { id: 'clienti',   label: 'Clienti'         },
  { id: 'sponsors',  label: 'Sponsors'        },
  { id: 'vino',      label: 'Contatti Vino'   },
  { id: 'bordeaux',  label: 'Produttori BDX'  },
  { id: 'influencer', label: 'Influencer'     },
];

const TAB_SUBTITLES: Record<CrmTab, string> = {
  membri:     'Lista membri e invio comunicazioni.',
  clienti:    'Banca dati automatica dei clienti che hanno acquistato biglietti — invio email e storico eventi.',
  sponsors:   'Gestione degli sponsor del club — contatti, siti web e note.',
  vino:       'Contatti del settore vitivinicolo — produttori, hospitality, industry.',
  bordeaux:   'Châteaux e produttori di Bordeaux — richieste visita e follow-up.',
  influencer: 'Creator e influencer — Instagram, TikTok e collaborazioni.',
};

export default function CrmHub() {
  const [activeTab, setActiveTab] = useState<CrmTab>('membri');

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="mb-2">
        <h1
          className="text-[clamp(1.6rem,2.5vw,2.2rem)] font-light text-[#1a0505] leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          CRM
        </h1>
        <p
          className="mt-2 text-sm text-[#7a4a4a]/70 font-light"
          style={{ fontFamily: 'var(--font-nunito)' }}
        >
          {TAB_SUBTITLES[activeTab]}
        </p>
        <div className="mt-5 h-px w-16 bg-[#e8d5d5]" />
      </div>

      {/* Tab bar */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="flex gap-1 min-w-max">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-[11px] tracking-[0.2em] whitespace-nowrap transition-all duration-150 ${
                activeTab === tab.id
                  ? 'bg-[#731515] text-white shadow-sm'
                  : 'bg-white border border-[#e8d5d5] text-[#7a4a4a] hover:border-[#731515]/40 hover:text-[#731515]'
              }`}
              style={{ fontFamily: 'var(--font-nunito)' }}
            >
              {tab.label}
              {tab.id === 'influencer' && (
                <span className={`ml-1.5 text-[8px] px-1 py-0.5 rounded tracking-[0.1em] ${
                  activeTab === tab.id
                    ? 'bg-white/20 text-white'
                    : 'bg-[#731515]/10 text-[#731515]'
                }`}>
                  NEW
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'membri'     && <MemberCRM />}
        {activeTab === 'clienti'    && <CrmClienti />}
        {activeTab === 'sponsors'   && <CrmSponsors />}
        {activeTab === 'vino'       && <CrmWine />}
        {activeTab === 'bordeaux'   && <CrmBordeaux />}
        {activeTab === 'influencer' && <CrmInfluencer />}
      </div>
    </div>
  );
}
