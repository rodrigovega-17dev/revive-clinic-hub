/**
 * Parse CFDI 4.0 XML (client-side) to extract uuid, folio, total, subtotal, tax, emitted_at, type.
 * Uses DOMParser; no extra deps.
 */

export type CfdiParsed = {
  uuid: string;
  folio: string | null;
  total: number;
  subtotal: number;
  tax: number;
  emitted_at: string;
  type: 'ingreso' | 'egreso' | 'pago';
};

function getAttr(el: Element, name: string): string | null {
  return el.getAttribute(name) ?? el.getAttribute(name.toLowerCase()) ?? null;
}

function findTag(doc: Document, localName: string): Element | null {
  const all = doc.getElementsByTagName('*');
  for (let i = 0; i < all.length; i++) {
    const el = all[i];
    if (el.localName === localName) return el;
  }
  return null;
}

/**
 * Parse CFDI 4.0 XML string. Throws on invalid or missing required nodes.
 * Comprobante: Total, SubTotal, Fecha, Folio, TipoDeComprobante.
 * Complemento > TimbreFiscalDigital: UUID.
 */
export function parseCfdiXml(xmlString: string): CfdiParsed {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');
  const root = doc.documentElement;
  if (!root || root.nodeName === 'parsererror') {
    throw new Error('Invalid CFDI XML');
  }

  const totalStr = getAttr(root, 'Total') ?? getAttr(root, 'total');
  const subtotalStr = getAttr(root, 'SubTotal') ?? getAttr(root, 'SubTotal') ?? getAttr(root, 'subtotal');
  const fechaStr = getAttr(root, 'Fecha') ?? getAttr(root, 'fecha');
  const folioStr = getAttr(root, 'Folio') ?? getAttr(root, 'folio');
  const tipoStr = getAttr(root, 'TipoDeComprobante') ?? getAttr(root, 'tipoDeComprobante');

  if (!totalStr || !subtotalStr || !fechaStr) {
    throw new Error('CFDI XML missing required attributes (Total, SubTotal, Fecha)');
  }

  const total = parseFloat(totalStr);
  const subtotal = parseFloat(subtotalStr);
  if (Number.isNaN(total) || Number.isNaN(subtotal)) {
    throw new Error('Invalid CFDI amounts');
  }

  const tfd = findTag(doc, 'TimbreFiscalDigital');
  const uuid = tfd ? (getAttr(tfd, 'UUID') ?? getAttr(tfd, 'uuid')) : null;
  if (!uuid?.trim()) {
    throw new Error('CFDI XML missing TimbreFiscalDigital UUID');
  }

  let type: 'ingreso' | 'egreso' | 'pago' = 'ingreso';
  const t = (tipoStr ?? 'I').toUpperCase();
  if (t === 'E') type = 'egreso';
  else if (t === 'P') type = 'pago';

  const tax = Math.max(0, total - subtotal);

  return {
    uuid: uuid.trim(),
    folio: folioStr?.trim() ?? null,
    total,
    subtotal,
    tax,
    emitted_at: fechaStr.trim(),
    type,
  };
}
