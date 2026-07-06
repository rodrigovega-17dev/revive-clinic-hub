-- Seed the medical_recipe document template for all existing clinics.
-- Also updates the new-clinic trigger function to include this template.

DO $$
DECLARE
  c RECORD;
  recipe_schema JSONB;
BEGIN
  recipe_schema := jsonb_build_object(
    'layout', 'simple',
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'header',
        'label', 'Información del Paciente',
        'type', 'group',
        'fields', jsonb_build_array(
          jsonb_build_object(
            'id', 'patient_name',
            'label', 'Nombre del Paciente',
            'type', 'text',
            'prefillFrom', 'client.full_name',
            'readonly', true
          ),
          jsonb_build_object(
            'id', 'patient_age',
            'label', 'Edad',
            'type', 'text',
            'prefillFrom', 'client.age',
            'readonly', true
          ),
          jsonb_build_object(
            'id', 'prescription_date',
            'label', 'Fecha',
            'type', 'date',
            'prefillFrom', 'appointment.date'
          ),
          jsonb_build_object(
            'id', 'doctor_name',
            'label', 'Médico / Fisioterapeuta',
            'type', 'text',
            'prefillFrom', 'therapist.full_name',
            'readonly', true
          )
        )
      ),
      jsonb_build_object(
        'id', 'diagnosis',
        'label', 'Diagnóstico / Indicación',
        'type', 'textarea',
        'placeholder', 'Diagnóstico clínico o indicación médica...'
      ),
      jsonb_build_object(
        'id', 'medications',
        'label', 'Medicamentos',
        'type', 'textarea',
        'placeholder', 'Nombre — Presentación — Dosis — Frecuencia — Duración'
      ),
      jsonb_build_object(
        'id', 'physical_therapy',
        'label', 'Terapia Física / Indicaciones',
        'type', 'textarea',
        'placeholder', 'Modalidades indicadas, frecuencia de sesiones, número de sesiones...'
      ),
      jsonb_build_object(
        'id', 'special_instructions',
        'label', 'Instrucciones Especiales / Precauciones',
        'type', 'textarea'
      ),
      jsonb_build_object(
        'id', 'next_appointment',
        'label', 'Próxima cita / Seguimiento',
        'type', 'text'
      ),
      jsonb_build_object(
        'id', 'doctor_signature',
        'label', 'Firma del Médico / Terapeuta',
        'type', 'signature'
      ),
      jsonb_build_object(
        'id', 'patient_signature',
        'label', 'Firma del Paciente (Recibí)',
        'type', 'signature'
      )
    )
  );

  FOR c IN SELECT id FROM public.clinics LOOP
    INSERT INTO public.document_templates (
      clinic_id, slug, name, description, type, category, language, version, is_active, schema
    )
    SELECT
      c.id,
      'medical_recipe',
      'Receta Médica / Prescripción',
      'Receta o prescripción médica con medicamentos, indicaciones y firma del terapeuta.',
      'appointment',
      'medical_record',
      'es',
      1,
      true,
      recipe_schema
    WHERE NOT EXISTS (
      SELECT 1 FROM public.document_templates dt
      WHERE dt.clinic_id = c.id
        AND dt.slug = 'medical_recipe'
        AND dt.version = 1
    );
  END LOOP;
END $$;


