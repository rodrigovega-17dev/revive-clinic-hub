
-- Add expenses table to track daily expenses
CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  recorded_by UUID REFERENCES auth.users,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add daily_cash_summary table to track opening/closing cash
CREATE TABLE public.daily_cash_summary (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL UNIQUE,
  opening_cash NUMERIC DEFAULT 0,
  closing_cash NUMERIC DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  total_expenses NUMERIC DEFAULT 0,
  cash_payments NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on both tables
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_cash_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expenses
CREATE POLICY "Users can view all expenses" 
  ON public.expenses 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can create expenses" 
  ON public.expenses 
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "Users can update expenses" 
  ON public.expenses 
  FOR UPDATE 
  USING (true);

-- Create RLS policies for daily cash summary
CREATE POLICY "Users can view daily cash summary" 
  ON public.daily_cash_summary 
  FOR SELECT 
  USING (true);

CREATE POLICY "Users can manage daily cash summary" 
  ON public.daily_cash_summary 
  FOR ALL
  USING (true);

-- Insert some sample data to see the functionality working
INSERT INTO public.payments (client_id, amount, method, payment_date, description) 
SELECT 
  (SELECT id FROM public.clients LIMIT 1),
  50.00,
  'cash',
  CURRENT_DATE,
  'Sample payment for testing'
WHERE EXISTS (SELECT 1 FROM public.clients);

INSERT INTO public.expenses (date, amount, description, category)
VALUES 
  (CURRENT_DATE, 25.00, 'Office supplies', 'supplies'),
  (CURRENT_DATE, 15.00, 'Coffee and snacks', 'office'),
  (CURRENT_DATE - INTERVAL '1 day', 30.00, 'Equipment maintenance', 'maintenance');
