-- ─────────────────────────────────────────────────────────────────────
-- Sincronizzare il registro con la cassa vera.
--
-- Due cose si erano scollate.
--
-- 1. La produzione scrive ancora con il vecchio schema: `type`,
--    `assigned_to`, `reimbursed_to`, e nessun `entry_type`. Il registro
--    nuovo quelle righe le scartava — diciassette, per 1.548,57 € — e
--    la cassa che mostrava era di conseguenza sbagliata. Qui si
--    ricavano tipo e persona dalle vecchie colonne, che il dato ce
--    l'hanno sempre avuto.
--
-- 2. Non vedendole, il 21 ottobre sera sono stati registrati una
--    seconda volta quattro rimborsi che Filippo aveva già messo nel
--    pomeriggio. Sono soldi usciti una volta sola e vanno scritti una
--    volta sola.
--
-- Dopo questa migrazione la cassa calcolata dal registro nuovo e
-- quella calcolata dalla produzione danno lo stesso numero: 1.047,09 €.
-- ─────────────────────────────────────────────────────────────────────

-- ── 1. I quattro doppioni del 22 ottobre ──
-- Gli originali del 21 restano: 9,30 € a Marcello, 290,04 € a
-- Cristiano, 791,50 € a Giacomo, 320,00 € a Filippo.
delete from transactions
 where id in (
   '2b1e9a0b-7f40-4b5b-ad5e-2da6db03a32d',  -- 9,30 €  "Rimborso a Marcello Abbadati"
   '18c6ea4d-5fa8-4071-9c16-327b9ed2690c',  -- 110,00 € "Rimborso a Filippo Lombardi"
   '7c8879ec-24c7-443a-a2fe-f4124f6b8773',  -- 671,00 € "Rimborso a Giacomo Gallo"
   'b621cacb-1f44-4dd9-8209-8289a1fcc722'   -- 290,00 € "Rimborso Cris"
 );

-- ── 2. Tipo e persona, nella stessa scrittura ──
--
-- In due scritture separate non si può: c'è un vincolo che pretende la
-- persona su ogni rimborso, e scrivere prima il tipo creerebbe per un
-- istante dei rimborsi senza nessuno — che è esattamente la riga che
-- il vincolo esiste per impedire. Quindi si scrivono insieme, e la
-- persona si ricava dal campo vecchio `type`, che c'è già.
--
-- Per i rimborsi il nome sta in `reimbursed_to`, per il resto in
-- `assigned_to`. "Club" non è una persona: resta null, e vuol dire
-- che i soldi sono usciti dal conto del club.
update transactions t
   set entry_type = case
         when t.type = 'rimborso' then 'reimbursement'
         when t.type = 'revenue'  then 'income'
         else                          'expense'
       end,
       member_email = coalesce(
         t.member_email,
         (select m.email
            from team_members m
           where lower(trim(m.name)) = lower(trim(
                   case when t.type = 'rimborso' then t.reimbursed_to else t.assigned_to end))
           limit 1)
       )
 where t.entry_type is null;

-- ── 3. Verifica ──
-- Atteso: nessuna riga senza tipo, nessun rimborso senza persona.
select
  count(*) filter (where entry_type is null)                                          as senza_tipo,
  count(*) filter (where entry_type in ('reimbursement','contribution')
                     and member_email is null)                                        as rimborsi_senza_persona,
  count(*)                                                                            as movimenti
from transactions;
