-- ─────────────────────────────────────────────────────────────────────
-- Il colore di un contenuto del piano editoriale.
--
-- Finora il colore lo decideva il formato: tutti i reel dello stesso
-- rosso, tutte le storie dello stesso giallo. Va bene come regola, e
-- infatti resta quella di partenza — ma chi compila il piano vuole
-- poter dire "questo no, questo e' la campagna di Natale" senza
-- ricolorare tutti i reel dell'anno.
--
-- Quindi il colore sta sulla riga, e quando non c'e' vale quello del
-- formato. `null` non e' un buco: e' "come gli altri suoi simili", ed
-- e' il caso normale.
-- ─────────────────────────────────────────────────────────────────────

alter table ped_entries add column if not exists color text;

-- ── Verifica ──
select content_type, count(*) as contenuti, count(color) as con_colore_proprio
  from ped_entries
 group by content_type
 order by contenuti desc;
