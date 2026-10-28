'use client';

import { motion, useReducedMotion } from 'framer-motion';

import { VideoCard } from '@/components/ui/VideoCard';
import type { HomeReel } from '@/lib/home-reels';

/**
 * Il mucchio di clip in cima alla pagina del Club.
 *
 * In home le stesse clip scorrono in fila, che va bene per una
 * striscia di sfondo: qui serve l'opposto, qualcosa che sembri un
 * mucchio di foto buttate sul tavolo dopo una serata. Le schede sono
 * storte, di altezze diverse, e respirano piano ognuna per conto suo.
 *
 * Le inclinazioni sono scritte, non sorteggiate: un `Math.random()`
 * darebbe al server un numero e al browser un altro, e React se ne
 * accorgerebbe. Sembrano casuali perche' non si ripetono mai uguali
 * nello stesso schermo, non perche' lo siano.
 *
 * Chi ha chiesto al telefono di non far muovere niente vede le stesse
 * schede dritte e ferme: nessuna rotazione, nessun respiro, e i video
 * restano il loro primo fotogramma (ci pensa `VideoCard`).
 */

/** Rotazione, spostamento verticale e durata del respiro, scheda per scheda. */
const POSE = [
  { rot: -2.5, dy: 0,  respiro: 7.5 },
  { rot: 1.8,  dy: 18, respiro: 6.5 },
  { rot: -1.2, dy: 6,  respiro: 8.5 },
  { rot: 2.6,  dy: 16, respiro: 7.0 },
  { rot: -1.9, dy: 10, respiro: 9.0 },
  { rot: 1.4,  dy: 0,  respiro: 6.8 },
  { rot: -2.2, dy: 14, respiro: 8.0 },
  { rot: 2.0,  dy: 8,  respiro: 7.2 },
];

export function ClubCollage({ reels }: { reels: HomeReel[] }) {
  const reduce = useReducedMotion();

  /* Tre colonne, e in ognuna una scheda alta e una bassa: se si
     prendessero le clip nell'ordine in cui arrivano, i verticali
     sono molti di piu' e l'ultima colonna scenderebbe da sola
     lasciando mezzo schermo vuoto accanto. */
  const alti  = reels.filter((r) => r.orientamento === 'verticale').slice(0, 3);
  const bassi = reels.filter((r) => r.orientamento === 'orizzontale').slice(0, 3);
  const schede: HomeReel[] = [];
  for (let i = 0; i < Math.max(alti.length, bassi.length); i++) {
    if (alti[i]) schede.push(alti[i]);
    if (bassi[i]) schede.push(bassi[i]);
  }
  if (schede.length === 0) return null;

  return (
    <div className="columns-2 gap-3 sm:gap-4 md:columns-3">
      {schede.map((r, i) => {
        const pose = POSE[i % POSE.length];
        const fermo = { rotate: 0, y: 0, scale: 1 };

        return (
          <motion.div
            key={`${r.src ?? r.poster}-${i}`}
            className="mb-3 break-inside-avoid sm:mb-4"
            initial={reduce ? false : { opacity: 0, y: 40, scale: 0.94, rotate: pose.rot * 2.5 }}
            whileInView={
              reduce
                ? fermo
                : {
                    opacity: 1,
                    scale: 1,
                    rotate: pose.rot,
                    y: [pose.dy, pose.dy - 10, pose.dy],
                  }
            }
            viewport={{ once: true, amount: 0.15 }}
            transition={
              reduce
                ? { duration: 0 }
                : {
                    opacity: { duration: 0.5, delay: i * 0.07 },
                    scale: { type: 'spring', stiffness: 220, damping: 18, delay: i * 0.07 },
                    rotate: { type: 'spring', stiffness: 180, damping: 16, delay: i * 0.07 },
                    y: { duration: pose.respiro, repeat: Infinity, ease: 'easeInOut', delay: i * 0.3 },
                  }
            }
            whileHover={reduce ? undefined : { rotate: 0, scale: 1.04, zIndex: 2 }}
          >
            <VideoCard
              source={{ src: r.src, poster: r.poster }}
              aspect={r.orientamento === 'verticale' ? 'reel' : 'wide'}
              priority={i < 2}
              sizes="(max-width: 640px) 46vw, 31vw"
              className="shadow-[0_18px_40px_-28px_rgba(26,5,5,0.55)]"
            />
          </motion.div>
        );
      })}
    </div>
  );
}
