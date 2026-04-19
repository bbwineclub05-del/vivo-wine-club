'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Star, X } from 'lucide-react';
import type { Winery } from './WineriesGlobe';

const WineriesGlobe = dynamic(() => import('./WineriesGlobe'), { ssr: false });

export const WINERIES: Winery[] = [
  {
    id: 1,
    name: 'Gaja',
    region: 'Barolo / Barbaresco',
    country: 'Italia',
    lat: 44.76,
    lng: 8.03,
    description:
      'Cantina leggendaria delle Langhe piemontesi, pioniera del Barbaresco moderno. Angelo Gaja ha rivoluzionato il vino italiano con metodi borgognoni e una visione senza compromessi.',
    visited: '2024',
    highlights: ['Barbaresco DOCG', 'Barolo Sperss', "Ca' Marcanda"],
  },
  {
    id: 2,
    name: 'Marchesi Antinori',
    region: 'Toscana',
    country: 'Italia',
    lat: 43.77,
    lng: 11.25,
    description:
      "Famiglia vitivinicola con 26 generazioni di storia, creatrice del Tignanello e pioniera dei Super Tuscans. La cantina di Bargino è un capolavoro architettonico integrato nella collina.",
    visited: '2024',
    highlights: ['Tignanello', 'Solaia', 'Guado al Tasso'],
  },
  {
    id: 3,
    name: 'Château Margaux',
    region: 'Bordeaux',
    country: 'Francia',
    lat: 45.04,
    lng: -0.67,
    description:
      "Premier Grand Cru Classé di Bordeaux, simbolo dell'eleganza francese per oltre due secoli. Le sue vendemmie più celebri sono tra le bottiglie più ambite dai collezionisti di tutto il mondo.",
    visited: '2023',
    highlights: ['Château Margaux', 'Pavillon Rouge', 'Pavillon Blanc'],
  },
  {
    id: 4,
    name: 'Domaine de la Romanée-Conti',
    region: 'Borgogna',
    country: 'Francia',
    lat: 47.16,
    lng: 4.95,
    description:
      "La cantina più esclusiva e leggendaria del mondo. Produce i vini più costosi e ricercati del pianeta da un fazzoletto di terra burgundiana di soli 1,8 ettari.",
    visited: '2023',
    highlights: ['Romanée-Conti', 'La Tâche', 'Richebourg'],
  },
  {
    id: 5,
    name: 'Vega Sicilia',
    region: 'Ribera del Duero',
    country: 'Spagna',
    lat: 41.67,
    lng: -4.20,
    description:
      "La cantina più prestigiosa di Spagna, con oltre 150 anni di storia. L'Único viene rilasciato solo nelle annate eccellenti dopo anni di affinamento.",
    visited: '2024',
    highlights: ['Único', 'Valbuena', 'Alión'],
  },
  {
    id: 6,
    name: 'Quinta do Vesuvio',
    region: 'Valle del Douro',
    country: 'Portogallo',
    lat: 41.20,
    lng: -7.55,
    description:
      'Uno dei più prestigiosi produttori di Porto Vintage nel cuore selvaggio del Douro. Le terrazze scolpite nella scisto producono grappoli concentrati di straordinaria intensità.',
    visited: '2023',
    highlights: ['Quinta do Vesuvio Vintage Port', 'Pombal do Vesuvio'],
  },
  {
    id: 7,
    name: 'Catena Zapata',
    region: 'Mendoza',
    country: 'Argentina',
    lat: -32.89,
    lng: -68.85,
    description:
      "Pionieri del Malbec d'alta quota in Argentina, tra le cantine più innovative del Nuovo Mondo. I vigneti Adrianna, a 1.500 metri di altitudine, producono vini di livello mondiale.",
    visited: '2024',
    highlights: ['Adrianna Vineyard', 'Nicolás Catena Zapata', 'Adrianna White Bones'],
  },
  {
    id: 8,
    name: 'Opus One',
    region: 'Napa Valley',
    country: 'USA',
    lat: 38.40,
    lng: -122.42,
    description:
      "Frutto della storica collaborazione tra Robert Mondavi e Baron Philippe de Rothschild, Opus One è l'icona californiana per eccellenza, blend di Cabernet Sauvignon e uvaggi bordolesi.",
    visited: '2023',
    highlights: ['Opus One', 'Overture'],
  },
  {
    id: 9,
    name: 'Penfolds',
    region: 'Barossa Valley',
    country: 'Australia',
    lat: -34.53,
    lng: 138.96,
    description:
      "La cantina più iconica d'Australia, produttrice del leggendario Grange Hermitage. Dal 1844, Penfolds definisce lo stile del grande Shiraz australiano.",
    visited: '2024',
    highlights: ['Grange', 'RWT Shiraz', 'Bin 707'],
  },
  {
    id: 10,
    name: 'Klein Constantia',
    region: 'Constantia',
    country: 'Sudafrica',
    lat: -34.02,
    lng: 18.41,
    description:
      'Storica cantina del Sudafrica, rinomata per il Vin de Constance, il vino dolce preferito di Napoleone Bonaparte durante il suo esilio a Sant\'Elena.',
    visited: '2023',
    highlights: ['Vin de Constance', 'Metis', 'KC Sauvignon Blanc'],
  },
  {
    id: 11,
    name: 'Cloudy Bay',
    region: 'Marlborough',
    country: 'Nuova Zelanda',
    lat: -41.50,
    lng: 173.96,
    description:
      "Icona del Sauvignon Blanc neozelandese, fondatrice del profilo aromatico che ha conquistato il mondo. Situata nella regione di Marlborough, nella punta nord dell'isola del Sud.",
    visited: '2024',
    highlights: ['Sauvignon Blanc', 'Te Koko', 'Pelorus'],
  },
  {
    id: 12,
    name: 'Concha y Toro',
    region: 'Valle del Maipo',
    country: 'Cile',
    lat: -33.54,
    lng: -70.65,
    description:
      'La più grande cantina del Cile e produttrice del leggendario Don Melchor, considerato uno dei migliori Cabernet Sauvignon del Nuovo Mondo.',
    visited: '2024',
    highlights: ['Don Melchor', 'Almaviva', 'Carmin de Peumo'],
  },
];

