-- ─────────────────────────────────────────────────────────────────
-- Revenue categories v2: rinomina le vecchie voci, aggiunge le nuove
-- I ricavi esistenti vengono migrati automaticamente.
-- ─────────────────────────────────────────────────────────────────

-- 1. Rinomina categorie esistenti (e migra le transazioni associate)

UPDATE budget_categories SET name = 'Quote Membership'
  WHERE name = 'Quote associative';
UPDATE transactions SET budget_category = 'Quote Membership'
  WHERE budget_category = 'Quote associative';

UPDATE budget_categories SET name = 'Vendita Merch'
  WHERE name = 'Vendita Merchandise';
UPDATE transactions SET budget_category = 'Vendita Merch'
  WHERE budget_category = 'Vendita Merchandise';

UPDATE budget_categories SET name = 'Sponsorizzazioni Brand'
  WHERE name = 'Sponsorizzazioni';
UPDATE transactions SET budget_category = 'Sponsorizzazioni Brand'
  WHERE budget_category = 'Sponsorizzazioni';

UPDATE budget_categories SET name = 'Donazioni / Contributi'
  WHERE name = 'Donazioni e lasciti';
UPDATE transactions SET budget_category = 'Donazioni / Contributi'
  WHERE budget_category = 'Donazioni e lasciti';

UPDATE budget_categories SET name = 'Altro'
  WHERE name = 'Altre Entrate';
UPDATE transactions SET budget_category = 'Altro'
  WHERE budget_category = 'Alte Entrate';

UPDATE budget_categories SET name = 'Sponsorizzazioni Evento'
  WHERE name = 'Contributi per attività ed eventi';
UPDATE transactions SET budget_category = 'Sponsorizzazioni Evento'
  WHERE budget_category = 'Contributi per attività ed eventi';

-- 2. Aggiunge nuove categorie di ricavo non ancora presenti

INSERT INTO budget_categories (name, type) VALUES
  ('Vendita Biglietti Eventi', 'revenue'),
  ('Vendita Vino',             'revenue'),
  ('Rinnovi Membership',       'revenue'),
  ('Incassi Door',             'revenue'),
  ('Collaborazioni',           'revenue'),
  ('Commissioni Partner',      'revenue')
ON CONFLICT (name) DO NOTHING;
