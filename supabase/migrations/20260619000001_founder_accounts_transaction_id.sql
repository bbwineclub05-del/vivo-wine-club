-- Link founder_accounts to transactions for auto-cascade delete
ALTER TABLE public.founder_accounts
  ADD COLUMN IF NOT EXISTS transaction_id uuid REFERENCES public.transactions(id) ON DELETE CASCADE;
