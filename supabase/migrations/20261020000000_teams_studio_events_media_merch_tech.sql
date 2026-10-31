-- ─────────────────────────────────────────────────────────────────────
-- The five teams, as they actually exist: Studio, Events, Media,
-- Merch, Tech.
--
-- "Board" is renamed to "Studio" rather than deleted and recreated:
-- 25 of the 48 rows in `tasks` point at its id, and dropping the row
-- would orphan every one of them. The membership of Board was already
-- exactly the five people in Studio, so the rename is also the honest
-- description of what that team is.
--
-- Data only: no table, column or constraint is touched, so nothing in
-- events, payments or Stripe can be affected by this.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Rename Board → Studio, keeping its id ──
update teams
   set name        = 'Studio',
       color       = '#731515',
       description = 'Strategia, brand e rapporti con le cantine'
 where name = 'Board';

-- ── 2. Refresh the two teams that already existed ──
update teams
   set color       = '#A3561A',
       description = 'Organizzazione ed esecuzione degli eventi'
 where name = 'Events';

update teams
   set color       = '#1F5F8B',
       description = 'Contenuti, social e comunicazione'
 where name = 'Media';

-- ── 3. Add the two that were missing ──
insert into teams (name, color, description)
select 'Merch', '#2F7A4F', 'Prodotti, magazzino e spedizioni'
 where not exists (select 1 from teams where name = 'Merch');

insert into teams (name, color, description)
select 'Tech', '#5B3A8C', 'Sito, area riservata e automazioni'
 where not exists (select 1 from teams where name = 'Tech');

-- ── 4. Membership: make each team's roster exactly the list given ──
-- Removes whoever is no longer on a team, adds whoever is missing, and
-- leaves rows that are already correct alone.

with roster (team_name, user_email) as (values
  -- Studio
  ('Studio', 'giacomogallo1310@gmail.com'),
  ('Studio', 'filippo.lombardi890@gmail.com'),
  ('Studio', 'francesco.basile@luniversotuo.it'),
  ('Studio', 'cristianomichelotti@gmail.com'),
  ('Studio', 'lorenzofioretti2001@gmail.com'),
  -- Events
  ('Events', 'marcelloabbadati02@gmail.com'),
  ('Events', 'federico.paroli@icloud.com'),
  ('Events', 'giachino.giovanni@outlook.it'),
  ('Events', 'carolinamariacarra@gmail.com'),
  -- Media
  ('Media',  'cristianomichelotti@gmail.com'),
  ('Media',  'elenacatellani76@gmail.com'),
  ('Media',  'giulyfascella@gmail.com'),
  ('Media',  'carolinamariacarra@gmail.com'),
  -- Merch
  ('Merch',  'cristianomichelotti@gmail.com'),
  ('Merch',  'danielenatalini1@gmail.com'),
  -- Tech
  ('Tech',   'giacomogallo1310@gmail.com'),
  ('Tech',   'edoardopiceni@gmail.com')
),
wanted as (
  select t.id as team_id, r.user_email
    from roster r
    join teams t on t.name = r.team_name
),
-- Drop memberships that are not in the roster, but only for the five
-- teams above: any other team is left untouched.
removed as (
  delete from team_members_tasks m
   where m.team_id in (select id from teams where name in ('Studio','Events','Media','Merch','Tech'))
     and not exists (
       select 1 from wanted w
        where w.team_id = m.team_id and w.user_email = m.user_email
     )
  returning 1
)
insert into team_members_tasks (team_id, user_email)
select w.team_id, w.user_email
  from wanted w
 where not exists (
   select 1 from team_members_tasks m
    where m.team_id = w.team_id and m.user_email = w.user_email
 );

-- ── 5. Check: every task still points at a team that exists ──
-- Expect 0 rows.
select count(*) as tasks_with_dangling_team
  from tasks
 where team_id is not null
   and team_id not in (select id from teams);
