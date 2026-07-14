-- Expenses had no payment method, so the daily corte de caja subtracted every
-- expense from the cash drawer regardless of how it was actually paid — a large
-- non-cash expense (e.g. an INFONAVIT payment via bank transfer) would incorrectly
-- deflate "amount in cashier" even though no physical cash left the register.
-- Default/backfill to 'cash' to preserve historical corte de caja figures, which
-- already assumed every expense was a cash-drawer outflow.
ALTER TABLE public.expenses
  ADD COLUMN payment_method TEXT NOT NULL DEFAULT 'cash';
