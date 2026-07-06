-- Enrich activity log descriptions with client name, therapist name, and appointment time.
-- Replaces the sparse "Cita creada" messages with full context like:
--   "Cita creada: Maria Lopez con Dr. Vega – 06/07/2026 10:00"
--   "Maria Lopez: Programada → En progreso (06/07/2026 10:00)"
--   "Pago registrado $1,500.00 (Efectivo): Maria Lopez con Dr. Vega"
--
-- IMPORTANT: the status/method label CASE expressions cast their operand and
-- ELSE branch to text. A simple `CASE NEW.status WHEN ... ELSE NEW.status END`
-- makes Postgres resolve the CASE result to the appointment_status enum and try
-- to cast the Spanish labels back into the enum, which fails at runtime with
-- 22P02 (invalid input value for enum) and blocks every status update.

CREATE OR REPLACE FUNCTION public.log_appointment_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email          TEXT;
  v_client_name    TEXT;
  v_therapist_name TEXT;
  v_apt_time       TEXT;
  v_old_apt_time   TEXT;
  v_status_es      TEXT;
  v_old_status_es  TEXT;
  v_amount         TEXT;
  v_method_es      TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(c.first_name || ' ' || c.last_name, 'Desconocido')
      INTO v_client_name FROM public.clients c WHERE c.id = NEW.client_id;
    SELECT COALESCE(t.first_name || ' ' || t.last_name, 'Sin terapeuta')
      INTO v_therapist_name FROM public.therapists t WHERE t.id = NEW.therapist_id;
    v_apt_time := to_char(NEW.start_time AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI');

    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(NEW.clinic_id, auth.uid(), v_email, 'appointment.created', 'appointment', NEW.id,
           'Cita creada: ' || COALESCE(v_client_name, 'Desconocido') || ' con ' || COALESCE(v_therapist_name, 'Sin terapeuta') || ' – ' || v_apt_time,
           jsonb_build_object('status', NEW.status, 'start_time', NEW.start_time,
                              'client_name', v_client_name, 'therapist_name', v_therapist_name));
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(c.first_name || ' ' || c.last_name, 'Desconocido')
      INTO v_client_name FROM public.clients c WHERE c.id = OLD.client_id;
    SELECT COALESCE(t.first_name || ' ' || t.last_name, 'Sin terapeuta')
      INTO v_therapist_name FROM public.therapists t WHERE t.id = OLD.therapist_id;
    v_apt_time := to_char(OLD.start_time AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI');

    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(OLD.clinic_id, auth.uid(), v_email, 'appointment.deleted', 'appointment', OLD.id,
           'Cita eliminada: ' || COALESCE(v_client_name, 'Desconocido') || ' con ' || COALESCE(v_therapist_name, 'Sin terapeuta') || ' – ' || v_apt_time,
           jsonb_build_object('old_status', OLD.status, 'start_time', OLD.start_time,
                              'client_name', v_client_name, 'therapist_name', v_therapist_name));
    RETURN OLD;
  END IF;

  -- UPDATE: resolve names once, reuse for all sub-events
  SELECT COALESCE(c.first_name || ' ' || c.last_name, 'Desconocido')
    INTO v_client_name FROM public.clients c WHERE c.id = NEW.client_id;
  SELECT COALESCE(t.first_name || ' ' || t.last_name, 'Sin terapeuta')
    INTO v_therapist_name FROM public.therapists t WHERE t.id = NEW.therapist_id;
  v_apt_time := to_char(NEW.start_time AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI');

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    v_status_es := CASE NEW.status::text
      WHEN 'scheduled'        THEN 'Programada'
      WHEN 'confirmed'        THEN 'Confirmada'
      WHEN 'in_progress'      THEN 'En progreso'
      WHEN 'waiting_checkout' THEN 'Esperando salida'
      WHEN 'completed'        THEN 'Completada'
      WHEN 'cancelled'        THEN 'Cancelada'
      WHEN 'no_show'          THEN 'No se presentó'
      ELSE NEW.status::text END;
    v_old_status_es := CASE OLD.status::text
      WHEN 'scheduled'        THEN 'Programada'
      WHEN 'confirmed'        THEN 'Confirmada'
      WHEN 'in_progress'      THEN 'En progreso'
      WHEN 'waiting_checkout' THEN 'Esperando salida'
      WHEN 'completed'        THEN 'Completada'
      WHEN 'cancelled'        THEN 'Cancelada'
      WHEN 'no_show'          THEN 'No se presentó'
      ELSE OLD.status::text END;

    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(NEW.clinic_id, auth.uid(), v_email, 'appointment.status_changed', 'appointment', NEW.id,
           COALESCE(v_client_name, 'Desconocido') || ': ' || v_old_status_es || ' → ' || v_status_es || ' (' || v_apt_time || ')',
           jsonb_build_object('old_status', OLD.status, 'new_status', NEW.status,
                              'client_name', v_client_name, 'therapist_name', v_therapist_name));
  END IF;

  IF (OLD.start_time IS DISTINCT FROM NEW.start_time) OR (OLD.therapist_id IS DISTINCT FROM NEW.therapist_id) THEN
    v_old_apt_time := to_char(OLD.start_time AT TIME ZONE 'UTC', 'DD/MM/YYYY HH24:MI');

    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(NEW.clinic_id, auth.uid(), v_email, 'appointment.rescheduled', 'appointment', NEW.id,
           'Cita reprogramada: ' || COALESCE(v_client_name, 'Desconocido') || ' – ' || v_old_apt_time || ' → ' || v_apt_time,
           jsonb_build_object('old_start', OLD.start_time, 'new_start', NEW.start_time,
                              'client_name', v_client_name, 'therapist_name', v_therapist_name));
  END IF;

  IF (OLD.payment_status IS DISTINCT FROM NEW.payment_status) AND NEW.payment_status = 'paid' THEN
    v_amount := '$' || COALESCE(TO_CHAR(NEW.payment_amount, 'FM999,999,990.00'), '0');
    v_method_es := CASE NEW.payment_method::text
      WHEN 'cash'      THEN 'Efectivo'
      WHEN 'card'      THEN 'Tarjeta'
      WHEN 'transfer'  THEN 'Transferencia'
      WHEN 'insurance' THEN 'Seguro'
      WHEN 'balance'   THEN 'Balance'
      ELSE COALESCE(NEW.payment_method::text, '') END;

    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(NEW.clinic_id, auth.uid(), v_email, 'appointment.payment_recorded', 'appointment', NEW.id,
           'Pago registrado ' || v_amount || ' (' || v_method_es || '): ' || COALESCE(v_client_name, 'Desconocido') || ' con ' || COALESCE(v_therapist_name, 'Sin terapeuta'),
           jsonb_build_object('amount', NEW.payment_amount, 'method', NEW.payment_method,
                              'client_name', v_client_name, 'therapist_name', v_therapist_name));
  END IF;

  RETURN NEW;
END $$;
