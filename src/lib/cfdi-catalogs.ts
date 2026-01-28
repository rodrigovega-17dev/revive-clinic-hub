/**
 * SAT catalog values for CFDI (Mexico electronic invoicing).
 * Minimal set; expand as needed.
 */

/** Tax regime (regimen fiscal) code + label */
export const TAX_REGIMES: { value: string; labelKey: string }[] = [
  { value: '601', labelKey: 'cfdi.regime601' },
  { value: '603', labelKey: 'cfdi.regime603' },
  { value: '605', labelKey: 'cfdi.regime605' },
  { value: '606', labelKey: 'cfdi.regime606' },
  { value: '607', labelKey: 'cfdi.regime607' },
  { value: '608', labelKey: 'cfdi.regime608' },
  { value: '610', labelKey: 'cfdi.regime610' },
  { value: '611', labelKey: 'cfdi.regime611' },
  { value: '612', labelKey: 'cfdi.regime612' },
  { value: '614', labelKey: 'cfdi.regime614' },
  { value: '616', labelKey: 'cfdi.regime616' },
  { value: '620', labelKey: 'cfdi.regime620' },
  { value: '621', labelKey: 'cfdi.regime621' },
  { value: '622', labelKey: 'cfdi.regime622' },
  { value: '623', labelKey: 'cfdi.regime623' },
  { value: '624', labelKey: 'cfdi.regime624' },
  { value: '625', labelKey: 'cfdi.regime625' },
  { value: '626', labelKey: 'cfdi.regime626' },
];

/** CFDI use (uso CFDI) code + label */
export const CFDI_USES: { value: string; labelKey: string }[] = [
  { value: 'G01', labelKey: 'cfdi.useG01' },
  { value: 'G02', labelKey: 'cfdi.useG02' },
  { value: 'G03', labelKey: 'cfdi.useG03' },
  { value: 'D01', labelKey: 'cfdi.useD01' },
  { value: 'D02', labelKey: 'cfdi.useD02' },
  { value: 'D03', labelKey: 'cfdi.useD03' },
  { value: 'D04', labelKey: 'cfdi.useD04' },
  { value: 'D05', labelKey: 'cfdi.useD05' },
  { value: 'D06', labelKey: 'cfdi.useD06' },
  { value: 'D07', labelKey: 'cfdi.useD07' },
  { value: 'D08', labelKey: 'cfdi.useD08' },
  { value: 'D09', labelKey: 'cfdi.useD09' },
  { value: 'D10', labelKey: 'cfdi.useD10' },
  { value: 'P01', labelKey: 'cfdi.useP01' },
];

/** RFC format: 12–13 chars, alphanumeric + Ñ&. Not full SAT validation. */
export function isValidRfcFormat(rfc: string): boolean {
  const s = rfc?.trim().toUpperCase() || '';
  if (s.length < 12 || s.length > 13) return false;
  return /^[A-ZÑ&][A-Z0-9Ñ&]{2,3}\d{6}[A-Z0-9]{2}[0-9A]$/.test(s);
}

/** True when client has RFC, tax regime, CFDI use, and email (cfdi_email or main). */
export function hasCfdiData(c: { rfc?: string | null; tax_regime?: string | null; cfdi_use?: string | null; cfdi_email?: string | null; email?: string | null }): boolean {
  if (!c?.rfc?.trim() || !c?.tax_regime?.trim() || !c?.cfdi_use?.trim()) return false;
  const email = (c.cfdi_email || c.email || '').trim();
  return !!email;
}
