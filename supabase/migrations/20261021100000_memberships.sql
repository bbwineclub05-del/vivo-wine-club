-- ─────────────────────────────────────────────────────────────────────
-- La membership: chi è socio, fino a quando, e quanto ha pagato.
--
-- Oggi "essere membro" è una parola nella colonna `profiles.tier`, che
-- qualcuno scrive a mano. Non dice da quando, fino a quando, né se ha
-- pagato: trentatré candidature risultano approvate e i Member sono
-- quattro, perché approvare non crea niente.
--
-- Due tabelle. `memberships` è lo stato — una riga per persona, con la
-- scadenza. `membership_payments` è la storia — una riga per anno
-- pagato, che resta anche quando la membership scade o cambia prezzo.
-- Lo stato si ricava sempre dalla scadenza, mai da un flag scritto a
-- mano che prima o poi diverge.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists memberships (
  id uuid primary key default gen_random_uuid(),

  -- L'email è la chiave stabile: una persona può candidarsi prima di
  -- avere un account, e l'account arriva dopo.
  email text not null,
  user_id uuid references auth.users(id) on delete set null,

  full_name text,
  member_id text unique,

  -- 'founding'  chi entra entro il 31/12/2026: rinnova a prezzo ridotto
  -- 'standard'  chi entra dopo: prezzo pieno
  tier text not null default 'standard' check (tier in ('founding', 'standard')),

  started_at date not null default current_date,
  expires_at date not null,

  /**
   * Il prezzo del rinnovo, e l'offerta per chi rinnova in anticipo.
   *
   * La regola del club è: chi è socio prima del 1/12/2026 può
   * rinnovare subito a venti euro; dal 1/01/2027 si pagano trenta.
   * Non è una scadenza della membership, è uno sconto che finisce —
   * quindi servono due prezzi e una data, non un prezzo solo.
   *
   * Quale si applica lo dice una domanda sola: oggi è entro
   * `offer_expires_at`? Se sì `offer_price_cents`, altrimenti
   * `standard_price_cents`.
   *
   * Scritti sulla riga e non calcolati al volo dalla data di oggi:
   * una regola che guarda l'orologio dà risposte diverse a distanza
   * di mesi, e fra un anno nessuno saprebbe più perché a Tizio sono
   * stati chiesti venti e a Caio trenta.
   */
  standard_price_cents integer not null default 3000,
  offer_price_cents integer,
  offer_expires_at date,

  cancelled_at timestamptz,
  source_application_id uuid,

  -- Promemoria già mandati, per non mandarli due volte.
  reminded_30_at timestamptz,
  reminded_7_at  timestamptz,
  reminded_0_at  timestamptz,

  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists memberships_email_unique on memberships (lower(email));
create index if not exists memberships_expires_idx on memberships (expires_at);
create index if not exists memberships_user_idx on memberships (user_id);

alter table memberships enable row level security;

-- ── I pagamenti ──
create table if not exists membership_payments (
  id uuid primary key default gen_random_uuid(),
  membership_id uuid not null references memberships(id) on delete cascade,

  amount_cents integer not null check (amount_cents >= 0),
  period_start date not null,
  period_end   date not null,

  -- 'pending'  checkout aperto, non ancora confermato
  -- 'paid'     soldi incassati
  -- 'waived'   anno gratuito concesso dal club (il 2026)
  -- 'failed'   checkout abbandonato o rifiutato
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'waived', 'failed')),

  stripe_session_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists membership_payments_membership_idx
  on membership_payments (membership_id);
create unique index if not exists membership_payments_session_unique
  on membership_payments (stripe_session_id) where stripe_session_id is not null;

alter table membership_payments enable row level security;

-- ── Le candidature sanno dire a che punto sono ──
-- Stesso vocabolario della pipeline del CRM, così una candidatura si
-- segue come si segue uno sponsor.
alter table applications add column if not exists owner_email text;
alter table applications add column if not exists next_action_at date;
alter table applications add column if not exists membership_id uuid references memberships(id) on delete set null;

-- ── Travaso: i quattro Member di oggi diventano membership vere ──
-- Entrano come 'founding' con l'anno in corso gratuito e il rinnovo a
-- venti euro, che è la regola che hai dato per chi c'era già.
insert into memberships (email, user_id, full_name, member_id, tier, started_at, expires_at,
                         standard_price_cents, offer_price_cents, offer_expires_at)
select u.email,
       p.id,
       p.full_name,
       p.member_id,
       'founding',
       coalesce(make_date(p.member_since, 1, 1), current_date),
       date '2026-12-31',
       3000,          -- quello che pagheranno da gennaio
       2000,          -- se rinnovano entro fine anno
       date '2026-12-31'
  from profiles p
  join auth.users u on u.id = p.id
 where p.tier = 'Member'
   and u.email is not null
   and not exists (select 1 from memberships m where lower(m.email) = lower(u.email));

-- L'anno in corso risulta concesso, non pagato: è un fatto, e va
-- scritto come tale invece di lasciare un buco nella storia.
insert into membership_payments (membership_id, amount_cents, period_start, period_end, status, paid_at)
select m.id, 0, m.started_at, m.expires_at, 'waived', now()
  from memberships m
 where not exists (select 1 from membership_payments p where p.membership_id = m.id);

-- ── Verifica ──
select tier,
       count(*) as membri,
       min(expires_at) as prima_scadenza,
       min(offer_price_cents) as offerta_cent,
       min(standard_price_cents) as pieno_cent
  from memberships group by tier order by tier;

select status, count(*) from membership_payments group by status;
