-- Activity log table to track who changed what and when
CREATE TABLE IF NOT EXISTS public.activity_log (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clinic_id   UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_email  TEXT,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id   UUID,
  description TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}',
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_activity_log_clinic_created
  ON public.activity_log (clinic_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "clinic_members_view_logs" ON public.activity_log
  FOR SELECT USING (clinic_id = get_user_clinic_id());

CREATE POLICY "clinic_members_insert_logs" ON public.activity_log
  FOR INSERT WITH CHECK (clinic_id = get_user_clinic_id());

-- Trigger function for appointment changes
CREATE OR REPLACE FUNCTION public.log_appointment_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(NEW.clinic_id, auth.uid(), v_email, 'appointment.created', 'appointment', NEW.id,
           'Cita creada', jsonb_build_object('status', NEW.status, 'start_time', NEW.start_time));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(OLD.clinic_id, auth.uid(), v_email, 'appointment.deleted', 'appointment', OLD.id,
           'Cita eliminada', jsonb_build_object('old_status', OLD.status, 'start_time', OLD.start_time));
    RETURN OLD;
  END IF;

  -- UPDATE: log each significant change
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(NEW.clinic_id, auth.uid(), v_email, 'appointment.status_changed', 'appointment', NEW.id,
           'Estado cambiado: ' || OLD.status || ' → ' || NEW.status,
           jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status));
  END IF;

  IF (OLD.start_time IS DISTINCT FROM NEW.start_time) OR (OLD.therapist_id IS DISTINCT FROM NEW.therapist_id) THEN
    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(NEW.clinic_id, auth.uid(), v_email, 'appointment.rescheduled', 'appointment', NEW.id,
           'Cita reprogramada',
           jsonb_build_object('old_start', OLD.start_time, 'new_start', NEW.start_time,
                              'old_therapist', OLD.therapist_id, 'new_therapist', NEW.therapist_id));
  END IF;

  IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status) AND NEW.payment_status = 'paid' THEN
    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(NEW.clinic_id, auth.uid(), v_email, 'appointment.payment_recorded', 'appointment', NEW.id,
           'Pago registrado: $' || COALESCE(NEW.payment_amount::TEXT, '0'),
           jsonb_build_object('amount', NEW.payment_amount, 'method', NEW.payment_method));
  END IF;

  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_appointment_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.appointments
  FOR EACH ROW EXECUTE FUNCTION public.log_appointment_changes();

-- Trigger function for client edits
CREATE OR REPLACE FUNCTION public.log_client_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();
  INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
  VALUES(NEW.clinic_id, auth.uid(), v_email, 'client.updated', 'client', NEW.id,
         'Cliente editado: ' || NEW.first_name || ' ' || NEW.last_name, '{}');
  RETURN NEW;
END $$;

CREATE TRIGGER trg_log_client_changes
  AFTER UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.log_client_changes();
