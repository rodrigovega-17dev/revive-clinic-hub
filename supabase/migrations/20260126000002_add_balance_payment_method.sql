-- Allow balance as a payment method for client credits
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_type t
    WHERE t.typname = 'payment_method'
  ) THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      WHERE t.typname = 'payment_method' AND e.enumlabel = 'balance'
    ) THEN
      ALTER TYPE public.payment_method ADD VALUE 'balance';
    END IF;
  END IF;
END $$;
