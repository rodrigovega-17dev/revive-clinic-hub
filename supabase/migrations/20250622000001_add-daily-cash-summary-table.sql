-- Add daily_cash_summary table for tracking daily financial summaries
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

-- Enable RLS on daily_cash_summary table
ALTER TABLE public.daily_cash_summary ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for daily_cash_summary
CREATE POLICY "Authenticated users can view daily cash summaries" ON public.daily_cash_summary
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins and reception can manage daily cash summaries" ON public.daily_cash_summary
  FOR ALL USING (public.get_user_role() IN ('admin', 'reception'));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_daily_cash_summary_date ON public.daily_cash_summary (date);
CREATE INDEX IF NOT EXISTS idx_daily_cash_summary_created_at ON public.daily_cash_summary (created_at);

-- Add trigger for updated_at
CREATE TRIGGER update_daily_cash_summary_updated_at 
  BEFORE UPDATE ON public.daily_cash_summary
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column(); 