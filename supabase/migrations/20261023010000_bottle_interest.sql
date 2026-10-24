-- ─────────────────────────────────────────────────────────────────────
-- "Una bottiglia al mese": prima di costruirla, contare chi la vuole.
--
-- L'idea è un secondo livello di tessera a quindici euro al mese con
-- una bottiglia spedita a casa. Prima di mettere in piedi abbonamenti
-- ricorrenti, webhook, carte scadute e logistica delle spedizioni,
-- conviene sapere quante persone lo vogliono davvero: oggi è
-- un'ipotesi, e un'ipotesi non si spedisce.
--
-- Questa tabella raccoglie solo l'interesse. Nessun pagamento, nessun
-- impegno: un nome, un indirizzo email e che vino preferisce.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists bottle_interest (
  id         uuid primary key default gen_random_uuid(),
  email      text not null,
  full_name  text,
  -- 'rosso' | 'bianco' | 'misto'
  preference text,
  note       text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Una persona, una riga: se cambia idea sul vino si aggiorna la sua.
create unique index if not exists bottle_interest_email_idx
  on bottle_interest (lower(email));

-- Come le altre tabelle del club: ci si arriva solo dal server.
alter table bottle_interest enable row level security;

select count(*) as interessati from bottle_interest;
