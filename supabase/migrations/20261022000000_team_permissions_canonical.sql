-- ─────────────────────────────────────────────────────────────────────
-- Gli interruttori dei permessi, sulle sezioni di oggi.
--
-- Le righe di `team_members` portano ancora le chiavi di due
-- riorganizzazioni fa — news, media, pipeline — e non nominano né
-- finance, né ped, né membership, né offers. Una chiave che non c'è
-- vale "permesso", quindi oggi Finance è di fatto aperta a tutti
-- quelli che entrano nel pannello.
--
-- Questa migrazione riscrive i permessi sulle dodici chiavi che
-- corrispondono una a una alle voci del menù. Il codice sa già
-- tradurre le chiavi vecchie (lib/access.ts), quindi è sicura anche
-- se viene lanciata dopo il deploy: serve a togliere l'ambiguità dal
-- database, non a far funzionare l'applicazione.
--
-- Conserva le decisioni prese: se qualcuno aveva "news" spento, resta
-- spento quello che oggi si chiama "site".
-- ─────────────────────────────────────────────────────────────────────

update team_members
   set permissions = jsonb_build_object(
         'events',     coalesce((permissions->>'events')::boolean, true),
         'merch',      coalesce((permissions->>'merch')::boolean, true),
         'tasks',      coalesce((permissions->>'tasks')::boolean, true),
         'ped',        coalesce((permissions->>'ped')::boolean, true),
         'membership', coalesce((permissions->>'membership')::boolean,
                                (permissions->>'pipeline')::boolean, true),
         'finance',    coalesce((permissions->>'finance')::boolean, true),
         'documents',  coalesce((permissions->>'documents')::boolean, true),
         'crm',        coalesce((permissions->>'crm')::boolean, true),
         -- Sito ha assorbito news, media e la mappa cantine: basta che
         -- una delle tre fosse spenta perché resti spento.
         'site',       coalesce((permissions->>'site')::boolean, true)
                       and coalesce((permissions->>'news')::boolean, true)
                       and coalesce((permissions->>'media')::boolean, true)
                       and coalesce((permissions->>'wineries')::boolean, true),
         'offers',     coalesce((permissions->>'offers')::boolean, true)
                       and coalesce((permissions->>'discounts')::boolean, true)
                       and coalesce((permissions->>'upsell')::boolean, true),
         'analytics',  coalesce((permissions->>'analytics')::boolean, true),
         'scanner',    coalesce((permissions->>'scanner')::boolean, true)
       )
 where permissions is not null;

-- Chi non aveva proprio la colonna: tutto acceso, come chi entra oggi.
update team_members
   set permissions = jsonb_build_object(
         'events', true, 'merch', true, 'tasks', true, 'ped', true,
         'membership', true, 'finance', true, 'documents', true, 'crm', true,
         'site', true, 'offers', true, 'analytics', true, 'scanner', true
       )
 where permissions is null;
