-- Link founder_accounts to the transaction auto-created when a movement is
-- settled (the real club cash movement), distinct from transaction_id which
-- links to the original expense/income that created the obligation.
ALTER TABLE public.founder_accounts
  ADD COLUMN IF NOT EXISTS settlement_transaction_id uuid REFERENCES public.transactions(id) ON DELETE SET NULL;
