-- ─────────────────────────────────────────────────────────────────────
-- Due colonne per le mail della tessera.
--
-- `welcome_sent_at`: a chi è già arrivata. Senza, al secondo giro si
-- manda due volte a tutti o a nessuno.
--
-- `locale`: in che lingua scrivere. Non serve chiedere la nazionalità
-- nel modulo — che fra l'altro non risponderebbe alla domanda giusta,
-- perché un italiano a Londra resta italiano e un belga può preferire
-- il francese: il sito sa già in che lingua la persona stava
-- leggendo quando si è iscritta, ed è quella la lingua in cui si
-- aspetta di essere contattata. Per chi era socio prima che la
-- chiedessimo resta vuota, e vale l'italiano.
-- ─────────────────────────────────────────────────────────────────────

alter table memberships add column if not exists welcome_sent_at timestamptz;
alter table memberships add column if not exists locale          text;

select count(*) filter (where welcome_sent_at is null) as mai_ricevuta,
       count(*) filter (where locale is null)          as senza_lingua,
       count(*)                                        as tessere
  from memberships;