-- Update the new-clinic trigger to also seed medical_recipe going forward.
CREATE OR REPLACE FUNCTION public.seed_clinic_document_templates()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  recipe_schema JSONB;
BEGIN
  recipe_schema := jsonb_build_object(
    'layout', 'simple',
    'sections', jsonb_build_array(
      jsonb_build_object(
        'id', 'header',
        'label', 'Información del Paciente',
        'type', 'group',
        'fields', jsonb_build_array(
          jsonb_build_object('id', 'patient_name', 'label', 'Nombre del Paciente', 'type', 'text', 'prefillFrom', 'client.full_name', 'readonly', true),
          jsonb_build_object('id', 'patient_age', 'label', 'Edad', 'type', 'text', 'prefillFrom', 'client.age', 'readonly', true),
          jsonb_build_object('id', 'prescription_date', 'label', 'Fecha', 'type', 'date', 'prefillFrom', 'appointment.date'),
          jsonb_build_object('id', 'doctor_name', 'label', 'Médico / Fisioterapeuta', 'type', 'text', 'prefillFrom', 'therapist.full_name', 'readonly', true)
        )
      ),
      jsonb_build_object('id', 'diagnosis', 'label', 'Diagnóstico / Indicación', 'type', 'textarea', 'placeholder', 'Diagnóstico clínico o indicación médica...'),
      jsonb_build_object('id', 'medications', 'label', 'Medicamentos', 'type', 'textarea', 'placeholder', 'Nombre — Presentación — Dosis — Frecuencia — Duración'),
      jsonb_build_object('id', 'physical_therapy', 'label', 'Terapia Física / Indicaciones', 'type', 'textarea', 'placeholder', 'Modalidades indicadas, frecuencia de sesiones...'),
      jsonb_build_object('id', 'special_instructions', 'label', 'Instrucciones Especiales / Precauciones', 'type', 'textarea'),
      jsonb_build_object('id', 'next_appointment', 'label', 'Próxima cita / Seguimiento', 'type', 'text'),
      jsonb_build_object('id', 'doctor_signature', 'label', 'Firma del Médico / Terapeuta', 'type', 'signature'),
      jsonb_build_object('id', 'patient_signature', 'label', 'Firma del Paciente (Recibí)', 'type', 'signature')
    )
  );

  -- 1) Physiotherapy initial assessment
  INSERT INTO public.document_templates (clinic_id, slug, name, description, type, category, language, version, is_active, schema)
  VALUES (
    NEW.id, 'physio_initial_assessment', 'Evaluación inicial de fisioterapia',
    'Historia clínica básica y evaluación funcional para la primera sesión.',
    'client', 'assessment', 'es', 1, true,
    jsonb_build_object('layout', 'simple', 'sections', jsonb_build_array(
      jsonb_build_object('id', 'header', 'label', 'Encabezado', 'type', 'group', 'fields', jsonb_build_array(
        jsonb_build_object('id', 'client_name', 'label', 'Paciente', 'type', 'text', 'prefillFrom', 'client.full_name', 'readonly', true),
        jsonb_build_object('id', 'client_age', 'label', 'Edad', 'type', 'text', 'prefillFrom', 'client.age', 'readonly', true),
        jsonb_build_object('id', 'therapist_name', 'label', 'Fisioterapeuta', 'type', 'text', 'prefillFrom', 'therapist.full_name', 'readonly', true)
      )),
      jsonb_build_object('id', 'reason', 'label', 'Motivo de consulta / inicio', 'type', 'textarea'),
      jsonb_build_object('id', 'history', 'label', 'Historia y antecedentes relevantes', 'type', 'textarea'),
      jsonb_build_object('id', 'pain', 'label', 'Dolor (localización, intensidad, tipo)', 'type', 'textarea'),
      jsonb_build_object('id', 'function', 'label', 'Limitaciones funcionales / actividades afectadas', 'type', 'textarea'),
      jsonb_build_object('id', 'objective', 'label', 'Exploración física objetiva (ROM, fuerza, pruebas especiales)', 'type', 'textarea'),
      jsonb_build_object('id', 'assessment', 'label', 'Impresión clínica', 'type', 'textarea'),
      jsonb_build_object('id', 'plan', 'label', 'Plan de tratamiento propuesto', 'type', 'textarea')
    ))
  ) ON CONFLICT DO NOTHING;

  -- 2) General consent
  INSERT INTO public.document_templates (clinic_id, slug, name, description, type, category, language, version, is_active, schema)
  VALUES (
    NEW.id, 'physio_general_consent', 'Consentimiento informado de fisioterapia',
    'Consentimiento general para intervenciones y modalidades de fisioterapia.',
    'client', 'consent', 'es', 1, true,
    jsonb_build_object('layout', 'simple', 'sections', jsonb_build_array(
      jsonb_build_object('id', 'consent_text', 'label', 'Texto de consentimiento', 'type', 'textarea', 'placeholder', 'El paciente declara haber recibido información sobre los objetivos, beneficios y posibles riesgos de las intervenciones de fisioterapia...'),
      jsonb_build_object('id', 'modalities', 'label', 'Modalidades autorizadas', 'type', 'textarea'),
      jsonb_build_object('id', 'risks', 'label', 'Riesgos / advertencias específicos', 'type', 'textarea'),
      jsonb_build_object('id', 'patient_signature', 'label', 'Firma del paciente', 'type', 'signature'),
      jsonb_build_object('id', 'therapist_signature', 'label', 'Firma del fisioterapeuta', 'type', 'signature')
    ))
  ) ON CONFLICT DO NOTHING;

  -- 3) Privacy consent
  INSERT INTO public.document_templates (clinic_id, slug, name, description, type, category, language, version, is_active, schema)
  VALUES (
    NEW.id, 'privacy_communication_consent', 'Consentimiento de privacidad y comunicación',
    'Autorización para el tratamiento de datos personales y comunicación por canales digitales.',
    'client', 'consent', 'es', 1, true,
    jsonb_build_object('layout', 'simple', 'sections', jsonb_build_array(
      jsonb_build_object('id', 'privacy_notice', 'label', 'Aviso de privacidad', 'type', 'textarea'),
      jsonb_build_object('id', 'whatsapp_auth', 'label', 'Autorizo comunicación por WhatsApp', 'type', 'checkbox'),
      jsonb_build_object('id', 'email_auth', 'label', 'Autorizo comunicación por correo electrónico', 'type', 'checkbox'),
      jsonb_build_object('id', 'cancellation_policy', 'label', 'Política de cancelación', 'type', 'textarea'),
      jsonb_build_object('id', 'patient_signature', 'label', 'Firma del paciente', 'type', 'signature')
    ))
  ) ON CONFLICT DO NOTHING;

  -- 4) Session attending voucher
  INSERT INTO public.document_templates (clinic_id, slug, name, description, type, category, language, version, is_active, schema)
  VALUES (
    NEW.id, 'session_attending_voucher', 'Vale de asistencia a sesión',
    'Comprobante de asistencia a la sesión firmado por el paciente.',
    'appointment', 'session_note', 'es', 1, true,
    jsonb_build_object('layout', 'simple', 'sections', jsonb_build_array(
      jsonb_build_object('id', 'session_number', 'label', 'Número de sesión', 'type', 'number'),
      jsonb_build_object('id', 'treatment_summary', 'label', 'Resumen del tratamiento realizado', 'type', 'textarea'),
      jsonb_build_object('id', 'patient_tolerance', 'label', 'Tolerancia del paciente', 'type', 'textarea'),
      jsonb_build_object('id', 'patient_signature', 'label', 'Firma del paciente', 'type', 'signature'),
      jsonb_build_object('id', 'therapist_signature', 'label', 'Firma del fisioterapeuta', 'type', 'signature')
    ))
  ) ON CONFLICT DO NOTHING;

  -- 5) SOAP clinical note
  INSERT INTO public.document_templates (clinic_id, slug, name, description, type, category, language, version, is_active, schema)
  VALUES (
    NEW.id, 'session_clinical_note', 'Nota clínica de sesión (SOAP)',
    'Nota de evolución clínica en formato SOAP para documentación de la sesión.',
    'appointment', 'session_note', 'es', 1, true,
    jsonb_build_object('layout', 'simple', 'sections', jsonb_build_array(
      jsonb_build_object('id', 'subjective', 'label', 'S — Subjetivo (reporte del paciente)', 'type', 'textarea'),
      jsonb_build_object('id', 'objective', 'label', 'O — Objetivo (hallazgos clínicos, mediciones)', 'type', 'textarea'),
      jsonb_build_object('id', 'assessment', 'label', 'A — Evaluación (impresión clínica)', 'type', 'textarea'),
      jsonb_build_object('id', 'plan', 'label', 'P — Plan (próximos pasos, ajustes al tratamiento)', 'type', 'textarea')
    ))
  ) ON CONFLICT DO NOTHING;

  -- 6) Home exercise program
  INSERT INTO public.document_templates (clinic_id, slug, name, description, type, category, language, version, is_active, schema)
  VALUES (
    NEW.id, 'home_exercise_program', 'Programa de ejercicios en casa',
    'Rutina de ejercicios terapéuticos para realizar en casa entre sesiones.',
    'appointment', 'exercise_program', 'es', 1, true,
    jsonb_build_object('layout', 'simple', 'sections', jsonb_build_array(
      jsonb_build_object('id', 'exercises', 'label', 'Ejercicios (nombre, series, repeticiones, frecuencia)', 'type', 'textarea'),
      jsonb_build_object('id', 'precautions', 'label', 'Precauciones / contraindicaciones', 'type', 'textarea'),
      jsonb_build_object('id', 'additional_notes', 'label', 'Notas adicionales', 'type', 'textarea')
    ))
  ) ON CONFLICT DO NOTHING;

  -- 7) Medical recipe (NEW)
  INSERT INTO public.document_templates (clinic_id, slug, name, description, type, category, language, version, is_active, schema)
  VALUES (NEW.id, 'medical_recipe', 'Receta Médica / Prescripción',
    'Receta o prescripción médica con medicamentos, indicaciones y firma del terapeuta.',
    'appointment', 'medical_record', 'es', 1, true, recipe_schema)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END $$;
