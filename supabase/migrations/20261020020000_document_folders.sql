-- ─────────────────────────────────────────────────────────────────────
-- Cartelle vere per i documenti.
--
-- Finora la "categoria" era una lista di sei parole scritte dentro
-- components/DocumentManager.tsx: per aggiungerne una bisognava toccare
-- il codice e ridistribuire il sito. Qui diventa una tabella, così le
-- cartelle si creano dall'area riservata.
--
-- La colonna `documents.category` NON viene toccata né eliminata: resta
-- lì com'è, in modo che se qualcosa andasse storto si possa tornare
-- indietro senza aver perso nulla.
--
-- `on delete set null`: cancellare una cartella non cancella i file che
-- conteneva, che tornano semplicemente fuori da ogni cartella. Un
-- cestino che si porta via venti PDF dello statuto con un tocco non è
-- una cosa che voglio costruire.
-- ─────────────────────────────────────────────────────────────────────

create table if not exists document_folders (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  color      text not null default '#731515',
  created_at timestamptz not null default now()
);

-- Due cartelle "Contratti" e "contratti" sarebbero due posti diversi
-- dove cercare la stessa cosa.
create unique index if not exists document_folders_name_unique
  on document_folders (lower(name));

-- Come le altre tabelle dell'area: nessuna policy, quindi vi accede
-- soltanto la service-role dalle API, mai il browser.
alter table document_folders enable row level security;

alter table documents
  add column if not exists folder_id uuid
  references document_folders(id) on delete set null;

create index if not exists documents_folder_id_idx on documents (folder_id);

-- ── Travaso: ogni categoria in uso diventa una cartella ──
-- I colori sono quelli che le categorie avevano già nell'interfaccia
-- vecchia, così nessuno deve reimparare niente.
insert into document_folders (name, color)
select v.name, v.color
  from (values
          ('Statuto',    '#731515'),
          ('Pitch',      '#A3561A'),
          ('Contratti',  '#1F5F8B'),
          ('Verbali',    '#5B3A8C'),
          ('Preventivi', '#2F7A4F'),
          ('Altro',      '#7A5252')
       ) as v(name, color)
 where exists (select 1 from documents d where d.category = v.name)
   and not exists (
         select 1 from document_folders f where lower(f.name) = lower(v.name)
       );

update documents d
   set folder_id = f.id
  from document_folders f
 where lower(f.name) = lower(d.category)
   and d.folder_id is null;

-- ── Verifica ──
-- Prima query: quante cartelle e quanti file ciascuna.
-- Seconda: quanti documenti sono rimasti senza cartella (atteso 0, a
-- meno che qualcuno avesse una categoria fuori dalle sei di sopra).
select f.name, f.color, count(d.id) as file
  from document_folders f
  left join documents d on d.folder_id = f.id
 group by f.name, f.color
 order by f.name;

select count(*) as documenti_senza_cartella
  from documents
 where folder_id is null;
