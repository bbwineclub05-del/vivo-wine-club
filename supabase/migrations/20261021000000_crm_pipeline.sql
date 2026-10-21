-- ─────────────────────────────────────────────────────────────────────
-- Una spina dorsale sola per tutte le rubriche del CRM.
--
-- Oggi sponsor, cantine, produttori di Bordeaux e influencer sono
-- quattro tabelle con quattro forme diverse, quattro componenti da
-- ventimila byte l'uno e nessun modo di rispondere alla domanda che un
-- CRM esiste per rispondere: *a chi devo ancora dare retta.*
--
-- Si aggiungono tre colonne a tutte e quattro, uguali:
--
--   stage          a che punto è il rapporto
--   owner_email    chi del team se ne occupa
--   next_action_at quando va ripreso in mano
--
-- Da qui nasce la vista "Da fare": tutti i contatti, di qualunque
-- rubrica, con una prossima azione scaduta.
--
-- Additiva: nessuna colonna viene eliminata o cambiata di tipo, quindi
-- i componenti attuali continuano a funzionare mentre si passa ai nuovi.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Le tre colonne comuni ──
do $$
declare t text;
begin
  foreach t in array array['sponsors','contacts_wine','contacts_bordeaux','contacts_influencers']
  loop
    execute format('alter table %I add column if not exists stage text', t);
    execute format('alter table %I add column if not exists owner_email text', t);
    execute format('alter table %I add column if not exists next_action_at date', t);
    execute format(
      'alter table %I drop constraint if exists %I',
      t, t || '_stage_check');
    execute format(
      'alter table %I add constraint %I check (stage is null or stage in (''new'',''contacted'',''talking'',''active'',''lost''))',
      t, t || '_stage_check');
    execute format('create index if not exists %I on %I (stage)', t || '_stage_idx', t);
    execute format('create index if not exists %I on %I (next_action_at)', t || '_next_action_idx', t);
  end loop;
end $$;

-- ── 2. I contatti cantina non avevano un recapito ──
-- Quaranta nomi e nessun modo di scrivergli.
alter table contacts_wine add column if not exists email text;
alter table contacts_wine add column if not exists phone text;

-- ── 3. Gli influencer avevano già uno stato: si travasa ──
update contacts_influencers
   set stage = case status
         when 'Contattato'    then 'contacted'
         when 'In trattativa' then 'talking'
         when 'Confermato'    then 'active'
         else                      'new'
       end
 where stage is null;

-- ── 4. Tutti gli altri partono da "da contattare" ──
update sponsors          set stage = coalesce(stage, case when active is false then 'lost' else 'active' end);
update contacts_wine     set stage = coalesce(stage, 'new');
update contacts_bordeaux set stage = coalesce(stage, 'new');

-- ── 5. Verifica ──
-- Attesa: una riga per tabella e stato, nessuno stage nullo.
select 'sponsors' as rubrica,   stage, count(*) from sponsors            group by 2
union all
select 'cantine',               stage, count(*) from contacts_wine       group by 2
union all
select 'bordeaux',              stage, count(*) from contacts_bordeaux   group by 2
union all
select 'influencer',            stage, count(*) from contacts_influencers group by 2
order by 1, 2;
