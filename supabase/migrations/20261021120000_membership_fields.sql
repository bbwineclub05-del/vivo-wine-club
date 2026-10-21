-- ─────────────────────────────────────────────────────────────────────
-- I dati del socio, in colonne loro.
--
-- La rotta di iscrizione infilava la città dentro `notes`, che è un
-- campo libero per gli appunti dello staff: un dato strutturato messo
-- lì dentro non si può cercare, né contare, né correggere senza
-- riscrivere una frase.
--
-- `date_of_birth` serve perché la membership è per maggiorenni e il
-- modulo lo chiede già; `source` perché sapere da dove arriva la gente
-- è l'unica domanda di marketing che vale la pena fare al momento
-- dell'iscrizione.
-- ─────────────────────────────────────────────────────────────────────

alter table memberships add column if not exists phone text;
alter table memberships add column if not exists city text;
alter table memberships add column if not exists date_of_birth date;
alter table memberships add column if not exists source text;
alter table memberships add column if not exists consent_marketing boolean default false;
alter table memberships add column if not exists consent_privacy_accepted_at timestamptz;
alter table memberships add column if not exists consent_privacy_version text;

-- Le quattro tessere travasate dai profili: la città ce l'hanno già lì.
update memberships m
   set city = p.city,
       phone = coalesce(m.phone, p.phone),
       date_of_birth = coalesce(m.date_of_birth, p.date_of_birth)
  from profiles p
 where p.id = m.user_id
   and m.city is null;

-- ── Verifica ──
select member_id, full_name, city, phone is not null as ha_telefono
  from memberships order by created_at;
