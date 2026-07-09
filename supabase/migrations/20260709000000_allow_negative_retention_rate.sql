-- Allow negative retention rates: some clinics use a negative retention (e.g. -16%)
-- to gross up a therapist's pay as a fiscal support measure, rather than withhold from it.
alter table public.therapists
  drop constraint therapists_retention_rate_check;

alter table public.therapists
  add constraint therapists_retention_rate_check
  check (retention_rate >= -100 and retention_rate <= 100);
