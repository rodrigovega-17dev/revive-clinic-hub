/**
 * Resolve PDF/XML URL for CFDI display. Uploaded CFDIs use storage paths + signed URLs;
 * Facturapi CFDIs use stored full URLs.
 */

import { supabase } from '@/integrations/supabase/client';

const BUCKET = 'cfdi-uploads';
const SIGNED_URL_EXPIRY = 3600;

export type CfdiInvoiceForUrl = {
  source?: string | null;
  pdf_url?: string | null;
  xml_url?: string | null;
};

/**
 * Returns the URL to use for PDF or XML. For source=uploaded, path is in pdf_url/xml_url;
 * we create a signed URL. For Facturapi, we return the stored URL as-is.
 */
export async function getCfdiFileUrl(
  inv: CfdiInvoiceForUrl,
  kind: 'pdf' | 'xml'
): Promise<string | null> {
  const path = kind === 'pdf' ? inv.pdf_url : inv.xml_url;
  if (!path?.trim()) return null;

  if (inv.source === 'uploaded') {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrl(path.trim(), SIGNED_URL_EXPIRY);
    if (error) return null;
    return data?.signedUrl ?? null;
  }

  return path.startsWith('http') ? path : null;
}
