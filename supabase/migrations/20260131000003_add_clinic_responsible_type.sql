-- Allow 'clinic' as responsible_person_type for document_instances
-- (e.g. when document is signed on behalf of the clinic)

ALTER TABLE public.document_instances
  DROP CONSTRAINT IF EXISTS document_instances_responsible_person_type_check;

ALTER TABLE public.document_instances
  ADD CONSTRAINT document_instances_responsible_person_type_check
  CHECK (responsible_person_type IN ('therapist', 'user', 'clinic'));
