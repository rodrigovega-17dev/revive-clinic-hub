import React, { useMemo, useState } from 'react';
import type { Tables } from '@/integrations/supabase/types';
import {
  useDocumentTemplates,
  useClientDocuments,
  useAppointmentDocuments,
  useCreateDocumentInstance,
  useUpdateDocumentInstance,
  useDeleteDocumentInstance,
  DocumentContextType,
} from '@/hooks/useDocuments';
import { useTranslation } from 'react-i18next';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Plus, Printer, Eye, Pencil, Trash2, Mail, MessageCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { openWhatsApp, formatPhoneForWhatsApp } from '@/lib/whatsapp';

type DocumentInstance = Tables<'document_instances'>;
type DocumentTemplate = Tables<'document_templates'>;

interface DocumentSectionProps {
  context: DocumentContextType;
  clientId: string;
  appointmentId?: string | null;
  /** Optional: for WhatsApp document sharing (button shown only when set) */
  clientPhone?: string | null;
  /** Optional: client full name for WhatsApp message (falls back to doc variables) */
  clientName?: string | null;
}

type FieldType =
  | 'text'
  | 'textarea'
  | 'multiline_text'
  | 'date'
  | 'number'
  | 'checkbox'
  | 'signature';

interface FieldDef {
  id: string;
  label: string;
  type?: FieldType;
  placeholder?: string;
  prefillFrom?: string;
  readonly?: boolean;
}

interface SectionDef {
  id: string;
  label?: string;
  type?: 'group' | FieldType;
  fields?: FieldDef[];
  placeholder?: string;
}

interface ParsedTemplateSchema {
  layout?: string;
  sections?: SectionDef[];
}

type DocumentVariables = {
  clinicName?: string | null;
  clientFullName?: string | null;
  clientAge?: number | null;
  clientRfc?: string | null;
  clientEmail?: string | null;
  therapistFullName?: string | null;
  appointmentDateFormatted?: string | null;
  appointmentTimeFormatted?: string | null;
  treatmentName?: string | null;
};

/**
 * Normalize template.schema into a predictable sections array.
 * Supports both simple sections (backwards compatible) and grouped sections.
 */
const getTemplateSections = (template: DocumentTemplate | null): SectionDef[] => {
  if (!template) return [];
  const raw = (template.schema || {}) as ParsedTemplateSchema;
  if (!raw.sections || !Array.isArray(raw.sections)) return [];

  return raw.sections
    .filter((s): s is SectionDef => !!s && typeof s.id === 'string')
    .map((section) => {
      // Ensure we always have a type so renderers can make decisions
      if (!section.type) {
        // If it has fields, treat as group; otherwise as a single textarea-like block
        if (Array.isArray((section as any).fields) && (section as any).fields.length > 0) {
          return { ...section, type: 'group' as const };
        }
        return { ...section, type: 'textarea' as const };
      }
      return section;
    });
};

/**
 * Convert stored values into a display-friendly string.
 * Keeps booleans readable and avoids "undefined" noise.
 */
const formatFieldValue = (value: unknown) => {
  if (value === true) return 'Yes';
  if (value === false) return 'No';
  if (value === null || value === undefined) return '';
  return String(value);
};

/**
 * Pull normalized document data from an instance snapshot.
 * Helps reuse the same rendering logic for preview and print.
 */
const getInstanceSnapshot = (instance: DocumentInstance) => {
  const data = (instance.data || {}) as any;
  const schema = (data.schema || {}) as ParsedTemplateSchema;
  const sections: SectionDef[] = (schema.sections as SectionDef[]) || [];
  const values: Record<string, unknown> = data.values || {};
  const variables: DocumentVariables = (data.variables || {}) as DocumentVariables;

  return {
    data,
    schema,
    sections,
    values,
    variables,
  };
};

/**
 * Render a very simple, print-friendly HTML view for a document instance.
 * We rely on the browser's Print to generate a PDF if needed.
 */
