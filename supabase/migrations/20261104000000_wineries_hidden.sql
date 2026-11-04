-- ─────────────────────────────────────────────────────────────────────
-- Una cantina si può nascondere, senza cancellarla.
--
-- Bertani compariva due volte: la scheda vera (`bertani`, con logo) e
-- la riga creata in automatico dalla visita di maggio
-- (`winery-visit-bertani-may-2026`, senza logo né descrizione).
-- Cancellare la seconda non basterebbe: il cron delle visite la
-- ricreerebbe la notte dopo, perché l'evento esiste ancora. Nascosta,
-- invece, resta nel database e occupa il suo slug, quindi il cron la
-- salta. Il sito non la mostra e la sua pagina rimanda a `bertani`.
--
-- La data della visita passa sulla scheda vera, così la card con il
-- logo dice "Visitata dal club".
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. La colonna ──
alter table wineries add column if not exists hidden boolean not null default false;

-- ── 2. Nascosta la riga della visita ──
update wineries
   set hidden = true
 where slug = 'winery-visit-bertani-may-2026';

-- ── 3. La visita sulla scheda vera, solo se non ne ha già una ──
update wineries
   set visit_date = '2026-05-12'
 where slug = 'bertani'
   and visit_date is null;

-- ── 4. Verifica ──
-- Atteso: una riga nascosta (la visita), `bertani` visibile con la data.
select slug, name, hidden, visit_date, logo_url is not null as ha_logo
  from wineries
 where slug in ('bertani', 'winery-visit-bertani-may-2026')
 order by slug;
