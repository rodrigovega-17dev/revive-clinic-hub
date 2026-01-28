-- Seed shared document templates for all existing clinics.
-- This ensures every clinic has the 6 core templates defined earlier:
-- - physio_initial_assessment
-- - physio_general_consent
-- - privacy_communication_consent
-- - session_attending_voucher
-- - session_clinical_note
-- - home_exercise_program

DO $$
DECLARE
  c RECORD;
BEGIN
  FOR c IN SELECT id FROM public.clinics LOOP
    -- 1) Client-level: Physiotherapy initial assessment
    INSERT INTO public.document_templates (
      clinic_id, slug, name, description, type, category, language, version, is_active, schema
    )
    SELECT
      c.id,
      'physio_initial_assessment',
      'Evaluación inicial de fisioterapia',
      'Historia clínica básica y evaluación funcional para la primera sesión.',
      'client',
      'assessment',
      'es',
      1,
      true,
      jsonb_build_object(
        'layout', 'simple',
        'sections', jsonb_build_array(
          jsonb_build_object('id', 'reason', 'label', 'Motivo de consulta / inicio', 'type', 'textarea'),
          jsonb_build_object('id', 'history', 'label', 'Historia y antecedentes relevantes', 'type', 'textarea'),
          jsonb_build_object('id', 'pain', 'label', 'Dolor (localización, intensidad, tipo)', 'type', 'textarea'),
          jsonb_build_object('id', 'function', 'label', 'Limitaciones funcionales / actividades afectadas', 'type', 'textarea'),
          jsonb_build_object('id', 'objective', 'label', 'Exploración física objetiva (ROM, fuerza, pruebas especiales)', 'type', 'textarea'),
          jsonb_build_object('id', 'assessment', 'label', 'Impresión clínica', 'type', 'textarea'),
          jsonb_build_object('id', 'plan', 'label', 'Plan de tratamiento propuesto', 'type', 'textarea')
        )
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.document_templates dt
      WHERE dt.clinic_id = c.id
        AND dt.slug = 'physio_initial_assessment'
        AND dt.version = 1
    );

    -- 2) Client-level: General informed consent for physiotherapy
    INSERT INTO public.document_templates (
      clinic_id, slug, name, description, type, category, language, version, is_active, schema
    )
    SELECT
      c.id,
      'physio_general_consent',
      'Consentimiento informado de fisioterapia',
      'Consentimiento general para intervenciones y modalidades de fisioterapia.',
      'client',
      'consent',
      'es',
      1,
      true,
      jsonb_build_object(
        'layout', 'simple',
        'sections', jsonb_build_array(
          jsonb_build_object(
            'id', 'consent_text',
            'label', 'Texto de consentimiento',
            'type', 'textarea',
            'placeholder', 'El paciente declara haber recibido información sobre los objetivos, beneficios y posibles riesgos de las intervenciones de fisioterapia...'
          ),
          jsonb_build_object('id', 'modalities', 'label', 'Modalidades autorizadas (manual, ejercicio, electroterapia, etc.)', 'type', 'textarea'),
          jsonb_build_object('id', 'risks', 'label', 'Riesgos / advertencias específicos', 'type', 'textarea'),
          jsonb_build_object('id', 'patient_signature', 'label', 'Firma del paciente', 'type', 'signature'),
          jsonb_build_object('id', 'therapist_signature', 'label', 'Firma del fisioterapeuta', 'type', 'signature')
        )
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.document_templates dt
      WHERE dt.clinic_id = c.id
        AND dt.slug = 'physio_general_consent'
        AND dt.version = 1
    );

    -- 3) Client-level: Privacy & communication consent
    INSERT INTO public.document_templates (
      clinic_id, slug, name, description, type, category, language, version, is_active, schema
    )
    SELECT
      c.id,
      'privacy_communication_consent',
      'Aviso de privacidad y consentimiento de comunicación',
      'Autorización para el tratamiento de datos personales y canales de contacto.',
      'client',
      'consent',
      'es',
      1,
      true,
      jsonb_build_object(
        'layout', 'simple',
        'sections', jsonb_build_array(
          jsonb_build_object('id', 'privacy_text', 'label', 'Aviso de privacidad', 'type', 'textarea'),
          jsonb_build_object('id', 'whatsapp', 'label', 'Autoriza contacto por WhatsApp', 'type', 'checkbox'),
          jsonb_build_object('id', 'email', 'label', 'Autoriza contacto por correo electrónico', 'type', 'checkbox'),
          jsonb_build_object('id', 'phone', 'label', 'Autoriza contacto telefónico', 'type', 'checkbox'),
          jsonb_build_object('id', 'policies', 'label', 'Políticas de cancelación / reprogramación', 'type', 'textarea'),
          jsonb_build_object('id', 'patient_signature', 'label', 'Firma del paciente', 'type', 'signature')
        )
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.document_templates dt
      WHERE dt.clinic_id = c.id
        AND dt.slug = 'privacy_communication_consent'
        AND dt.version = 1
    );

    -- 4) Appointment-level: Session attending voucher
    INSERT INTO public.document_templates (
      clinic_id, slug, name, description, type, category, language, version, is_active, schema
    )
    SELECT
      c.id,
      'session_attending_voucher',
      'Comprobante de asistencia a sesión',
      'Constancia simple de que el paciente acudió a la sesión.',
      'appointment',
      'session_note',
      'es',
      1,
      true,
      jsonb_build_object(
        'layout', 'simple',
        'sections', jsonb_build_array(
          jsonb_build_object('id', 'session_number', 'label', 'Número de sesión', 'type', 'text'),
          jsonb_build_object('id', 'treatment_summary', 'label', 'Descripción breve del tratamiento realizado', 'type', 'textarea'),
          jsonb_build_object('id', 'tolerance', 'label', 'Tolerancia del paciente / observaciones', 'type', 'textarea'),
          jsonb_build_object('id', 'patient_signature', 'label', 'Firma del paciente', 'type', 'signature'),
          jsonb_build_object('id', 'therapist_signature', 'label', 'Firma del fisioterapeuta', 'type', 'signature')
        )
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.document_templates dt
      WHERE dt.clinic_id = c.id
        AND dt.slug = 'session_attending_voucher'
        AND dt.version = 1
    );

    -- 5) Appointment-level: Session clinical note (SOAP-style)
    INSERT INTO public.document_templates (
      clinic_id, slug, name, description, type, category, language, version, is_active, schema
    )
    SELECT
      c.id,
      'session_clinical_note',
      'Nota clínica de sesión (SOAP)',
      'Registro breve y estructurado por sesión.',
      'appointment',
      'session_note',
      'es',
      1,
      true,
      jsonb_build_object(
        'layout', 'simple',
        'sections', jsonb_build_array(
          jsonb_build_object('id', 'subjective', 'label', 'S - Subjetivo (cambios desde la última sesión)', 'type', 'textarea'),
          jsonb_build_object('id', 'objective', 'label', 'O - Objetivo (mediciones, pruebas, ROM, etc.)', 'type', 'textarea'),
          jsonb_build_object('id', 'assessment', 'label', 'A - Análisis / impresión clínica', 'type', 'textarea'),
          jsonb_build_object('id', 'plan', 'label', 'P - Plan (siguientes sesiones, ejercicios en casa)', 'type', 'textarea')
        )
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.document_templates dt
      WHERE dt.clinic_id = c.id
        AND dt.slug = 'session_clinical_note'
        AND dt.version = 1
    );

    -- 6) Appointment-level: Home exercise program
    INSERT INTO public.document_templates (
      clinic_id, slug, name, description, type, category, language, version, is_active, schema
    )
    SELECT
      c.id,
      'home_exercise_program',
      'Programa de ejercicios en casa',
      'Listado simple de ejercicios recomendados al paciente.',
      'appointment',
      'exercise_program',
      'es',
      1,
      true,
      jsonb_build_object(
        'layout', 'simple',
        'sections', jsonb_build_array(
          jsonb_build_object(
            'id', 'exercises',
            'label', 'Ejercicios recomendados (nombre, series, repeticiones, frecuencia)',
            'type', 'textarea',
            'placeholder', '1) Ejercicio...\n2) Ejercicio...'
          ),
          jsonb_build_object('id', 'precautions', 'label', 'Precauciones / contraindicaciones', 'type', 'textarea'),
          jsonb_build_object('id', 'notes', 'label', 'Notas adicionales para el paciente', 'type', 'textarea')
        )
      )
    WHERE NOT EXISTS (
      SELECT 1
      FROM public.document_templates dt
      WHERE dt.clinic_id = c.id
        AND dt.slug = 'home_exercise_program'
        AND dt.version = 1
    );
  END LOOP;
END;
$$;

