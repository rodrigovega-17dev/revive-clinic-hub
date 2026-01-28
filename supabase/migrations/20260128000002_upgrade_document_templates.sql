-- Upgrade existing document_templates schemas to richer, header-based structures.
-- This migration updates version 1 templates for all clinics in-place.

UPDATE public.document_templates
SET schema = jsonb_build_object(
  'layout', 'simple',
  'sections', jsonb_build_array(
    -- Header group with common prefilled, readonly fields
    jsonb_build_object(
      'id', 'header',
      'label', 'Encabezado',
      'type', 'group',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'client_name',
          'label', 'Paciente',
          'type', 'text',
          'prefillFrom', 'client.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'client_age',
          'label', 'Edad',
          'type', 'text',
          'prefillFrom', 'client.age',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'therapist_name',
          'label', 'Fisioterapeuta',
          'type', 'text',
          'prefillFrom', 'therapist.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'session_date',
          'label', 'Fecha de sesión',
          'type', 'text',
          'prefillFrom', 'appointment.date',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'treatment_name',
          'label', 'Tratamiento',
          'type', 'text',
          'prefillFrom', 'treatment.name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'clinic_name',
          'label', 'Clínica',
          'type', 'text',
          'prefillFrom', 'clinic.name',
          'readonly', true
        )
      )
    ),
    -- Body sections (existing content preserved with clearer prompts)
    jsonb_build_object('id', 'reason', 'label', 'Motivo de consulta / inicio', 'type', 'textarea'),
    jsonb_build_object('id', 'history', 'label', 'Historia y antecedentes relevantes', 'type', 'textarea'),
    jsonb_build_object('id', 'pain', 'label', 'Dolor (localización, intensidad, tipo)', 'type', 'textarea'),
    jsonb_build_object('id', 'function', 'label', 'Limitaciones funcionales / actividades afectadas', 'type', 'textarea'),
    jsonb_build_object('id', 'objective', 'label', 'Exploración física objetiva (ROM, fuerza, pruebas especiales)', 'type', 'textarea'),
    jsonb_build_object('id', 'assessment', 'label', 'Impresión clínica', 'type', 'textarea'),
    jsonb_build_object('id', 'plan', 'label', 'Plan de tratamiento propuesto', 'type', 'textarea')
  )
)
WHERE slug = 'physio_initial_assessment'
  AND version = 1;

UPDATE public.document_templates
SET schema = jsonb_build_object(
  'layout', 'simple',
  'sections', jsonb_build_array(
    jsonb_build_object(
      'id', 'header',
      'label', 'Encabezado',
      'type', 'group',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'client_name',
          'label', 'Paciente',
          'type', 'text',
          'prefillFrom', 'client.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'clinic_name',
          'label', 'Clínica',
          'type', 'text',
          'prefillFrom', 'clinic.name',
          'readonly', true
        )
      )
    ),
    jsonb_build_object(
      'id', 'consent_text',
      'label', 'Texto de consentimiento',
      'type', 'textarea',
      'placeholder', 'El paciente declara haber recibido información sobre los objetivos, beneficios y posibles riesgos de las intervenciones de fisioterapia...'
    ),
    jsonb_build_object(
      'id', 'modalities',
      'label', 'Modalidades autorizadas (manual, ejercicio, electroterapia, etc.)',
      'type', 'textarea'
    ),
    jsonb_build_object(
      'id', 'risks',
      'label', 'Riesgos / advertencias específicos',
      'type', 'textarea'
    ),
    jsonb_build_object(
      'id', 'patient_signature',
      'label', 'Firma del paciente',
      'type', 'signature'
    ),
    jsonb_build_object(
      'id', 'therapist_signature',
      'label', 'Firma del fisioterapeuta',
      'type', 'signature'
    )
  )
)
WHERE slug = 'physio_general_consent'
  AND version = 1;

UPDATE public.document_templates
SET schema = jsonb_build_object(
  'layout', 'simple',
  'sections', jsonb_build_array(
    jsonb_build_object(
      'id', 'header',
      'label', 'Encabezado',
      'type', 'group',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'client_name',
          'label', 'Paciente',
          'type', 'text',
          'prefillFrom', 'client.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'clinic_name',
          'label', 'Clínica',
          'type', 'text',
          'prefillFrom', 'clinic.name',
          'readonly', true
        )
      )
    ),
    jsonb_build_object('id', 'privacy_text', 'label', 'Aviso de privacidad', 'type', 'textarea'),
    jsonb_build_object('id', 'whatsapp', 'label', 'Autoriza contacto por WhatsApp', 'type', 'checkbox'),
    jsonb_build_object('id', 'email', 'label', 'Autoriza contacto por correo electrónico', 'type', 'checkbox'),
    jsonb_build_object('id', 'phone', 'label', 'Autoriza contacto telefónico', 'type', 'checkbox'),
    jsonb_build_object('id', 'policies', 'label', 'Políticas de cancelación / reprogramación', 'type', 'textarea'),
    jsonb_build_object('id', 'patient_signature', 'label', 'Firma del paciente', 'type', 'signature')
  )
)
WHERE slug = 'privacy_communication_consent'
  AND version = 1;

