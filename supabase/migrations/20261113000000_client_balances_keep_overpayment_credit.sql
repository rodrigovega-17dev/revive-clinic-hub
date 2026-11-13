-- get_client_balances charged each paid session the larger of its price or everything paid toward
-- it. That was meant for credit applied with a factura (1600 + 16% IVA = 1856 drawn from the
-- balance), but it also swallowed real overpayments: a client who paid 1600 cash for a 1500
-- session lost the 100 that should have stayed as credit, and later using that credit showed up
-- as debt.
--
-- A paid session is now charged its price plus only the part of the applied credit that went
-- beyond what was still owed after real money (cash/card/transfer…). So real overpayments stay as
-- credit, and credit applied for a taxed session is consumed in full.

CREATE OR REPLACE FUNCTION public.get_client_balances(
  p_clinic_id uuid,
  p_client_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  client_id uuid,
  total_payments numeric,
  total_charges numeric,
  pending_payments numeric,
  balance numeric,
  last_payment_date timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  WITH target_clients AS (
    SELECT c.id
    FROM clients c
    WHERE c.clinic_id = p_clinic_id
      AND (p_client_ids IS NULL OR c.id = ANY (p_client_ids))
  ),
  client_payments AS (
    SELECT p.client_id,
           p.appointment_id,
           p.method,
           p.payment_date,
           CASE WHEN p.facturado THEN COALESCE(p.amount, 0) - COALESCE(p.iva_amount, 0)
                ELSE COALESCE(p.amount, 0) END AS base
    FROM payments p
    JOIN target_clients tc ON tc.id = p.client_id
    WHERE p.clinic_id = p_clinic_id
  ),
  paid_per_appointment AS (
    SELECT cp.client_id,
           cp.appointment_id,
           SUM(ABS(cp.base)) AS paid,
           SUM(CASE WHEN cp.method IS DISTINCT FROM 'balance' THEN cp.base ELSE 0 END) AS real_paid,
           SUM(CASE WHEN cp.method = 'balance' THEN ABS(cp.base) ELSE 0 END) AS credit_used
    FROM client_payments cp
    WHERE cp.appointment_id IS NOT NULL
    GROUP BY cp.client_id, cp.appointment_id
  ),
  appointment_totals AS (
    SELECT a.client_id,
           SUM(CASE WHEN COALESCE(ppa.paid, 0) > 0
                    THEN COALESCE(a.payment_amount, 0)
                         + GREATEST(0, ppa.credit_used - GREATEST(0, COALESCE(a.payment_amount, 0) - ppa.real_paid))
                    ELSE 0 END) AS total_charges,
           SUM(CASE WHEN a.payment_status IS NULL OR a.payment_status = 'pending'
                    THEN COALESCE(a.payment_amount, 0)
                    ELSE 0 END) AS pending_payments
    FROM appointments a
    JOIN target_clients tc ON tc.id = a.client_id
    LEFT JOIN paid_per_appointment ppa
      ON ppa.appointment_id = a.id AND ppa.client_id = a.client_id
    WHERE a.clinic_id = p_clinic_id
      AND a.status = 'completed'
    GROUP BY a.client_id
  ),
  payment_totals AS (
    SELECT cp.client_id,
           SUM(CASE WHEN cp.method IS DISTINCT FROM 'balance' THEN cp.base ELSE 0 END) AS total_payments,
           MAX(cp.payment_date) AS last_payment_date
    FROM client_payments cp
    GROUP BY cp.client_id
  )
  -- Rounded to cents: some stored amounts carry JS float residue (e.g. 1855.9999999999998).
  SELECT tc.id,
         ROUND(COALESCE(pay_tot.total_payments, 0), 2),
         ROUND(COALESCE(apt_tot.total_charges, 0), 2),
         ROUND(COALESCE(apt_tot.pending_payments, 0), 2),
         ROUND(COALESCE(pay_tot.total_payments, 0) - COALESCE(apt_tot.total_charges, 0), 2),
         pay_tot.last_payment_date
  FROM target_clients tc
  LEFT JOIN payment_totals pay_tot ON pay_tot.client_id = tc.id
  LEFT JOIN appointment_totals apt_tot ON apt_tot.client_id = tc.id
  ORDER BY tc.id;
$$;
