-- Payroll snapshots should freeze at *payout* time, not at appointment-completion time.
-- The previous migration (20260707021500) backfilled payroll_* columns on every completed
-- appointment using whatever the therapist's config happened to be at that moment, which
-- made it look like therapist compensation edits weren't being reflected — because those
-- sessions were already (incorrectly) frozen before anyone had actually been paid.
--
-- Since no therapist has ever been paid out yet (public.therapist_payouts is empty at the
-- time of this migration), it's safe to clear every existing snapshot: nothing here has
-- actually been locked in by a real payout, so pending/unpaid sessions should go back to
-- following the therapist's live compensation config until a payout freezes them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.therapist_payouts) THEN
    UPDATE public.appointments
    SET
      payroll_compensation_type = NULL,
      payroll_commission_percentage = NULL,
      payroll_fixed_session_amount = NULL,
      payroll_retention_enabled = NULL,
      payroll_retention_rate = NULL,
      payroll_incentive_enabled = NULL,
      payroll_incentive_threshold_sessions = NULL,
      payroll_incentive_percentage_bonus = NULL,
      payroll_incentive_fixed_bonus = NULL,
      payroll_snapshot_at = NULL
    WHERE payroll_snapshot_at IS NOT NULL;
  END IF;
END $$;