UPDATE public.document_templates
SET schema = jsonb_build_object(
  'layout', 'simple',
  'sections', jsonb_build_array(
    jsonb_build_object(
      'id', 'header',
      'label', 'Encabezado',
      'type', 'group',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'client_name',
          'label', 'Paciente',
          'type', 'text',
          'prefillFrom', 'client.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'therapist_name',
          'label', 'Fisioterapeuta',
          'type', 'text',
          'prefillFrom', 'therapist.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'session_date',
          'label', 'Fecha de sesión',
          'type', 'text',
          'prefillFrom', 'appointment.date',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'treatment_name',
          'label', 'Tratamiento',
          'type', 'text',
          'prefillFrom', 'treatment.name',
          'readonly', true
        )
      )
    ),
    jsonb_build_object('id', 'session_number', 'label', 'Número de sesión', 'type', 'text'),
    jsonb_build_object('id', 'treatment_summary', 'label', 'Descripción breve del tratamiento realizado', 'type', 'textarea'),
    jsonb_build_object('id', 'tolerance', 'label', 'Tolerancia del paciente / observaciones', 'type', 'textarea'),
    jsonb_build_object('id', 'patient_signature', 'label', 'Firma del paciente', 'type', 'signature'),
    jsonb_build_object('id', 'therapist_signature', 'label', 'Firma del fisioterapeuta', 'type', 'signature')
  )
)
WHERE slug = 'session_attending_voucher'
  AND version = 1;

UPDATE public.document_templates
SET schema = jsonb_build_object(
  'layout', 'simple',
  'sections', jsonb_build_array(
    jsonb_build_object(
      'id', 'header',
      'label', 'Encabezado',
      'type', 'group',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'client_name',
          'label', 'Paciente',
          'type', 'text',
          'prefillFrom', 'client.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'therapist_name',
          'label', 'Fisioterapeuta',
          'type', 'text',
          'prefillFrom', 'therapist.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'session_date',
          'label', 'Fecha de sesión',
          'type', 'text',
          'prefillFrom', 'appointment.date',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'treatment_name',
          'label', 'Tratamiento',
          'type', 'text',
          'prefillFrom', 'treatment.name',
          'readonly', true
        )
      )
    ),
    jsonb_build_object('id', 'subjective', 'label', 'S - Subjetivo (cambios desde la última sesión)', 'type', 'textarea'),
    jsonb_build_object('id', 'objective', 'label', 'O - Objetivo (mediciones, pruebas, ROM, etc.)', 'type', 'textarea'),
    jsonb_build_object('id', 'assessment', 'label', 'A - Análisis / impresión clínica', 'type', 'textarea'),
    jsonb_build_object('id', 'plan', 'label', 'P - Plan (siguientes sesiones, ejercicios en casa)', 'type', 'textarea')
  )
)
WHERE slug = 'session_clinical_note'
  AND version = 1;

UPDATE public.document_templates
SET schema = jsonb_build_object(
  'layout', 'simple',
  'sections', jsonb_build_array(
    jsonb_build_object(
      'id', 'header',
      'label', 'Encabezado',
      'type', 'group',
      'fields', jsonb_build_array(
        jsonb_build_object(
          'id', 'client_name',
          'label', 'Paciente',
          'type', 'text',
          'prefillFrom', 'client.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'therapist_name',
          'label', 'Fisioterapeuta',
          'type', 'text',
          'prefillFrom', 'therapist.full_name',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'session_date',
          'label', 'Fecha de sesión',
          'type', 'text',
          'prefillFrom', 'appointment.date',
          'readonly', true
        ),
        jsonb_build_object(
          'id', 'treatment_name',
          'label', 'Tratamiento',
          'type', 'text',
          'prefillFrom', 'treatment.name',
          'readonly', true
        )
      )
    ),
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
WHERE slug = 'home_exercise_program'
  AND version = 1;

