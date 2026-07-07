/**
 * Name formatting helpers used across client/therapist UI.
 */

export const toUpperNamePart = (value?: string | null): string => {
  if (!value) return '';
  return value.trim().toLocaleUpperCase('es-MX');
};

export const formatPersonName = (
  firstName?: string | null,
  lastName?: string | null,
): string => {
  return [toUpperNamePart(firstName), toUpperNamePart(lastName)]
    .filter(Boolean)
    .join(' ')
    .trim();
};
