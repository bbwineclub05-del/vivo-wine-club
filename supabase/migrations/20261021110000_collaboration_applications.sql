-- ─────────────────────────────────────────────────────────────────────
-- Le candidature: una tabella sola, quattro modi di proporsi.
--
-- Oggi chi vuole lavorare con il club trova tre porte diverse —
-- /brands per le aziende, /talents per i creator, /collaborate/ambassador
-- per gli ambassador — che scrivono in tre tabelle con tre forme, e
-- nessuna delle tre chiede alla persona chi è prima di farle compilare
-- dei campi.
--
-- Qui diventa una domanda sola, posta prima dei campi: vuoi diventare
-- ambassador, lavorare con noi come azienda, entrare nel portafoglio
-- come creator, o lavorare nel team?
--
-- La membership non sta qui dentro, e non è una svista. Una tessera si
-- compra, non si chiede: chi si iscrive diventa socio e basta. Le
-- vecchie 39 righe di `applications` restano dove sono, come archivio
-- di quando funzionava diversamente.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists collaboration_applications (
  id uuid primary key default gen_random_uuid(),

  -- Chi si propone, e come.
  kind text not null check (kind in ('ambassador', 'company', 'creator', 'staff')),

  first_name text,
  last_name  text,
  email text not null,
  phone text,
  city text,
  country text,

  -- Per le aziende.
  company text,
  role text,
  website text,

  -- Per creator e ambassador.
  instagram text,
  tiktok text,
  followers integer,

  -- Quello che scrivono di sé: una domanda aperta invece di otto campi
  -- che non si adattano a nessuno dei quattro casi.
  message text,

  -- Lo stesso vocabolario della pipeline del CRM, così una candidatura
  -- si segue come si segue uno sponsor.
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'talking', 'active', 'lost')),
  owner_email text,
  next_action_at date,
  notes text,

  locale text,
  consent_privacy_accepted_at timestamptz,
  consent_privacy_version text,
  consent_marketing boolean default false,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists collab_apps_kind_idx  on collaboration_applications (kind);
create index if not exists collab_apps_stage_idx on collaboration_applications (stage);
create index if not exists collab_apps_next_idx  on collaboration_applications (next_action_at);

alter table collaboration_applications enable row level security;

-- ── Travaso: le candidature ambassador già ricevute ──
insert into collaboration_applications
  (kind, first_name, last_name, email, phone, city, instagram, message,
   stage, notes, locale, consent_privacy_accepted_at, consent_privacy_version, created_at)
select 'ambassador',
       a.first_name,
       a.last_name,
       a.email,
       a.phone,
       coalesce(a.area, a.area_other),
       a.social_links,
       concat_ws(E'\n\n',
         nullif(a.motivation, ''),
         nullif(a.experience, ''),
         nullif(a.community, ''),
         nullif(a.availability, '')),
       case a.status
         when 'accepted' then 'active'
         when 'rejected' then 'lost'
         else 'new'
       end,
       a.staff_notes,
       a.locale,
       a.consent_privacy_accepted_at,
       a.consent_privacy_version,
       a.created_at
  from ambassador_applications a
 where not exists (
   select 1 from collaboration_applications c
    where lower(c.email) = lower(a.email) and c.kind = 'ambassador'
 );

-- ── Travaso: le richieste delle aziende ──
-- `brand_leads` è vuota oggi, ma la riga resta per quando non lo sarà.
insert into collaboration_applications
  (kind, email, company, phone, message, stage, notes, locale,
   consent_privacy_accepted_at, consent_privacy_version, created_at)
select 'company',
       b.email,
       b.company,
       b.phone,
       concat_ws(E'\n\n',
         nullif(b.contact_name, ''),
         nullif(b.project_type, ''),
         nullif(b.message, '')),
       case b.status
         when 'accepted' then 'active'
         when 'rejected' then 'lost'
         else 'new'
       end,
       b.staff_notes,
       b.locale,
       b.consent_privacy_accepted_at,
       b.consent_privacy_version,
       b.created_at
  from brand_leads b
 where b.email is not null
   and not exists (
     select 1 from collaboration_applications c
      where lower(c.email) = lower(b.email) and c.kind = 'company'
   );

-- ── Verifica ──
-- Attesa: una riga per tipo presente, con i conteggi.
select kind, stage, count(*) from collaboration_applications group by 1, 2 order by 1, 2;
