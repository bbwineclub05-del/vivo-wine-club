-- ─────────────────────────────────────────────────────────────────────
-- Dove spedire il welcome pack.
--
-- Il cappellino va mandato a casa, e l'unico momento in cui si può
-- chiedere un indirizzo senza rincorrere nessuno è mentre la persona
-- sta già pagando. Stripe lo raccoglie durante il checkout; queste
-- colonne sono dove finisce quando il pagamento è confermato.
--
-- `welcome_pack_sent_at` serve a sapere a chi è già partito: senza,
-- al secondo giro si rispedisce a tutti o a nessuno.
-- ─────────────────────────────────────────────────────────────────────

alter table memberships add column if not exists shipping_name        text;
alter table memberships add column if not exists shipping_phone       text;
alter table memberships add column if not exists shipping_line1       text;
alter table memberships add column if not exists shipping_line2       text;
alter table memberships add column if not exists shipping_city        text;
alter table memberships add column if not exists shipping_postal      text;
alter table memberships add column if not exists shipping_state       text;
alter table memberships add column if not exists shipping_country     text;
alter table memberships add column if not exists welcome_pack_sent_at timestamptz;

-- Verifica: atteso 9 colonne nuove.
select count(*) as colonne_spedizione
  from information_schema.columns
 where table_name = 'memberships'
   and (column_name like 'shipping\_%' or column_name = 'welcome_pack_sent_at');

-- ─────────────────────────────────────────────────────────────────────
-- I contatti delle cantine.
--
-- Nell'area del socio promettiamo "la mappa delle cantine con tutti i
-- contatti, per avere più fortuna quando si chiede una visita". Oggi
-- la tabella non ha un telefono né un sito: la promessa non sarebbe
-- mantenibile. Queste colonne sono i campi da riempire dalla scheda
-- Cantine — restano vuote finché non le compilate, e dove sono vuote
-- l'area del socio non mostra niente invece di mostrare un vuoto.
-- ─────────────────────────────────────────────────────────────────────

alter table wineries add column if not exists website     text;
alter table wineries add column if not exists phone       text;
alter table wineries add column if not exists email       text;
alter table wineries add column if not exists booking_url text;
alter table wineries add column if not exists address     text;

select count(*) as colonne_contatto
  from information_schema.columns
 where table_name = 'wineries'
   and column_name in ('website', 'phone', 'email', 'booking_url', 'address');
