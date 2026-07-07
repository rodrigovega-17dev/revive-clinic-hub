/**
 * Reusable modal to upload externally generated CFDI (XML + optional PDF).
 * Individual mode: link to selected payments. Global mode: link to non-invoiced payments in period.
 */

import { useState, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import { Loader2, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { parseCfdiXml } from '@/lib/cfdi-xml';

const BUCKET = 'cfdi-uploads';

export type CfdiUploadMode = 'individual' | 'global' | 'payout';

export interface CfdiUploadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  clinicId: string;
  mode: CfdiUploadMode;
  /** Individual: payment ids to link. */
  paymentIds?: string[];
  /** Global: period. */
  periodStart?: string;
  periodEnd?: string;
  /** Payout: therapist payout id to attach CFDI. */
  therapistPayoutId?: string;
}

export function CfdiUploadModal({
  open,
  onClose,
  onSuccess,
  clinicId,
  mode,
  paymentIds = [],
  periodStart,
  periodEnd,
  therapistPayoutId,
}: CfdiUploadModalProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [xmlFile, setXmlFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const xmlInputRef = useRef<HTMLInputElement>(null);
  const pdfInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setXmlFile(null);
    setPdfFile(null);
    xmlInputRef.current && (xmlInputRef.current.value = '');
    pdfInputRef.current && (pdfInputRef.current.value = '');
  };

  const handleClose = () => {
    if (!uploading) {
      reset();
      onClose();
    }
  };

  const handleSubmit = async () => {
    if (!xmlFile || !clinicId) return;
    setUploading(true);
    try {
      const xmlText = await xmlFile.text();
      const parsed = parseCfdiXml(xmlText);

      // Payout mode: CFDI must be type egreso (therapist-provided factura)
      if (mode === 'payout') {
        if (parsed.type !== 'egreso') {
          throw new Error(t('payroll.cfdiMustBeEgreso'));
        }
      }

      const invoiceState = mode === 'individual' ? 'individually_invoiced' : 'globally_invoiced';

      const { data: inserted, error: insErr } = await supabase
        .from('cfdi_invoices')
        .insert({
          clinic_id: clinicId,
          source: 'uploaded',
          facturapi_id: null,
          uuid: parsed.uuid,
          folio: parsed.folio,
          type: parsed.type,
          status: 'issued',
          total: parsed.total,
          subtotal: parsed.subtotal,
          tax: parsed.tax,
          currency: 'MXN',
          emitted_at: parsed.emitted_at,
          global_period_start: mode === 'global' ? periodStart ?? null : null,
          global_period_end: mode === 'global' ? periodEnd ?? null : null,
        })
        .select('id')
        .single();

      if (insErr) {
        if (insErr.code === '23505') throw new Error('CFDI UUID already registered');
        throw new Error(insErr.message);
      }

      const prefix = `${clinicId}/${inserted.id}`;
      const xmlPath = `${prefix}/cfdi.xml`;
      const { error: xmlUpErr } = await supabase.storage
        .from(BUCKET)
        .upload(xmlPath, xmlFile, { upsert: true });
      if (xmlUpErr) throw new Error('Failed to upload XML: ' + xmlUpErr.message);

      let pdfPath: string | null = null;
      if (pdfFile) {
        pdfPath = `${prefix}/cfdi.pdf`;
        const { error: pdfUpErr } = await supabase.storage
          .from(BUCKET)
          .upload(pdfPath, pdfFile, { upsert: true });
        if (pdfUpErr) throw new Error('Failed to upload PDF: ' + pdfUpErr.message);
      }

      await supabase
        .from('cfdi_invoices')
        .update({ xml_url: xmlPath, pdf_url: pdfPath })
        .eq('id', inserted.id);

      // Payout mode: link CFDI to therapist payout, no payment linking
      if (mode === 'payout' && therapistPayoutId) {
        const { error: updateErr } = await supabase
          .from('therapist_payouts')
          .update({ cfdi_invoice_id: inserted.id })
          .eq('id', therapistPayoutId)
          .eq('clinic_id', clinicId);
        if (updateErr) throw new Error(updateErr.message);
        queryClient.invalidateQueries({ queryKey: ['therapist-payouts'] });
        queryClient.invalidateQueries({ queryKey: ['payroll'] });
        toast({ title: t('common.success'), description: t('cfdi.uploadCfdiSuccess') });
        reset();
        onSuccess();
        onClose();
        return;
      }

      // 'balance'/'adjustment' payments never moved real cash — the CFDI belongs on
      // whichever payment originally created the credit (or nothing, for a debt adjustment).
      let payments: { id: string; amount: number }[] = [];
      if (mode === 'individual' && paymentIds.length) {
        const { data: rows, error: payErr } = await supabase
          .from('payments')
          .select('id, amount, method, invoice_state')
          .in('id', paymentIds)
          .eq('clinic_id', clinicId);
        if (payErr) throw new Error('Failed to fetch payments');
        const nonInvoiced = (rows ?? []).filter(
          (p) => p.invoice_state === 'non_invoiced' && p.method !== 'balance' && p.method !== 'adjustment'
        );
        if (!nonInvoiced.length) throw new Error('Selected payment(s) already invoiced');
        payments = nonInvoiced.map((p) => ({ id: p.id, amount: Number(p.amount) }));
      } else if (mode === 'global' && periodStart && periodEnd) {
        const start = new Date(periodStart);
        const end = new Date(periodEnd);
        const { data: rows, error: payErr } = await supabase
          .from('payments')
          .select('id, amount, appointment_id')
          .eq('clinic_id', clinicId)
          .eq('invoice_state', 'non_invoiced')
          .neq('method', 'balance')
          .neq('method', 'adjustment')
          .gte('payment_date', start.toISOString())
          .lte('payment_date', end.toISOString())
          .is('refunded_at', null);
        if (payErr) throw new Error('Failed to fetch payments');
        const aids = [...new Set((rows ?? []).map((p) => p.appointment_id).filter(Boolean))];
        let allowed = new Set<string>();
        if (aids.length) {
          const { data: apts } = await supabase
            .from('appointments')
            .select('id')
            .in('id', aids)
            .eq('clinic_id', clinicId)
            .or('status.eq.scheduled,status.eq.completed,status.eq.confirmed,status.eq.in_progress');
          allowed = new Set((apts ?? []).map((a) => a.id));
        }
        const filtered = (rows ?? []).filter(
          (p) => !p.appointment_id || allowed.has(p.appointment_id)
        );
        if (!filtered.length) throw new Error('No non-invoiced payments in period');
        payments = filtered.map((p) => ({ id: p.id, amount: Number(p.amount) }));
      }

      for (const p of payments) {
        await supabase.from('cfdi_invoice_payments').insert({
          cfdi_invoice_id: inserted.id,
          payment_id: p.id,
          amount: p.amount,
        });
        await supabase.from('payments').update({ invoice_state: invoiceState }).eq('id', p.id);
      }

      queryClient.invalidateQueries({ queryKey: ['appointment-payments'] });
      queryClient.invalidateQueries({ queryKey: ['client-cfdi-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['client-payments'] });
      queryClient.invalidateQueries({ queryKey: ['monthly-payments'] });
      queryClient.invalidateQueries({ queryKey: ['payments'] });

      toast({ title: t('common.success'), description: t('cfdi.uploadCfdiSuccess') });
      reset();
      onSuccess();
      onClose();
    } catch (e) {
      toast({
        title: t('common.error'),
        description: (e as Error).message || t('cfdi.uploadCfdiError'),
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
    }
  };

  const canSubmit =
    !!xmlFile &&
    !!clinicId &&
    (mode === 'global' ? !!periodStart && !!periodEnd : mode === 'payout' ? !!therapistPayoutId : true);
  const title =
    mode === 'global' ? t('cfdi.uploadGlobalCfdi') : mode === 'payout' ? t('payroll.uploadPayoutCfdi') : t('cfdi.uploadCfdi');
  const desc =
    mode === 'global' && periodStart && periodEnd
      ? `${format(new Date(periodStart), 'd MMM yyyy')} – ${format(new Date(periodEnd), 'd MMM yyyy')}`
      : mode === 'individual' && paymentIds.length
        ? t('cfdi.uploadLinkPayments', { count: paymentIds.length })
        : mode === 'payout'
          ? t('payroll.attachCfdi')
          : t('cfdi.uploadCfdi');

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            {title}
          </DialogTitle>
          <DialogDescription>{desc}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>{t('cfdi.uploadXmlRequired')}</Label>
            <input
              ref={xmlInputRef}
              type="file"
              accept=".xml,application/xml"
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:rounded file:border file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
              onChange={(e) => setXmlFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <div>
            <Label>{t('cfdi.uploadPdfOptional')}</Label>
            <input
              ref={pdfInputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="mt-1 block w-full text-sm text-muted-foreground file:mr-4 file:rounded file:border file:bg-primary file:px-4 file:py-2 file:text-primary-foreground"
              onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
            />
          </div>
          {mode === 'individual' && paymentIds.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {t('cfdi.uploadLinkPayments', { count: paymentIds.length })}
            </p>
          )}
          <div className="flex gap-2 justify-end pt-2">
            <Button variant="outline" onClick={handleClose} disabled={uploading}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={!canSubmit || uploading}>
              {uploading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('cfdi.uploadCfdi')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
