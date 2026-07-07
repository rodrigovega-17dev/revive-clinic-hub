-- Normalize all existing client/therapist names to uppercase and keep them
-- uppercase for future inserts/updates.

UPDATE public.clients
SET
  first_name = UPPER(BTRIM(first_name)),
  last_name = UPPER(BTRIM(last_name))
WHERE
  first_name IS DISTINCT FROM UPPER(BTRIM(first_name))
  OR last_name IS DISTINCT FROM UPPER(BTRIM(last_name));

UPDATE public.therapists
SET
  first_name = UPPER(BTRIM(first_name)),
  last_name = UPPER(BTRIM(last_name))
WHERE
  first_name IS DISTINCT FROM UPPER(BTRIM(first_name))
  OR last_name IS DISTINCT FROM UPPER(BTRIM(last_name));

CREATE OR REPLACE FUNCTION public.normalize_person_name_uppercase()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.first_name IS NOT NULL THEN
    NEW.first_name := UPPER(BTRIM(NEW.first_name));
  END IF;

  IF NEW.last_name IS NOT NULL THEN
    NEW.last_name := UPPER(BTRIM(NEW.last_name));
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_clients_normalize_name_uppercase ON public.clients;
CREATE TRIGGER trg_clients_normalize_name_uppercase
BEFORE INSERT OR UPDATE ON public.clients
FOR EACH ROW
EXECUTE FUNCTION public.normalize_person_name_uppercase();

DROP TRIGGER IF EXISTS trg_therapists_normalize_name_uppercase ON public.therapists;
CREATE TRIGGER trg_therapists_normalize_name_uppercase
BEFORE INSERT OR UPDATE ON public.therapists
FOR EACH ROW
EXECUTE FUNCTION public.normalize_person_name_uppercase();
