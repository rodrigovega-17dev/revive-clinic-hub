/**
 * Print-friendly finance report generator (daily "corte del día" and monthly).
 *
 * Opens a new window with a self-contained, styled HTML document and triggers
 * the browser's native Print dialog so the user can save it as PDF or print it.
 * No PDF library dependency — same approach used by the document templates.
 *
 * All i18n and currency/date formatting is done by the caller; this module only
 * lays out the values it is given.
 */

export interface FinanceReportStat {
  label: string;
  value: string;
  /** Optional emphasis for the headline number (e.g. cash box, net). */
  highlight?: boolean;
}

export interface FinanceReportTable {
  title: string;
  columns: string[];
  /** Each row is an array of cell strings, aligned to `columns`. */
  rows: string[][];
  /** Right-align these column indexes (typically amount columns). */
  numericColumns?: number[];
  emptyText: string;
  /** Optional footer row (e.g. totals), aligned to `columns`. */
  footer?: string[];
}

export interface FinanceReportData {
  clinicName: string;
  clinicLogoUrl?: string | null;
  reportTitle: string;
  periodLabel: string;
  generatedLabel: string;
  appointmentsTitle: string;
  appointmentStats: FinanceReportStat[];
  financialTitle: string;
  financialStats: FinanceReportStat[];
  tables: FinanceReportTable[];
}

const escapeHtml = (value: unknown): string => {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
};

const renderStatCards = (stats: FinanceReportStat[]): string =>
  stats
    .map(
      (s) => `
        <div class="stat ${s.highlight ? 'stat--highlight' : ''}">
          <div class="stat-label">${escapeHtml(s.label)}</div>
          <div class="stat-value">${escapeHtml(s.value)}</div>
        </div>`,
    )
    .join('');

const renderTable = (table: FinanceReportTable): string => {
  const numeric = new Set(table.numericColumns ?? []);
  const head = table.columns
    .map((c, i) => `<th class="${numeric.has(i) ? 'num' : ''}">${escapeHtml(c)}</th>`)
    .join('');

  const body =
    table.rows.length > 0
      ? table.rows
          .map(
            (row) =>
              `<tr>${row
                .map((cell, i) => `<td class="${numeric.has(i) ? 'num' : ''}">${escapeHtml(cell)}</td>`)
                .join('')}</tr>`,
          )
          .join('')
      : `<tr><td class="empty" colspan="${table.columns.length}">${escapeHtml(table.emptyText)}</td></tr>`;

  const footer = table.footer
    ? `<tfoot><tr>${table.footer
        .map((cell, i) => `<td class="${numeric.has(i) ? 'num' : ''}">${escapeHtml(cell)}</td>`)
        .join('')}</tr></tfoot>`
    : '';

  return `
    <section class="table-section">
      <h3>${escapeHtml(table.title)}</h3>
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
        ${footer}
      </table>
    </section>`;
};

export const openFinanceReport = (data: FinanceReportData): void => {
  const win = window.open('', '_blank');
  if (!win) return;

  const watermark = data.clinicLogoUrl
    ? `<div class="watermark" style="background-image:url('${escapeHtml(data.clinicLogoUrl)}');"></div>`
    : '';

  win.document.write(`
    <html>
      <head>
        <meta charset="utf-8" />
        <title>${escapeHtml(data.reportTitle)} — ${escapeHtml(data.periodLabel)}</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111827; background: #f3f4f6; margin: 0; padding: 24px; }
          .page { position: relative; overflow: hidden; background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 32px; max-width: 900px; margin: 0 auto; }
          .watermark { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 420px; height: 420px; background-size: contain; background-repeat: no-repeat; background-position: center; opacity: 0.05; pointer-events: none; z-index: 0; }
          .page > * { position: relative; z-index: 1; }
          header { border-bottom: 2px solid #111827; padding-bottom: 12px; margin-bottom: 20px; }
          .clinic { font-size: 13px; color: #6b7280; text-transform: uppercase; letter-spacing: .05em; }
          h1 { font-size: 24px; margin: 4px 0 2px; }
          .period { font-size: 15px; color: #374151; font-weight: 600; }
          .generated { font-size: 11px; color: #9ca3af; margin-top: 4px; }
          h2 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 24px 0 10px; }
          .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
          .stat { border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px 12px; background: #fafafa; }
          .stat--highlight { background: #ecfdf5; border-color: #a7f3d0; }
          .stat-label { font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: .03em; }
          .stat-value { font-size: 20px; font-weight: 700; margin-top: 2px; }
          .table-section { margin-top: 22px; }
          .table-section h3 { font-size: 14px; margin: 0 0 8px; }
          table { width: 100%; border-collapse: collapse; font-size: 12px; }
          th { text-align: left; background: #f9fafb; color: #374151; font-weight: 600; padding: 8px 10px; border-bottom: 1px solid #e5e7eb; }
          td { padding: 7px 10px; border-bottom: 1px solid #f3f4f6; }
          th.num, td.num { text-align: right; white-space: nowrap; }
          td.empty { text-align: center; color: #9ca3af; padding: 20px; }
          tfoot td { font-weight: 700; border-top: 2px solid #111827; border-bottom: none; }
          .print-btn { display: block; margin: 0 auto 20px; padding: 10px 20px; font-size: 14px; font-weight: 600; color: #fff; background: #111827; border: none; border-radius: 8px; cursor: pointer; }
          @media print {
            body { background: #fff; padding: 0; }
            .page { border: none; border-radius: 0; max-width: none; }
            .print-btn { display: none; }
          }
        </style>
      </head>
      <body>
        <button class="print-btn" onclick="window.print()">Imprimir / PDF</button>
        <div class="page">
          ${watermark}
          <header>
            <div class="clinic">${escapeHtml(data.clinicName)}</div>
            <h1>${escapeHtml(data.reportTitle)}</h1>
            <div class="period">${escapeHtml(data.periodLabel)}</div>
            <div class="generated">${escapeHtml(data.generatedLabel)}</div>
          </header>

          <h2>${escapeHtml(data.appointmentsTitle)}</h2>
          <div class="stats">${renderStatCards(data.appointmentStats)}</div>

          <h2>${escapeHtml(data.financialTitle)}</h2>
          <div class="stats">${renderStatCards(data.financialStats)}</div>

          ${data.tables.map(renderTable).join('')}
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
};
