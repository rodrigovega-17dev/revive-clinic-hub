/**
 * Shared document HTML renderer. Matches the layout used in:
 * - DocumentSection print/PDF (openDocumentWindow)
 * - view-document (shared link)
 * - send-document-email
 */

function formatValue(v) {
  if (v === true) return 'Yes';
  if (v === false) return 'No';
  if (v === null || v === undefined) return '';
  return String(v);
}

function escapeHtml(str) {
  if (str == null) return '';
  const s = String(str);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Format date for display (no date-fns dep). */
function formatDate(isoStr) {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return '';
  }
}

/**
 * Build full document HTML (matches print layout).
 * @param {object} instance - document_instances row
 * @param {object} opts - { includeFullPage: boolean } - if true, return full HTML doc; if false, body-only for email
 */
function renderDocumentHtml(instance, opts = {}) {
  const { includeFullPage = true } = opts;
  const data = instance.data || {};
  const schema = data.schema || {};
  const sections = Array.isArray(schema.sections) ? schema.sections : [];
  const values = data.values || {};
  const variables = data.variables || {};

  const title = data.templateName || data.templateSlug || 'Documento';
  const clinicName = variables.clinicName || 'Clínica';
  const createdAtText = formatDate(instance.created_at);

  const responsibleName = variables.responsibleName || null;
  const responsibleSignatureUrl = variables.responsibleSignatureUrl || null;
  const clinicLogoUrl = variables.clinicLogoUrl || null;

  const infoRows = [
    { label: 'Paciente', value: variables.clientFullName },
    { label: 'Edad', value: variables.clientAge },
    { label: 'Correo', value: variables.clientEmail },
    { label: 'RFC', value: variables.clientRfc },
    { label: 'Fisioterapeuta', value: variables.therapistFullName },
    { label: 'Tratamiento', value: variables.treatmentName },
    {
      label: 'Cita',
      value: [variables.appointmentDateFormatted, variables.appointmentTimeFormatted].filter(Boolean).join(' · '),
    },
  ].filter((row) => row.value);

  function renderSignatureBlock(fieldId, fieldLabel) {
    const isClient = /patient_signature|client_signature/i.test(fieldId);
    if (isClient) {
      return `
        <div style="margin-top: 24px;">
          <div style="border-bottom: 1px solid #111827; width: 200px; height: 40px; margin-bottom: 4px;"></div>
          <div style="font-size: 11px; color: #6b7280; text-transform: uppercase;">${escapeHtml(fieldLabel)}</div>
        </div>`;
    }
    if (responsibleName) {
      return `
        <div style="margin-top: 24px; text-align: right;">
          ${responsibleSignatureUrl
            ? `<img src="${escapeHtml(responsibleSignatureUrl)}" alt="Signature" style="max-width: 200px; max-height: 80px; display: inline-block;" />`
            : `<div style="font-family: 'Brush Script MT', cursive; font-size: 24px; font-style: italic;">${escapeHtml(responsibleName)}</div>`
          }
          <div style="margin-top: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase;">${escapeHtml(fieldLabel)}</div>
          <div style="font-size: 13px; color: #374151;">${escapeHtml(responsibleName)}</div>
        </div>`;
    }
    return `<div style="margin-top: 24px; font-size: 13px; color: #6b7280;">${escapeHtml(fieldLabel)}</div>`;
  }

  // If the template already has a responsible (therapist) signature section/field, don't add the extra trailing block
  const hasResponsibleSignatureInSchema = sections.some((s) => {
    if (s.type === 'signature') return !/patient_signature|client_signature/i.test(String(s.id || ''));
    if (s.type === 'group' && Array.isArray(s.fields)) {
      return s.fields.some((f) => f.type === 'signature' && !/patient_signature|client_signature/i.test(String(f.id || '')));
    }
    return false;
  });

  const sectionHtml = sections
    .filter((s) => s.id !== 'header')
    .map((section) => {
      if (section.type === 'signature') {
        const label = section.label || 'Firma';
        return `<section style="margin-bottom: 16px;">${renderSignatureBlock(section.id, label)}</section>`;
      }
      if (section.type === 'group' && Array.isArray(section.fields) && section.fields.length > 0) {
        const fieldsHtml = section.fields
          .map((field) => {
            if (field.type === 'signature') {
              return renderSignatureBlock(field.id, field.label || 'Firma');
            }
            const v = values[field.id];
            const display = escapeHtml(formatValue(v));
            return `
              <div style="margin-bottom: 8px;">
                <div style="font-weight: 500; font-size: 13px; margin-bottom: 2px;">${escapeHtml(field.label)}</div>
                <div style="border: 1px solid #e5e7eb; padding: 6px; min-height: 32px; white-space: pre-wrap; font-size: 13px; background: #fff;">${display}</div>
              </div>`;
          })
          .join('');
        return `
          <section style="margin-bottom: 16px;">
            ${section.label ? `<h3 style="margin: 0 0 6px; font-size: 14px;">${escapeHtml(section.label)}</h3>` : ''}
            ${fieldsHtml}
          </section>`;
      }
      const label = section.label || section.id;
      const value = values[section.id];
      const display = escapeHtml(formatValue(value));
      return `
        <section style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 4px; font-size: 14px;">${escapeHtml(label)}</h3>
          <div style="border: 1px solid #e5e7eb; padding: 8px; min-height: 40px; white-space: pre-wrap; font-size: 13px; background: #fff;">${display}</div>
        </section>`;
    })
    .join('');

  const infoGridHtml =
    infoRows.length > 0
      ? `<div style="display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin: 16px 0 20px;">
          ${infoRows
            .map(
              (row) => `
            <div>
              <div style="font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280;">${escapeHtml(row.label)}</div>
              <div style="font-size: 13px;">${escapeHtml(formatValue(row.value))}</div>
            </div>`
            )
            .join('')}
        </div>`
      : '';

  const signatureBlockHtml = responsibleName && !hasResponsibleSignatureInSchema
    ? `
      <div style="margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
        <div style="text-align: right;">
          <div style="margin-bottom: 8px; font-size: 11px; color: #6b7280; text-transform: uppercase;">Firma</div>
          ${responsibleSignatureUrl
            ? `<img src="${escapeHtml(responsibleSignatureUrl)}" alt="Signature" style="max-width: 200px; max-height: 80px; display: inline-block;" />`
            : `<div style="font-family: 'Brush Script MT', cursive; font-size: 24px; font-style: italic;">${escapeHtml(responsibleName)}</div>`
          }
          <div style="margin-top: 8px; font-size: 13px; color: #6b7280;">${escapeHtml(responsibleName)}</div>
        </div>
      </div>`
    : '';

  const watermarkHtml = clinicLogoUrl
    ? `<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 380px; height: 380px; background-image: url('${escapeHtml(clinicLogoUrl)}'); background-size: contain; background-repeat: no-repeat; background-position: center; opacity: 0.06; pointer-events: none; z-index: 0;"></div>`
    : '';

  const pageContent = `
    <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; max-width: 720px; font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111827; position: relative; overflow: hidden;">
      ${watermarkHtml}
      <div style="position: relative; z-index: 1;">
      <header style="margin-bottom: 16px;">
        <div style="font-size: 12px; color: #6b7280;">${escapeHtml(clinicName)}</div>
        <h1 style="font-size: 20px; margin-bottom: 4px;">${escapeHtml(title)}</h1>
        ${createdAtText ? `<h2 style="font-size: 14px; font-weight: normal; margin-top: 0; margin-bottom: 8px; color: #6b7280;">${escapeHtml(createdAtText)}</h2>` : ''}
      </header>
      ${infoGridHtml}
      ${sectionHtml}
      ${signatureBlockHtml}
      </div>
    </div>`;

  if (!includeFullPage) {
    return pageContent;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 28px; color: #111827; background: #f9fafb; margin: 0; }
  </style>
</head>
<body style="margin: 0; padding: 28px; background: #f9fafb;">
  ${pageContent}
</body>
</html>`;
}

module.exports = { renderDocumentHtml, escapeHtml, formatValue };
