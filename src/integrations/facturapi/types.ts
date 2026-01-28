/** CFDI / Facturapi integration types */

export interface IssueIndividualInvoicePayload {
  clinicId: string;
  clientId: string;
  paymentIds: string[];
}

export interface IssueIndividualInvoiceResult {
  id: string;
  facturapi_id: string;
  uuid: string | null;
  status: string;
  pdf_url: string | null;
  xml_url: string | null;
  total: number;
}

export interface IssueGlobalInvoicePayload {
  clinicId: string;
  periodStart: string;
  periodEnd: string;
}

export interface IssueGlobalInvoiceResult {
  id: string;
  facturapi_id: string;
  uuid: string | null;
  pdf_url: string | null;
  xml_url: string | null;
  total: number;
}

export interface IssueCreditNotePayload {
  clinicId: string;
  originalInvoiceId: string;
  reason?: string;
  amount?: number;
}

export interface IssueCreditNoteResult {
  id: string;
  facturapi_id: string;
  uuid: string | null;
  pdf_url: string | null;
  xml_url: string | null;
}

export interface IssueLateInvoicePayload {
  clinicId: string;
  paymentId: string;
}
