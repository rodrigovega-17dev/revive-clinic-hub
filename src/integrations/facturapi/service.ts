/**
 * Frontend CFDI / Facturapi service. Calls Netlify facturapi function.
 */

import { supabase } from '../supabase/client';
import type {
  IssueIndividualInvoicePayload,
  IssueIndividualInvoiceResult,
  IssueGlobalInvoicePayload,
  IssueGlobalInvoiceResult,
  IssueCreditNotePayload,
  IssueCreditNoteResult,
  IssueLateInvoicePayload,
} from './types';

const getBaseUrl = () => {
  const fallback =
    typeof window !== 'undefined' &&
    window.location.hostname === 'localhost' &&
    window.location.port !== '8888'
      ? 'http://localhost:8888'
      : '';
  return import.meta.env.VITE_NETLIFY_FUNCTIONS_BASE || fallback;
};

async function getToken(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('User session required for CFDI operations');
  return token;
}

async function callFacturapi<T>(action: string, payload: Record<string, unknown>): Promise<T> {
  const token = await getToken();
  const base = getBaseUrl();
  const res = await fetch(`${base}/.netlify/functions/facturapi`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, payload }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = j?.error ?? text;
    } catch {
      /* use text */
    }
    throw new Error(msg || 'CFDI request failed');
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function callFacturapiConfig<T>(method: 'GET' | 'POST', body?: object): Promise<T> {
  const token = await getToken();
  const base = getBaseUrl();
  const res = await fetch(`${base}/.netlify/functions/facturapi-config`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  const text = await res.text();
  if (!res.ok) {
    let msg = text;
    try {
      const j = JSON.parse(text);
      msg = (j as { error?: string })?.error ?? text;
    } catch {
      /* use text */
    }
    throw new Error(msg || 'Facturapi config request failed');
  }
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export const facturapiService = {
  createCustomer: (clinicId: string, clientId: string) =>
    callFacturapi<{ customer_id: string }>('createCustomer', { clinicId, clientId }),

  issueIndividualInvoice: (p: IssueIndividualInvoicePayload) =>
    callFacturapi<IssueIndividualInvoiceResult>('issueIndividualInvoice', p),

  getInvoice: (invoiceId: string, clinicId?: string) =>
    callFacturapi<Record<string, unknown>>('getInvoice', { invoiceId, clinicId }),

  issueGlobalInvoice: (p: IssueGlobalInvoicePayload) =>
    callFacturapi<IssueGlobalInvoiceResult>('issueGlobalInvoice', p),

  issueCreditNote: (p: IssueCreditNotePayload) =>
    callFacturapi<IssueCreditNoteResult>('issueCreditNote', p),

  issueLateInvoice: (p: IssueLateInvoicePayload) =>
    callFacturapi<IssueIndividualInvoiceResult>('issueLateInvoice', p),

  getConfig: () => callFacturapiConfig<{ configured: boolean; useLive: boolean }>('GET'),

  saveConfig: (payload: {
    facturapiTestSecret?: string;
    facturapiLiveSecret?: string;
    facturapiUseLive?: boolean;
    facturapiWebhookSecret?: string;
  }) => callFacturapiConfig<{ ok: boolean }>('POST', payload),
};
