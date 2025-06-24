-- Add sync_logs table for tracking Google Calendar sync operations
CREATE TABLE public.sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE CASCADE,
  old_status TEXT,
  new_status TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on sync_logs table
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for sync_logs
CREATE POLICY "Authenticated users can view sync logs" ON public.sync_logs
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can create sync logs" ON public.sync_logs
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Admins can manage sync logs" ON public.sync_logs
  FOR ALL USING (public.get_user_role() = 'admin');

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_sync_logs_appointment_id ON public.sync_logs (appointment_id);
CREATE INDEX IF NOT EXISTS idx_sync_logs_created_at ON public.sync_logs (created_at); 