CREATE TABLE IF NOT EXISTS budget_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  type text NOT NULL CHECK (type IN ('revenue', 'cost', 'both')),
  created_at timestamptz DEFAULT now()
);
INSERT INTO budget_categories (name, type) VALUES
  ('Quote associative', 'revenue'),
  ('Contributi per attività ed eventi', 'revenue'),
  ('Sponsorizzazioni', 'revenue'),
  ('Vendita Merchandise', 'revenue'),
  ('Donazioni e lasciti', 'revenue'),
  ('Altre Entrate', 'revenue'),
  ('Costi organizzazione eventi', 'cost'),
  ('Affitto location', 'cost'),
  ('Catering e Food', 'cost'),
  ('Marketing e Comunicazione', 'cost'),
  ('Trasporti', 'cost'),
  ('Forniture e Materiali', 'cost'),
  ('Costi Amministrativi', 'cost'),
  ('Rimborsi Consiglio Direttivo', 'cost'),
  ('Rimborsi a Terzi', 'cost'),
  ('Altre Uscite', 'cost')
ON CONFLICT (name) DO NOTHING;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS budget_category text;
