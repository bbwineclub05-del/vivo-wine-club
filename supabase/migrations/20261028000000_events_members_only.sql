-- Eventi riservati ai soci.
--
-- Prima la distinzione viveva solo nella testa di chi scriveva la
-- descrizione: adesso e' un campo, cosi' il pubblico lo vede sulla
-- targhetta e chi gestisce gli eventi lo decide con una spunta.
--
-- Default false: tutti gli eventi che esistono gia' restano aperti a
-- tutti, esattamente come sono adesso. Nessuna riga cambia significato.
alter table public.events
  add column if not exists members_only boolean not null default false;

comment on column public.events.members_only is
  'true = evento riservato ai soci. Mostrato come targhetta "Solo soci" nel calendario.';
