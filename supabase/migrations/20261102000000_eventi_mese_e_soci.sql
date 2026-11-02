-- ─────────────────────────────────────────────────────────────────────
-- Due cose sugli eventi: una data che può dire solo il mese, e il
-- riservato ai soci che diventa una regola invece di un'etichetta.
--
-- `date_month_only` non è una seconda data. La data resta una data
-- vera — serve per ordinare il calendario, per sapere cos'è passato e
-- per i promemoria — e questa colonna dice soltanto fino a che punto
-- ci si può fidare: col flag alzato, in pagina si scrive "Dicembre
-- 2026" e il giorno non si mostra a nessuno. L'alternativa sarebbe
-- lasciare la data vuota, e allora ogni query che ordina per data
-- dovrebbe sapere cosa fare del buco.
--
-- Quando vale solo il mese, un evento resta futuro fino alla fine del
-- mese: col primo del mese come data, altrimenti sparirebbe dal
-- calendario il giorno due.
--
-- `members_only` esiste già in produzione, creata a mano. La si
-- dichiara anche qui perché una colonna che vive solo nel database e
-- non nelle migrazioni è una colonna che il prossimo ambiente non
-- avrà.
-- ─────────────────────────────────────────────────────────────────────

alter table events add column if not exists date_month_only boolean not null default false;
alter table events add column if not exists members_only    boolean not null default false;

-- ── Verifica ──
select title, date, date_month_only, members_only
  from events
 where date >= current_date
 order by date;
