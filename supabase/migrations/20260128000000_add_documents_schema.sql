-- Documents schema for client/appointment-attached documents
-- This migration adds:
-- - document_templates: reusable, clinic-scoped templates
-- - document_instances: concrete documents attached to clients/appointments

-- Create document_templates table
CREATE TABLE public.document_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  -- Short identifier per clinic (e.g. 'physio_initial_assessment')
  slug TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  -- 'client' = client-level document, 'appointment' = appointment-level document
  type TEXT NOT NULL CHECK (type IN ('client', 'appointment')),
  -- Category for simple grouping/filtering (assessment, consent, session_note, exercise_program, report)
  category TEXT,
  -- Language code, e.g. 'es' or 'en'
  language TEXT NOT NULL DEFAULT 'es',
  -- Simple integer versioning for templates
  version INTEGER NOT NULL DEFAULT 1,
  is_active BOOLEAN NOT NULL DEFAULT true,
  -- JSON schema describing fields and layout (kept intentionally simple)
  -- Example shape:
  -- {
  --   "layout": "simple",
  --   "sections": [
  --     { "id": "subjective", "label": "Subjective", "type": "textarea", "required": false },
  --     { "id": "objective", "label": "Objective", "type": "textarea", "required": false }
  --   ]
  -- }
  schema JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (clinic_id, slug, version)
);

CREATE INDEX IF NOT EXISTS idx_document_templates_clinic_id
  ON public.document_templates (clinic_id);

-- Create document_instances table
CREATE TABLE public.document_instances (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  clinic_id UUID NOT NULL REFERENCES public.clinics(id) ON DELETE CASCADE,
  template_id UUID NOT NULL REFERENCES public.document_templates(id) ON DELETE RESTRICT,
  template_version INTEGER NOT NULL,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
  -- 'draft' = editable, 'finalized' = locked for changes
  status TEXT NOT NULL CHECK (status IN ('draft', 'finalized')) DEFAULT 'finalized',
  -- Snapshot of filled data + template structure at the time of creation.
  -- Example shape:
  -- {
  --   "templateName": "...",
  --   "templateSlug": "...",
  --   "sections": [...],     -- copied from template.schema.sections
  --   "values": { "fieldId": "..." },
  --   "variables": {
  --     "clientFullName": "...",
  --     "appointmentDate": "2026-01-28"
  --   }
  -- }
  data JSONB NOT NULL,
  rendered_pdf_url TEXT,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finalized_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_document_instances_clinic_id
  ON public.document_instances (clinic_id);

CREATE INDEX IF NOT EXISTS idx_document_instances_client_id
  ON public.document_instances (client_id);

CREATE INDEX IF NOT EXISTS idx_document_instances_appointment_id
  ON public.document_instances (appointment_id);

CREATE INDEX IF NOT EXISTS idx_document_instances_template_id
  ON public.document_instances (template_id);

-- Enable RLS and scope access by clinic_id, matching existing multi-tenant pattern
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_instances ENABLE ROW LEVEL SECURITY;

-- Users can only access templates for their clinic
CREATE POLICY "Users can manage their clinic's document templates"
  ON public.document_templates
  FOR ALL
  USING (clinic_id = public.get_user_clinic_id())
  WITH CHECK (clinic_id = public.get_user_clinic_id());

-- Users can only access document instances for their clinic
CREATE POLICY "Users can manage their clinic's document instances"
  ON public.document_instances
  FOR ALL
  USING (clinic_id = public.get_user_clinic_id())
  WITH CHECK (clinic_id = public.get_user_clinic_id());

-- Reuse generic updated_at trigger for new tables
CREATE TRIGGER update_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_document_instances_updated_at
  BEFORE UPDATE ON public.document_instances
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed a minimal set of high-value templates for the default clinic.
-- This keeps the app usable immediately after migration for the default-clinic slug.
DO $$
DECLARE
  default_clinic_id UUID;
BEGIN
  SELECT id INTO default_clinic_id
  FROM public.clinics
  WHERE slug = 'default-clinic'
  LIMIT 1;

  IF default_clinic_id IS NULL THEN
    -- If there's no default clinic yet, skip seeding gracefully.
    RETURN;
  END IF;

  -- 1) Client-level: Physiotherapy initial assessment
  INSERT INTO public.document_templates (
    clinic_id, slug, name, description, type, category, language, version, is_active, schema
  ) VALUES (
    default_clinic_id,
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
  );

  -- 2) Client-level: General informed consent for physiotherapy
  INSERT INTO public.document_templates (
    clinic_id, slug, name, description, type, category, language, version, is_active, schema
  ) VALUES (
    default_clinic_id,
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
  );

  -- 3) Client-level: Privacy & communication consent
  INSERT INTO public.document_templates (
    clinic_id, slug, name, description, type, category, language, version, is_active, schema
  ) VALUES (
    default_clinic_id,
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
  );

  -- 4) Appointment-level: Session attending voucher
  INSERT INTO public.document_templates (
    clinic_id, slug, name, description, type, category, language, version, is_active, schema
  ) VALUES (
    default_clinic_id,
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
  );

  -- 5) Appointment-level: Session clinical note (SOAP-style)
  INSERT INTO public.document_templates (
    clinic_id, slug, name, description, type, category, language, version, is_active, schema
  ) VALUES (
    default_clinic_id,
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
  );

  -- 6) Appointment-level: Home exercise program
  INSERT INTO public.document_templates (
    clinic_id, slug, name, description, type, category, language, version, is_active, schema
  ) VALUES (
    default_clinic_id,
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
  );

END;
$$;

