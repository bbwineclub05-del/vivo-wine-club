-- ─────────────────────────────────────────────────────────────────────
-- Giulia Zalum e Gabriele Lisanti non fanno più parte del team.
--
-- Controllato prima di scrivere questo file:
--   · nessuna tabella ha una foreign key verso `team_members`, quindi
--     cancellare le due righe non si porta dietro nient'altro;
--   · i due indirizzi non compaiono in customers, tickets, profiles,
--     subscribers, merch_orders, event_guests, transactions, documents,
--     applications né in nessuna tabella CRM: esistono solo come staff;
--   · non sono citati da nessuna parte nel codice.
--
-- Resta volutamente in piedi una cosa: la task già completata
-- "Completare il Pitch Sponsor & company presentation", assegnata a
-- Gabriele. È storia del club e cancellarla falserebbe l'archivio;
-- l'interfaccia mostra il nome ricavato dall'indirizzo, quindi la riga
-- continua a leggersi senza errori.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. Fuori dai team operativi ──
delete from team_members_tasks
 where user_email in ('giulia@zalum.eu', 'gabrielelisanti@icloud.com');

-- ── 2. Fuori dall'area riservata ──
-- Questa è la riga che dà l'accesso: senza di essa `resolveAccess`
-- non concede nulla, perché la tabella è vincolante.
delete from team_members
 where email in ('giulia@zalum.eu', 'gabrielelisanti@icloud.com');

-- ── 3. Verifica: entrambe devono rispondere 0 ──
select count(*) as righe_team_members
  from team_members
 where email in ('giulia@zalum.eu', 'gabrielelisanti@icloud.com');

select count(*) as righe_team_members_tasks
  from team_members_tasks
 where user_email in ('giulia@zalum.eu', 'gabrielelisanti@icloud.com');
