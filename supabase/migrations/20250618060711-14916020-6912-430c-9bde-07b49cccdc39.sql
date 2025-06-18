
-- Insert dummy clients
INSERT INTO public.clients (first_name, last_name, email, phone, charge_amount, is_active) VALUES
('Maria', 'Rodriguez', 'maria.rodriguez@email.com', '+1-555-0101', 80.00, true),
('John', 'Smith', 'john.smith@email.com', '+1-555-0102', 75.00, true),
('Emily', 'Johnson', 'emily.johnson@email.com', '+1-555-0103', 90.00, true),
('Michael', 'Brown', 'michael.brown@email.com', '+1-555-0104', 85.00, true),
('Sarah', 'Davis', 'sarah.davis@email.com', '+1-555-0105', 70.00, true),
('David', 'Wilson', 'david.wilson@email.com', '+1-555-0106', 95.00, true),
('Lisa', 'Miller', 'lisa.miller@email.com', '+1-555-0107', 80.00, true),
('Robert', 'Anderson', 'robert.anderson@email.com', '+1-555-0108', 75.00, true),
('Jennifer', 'Taylor', 'jennifer.taylor@email.com', '+1-555-0109', 85.00, true),
('William', 'Thomas', 'william.thomas@email.com', '+1-555-0110', 90.00, true);

-- Insert dummy therapists
INSERT INTO public.therapists (first_name, last_name, specialties, is_active) VALUES
('Dr. Anna', 'Martinez', ARRAY['Physical Therapy', 'Sports Medicine'], true),
('Dr. James', 'Lee', ARRAY['Massage Therapy', 'Pain Management'], true),
('Dr. Sofia', 'Garcia', ARRAY['Rehabilitation', 'Manual Therapy'], true);

-- Insert dummy treatments
INSERT INTO public.treatments (name, description, duration_minutes, price, is_active) VALUES
('Deep Tissue Massage', 'Intensive massage therapy for muscle relief', 60, 80.00, true),
('Physical Therapy Session', 'Rehabilitation and strengthening exercises', 45, 75.00, true),
('Sports Massage', 'Targeted massage for athletes', 60, 90.00, true),
('Manual Therapy', 'Hands-on treatment for joint mobility', 50, 85.00, true),
('Pain Management Session', 'Comprehensive pain relief treatment', 60, 95.00, true);

-- Insert dummy appointments for the past 15 days
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '14 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  )::date AS appointment_date
),
client_ids AS (
  SELECT id FROM public.clients LIMIT 10
),
therapist_ids AS (
  SELECT id FROM public.therapists LIMIT 3
),
treatment_ids AS (
  SELECT id FROM public.treatments LIMIT 5
)
INSERT INTO public.appointments (
  client_id, 
  therapist_id, 
  treatment_id, 
  start_time, 
  end_time, 
  status, 
  payment_amount, 
  payment_status
)
SELECT 
  (SELECT id FROM client_ids ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM therapist_ids ORDER BY RANDOM() LIMIT 1),
  (SELECT id FROM treatment_ids ORDER BY RANDOM() LIMIT 1),
  appointment_date + (floor(random() * 8 + 9) || ' hours')::interval + (floor(random() * 4) * 15 || ' minutes')::interval,
  appointment_date + (floor(random() * 8 + 9) || ' hours')::interval + (floor(random() * 4) * 15 || ' minutes')::interval + '1 hour'::interval,
  'completed',
  CASE 
    WHEN random() < 0.2 THEN 70.00
    WHEN random() < 0.4 THEN 75.00
    WHEN random() < 0.6 THEN 80.00
    WHEN random() < 0.8 THEN 85.00
    ELSE 90.00
  END,
  'paid'
FROM date_series
CROSS JOIN generate_series(1, floor(random() * 4 + 2)::int);

-- Insert payments based on completed appointments
INSERT INTO public.payments (appointment_id, client_id, amount, method, payment_date, description)
SELECT 
  a.id,
  a.client_id,
  a.payment_amount,
  CASE 
    WHEN random() < 0.4 THEN 'cash'::payment_method
    WHEN random() < 0.7 THEN 'card'::payment_method
    WHEN random() < 0.9 THEN 'transfer'::payment_method
    ELSE 'insurance'::payment_method
  END,
  a.start_time,
  CASE 
    WHEN random() < 0.3 THEN 'Therapy session payment'
    WHEN random() < 0.6 THEN 'Treatment fee'
    ELSE 'Consultation payment'
  END
FROM public.appointments a
WHERE a.status = 'completed' AND a.payment_status = 'paid';

-- Insert dummy expenses for the past 15 days
WITH date_series AS (
  SELECT generate_series(
    CURRENT_DATE - INTERVAL '14 days',
    CURRENT_DATE,
    INTERVAL '1 day'
  )::date AS expense_date
)
INSERT INTO public.expenses (date, amount, description, category)
SELECT 
  expense_date,
  CASE 
    WHEN random() < 0.2 THEN round((random() * 50 + 10)::numeric, 2)
    WHEN random() < 0.5 THEN round((random() * 100 + 20)::numeric, 2)
    WHEN random() < 0.8 THEN round((random() * 200 + 50)::numeric, 2)
    ELSE round((random() * 300 + 100)::numeric, 2)
  END,
  CASE 
    WHEN random() < 0.2 THEN 'Office supplies and equipment'
    WHEN random() < 0.4 THEN 'Cleaning and maintenance services'
    WHEN random() < 0.6 THEN 'Utility bills and office expenses'
    WHEN random() < 0.8 THEN 'Marketing and advertising costs'
    ELSE 'Equipment maintenance and repairs'
  END,
  CASE 
    WHEN random() < 0.2 THEN 'supplies'
    WHEN random() < 0.4 THEN 'maintenance'
    WHEN random() < 0.6 THEN 'utilities'
    WHEN random() < 0.8 THEN 'marketing'
    ELSE 'equipment'
  END
FROM date_series
CROSS JOIN generate_series(1, floor(random() * 3 + 1)::int);
