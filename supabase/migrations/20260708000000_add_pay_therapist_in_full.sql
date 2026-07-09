-- Allow flagging clients/appointments where the therapist keeps 100% of the
-- collected amount instead of their normal commission/fixed-session compensation.
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS pay_therapist_in_full BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE public.appointments
ADD COLUMN IF NOT EXISTS pay_therapist_in_full BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.clients.pay_therapist_in_full IS
  'Default for new appointments: when true, the payment tab defaults to paying the therapist 100% of the collected amount instead of their normal commission/fixed compensation.';
COMMENT ON COLUMN public.appointments.pay_therapist_in_full IS
  'When true, this appointment''s payroll pays the therapist 100% of the pre-IVA collected amount instead of commission/fixed-session compensation (retention, if enabled, still applies).';
