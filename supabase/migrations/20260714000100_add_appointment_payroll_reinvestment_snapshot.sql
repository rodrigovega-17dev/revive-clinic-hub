-- Freeze reinvestment terms on each appointment alongside the other payroll_* snapshot
-- columns, same nullable/no-default convention as the rest of that column family.
ALTER TABLE public.appointments
ADD COLUMN payroll_reinvestment_enabled BOOLEAN,
ADD COLUMN payroll_reinvestment_percentage NUMERIC(5,2);

COMMENT ON COLUMN public.appointments.payroll_reinvestment_enabled IS
  'Snapshot of therapist reinvestment_enabled at payout time.';
COMMENT ON COLUMN public.appointments.payroll_reinvestment_percentage IS
  'Snapshot of therapist reinvestment_percentage at payout time.';

-- No backfill needed. Existing frozen appointments (payroll_snapshot_at IS NOT NULL) simply
-- get NULL for these two new columns. resolveAppointmentPayrollConfig returns snapshot
-- columns as-is once payroll_snapshot_at is set, and computeTherapistPayroll treats a null
-- reinvestmentEnabled as `!!null = false` — so historical, already-paid-out sessions
-- correctly keep computing exactly as they did before this feature existed (no reinvestment
-- applied retroactively), matching the non-retroactive intent of the snapshot mechanism.
