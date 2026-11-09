-- ─────────────────────────────────────────────────────────────────────
-- Il prezzo riservato ai soci, e la traccia di chi l'ha gia' usato.
--
-- `member_price` e' il prezzo finale per un socio, non uno sconto in
-- percentuale: se la serata costa 15 € e ai soci la facciamo 12, qui
-- dentro si scrive 12. Una percentuale su quindici euro fa cifre con
-- i centesimi che nessuno vuole vedere su un biglietto, e costringe
-- chi organizza a fare un conto a mente per sapere quanto incassa.
-- `null` vuol dire che per quell'evento i soci pagano come tutti.
--
-- `member_price_applied` sul biglietto serve a una cosa sola: sapere
-- se quel socio il suo sconto per quell'evento l'ha gia' speso. Non
-- basta guardare se ha gia' un biglietto, perche' potrebbe averlo
-- comprato a prezzo pieno — prima che lo sconto esistesse, o perche'
-- era il secondo. Senza questa colonna gli diremmo "hai gia' usato il
-- tuo sconto" a qualcuno che non l'ha mai avuto.
-- ─────────────────────────────────────────────────────────────────────

alter table events  add column if not exists member_price numeric;
alter table tickets add column if not exists member_price_applied boolean not null default false;

-- Trovare in fretta se questo indirizzo ha gia' speso lo sconto per
-- questo evento: e' una domanda che si fa a ogni checkout.
create index if not exists tickets_sconto_socio_idx
  on tickets (event_id, lower(email))
  where member_price_applied;

-- ── Verifica ──
select title, price, member_price
  from events
 where date >= current_date
 order by date;
