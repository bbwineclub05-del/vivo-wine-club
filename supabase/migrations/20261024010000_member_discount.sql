-- ─────────────────────────────────────────────────────────────────────
-- Il 15% dei soci: un codice che non si consuma.
--
-- La tabella dei codici è nata per i regali singoli — il compleanno,
-- l'omaggio dopo un evento — e infatti ha una colonna `used` che li
-- spegne al primo acquisto. Lo sconto dei soci è un'altra cosa: vale
-- finché vale la tessera, e chi compra due magliette in due mesi deve
-- poterlo usare due volte.
--
-- Due colonne: `reusable` dice che non si consuma, `uses` conta
-- quante volte è stato usato — serve a sapere se questo vantaggio
-- interessa a qualcuno o se lo stiamo solo raccontando.
-- ─────────────────────────────────────────────────────────────────────

alter table discount_codes add column if not exists reusable boolean not null default false;
alter table discount_codes add column if not exists uses     integer not null default 0;

select count(*) filter (where reusable) as riutilizzabili,
       count(*)                         as codici
  from discount_codes;
