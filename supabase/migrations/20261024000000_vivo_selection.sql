-- ─────────────────────────────────────────────────────────────────────
-- VIVO Selection: le bottiglie che consigliamo ai soci.
--
-- Non è un catalogo né un e-commerce: è la lista corta di quello che
-- abbiamo bevuto noi, da cantine in cui siamo stati, scelto sul
-- rapporto qualità prezzo. La vedono solo i soci — è uno dei motivi
-- per cui la tessera vale.
--
-- La nota in tre lingue: l'italiano è l'unico obbligatorio, gli altri
-- due si riempiono quando c'è tempo e, se mancano, si legge
-- l'italiano. Meglio una nota sola scritta bene che tre scritte male.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists wine_selection (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  producer     text,
  -- La cantina nel nostro elenco, se è una di quelle che abbiamo visitato.
  winery_slug  text,
  vintage      text,
  region       text,
  grape        text,
  -- Prezzo indicativo in centesimi: quanto costa trovarla, più o meno.
  price_cents  integer,
  where_to_buy text,
  photo_url    text,
  note_it      text,
  note_en      text,
  note_fr      text,
  sort_order   integer not null default 0,
  published    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists wine_selection_order_idx
  on wine_selection (published, sort_order, created_at desc);

alter table wine_selection enable row level security;

select count(*) as bottiglie from wine_selection;