const openDocumentWindow = (instance: DocumentInstance, options?: { autoPrint?: boolean }) => {
  const { data, sections, values, variables } = getInstanceSnapshot(instance);

  const docTitle = (data.templateName as string) || 'Documento';
  const clinicName = variables.clinicName || 'Clínica';
  const createdAt = instance.created_at ? new Date(instance.created_at) : null;
  const createdAtText = createdAt ? format(createdAt, 'PPpp') : '';

  const win = window.open('', '_blank');
  if (!win) return;

  const sectionHtml = sections
    .filter((section) => section.id !== 'header')
    .map((section) => {
      // Grouped section: render group label and each field
      if (section.type === 'group' && Array.isArray(section.fields) && section.fields.length > 0) {
        const fieldsHtml = section.fields
          .map((field) => {
            const v = values[field.id];
            const display = formatFieldValue(v);
            return `
              <div style="margin-bottom: 8px;">
                <div style="font-weight: 500; font-size: 13px; margin-bottom: 2px;">${field.label}</div>
                <div style="border: 1px solid #e5e7eb; padding: 6px; min-height: 32px; white-space: pre-wrap; font-size: 13px; background: #fff;">
                  ${display}
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <section style="margin-bottom: 16px;">
            ${
              section.label
                ? `<h3 style="margin: 0 0 6px; font-size: 14px;">${section.label}</h3>`
                : ''
            }
            ${fieldsHtml}
          </section>
        `;
      }

      // Simple section treated as a single field
      const label = section.label || section.id;
      const value = values[section.id];
      const display = formatFieldValue(value);
      return `
        <section style="margin-bottom: 16px;">
          <h3 style="margin: 0 0 4px; font-size: 14px;">${label}</h3>
          <div style="border: 1px solid #e5e7eb; padding: 8px; min-height: 40px; white-space: pre-wrap; font-size: 13px; background: #fff;">
            ${display}
          </div>
        </section>
      `;
    })
    .join('');

  const infoRows = [
    { label: 'Paciente', value: variables.clientFullName },
    { label: 'Edad', value: variables.clientAge },
    { label: 'Correo', value: variables.clientEmail },
    { label: 'RFC', value: variables.clientRfc },
    { label: 'Fisioterapeuta', value: variables.therapistFullName },
    { label: 'Tratamiento', value: variables.treatmentName },
    {
      label: 'Cita',
      value: [variables.appointmentDateFormatted, variables.appointmentTimeFormatted]
        .filter(Boolean)
        .join(' · '),
    },
  ].filter((row) => row.value);

  win.document.write(`
    <html>
      <head>
        <title>${docTitle}</title>
        <meta charset="utf-8" />
        <style>
          body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; padding: 28px; color: #111827; background: #f9fafb; }
          .page { background: #fff; border: 1px solid #e5e7eb; border-radius: 12px; padding: 28px; }
          h1 { font-size: 20px; margin-bottom: 4px; }
          h2 { font-size: 14px; margin-top: 0; margin-bottom: 8px; color: #6b7280; }
          .meta { font-size: 12px; color: #6b7280; }
          .info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 16px; margin: 16px 0 20px; }
          .info-label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; }
          .info-value { font-size: 13px; }
        </style>
      </head>
      <body>
        <div class="page">
          <header style="margin-bottom: 16px;">
            <div class="meta">${clinicName}</div>
            <h1>${docTitle}</h1>
            <h2>${createdAtText}</h2>
          </header>
          ${
            infoRows.length
              ? `<div class="info-grid">
                  ${infoRows
                    .map(
                      (row) => `
                        <div>
                          <div class="info-label">${row.label}</div>
                          <div class="info-value">${formatFieldValue(row.value)}</div>
                        </div>
                      `,
                    )
                    .join('')}
                </div>`
              : ''
          }
          ${sectionHtml}
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  if (options?.autoPrint) {
    // Give the browser a tiny delay to render before triggering print
    setTimeout(() => {
      win.print();
    }, 300);
  }
};

export const DocumentSection: React.FC<DocumentSectionProps> = ({
  context,
  clientId,
  appointmentId,
  clientPhone,
  clientName: clientNameProp,
}) => {
  const { t } = useTranslation();
  const { toast } = useToast();

  // Load templates + existing documents based on context
  const { data: templates = [] } = useDocumentTemplates(context);
  const { data: clientDocuments = [] } = useClientDocuments(clientId);
  const { data: appointmentDocuments = [] } = useAppointmentDocuments(appointmentId || null);

  const createDocument = useCreateDocumentInstance();
  const updateDocument = useUpdateDocumentInstance();
  const deleteDocument = useDeleteDocumentInstance();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [editingInstance, setEditingInstance] = useState<DocumentInstance | null>(null);
  const [editFieldValues, setEditFieldValues] = useState<Record<string, string>>({});
  const [emailInstance, setEmailInstance] = useState<DocumentInstance | null>(null);
  const [emailTo, setEmailTo] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [isSendingEmail, setIsSendingEmail] = useState(false);

  const allDocuments: DocumentInstance[] = useMemo(() => {
    if (context === 'client') {
      return clientDocuments;
    }
    return appointmentDocuments;
  }, [context, clientDocuments, appointmentDocuments]);

  const selectedTemplate = useMemo(
    () => templates.find((t) => t.id === selectedTemplateId) || null,
    [templates, selectedTemplateId]
  );

  const sections = useMemo(() => getTemplateSections(selectedTemplate), [selectedTemplate]);

  const handleOpenDialog = () => {
    setSelectedTemplateId(null);
    setFieldValues({});
    setIsDialogOpen(true);
  };

  const handleTemplateChange = (id: string) => {
    setSelectedTemplateId(id);
    // Reset field values when changing template
    setFieldValues({});
  };

  const handleFieldChange = (id: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleEditFieldChange = (id: string, value: string) => {
    setEditFieldValues((prev) => ({ ...prev, [id]: value }));
  };

  const handleCreate = async () => {
    if (!selectedTemplate || !clientId) return;

    const variables: Record<string, unknown> = {
      clientId,
    };

    if (appointmentId) {
      variables.appointmentId = appointmentId;
    }

    // Human-friendly date for the printable header if we have an appointment
    if (appointmentId) {
      const appointmentDoc = allDocuments.find((d) => d.appointment_id === appointmentId);
      if (appointmentDoc?.created_at) {
        variables.appointmentDate = format(new Date(appointmentDoc.created_at), 'PP');
      }
    }

    await createDocument.mutateAsync({
      template: selectedTemplate,
      clientId,
      appointmentId: context === 'appointment' ? appointmentId ?? null : null,
      status: 'finalized',
      values: fieldValues,
      variables,
    });

    setIsDialogOpen(false);
  };

  const title =
    context === 'client'
      ? t('documents.clientDocumentsTitle', 'Documentos del cliente')
      : t('documents.appointmentDocumentsTitle', 'Documentos de la cita');

  const emptyText =
    context === 'client'
      ? t('documents.noClientDocuments', 'No hay documentos registrados para este cliente.')
      : t('documents.noAppointmentDocuments', 'No hay documentos registrados para esta cita.');

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {title}
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleOpenDialog}
        >
          <Plus className="mr-2 h-4 w-4" />
          {t('documents.newDocument', 'Nuevo documento')}
        </Button>
      </CardHeader>
      <CardContent>
        {!allDocuments.length ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="space-y-2">
            {allDocuments.map((doc) => {
              const data = (doc.data || {}) as any;
              const displayName: string =
                (data.templateName as string) || (data.templateSlug as string) || 'Documento';
              const createdAt = doc.created_at ? new Date(doc.created_at) : null;

              return (
                <div
                  key={doc.id}
                  className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm"
                >
                  <div className="flex flex-col">
                    <span className="font-medium text-foreground">{displayName}</span>
                    {createdAt && (
                      <span className="text-xs text-muted-foreground">
                        {format(createdAt, 'PPpp')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {doc.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openDocumentWindow(doc, { autoPrint: false })}
                      title={t('common.view')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const data = (doc.data || {}) as any;
                        const values = (data.values || {}) as Record<string, string>;
                        setEditingInstance(doc);
                        setEditFieldValues(values);
                      }}
                      title={t('common.edit')}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={async () => {
                        const confirmed = window.confirm(
                          t(
                            'documents.confirmDelete',
                            'Are you sure you want to delete this document?'
                          ),
                        );
                        if (!confirmed) return;
                        try {
                          await deleteDocument.mutateAsync(doc);
                          toast({
                            title: t('common.success'),
                            description: t(
                              'documents.deleted',
                              'Document deleted successfully.',
                            ),
                          });
                        } catch (e) {
                          console.error(e);
                          toast({
                            title: t('common.error'),
                            description: t(
                              'documents.deleteFailed',
                              'Failed to delete document.',
                            ),
                            variant: 'destructive',
                          });
                        }
                      }}
                      title={t('common.delete')}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        const data = (doc.data || {}) as any;
                        const vars = (data.variables || {}) as Record<string, unknown>;
                        const defaultEmail =
                          (vars.clientEmail as string | undefined) || '';
                        setEmailInstance(doc);
                        setEmailTo(defaultEmail);
                        setEmailSubject(
                          data.templateName || t('documents.emailSubject', 'Clinic document'),
                        );
                      }}
                      title={t('common.email')}
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    {formatPhoneForWhatsApp(clientPhone || '') && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700 dark:hover:bg-green-950/50"
                        onClick={() => {
                          const data = (doc.data || {}) as any;
                          const vars = (data.variables || {}) as Record<string, unknown>;
                          const docName = data.templateName || t('documents.document', 'document');
                          const name = clientNameProp || (vars.clientFullName as string) || '';
                          const link = `${window.location.origin}/clients/${clientId}`;
                          openWhatsApp(
                            clientPhone ?? '',
                            t('whatsapp.messageDocument', { name, document: docName, link }),
                          );
                        }}
                        title={t('whatsapp.document')}
                        aria-label={t('whatsapp.document')}
                      >
                        <MessageCircle className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openDocumentWindow(doc, { autoPrint: true })}
                      title={t('documents.printOrPdf', 'Imprimir / PDF')}
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col gap-4">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t('documents.createDocument', 'Crear documento')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="shrink-0 h-[min(60vh,480px)] w-full">
            <div className="space-y-6 pr-3 pb-2 pt-0.5">
              {templates.length === 0 ? (
                <p className="text-sm text-muted-foreground py-4">
                  {t(
                    'documents.noTemplates',
                    'No templates are configured yet for this clinic.'
                  )}
                </p>
              ) : (
                <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
                  <label className="text-sm font-medium text-foreground block">
                    {t('documents.template', 'Plantilla')}
                  </label>
                  <Select
                    value={selectedTemplateId ?? ''}
                    onValueChange={handleTemplateChange}
                  >
                    <SelectTrigger className="h-11 min-h-11 px-3.5 py-2.5 text-left [&>span]:pr-6">
                      <SelectValue
                        placeholder={t('documents.selectTemplate', 'Selecciona una plantilla')}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((tpl) => (
                        <SelectItem key={tpl.id} value={tpl.id}>
                          {tpl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedTemplate && sections.length > 0 && (
                <div className="space-y-4">
                  {sections
                    .filter((section) => section.id !== 'header')
                    .map((section) => {
                    // Grouped section: render group label and its fields
                    if (section.type === 'group' && Array.isArray(section.fields)) {
                      return (
                        <div
                          key={section.id}
                          className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
                        >
                          {section.label && (
                            <p className="text-sm font-semibold text-foreground pb-0.5">
                              {section.label}
                            </p>
                          )}
                          <div className="space-y-4">
                            {section.fields
                              .filter((field) => !field.readonly)
                              .map((field) => {
                                const value = fieldValues[field.id] ?? '';
                                const commonProps = {
                                  id: field.id,
                                  value,
                                  onChange: (
                                    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                                  ) => handleFieldChange(field.id, e.target.value),
                                  placeholder: field.placeholder || '',
                                };
                                const fieldType = field.type || 'textarea';
                                const isReadonly = field.readonly === true;

                                return (
                                  <div key={field.id} className="space-y-2">
                                    <label
                                      htmlFor={field.id}
                                      className="text-sm font-medium text-foreground"
                                    >
                                      {field.label}
                                    </label>
                                    {fieldType === 'text' ||
                                    fieldType === 'date' ||
                                    fieldType === 'number' ? (
                                      <Input
                                        {...commonProps}
                                        type={fieldType === 'text' ? 'text' : fieldType}
                                        disabled={isReadonly}
                                        className="h-10"
                                      />
                                    ) : (
                                      <Textarea
                                        {...commonProps}
                                        rows={3}
                                        disabled={isReadonly}
                                        className="resize-y min-h-[4.5rem]"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      );
                    }

                    // Simple section rendered as a single field
                    const fieldType = (section.type as FieldType) || 'textarea';
                    const value = fieldValues[section.id] ?? '';
                    const commonProps = {
                      id: section.id,
                      value,
                      onChange: (
                        e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                      ) => handleFieldChange(section.id, e.target.value),
                      placeholder: section.placeholder || '',
                    };

                    return (
                      <div
                        key={section.id}
                        className="space-y-2 rounded-lg border border-border bg-muted/30 p-4"
                      >
                        <label
                          htmlFor={section.id}
                          className="text-sm font-medium text-foreground"
                        >
                          {section.label || section.id}
                        </label>
                        {fieldType === 'text' || fieldType === 'date' || fieldType === 'number' ? (
                          <Input
                            {...commonProps}
                            type={fieldType === 'text' ? 'text' : fieldType}
                            className="h-10"
                          />
                        ) : (
                          <Textarea {...commonProps} rows={3} className="resize-y min-h-[4.5rem]" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="flex shrink-0 justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={!templates.length || !selectedTemplateId || createDocument.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit document dialog (values only, using snapshot schema) */}
      <Dialog open={!!editingInstance} onOpenChange={(open) => !open && setEditingInstance(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-hidden flex flex-col gap-4">
          <DialogHeader className="shrink-0">
            <DialogTitle>{t('common.edit')}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="shrink-0 h-[min(60vh,480px)] w-full">
            {editingInstance && (
              <div className="space-y-6 pr-3 pb-2 pt-0.5">
                {(() => {
                  const data = (editingInstance.data || {}) as any;
                  const schema = (data.schema || {}) as ParsedTemplateSchema;
                  const sections = (schema.sections || []) as SectionDef[];

                  return sections
                    .filter((section) => section.id !== 'header')
                    .map((section) => {
                      if (section.type === 'group' && Array.isArray(section.fields)) {
                        return (
                          <div
                            key={section.id}
                            className="space-y-3 rounded-lg border border-border bg-muted/30 p-4"
                          >
                            {section.label && (
                              <p className="text-sm font-semibold text-foreground pb-0.5">
                                {section.label}
                              </p>
                            )}
                            <div className="space-y-4">
                              {section.fields.map((field) => {
                                const value = editFieldValues[field.id] ?? '';
                                const commonProps = {
                                  id: field.id,
                                  value,
                                  onChange: (
                                    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                                  ) => handleEditFieldChange(field.id, e.target.value),
                                  placeholder: field.placeholder || '',
                                };
                                const fieldType = field.type || 'textarea';
                                const isReadonly = field.readonly === true;

                                return (
                                  <div key={field.id} className="space-y-2">
                                    <label
                                      htmlFor={field.id}
                                      className="text-sm font-medium text-foreground"
                                    >
                                      {field.label}
                                    </label>
                                    {fieldType === 'text' ||
                                    fieldType === 'date' ||
                                    fieldType === 'number' ? (
                                      <Input
                                        {...commonProps}
                                        type={fieldType === 'text' ? 'text' : fieldType}
                                        disabled={isReadonly}
                                        className="h-10"
                                      />
                                    ) : (
                                      <Textarea
                                        {...commonProps}
                                        rows={3}
                                        disabled={isReadonly}
                                        className="resize-y min-h-[4.5rem]"
                                      />
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      }

                      const fieldType = (section.type as FieldType) || 'textarea';
                      const value = editFieldValues[section.id] ?? '';
                      const commonProps = {
                        id: section.id,
                        value,
                        onChange: (
                          e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
                        ) => handleEditFieldChange(section.id, e.target.value),
                        placeholder: section.placeholder || '',
                      };

                      return (
                        <div
                          key={section.id}
                          className="space-y-2 rounded-lg border border-border bg-muted/30 p-4"
                        >
                          <label
                            htmlFor={section.id}
                            className="text-sm font-medium text-foreground"
                          >
                            {section.label || section.id}
                          </label>
                          {fieldType === 'text' || fieldType === 'date' || fieldType === 'number' ? (
                            <Input
                              {...commonProps}
                              type={fieldType === 'text' ? 'text' : fieldType}
                              className="h-10"
                            />
                          ) : (
                            <Textarea {...commonProps} rows={3} className="resize-y min-h-[4.5rem]" />
                          )}
                        </div>
                      );
                    });
                })()}
              </div>
            )}
          </ScrollArea>
          <div className="flex shrink-0 justify-end gap-2 pt-2 border-t border-border">
            <Button variant="outline" onClick={() => setEditingInstance(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={async () => {
                if (!editingInstance) return;
                try {
                  await updateDocument.mutateAsync({
                    id: editingInstance.id,
                    values: editFieldValues,
                  });
                  toast({
                    title: t('common.success'),
                    description: t(
                      'documents.updated',
                      'Document updated successfully.',
                    ),
                  });
                  setEditingInstance(null);
                } catch (e) {
                  console.error(e);
                  toast({
                    title: t('common.error'),
                    description: t(
                      'documents.updateFailed',
                      'Failed to update document.',
                    ),
                    variant: 'destructive',
                  });
                }
              }}
            >
              {t('common.save')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Email document dialog */}
      <Dialog open={!!emailInstance} onOpenChange={(open) => !open && setEmailInstance(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('common.email')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                {t('common.email')}
              </label>
              <Input
                type="email"
                value={emailTo}
                onChange={(e) => setEmailTo(e.target.value)}
                placeholder="patient@example.com"
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">
                {t('appointments.appointmentDetails')}
              </label>
              <Input
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
              />
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEmailInstance(null)}>
              {t('common.cancel')}
            </Button>
            <Button
              disabled={!emailTo || isSendingEmail}
              onClick={async () => {
                if (!emailInstance) return;
                setIsSendingEmail(true);
                try {
                  const res = await fetch('/.netlify/functions/send-document-email', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      documentInstanceId: emailInstance.id,
                      to: emailTo,
                      subject: emailSubject,
                    }),
                  });
                  const json = await res.json();
                  if (!res.ok || json.error) {
                    throw new Error(json.error || 'Failed to send email');
                  }
                  toast({
                    title: t('common.success'),
                    description: t(
                      'documents.emailSent',
                      'Document email sent (or queued) successfully.',
                    ),
                  });
                  setEmailInstance(null);
                } catch (e) {
                  console.error(e);
                  toast({
                    title: t('common.error'),
                    description: t(
                      'documents.emailFailed',
                      'Failed to send document email.',
                    ),
                    variant: 'destructive',
                  });
                } finally {
                  setIsSendingEmail(false);
                }
              }}
            >
              {isSendingEmail ? t('common.loading') : t('common.send', 'Send')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
};

