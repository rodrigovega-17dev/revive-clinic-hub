-- Add richer appointment activity descriptions with date, time, and duration details.
-- This migration keeps the same trigger and action types but improves the description
-- and metadata payload for created, rescheduled, status, treatment, and payment events.

CREATE OR REPLACE FUNCTION public.log_appointment_changes()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_email               TEXT;
  v_clinic_id           UUID;
  v_timezone            TEXT := 'UTC';
  v_client_name         TEXT;
  v_new_therapist_name  TEXT;
  v_old_therapist_name  TEXT;
  v_new_treatment_name  TEXT;
  v_old_treatment_name  TEXT;
  v_new_start           TEXT;
  v_new_end             TEXT;
  v_old_start           TEXT;
  v_old_end             TEXT;
  v_new_duration_mins   INT;
  v_old_duration_mins   INT;
  v_status_es           TEXT;
  v_old_status_es       TEXT;
  v_amount              TEXT;
  v_method_es           TEXT;
BEGIN
  SELECT email INTO v_email FROM auth.users WHERE id = auth.uid();

  IF TG_OP = 'DELETE' THEN
    v_clinic_id := OLD.clinic_id;
  ELSE
    v_clinic_id := NEW.clinic_id;
  END IF;

  SELECT COALESCE(c.timezone, 'UTC')
    INTO v_timezone
  FROM public.clinics c
  WHERE c.id = v_clinic_id
  LIMIT 1;

  IF TG_OP = 'INSERT' THEN
    SELECT COALESCE(c.first_name || ' ' || c.last_name, 'Desconocido')
      INTO v_client_name
    FROM public.clients c
    WHERE c.id = NEW.client_id;

    SELECT COALESCE(t.first_name || ' ' || t.last_name, 'Sin terapeuta')
      INTO v_new_therapist_name
    FROM public.therapists t
    WHERE t.id = NEW.therapist_id;

    IF NEW.treatment_id IS NOT NULL THEN
      SELECT tr.name INTO v_new_treatment_name
      FROM public.treatments tr
      WHERE tr.id = NEW.treatment_id;
    END IF;

    v_new_start := to_char(NEW.start_time AT TIME ZONE v_timezone, 'DD/MM/YYYY HH24:MI');
    v_new_end := to_char(NEW.end_time AT TIME ZONE v_timezone, 'HH24:MI');
    v_new_duration_mins := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60)::INT);

    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(
      NEW.clinic_id,
      auth.uid(),
      v_email,
      'appointment.created',
      'appointment',
      NEW.id,
      'Cita creada: '
        || COALESCE(v_client_name, 'Desconocido')
        || ' con '
        || COALESCE(v_new_therapist_name, 'Sin terapeuta')
        || ' – '
        || v_new_start
        || ' a '
        || v_new_end
        || ' ('
        || v_new_duration_mins
        || ' min)'
        || CASE
             WHEN v_new_treatment_name IS NULL OR v_new_treatment_name = '' THEN ''
             ELSE ' · Tratamiento: ' || v_new_treatment_name
           END,
      jsonb_build_object(
        'status', NEW.status,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'duration_minutes', v_new_duration_mins,
        'client_name', v_client_name,
        'therapist_name', v_new_therapist_name,
        'treatment_name', v_new_treatment_name,
        'timezone', v_timezone
      )
    );
    RETURN NEW;
  END IF;

  IF TG_OP = 'DELETE' THEN
    SELECT COALESCE(c.first_name || ' ' || c.last_name, 'Desconocido')
      INTO v_client_name
    FROM public.clients c
    WHERE c.id = OLD.client_id;

    SELECT COALESCE(t.first_name || ' ' || t.last_name, 'Sin terapeuta')
      INTO v_old_therapist_name
    FROM public.therapists t
    WHERE t.id = OLD.therapist_id;

    IF OLD.treatment_id IS NOT NULL THEN
      SELECT tr.name INTO v_old_treatment_name
      FROM public.treatments tr
      WHERE tr.id = OLD.treatment_id;
    END IF;

    v_old_start := to_char(OLD.start_time AT TIME ZONE v_timezone, 'DD/MM/YYYY HH24:MI');
    v_old_end := to_char(OLD.end_time AT TIME ZONE v_timezone, 'HH24:MI');
    v_old_duration_mins := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (OLD.end_time - OLD.start_time)) / 60)::INT);

    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(
      OLD.clinic_id,
      auth.uid(),
      v_email,
      'appointment.deleted',
      'appointment',
      OLD.id,
      'Cita eliminada: '
        || COALESCE(v_client_name, 'Desconocido')
        || ' con '
        || COALESCE(v_old_therapist_name, 'Sin terapeuta')
        || ' – '
        || v_old_start
        || ' a '
        || v_old_end
        || ' ('
        || v_old_duration_mins
        || ' min)'
        || CASE
             WHEN v_old_treatment_name IS NULL OR v_old_treatment_name = '' THEN ''
             ELSE ' · Tratamiento: ' || v_old_treatment_name
           END,
      jsonb_build_object(
        'old_status', OLD.status,
        'start_time', OLD.start_time,
        'end_time', OLD.end_time,
        'duration_minutes', v_old_duration_mins,
        'client_name', v_client_name,
        'therapist_name', v_old_therapist_name,
        'treatment_name', v_old_treatment_name,
        'timezone', v_timezone
      )
    );
    RETURN OLD;
  END IF;

  -- UPDATE: resolve names/details once for rich event descriptions.
  SELECT COALESCE(c.first_name || ' ' || c.last_name, 'Desconocido')
    INTO v_client_name
  FROM public.clients c
  WHERE c.id = NEW.client_id;

  SELECT COALESCE(t.first_name || ' ' || t.last_name, 'Sin terapeuta')
    INTO v_new_therapist_name
  FROM public.therapists t
  WHERE t.id = NEW.therapist_id;

  SELECT COALESCE(t.first_name || ' ' || t.last_name, 'Sin terapeuta')
    INTO v_old_therapist_name
  FROM public.therapists t
  WHERE t.id = OLD.therapist_id;

  IF NEW.treatment_id IS NOT NULL THEN
    SELECT tr.name INTO v_new_treatment_name
    FROM public.treatments tr
    WHERE tr.id = NEW.treatment_id;
  END IF;

  IF OLD.treatment_id IS NOT NULL THEN
    SELECT tr.name INTO v_old_treatment_name
    FROM public.treatments tr
    WHERE tr.id = OLD.treatment_id;
  END IF;

  v_new_start := to_char(NEW.start_time AT TIME ZONE v_timezone, 'DD/MM/YYYY HH24:MI');
  v_new_end := to_char(NEW.end_time AT TIME ZONE v_timezone, 'HH24:MI');
  v_old_start := to_char(OLD.start_time AT TIME ZONE v_timezone, 'DD/MM/YYYY HH24:MI');
  v_old_end := to_char(OLD.end_time AT TIME ZONE v_timezone, 'HH24:MI');
  v_new_duration_mins := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (NEW.end_time - NEW.start_time)) / 60)::INT);
  v_old_duration_mins := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (OLD.end_time - OLD.start_time)) / 60)::INT);

  IF OLD.status IS DISTINCT FROM NEW.status THEN
    -- Cast to text so CASE does not try to coerce labels into appointment_status enum.
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
    VALUES(
      NEW.clinic_id,
      auth.uid(),
      v_email,
      'appointment.status_changed',
      'appointment',
      NEW.id,
      COALESCE(v_client_name, 'Desconocido')
        || ': '
        || v_old_status_es
        || ' → '
        || v_status_es
        || ' · '
        || v_new_start
        || ' a '
        || v_new_end
        || ' ('
        || v_new_duration_mins
        || ' min)',
      jsonb_build_object(
        'old_status', OLD.status,
        'new_status', NEW.status,
        'client_name', v_client_name,
        'therapist_name', v_new_therapist_name,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'duration_minutes', v_new_duration_mins,
        'timezone', v_timezone
      )
    );
  END IF;

  IF (OLD.start_time IS DISTINCT FROM NEW.start_time)
     OR (OLD.end_time IS DISTINCT FROM NEW.end_time)
     OR (OLD.therapist_id IS DISTINCT FROM NEW.therapist_id) THEN
    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(
      NEW.clinic_id,
      auth.uid(),
      v_email,
      'appointment.rescheduled',
      'appointment',
      NEW.id,
      'Cita reprogramada: '
        || COALESCE(v_client_name, 'Desconocido')
        || ' · '
        || v_old_start
        || ' a '
        || v_old_end
        || ' ('
        || v_old_duration_mins
        || ' min)'
        || ' con '
        || COALESCE(v_old_therapist_name, 'Sin terapeuta')
        || ' → '
        || v_new_start
        || ' a '
        || v_new_end
        || ' ('
        || v_new_duration_mins
        || ' min)'
        || ' con '
        || COALESCE(v_new_therapist_name, 'Sin terapeuta'),
      jsonb_build_object(
        'old_start', OLD.start_time,
        'new_start', NEW.start_time,
        'old_end', OLD.end_time,
        'new_end', NEW.end_time,
        'old_duration_minutes', v_old_duration_mins,
        'new_duration_minutes', v_new_duration_mins,
        'old_therapist', OLD.therapist_id,
        'new_therapist', NEW.therapist_id,
        'old_therapist_name', v_old_therapist_name,
        'new_therapist_name', v_new_therapist_name,
        'client_name', v_client_name,
        'timezone', v_timezone
      )
    );
  END IF;

  IF OLD.treatment_id IS DISTINCT FROM NEW.treatment_id THEN
    INSERT INTO public.activity_log(clinic_id, user_id, user_email, action_type, entity_type, entity_id, description, metadata)
    VALUES(
      NEW.clinic_id,
      auth.uid(),
      v_email,
      'appointment.treatment_changed',
      'appointment',
      NEW.id,
      'Tratamiento actualizado: '
        || COALESCE(v_client_name, 'Desconocido')
        || ' · '
        || COALESCE(v_old_treatment_name, 'Sin tratamiento')
        || ' → '
        || COALESCE(v_new_treatment_name, 'Sin tratamiento')
        || ' · '
        || v_new_start
        || ' a '
        || v_new_end
        || ' ('
        || v_new_duration_mins
        || ' min)',
      jsonb_build_object(
        'old_treatment_id', OLD.treatment_id,
        'new_treatment_id', NEW.treatment_id,
        'old_treatment_name', v_old_treatment_name,
        'new_treatment_name', v_new_treatment_name,
        'client_name', v_client_name,
        'therapist_name', v_new_therapist_name,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'duration_minutes', v_new_duration_mins,
        'timezone', v_timezone
      )
    );
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
    VALUES(
      NEW.clinic_id,
      auth.uid(),
      v_email,
      'appointment.payment_recorded',
      'appointment',
      NEW.id,
      'Pago registrado '
        || v_amount
        || ' ('
        || v_method_es
        || '): '
        || COALESCE(v_client_name, 'Desconocido')
        || ' con '
        || COALESCE(v_new_therapist_name, 'Sin terapeuta')
        || ' · '
        || v_new_start
        || ' a '
        || v_new_end
        || ' ('
        || v_new_duration_mins
        || ' min)',
      jsonb_build_object(
        'amount', NEW.payment_amount,
        'method', NEW.payment_method,
        'client_name', v_client_name,
        'therapist_name', v_new_therapist_name,
        'start_time', NEW.start_time,
        'end_time', NEW.end_time,
        'duration_minutes', v_new_duration_mins,
        'timezone', v_timezone
      )
    );
  END IF;

  RETURN NEW;
END $$;
