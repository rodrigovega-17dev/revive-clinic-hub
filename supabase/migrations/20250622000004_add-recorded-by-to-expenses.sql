-- Add recorded_by field to expenses table to track who recorded each expense
ALTER TABLE public.expenses 
ADD COLUMN recorded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Add comment to explain the new field
COMMENT ON COLUMN public.expenses.recorded_by IS 'User who recorded this expense';

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_expenses_recorded_by ON public.expenses (recorded_by); 