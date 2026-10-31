-- ─────────────────────────────────────────────────────────────────────
-- Le cantine si chiamano come la cantina.
--
-- Le nove visitate hanno preso il nome dall'evento che le ha create —
-- "Wine Visit - Berlucchi" — e così comparivano sul sito, nella mappa
-- e nel titolo della loro pagina. Il prefisso se ne va.
--
-- E la Franciacorta è una sola: una riga scritta "Franciacorta (BS)"
-- faceva comparire due filtri diversi nell'elenco pubblico.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Via il prefisso dell'evento ──
-- Prende sia "Wine Visit - " sia "Wine Visit · " sia "Winery Visit - ".
update wineries
   set name = trim(regexp_replace(name, '^Wine(ry)?[[:space:]]*Visit[[:space:]]*[-·–][[:space:]]*', '', 'i'))
 where name ~* '^Wine(ry)?[[:space:]]*Visit[[:space:]]*[-·–]';

-- ── 2. Una sola Franciacorta ──
update wineries
   set region = 'Franciacorta'
 where region = 'Franciacorta (BS)';

-- ── 3. Verifica ──
-- Atteso: nessun nome che inizia con "Wine Visit", una sola Franciacorta.
select count(*) filter (where name ~* '^Wine(ry)?[[:space:]]*Visit') as nomi_da_sistemare,
       count(distinct region) filter (where region ilike 'franciacorta%') as varianti_franciacorta,
       count(*) as cantine
  from wineries;
