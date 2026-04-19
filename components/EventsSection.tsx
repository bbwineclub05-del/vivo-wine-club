'use client';

import { motion } from 'framer-motion';
import { MapPin, Calendar, Users } from 'lucide-react';

const EVENTS = [
  {
    id: 1,
    title: 'Verticale di Barolo',
    type: 'DEGUSTAZIONE',
    date: '15 Maggio 2026',
    location: 'Milano',
    description:
      'Una serata esclusiva con una verticale di Barolo dal 2010 al 2022, guidata dal nostro Master Sommelier.',
    spots: 20,
    price: 95,
    gradient: 'from-[#4a1020] via-[#722F37] to-[#3a0c18]',
    accent: '#722F37',
    symbol: '🍷',
  },
  {
    id: 2,
    title: 'Tour Cantine Toscana',
    type: 'TOUR ESCLUSIVO',
    date: '6–8 Giugno 2026',
    location: 'Montalcino, Toscana',
    description:
      'Weekend immersivo nelle cantine più prestigiose del Brunello, con degustazioni e cena di gala nel borgo medievale.',
    spots: 12,
    price: 450,
    gradient: 'from-[#1a3a20] via-[#2d5c35] to-[#153018]',
    accent: '#2d6b35',
    symbol: '🌿',
  },
  {
    id: 3,
    title: 'Masterclass Champagne',
    type: 'MASTERCLASS',
    date: '20 Giugno 2026',
    location: 'Roma',
    description:
      "Esplora i grandi Champagne di Maison con il MW Luca Gardini. Un viaggio nelle bollicine più rare e ricercate.",
    spots: 15,
    price: 150,
    gradient: 'from-[#3a3218] via-[#6b5c28] to-[#2a2410]',
    accent: '#C9A84C',
    symbol: '🥂',
  },
  {
    id: 4,
    title: 'Cena dei Soci',
    type: 'CENA DI GALA',
    date: '10 Luglio 2026',
    location: 'Firenze',
    description:
      'Cena di gala riservata ai soci, con menu degustazione di 8 portate abbinato ai grandi vini della nostra cantina.',
    spots: 30,
    price: 120,
    gradient: 'from-[#1a103a] via-[#2d1f5e] to-[#12082a]',
    accent: '#6b5ea0',
    symbol: '🕯️',
  },
  {
    id: 5,
    title: 'Vendemmia Experience',
    type: 'ESPERIENZA',
    date: '15–17 Set. 2026',
    location: 'Langhe, Piemonte',
    description:
      'Partecipa alla vendemmia nelle Langhe con soggiorno in agriturismo di lusso e cena con il produttore.',
    spots: 8,
    price: 680,
    gradient: 'from-[#2a0a4a] via-[#4a1a7a] to-[#1e0838]',
    accent: '#7a3ab0',
    symbol: '🍇',
  },
  {
    id: 6,
    title: 'Wine & Fine Dining',
    type: 'CENA CON CHEF',
    date: '25 Ottobre 2026',
    location: 'Milano',
    description:
      'Cena stellata con pairing curato dal nostro sommelier, in esclusiva per i soci Vivo. Chef ospite con 2 stelle Michelin.',
    spots: 16,
    price: 210,
    gradient: 'from-[#3a1a0a] via-[#6b3515] to-[#2a1008]',
    accent: '#c45a1a',
    symbol: '⭐',
  },
];

interface EventCardProps {
  event: (typeof EVENTS)[0];
  index: number;
}

function EventCard({ event, index }: EventCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.7, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="group relative overflow-hidden glass-card hover:border-[#C9A84C]/40 transition-all duration-500 hover:shadow-[0_0_40px_rgba(114,47,55,0.2)] flex flex-col"
    >
      {/* Image area */}
      <div className={`relative h-44 bg-gradient-to-br ${event.gradient} overflow-hidden`}>
        <div className="absolute inset-0 flex items-center justify-center text-6xl opacity-30 group-hover:opacity-50 group-hover:scale-110 transition-all duration-700">
          {event.symbol}
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0306]/80 to-transparent" />
        {/* Type badge */}
        <div className="absolute top-4 left-4">
          <span className="text-[9px] tracking-[0.35em] text-[#C9A84C] border border-[#C9A84C]/40 px-3 py-1.5 bg-[#0d0306]/60 backdrop-blur-sm">
            {event.type}
          </span>
        </div>
        {/* Price */}
        <div className="absolute top-4 right-4">
          <span className="text-sm font-semibold text-[#F5EEE6]" style={{ fontFamily: 'var(--font-playfair)' }}>
            €{event.price}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 flex flex-col flex-1">
        <h3
          className="text-xl font-medium text-[#F5EEE6] mb-3 group-hover:text-[#C9A84C] transition-colors duration-300"
          style={{ fontFamily: 'var(--font-playfair)' }}
        >
          {event.title}
        </h3>
        <p className="text-sm text-[#C4B5A0] leading-relaxed mb-5 flex-1" style={{ fontFamily: 'var(--font-cormorant)' }}>
          {event.description}
        </p>

        <div className="flex flex-col gap-2 mb-6 text-xs text-[#C4B5A0]">
          <div className="flex items-center gap-2">
            <Calendar size={13} className="text-[#C9A84C] shrink-0" />
            <span>{event.date}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} className="text-[#C9A84C] shrink-0" />
            <span>{event.location}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users size={13} className="text-[#C9A84C] shrink-0" />
            <span>{event.spots} posti disponibili</span>
          </div>
        </div>

        <button className="w-full py-3 border border-[#722F37] text-[#F5EEE6] text-[10px] tracking-[0.3em] hover:bg-[#722F37] transition-all duration-300">
          PRENOTA ORA
        </button>
      </div>
    </motion.div>
  );
}

export default function EventsSection() {
  return (
    <section id="eventi" className="py-32 bg-[#0d0306] relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-[#722F37]/5 rounded-full blur-[120px] -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-[#C9A84C]/5 rounded-full blur-[100px] translate-x-1/3 translate-y-1/3" />

      <div className="max-w-7xl mx-auto px-6 lg:px-10">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="mb-16"
        >
          <div className="text-[10px] tracking-[0.5em] text-[#C9A84C] mb-4">
            CALENDARIO 2026
          </div>
          <h2
            className="text-[clamp(2.5rem,6vw,5rem)] font-light text-[#F5EEE6] leading-none section-title"
            style={{ fontFamily: 'var(--font-playfair)' }}
          >
            EVENTI
          </h2>
          <p
            className="mt-6 text-lg text-[#C4B5A0] font-light italic max-w-md"
            style={{ fontFamily: 'var(--font-cormorant)' }}
          >
            Esperienze esclusive riservate ai nostri soci, tra degustazioni, tour e cene stellate
          </p>
        </motion.div>

        {/* Events grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {EVENTS.map((event, i) => (
            <EventCard key={event.id} event={event} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
