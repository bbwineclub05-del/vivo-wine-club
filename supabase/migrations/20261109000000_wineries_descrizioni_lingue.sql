-- ─────────────────────────────────────────────────────────────────────
-- La descrizione di una cantina, nelle tre lingue del sito.
--
-- Finora era una colonna sola, `description`, scritta in inglese: un
-- socio italiano apriva la scheda di Ornellaia e leggeva l'inglese,
-- anche se tutto il resto della pagina era nella sua lingua.
--
-- Due colonne nuove invece di tre, e `description` resta l'inglese.
-- Cosi' le trentaquattro schede che una descrizione ce l'hanno gia'
-- continuano a funzionare senza che nessuno le sposti, e chi legge in
-- italiano o in francese vede la sua lingua se c'e' e l'inglese se
-- manca. Una colonna vuota non e' un buco: e' un ripiego dichiarato.
-- ─────────────────────────────────────────────────────────────────────

alter table wineries add column if not exists description_it text;
alter table wineries add column if not exists description_fr text;

-- ── Verifica ──
select
  count(*) filter (where coalesce(description, '') <> '')    as inglese,
  count(*) filter (where coalesce(description_it, '') <> '') as italiano,
  count(*) filter (where coalesce(description_fr, '') <> '') as francese
from wineries
where not hidden;