export default function WineriesSection() {
  const [selected, setSelected] = useState<Winery | null>(null);

  return (
    <section id="cantine" className="py-32 bg-[#0a0103] relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[#722F37]/6 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-4">
            {WINERIES.length} CANTINE VISITATE
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#F5EEE6] leading-none section-title"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            CANTINE
          </h2>
          <p
            className="mt-6 text-lg text-[#C4B5A0] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Esplora le cantine più leggendarie del mondo che abbiamo visitato. Clicca su un punto per scoprire la storia
          </p>
        </motion.div>

        {/* Globe + info layout */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
          {/* Globe */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-3 relative"
          >
            <div className="aspect-square max-h-[560px] w-full mx-auto">
              <WineriesGlobe
                wineries={WINERIES}
                onSelect={setSelected}
                selected={selected}
              />
            </div>
            <p className="text-center text-[10px] tracking-[0.3em] text-[#C4B5A0]/50 mt-3">
              TRASCINA · ZOOMA · CLICCA SU UN PUNTO
            </p>
          </motion.div>

          {/* Info panel */}
          <div className="lg:col-span-2 lg:sticky lg:top-28">
            <AnimatePresence mode="wait">
              {selected ? (
                <motion.div
                  key={selected.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                  className="glass-card p-8 relative"
                >
                  <button
                    onClick={() => setSelected(null)}
                    className="absolute top-5 right-5 text-[#C4B5A0] hover:text-[#C9A84C] transition-colors"
                  >
                    <X size={16} />
                  </button>

                  <div className="text-[9px] tracking-[0.4em] text-[#C9A84C] mb-2">
                    {selected.country.toUpperCase()}
                  </div>
                  <h3
                    className="text-2xl font-medium text-[#F5EEE6] mb-1"
                    style={{ fontFamily: 'var(--font-playfair)' }}
                  >
                    {selected.name}
                  </h3>
                  <div className="flex items-center gap-1.5 text-[#C4B5A0] text-xs mb-6">
                    <MapPin size={11} className="text-[#C9A84C]" />
                    <span>{selected.region}</span>
                    <span className="mx-1 text-[#722F37]">·</span>
                    <span className="text-[#C9A84C]">Visitata nel {selected.visited}</span>
                  </div>

                  <div className="w-10 h-px bg-[#C9A84C]/40 mb-6" />

                  <p
                    className="text-[#C4B5A0] text-base leading-relaxed mb-7"
                    style={{ fontFamily: 'var(--font-cormorant)' }}
                  >
                    {selected.description}
                  </p>

                  <div>
                    <div className="text-[9px] tracking-[0.4em] text-[#C9A84C] mb-3">
                      VINI DEGUSTATI
                    </div>
                    <div className="flex flex-col gap-2">
                      {selected.highlights.map((h) => (
                        <div key={h} className="flex items-center gap-2 text-sm text-[#F5EEE6]">
                          <Star size={10} className="text-[#C9A84C] fill-[#C9A84C] shrink-0" />
                          <span style={{ fontFamily: 'var(--font-cormorant)' }}>{h}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="glass-card p-8"
                >
                  <div className="text-[10px] tracking-[0.4em] text-[#C9A84C] mb-6">
                    LE NOSTRE CANTINE
                  </div>
                  <div className="flex flex-col gap-3 max-h-[420px] overflow-y-auto pr-2 scrollbar-thin">
                    {WINERIES.map((w) => (
                      <button
                        key={w.id}
                        onClick={() => setSelected(w)}
                        className="text-left p-3 border border-[#C9A84C]/10 hover:border-[#C9A84C]/40 hover:bg-[#722F37]/10 transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div
                              className="text-sm text-[#F5EEE6] group-hover:text-[#C9A84C] transition-colors"
                              style={{ fontFamily: 'var(--font-playfair)' }}
                            >
                              {w.name}
                            </div>
                            <div className="text-xs text-[#C4B5A0] mt-0.5">
                              {w.region} · {w.country}
                            </div>
                          </div>
                          <div className="text-[9px] text-[#C9A84C]/60">{w.visited}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}
