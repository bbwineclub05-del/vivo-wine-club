-- ─────────────────────────────────────────────────────────────────────
-- Il registro unico: identità per email e tipo di riga esplicito.
--
-- Oggi chi ha mosso i soldi è scritto come testo libero in due colonne
-- diverse (`assigned_to` per le spese, `reimbursed_to` per i rimborsi),
-- e lo stesso Cristiano compare come "Cristiano" e come "Cristiano
-- Michelotti". Due stringhe diverse sono due persone diverse per
-- chiunque faccia la somma, ed è una delle ragioni per cui i conti non
-- tornavano.
--
-- Questa migrazione è SOLO ADDITIVA: aggiunge due colonne che il codice
-- attuale non legge, quindi dopo averla lanciata la sezione Finance
-- continua a funzionare esattamente come prima. Nessuna colonna viene
-- eliminata o modificata, nessun importo viene toccato.
-- ─────────────────────────────────────────────────────────────────────

alter table transactions add column if not exists member_email text;
alter table transactions add column if not exists entry_type   text;

-- ── 1. Il tipo di riga ──
--   expense       una spesa
--   income        un'entrata
--   reimbursement il club restituisce i soldi a chi ha anticipato
--   contribution  un membro versa al club i soldi che aveva incassato
--
-- Le prime tre si ricavano da quello che c'è già. La quarta non era
-- esprimibile nel vecchio modello: è il movimento che mancava, e la sua
-- assenza è l'altra ragione per cui i conti non tornavano.
update transactions
   set entry_type = case
         when type = 'rimborso' then 'reimbursement'
         when type = 'revenue'  then 'income'
         else                        'expense'
       end
 where entry_type is null;

-- ── 2. Chi ha mosso i soldi, per email ──
-- `null` significa "il conto del club". Per i rimborsi la persona sta
-- in `reimbursed_to`, per tutto il resto in `assigned_to`.

-- 2a. Corrispondenza sul nome completo.
update transactions t
   set member_email = m.email
  from team_members m
 where t.member_email is null
   and t.entry_type <> 'reimbursement'
   and t.assigned_to is not null
   and btrim(t.assigned_to) <> ''
   and btrim(t.assigned_to) <> 'Club'
   and lower(btrim(m.name)) = lower(btrim(t.assigned_to));

update transactions t
   set member_email = m.email
  from team_members m
 where t.member_email is null
   and t.entry_type = 'reimbursement'
   and t.reimbursed_to is not null
   and lower(btrim(m.name)) = lower(btrim(t.reimbursed_to));

-- 2b. Corrispondenza sul solo nome di battesimo (il caso "Cristiano"),
--     ma unicamente quando porta a una persona sola: se due membri si
--     chiamassero Cristiano, la riga resta senza email e la si vede
--     nella verifica in fondo, invece di essere attribuita a caso.
update transactions t
   set member_email = sub.email
  from (
    select lower(split_part(btrim(name), ' ', 1)) as first_name,
           min(email) as email,
           count(*)   as n
      from team_members
     group by 1
  ) sub
 where t.member_email is null
   and sub.n = 1
   and lower(btrim(coalesce(
         case when t.entry_type = 'reimbursement' then t.reimbursed_to else t.assigned_to end,
         ''))) = sub.first_name;

-- ── 3. Vincoli ──
-- Da qui in avanti una riga senza tipo, o con un importo negativo, non
-- entra nemmeno. Il segno lo decide `entry_type`, mai l'importo.
alter table transactions
  drop constraint if exists transactions_entry_type_check;
alter table transactions
  add constraint transactions_entry_type_check
  check (entry_type in ('expense', 'income', 'reimbursement', 'contribution'));

alter table transactions
  drop constraint if exists transactions_amount_positive;
alter table transactions
  add constraint transactions_amount_positive check (amount > 0);

-- Un rimborso o un versamento senza la persona a cui si riferisce è una
-- riga priva di significato: non si saprebbe di chi muovere il saldo.
alter table transactions
  drop constraint if exists transactions_member_required;
alter table transactions
  add constraint transactions_member_required
  check (entry_type not in ('reimbursement', 'contribution') or member_email is not null);

create index if not exists transactions_member_email_idx on transactions (member_email);
create index if not exists transactions_entry_type_idx   on transactions (entry_type);

-- ── 4. Verifica ──

-- 4a. Quante righe per tipo. Atteso: 82 expense, 25 income, 66 reimbursement.
select entry_type, count(*) as righe
  from transactions
 group by entry_type
 order by entry_type;

-- 4b. Righe che nominano una persona ma di cui non si è trovata l'email.
--     Atteso: nessuna riga.
select id, date, description, type, assigned_to, reimbursed_to
  from transactions
 where member_email is null
   and coalesce(nullif(btrim(assigned_to), ''), 'Club') <> 'Club'
 order by date;

-- 4c. I saldi per persona, calcolati come li calcolerà l'applicazione.
--     Atteso: Giacomo +671,00 · Filippo +110,00 · Marcello +9,30
--             Francesco −13,00 · Daniele −90,00 · Cristiano −114,22
select coalesce(m.name, t.member_email) as persona,
       sum(
         case t.entry_type
           when 'expense'       then  t.amount
           when 'income'        then -t.amount
           when 'reimbursement' then -t.amount
           when 'contribution'  then  t.amount
         end
       ) as saldo
  from transactions t
  left join team_members m on m.email = t.member_email
 where t.member_email is not null
 group by 1
having sum(
         case t.entry_type
           when 'expense'       then  t.amount
           when 'income'        then -t.amount
           when 'reimbursement' then -t.amount
           when 'contribution'  then  t.amount
         end
       ) <> 0
 order by 2 desc;

-- 4d. La cassa del club. Atteso: 2.387,16
select sum(
         case
           when t.entry_type = 'expense'       and t.member_email is null then -t.amount
           when t.entry_type = 'income'        and t.member_email is null then  t.amount
           when t.entry_type = 'reimbursement'                            then -t.amount
           when t.entry_type = 'contribution'                             then  t.amount
           else 0
         end
       ) as cassa_club
  from transactions t;
