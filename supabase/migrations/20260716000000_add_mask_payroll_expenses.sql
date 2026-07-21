-- When enabled (only meaningful while finance_pin_required is also true), payout expenses
-- (expenses.category = 'Payroll') still appear in Finance reports but with their
-- description/amount hidden, since /finance itself isn't gated behind the finance PIN.
ALTER TABLE public.security_settings
  ADD COLUMN IF NOT EXISTS mask_payroll_expenses boolean DEFAULT false;
