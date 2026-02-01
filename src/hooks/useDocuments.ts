import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';
import { useAuth } from './useAuth';

type DocumentTemplate = Tables<'document_templates'>;
type DocumentInstance = Tables<'document_instances'>;
type DocumentInstanceInsert = TablesInsert<'document_instances'>;

export type DocumentContextType = 'client' | 'appointment';

/**
 * Fetch all active document templates for the current clinic.
 * Optionally filter by type ('client' | 'appointment').
 */
export const useDocumentTemplates = (type?: DocumentContextType) => {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['document-templates', clinicId, type],
    queryFn: async () => {
      if (!clinicId) return [] as DocumentTemplate[];

      let query = supabase
        .from('document_templates')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (type) {
        query = query.eq('type', type);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as DocumentTemplate[];
    },
    enabled: !!clinicId,
  });
};

/**
 * Fetch all document instances for a client.
 * This includes both client-level and appointment-level documents.
 */
export const useClientDocuments = (clientId: string | null | undefined) => {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['documents', 'client', clientId, clinicId],
    queryFn: async () => {
      if (!clinicId || !clientId) return [] as DocumentInstance[];

      const { data, error } = await supabase
        .from('document_instances')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DocumentInstance[];
    },
    enabled: !!clinicId && !!clientId,
  });
};

/**
 * Fetch all document instances attached to a specific appointment.
 */
export const useAppointmentDocuments = (appointmentId: string | null | undefined) => {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['documents', 'appointment', appointmentId, clinicId],
    queryFn: async () => {
      if (!clinicId || !appointmentId) return [] as DocumentInstance[];

      const { data, error } = await supabase
        .from('document_instances')
        .select('*')
        .eq('clinic_id', clinicId)
        .eq('appointment_id', appointmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return (data || []) as DocumentInstance[];
    },
    enabled: !!clinicId && !!appointmentId,
  });
};

/**
 * Create a new document instance from a template.
 *
 * The caller is responsible for:
 * - Choosing the template
 * - Providing clientId (and optional appointmentId)
 * - Providing the filled values for dynamic fields
 *
 * We snapshot the template's schema into the instance `data` to keep
 * documents stable even if the template changes in the future.
 */
export interface CreateDocumentPayload {
  template: DocumentTemplate;
  clientId: string;
  appointmentId?: string | null;
  status?: 'draft' | 'finalized';
  values: Record<string, unknown>;
  variables?: Record<string, unknown>;
  responsiblePersonType?: 'therapist' | 'user' | 'clinic' | null;
  responsiblePersonId?: string | null;
}

export const useCreateDocumentInstance = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();

  return useMutation({
    mutationFn: async (payload: CreateDocumentPayload) => {
      if (!clinicId) throw new Error('No clinic ID available');

      const { template, clientId, appointmentId, status, values, variables, responsiblePersonType, responsiblePersonId } = payload;

      // Load related records so we can build variables and default values
      const { data: client, error: clientError } = await supabase
        .from('clients')
        .select('first_name, last_name, birth_date, rfc, email')
        .eq('id', clientId)
        .single();
      if (clientError) throw clientError;

      let appointment: any = null;
      if (appointmentId) {
        const { data: apt, error: aptError } = await supabase
          .from('appointments')
          .select(
            `
              id,
              start_time,
              end_time,
              therapists (first_name, last_name),
              treatments (name)
            `,
          )
          .eq('id', appointmentId)
          .single();
        if (aptError) throw aptError;
        appointment = apt;
      }

      const { data: clinic, error: clinicError } = await supabase
        .from('clinics')
        .select('id, name, slug')
        .eq('id', clinicId)
        .single();
      if (clinicError) throw clinicError;

      // Compute some derived values
      const clientFullName = `${client.first_name ?? ''} ${client.last_name ?? ''}`.trim();
      let clientAge: number | null = null;
      if (client.birth_date) {
        const birth = new Date(client.birth_date as string);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const m = today.getMonth() - birth.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
          age--;
        }
        clientAge = age;
      }

      const therapist = appointment?.therapists;
      const treatment = appointment?.treatments;
      const appointmentDate = appointment
        ? new Date(appointment.start_time as string)
        : null;

      const variablesComputed: Record<string, unknown> = {
        clientId,
        clientFullName,
        clientAge,
        clientRfc: client.rfc,
        clientEmail: client.email,
        therapistFullName:
          therapist && (therapist.first_name || therapist.last_name)
            ? `${therapist.first_name ?? ''} ${therapist.last_name ?? ''}`.trim()
            : null,
        appointmentId: appointmentId ?? null,
        appointmentDateISO: appointmentDate ? appointmentDate.toISOString() : null,
        appointmentDateFormatted: appointmentDate
          ? appointmentDate.toLocaleDateString()
          : null,
        appointmentTimeFormatted: appointmentDate
          ? appointmentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : null,
        treatmentName: treatment?.name ?? null,
        clinicName: clinic.name,
        clinicSlug: clinic.slug,
      };

      const mergedVariables = {
        ...(variablesComputed || {}),
        ...(variables || {}),
      };

      // Fetch responsible person's signature if provided
      if (responsiblePersonType && responsiblePersonId) {
        if (responsiblePersonType === 'therapist') {
          const { data: therapistData, error: therapistError } = await supabase
            .from('therapists')
            .select('first_name, last_name, signature_image_url')
            .eq('id', responsiblePersonId)
            .single();
          if (!therapistError && therapistData) {
            mergedVariables.responsibleName = `${therapistData.first_name ?? ''} ${therapistData.last_name ?? ''}`.trim();
            mergedVariables.responsibleSignatureUrl = therapistData.signature_image_url;
          }
        } else if (responsiblePersonType === 'user') {
          const { data: userData, error: userError } = await supabase
            .from('profiles')
            .select('first_name, last_name, signature_image_url')
            .eq('id', responsiblePersonId)
            .single();
          if (!userError && userData) {
            mergedVariables.responsibleName = `${userData.first_name ?? ''} ${userData.last_name ?? ''}`.trim();
            mergedVariables.responsibleSignatureUrl = userData.signature_image_url;
          }
        } else if (responsiblePersonType === 'clinic') {
          const { data: clinicData, error: clinicError } = await supabase
            .from('clinics')
            .select('name, logo_url')
            .eq('id', responsiblePersonId)
            .single();
          if (!clinicError && clinicData) {
            mergedVariables.responsibleName = clinicData.name ?? '';
            mergedVariables.responsibleSignatureUrl = clinicData.logo_url;
          }
        }
      }

      // Walk template schema to prefill values where missing
      const finalValues: Record<string, unknown> = { ...values };
      const schema = (template.schema || {}) as any;
      const sections: any[] = Array.isArray(schema.sections) ? schema.sections : [];

      const applyPrefill = (field: any) => {
        if (!field || typeof field.id !== 'string') return;
        const fieldId = field.id as string;
        if (finalValues[fieldId] !== undefined && finalValues[fieldId] !== null) return;

        const prefillFrom = field.prefillFrom as string | undefined;
        if (!prefillFrom) return;

        let v: unknown = undefined;
        switch (prefillFrom) {
          case 'client.full_name':
            v = clientFullName;
            break;
          case 'client.age':
            v = clientAge;
            break;
          case 'client.rfc':
            v = client.rfc;
            break;
          case 'client.email':
            v = client.email;
            break;
          case 'therapist.full_name':
            v =
              therapist && (therapist.first_name || therapist.last_name)
                ? `${therapist.first_name ?? ''} ${therapist.last_name ?? ''}`.trim()
                : null;
            break;
          case 'appointment.date':
            v = appointmentDate ? appointmentDate.toLocaleDateString() : null;
            break;
          case 'treatment.name':
            v = treatment?.name ?? null;
            break;
          case 'clinic.name':
            v = clinic.name;
            break;
          default:
            if (prefillFrom in mergedVariables) {
              v = mergedVariables[prefillFrom];
            }
        }

        if (v !== undefined) {
          finalValues[fieldId] = v;
        }
      };

      sections.forEach((section) => {
        if (section.type === 'group' && Array.isArray(section.fields)) {
          section.fields.forEach((field: any) => applyPrefill(field));
        } else {
          applyPrefill(section);
        }
      });

      // Snapshot template schema + values into instance.data
      const dataSnapshot = {
        templateName: template.name,
        templateSlug: template.slug,
        type: template.type,
        category: template.category,
        language: template.language,
        schema: template.schema,
        values: finalValues,
        variables: mergedVariables,
      };

      const insert: DocumentInstanceInsert = {
        clinic_id: clinicId,
        template_id: template.id,
        template_version: template.version,
        client_id: clientId,
        appointment_id: appointmentId ?? null,
        status: status || 'finalized',
        data: dataSnapshot as any,
        responsible_person_type: responsiblePersonType || null,
        responsible_person_id: responsiblePersonId || null,
      };

      const { data, error } = await supabase
        .from('document_instances')
        .insert(insert)
        .select('*')
        .single();

      if (error) throw error;
      return data as DocumentInstance;
    },
    onSuccess: (instance) => {
      // Invalidate both client and appointment queries so UI stays in sync
      const clientId = instance.client_id;
      const appointmentId = instance.appointment_id;

      if (clientId) {
        queryClient.invalidateQueries({ queryKey: ['documents', 'client', clientId] });
      }
      if (appointmentId) {
        queryClient.invalidateQueries({ queryKey: ['documents', 'appointment', appointmentId] });
      }
    },
  });
};

/**
 * Update an existing document instance's values (and optionally status).
 * Uses the stored snapshot schema to keep documents stable.
 */
export const useUpdateDocumentInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (args: { id: string; values: Record<string, unknown> }) => {
      const { id, values } = args;

      const { data: existing, error: fetchError } = await supabase
        .from('document_instances')
        .select('data, client_id, appointment_id')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      const data = (existing.data || {}) as any;
      const updatedData = {
        ...data,
        values: {
          ...(data.values || {}),
          ...values,
        },
      };

      const { error } = await supabase
        .from('document_instances')
        .update({ data: updatedData })
        .eq('id', id);

      if (error) throw error;

      return existing as { client_id: string; appointment_id: string | null };
    },
    onSuccess: (existing) => {
      if (existing.client_id) {
        queryClient.invalidateQueries({
          queryKey: ['documents', 'client', existing.client_id],
        });
      }
      if (existing.appointment_id) {
        queryClient.invalidateQueries({
          queryKey: ['documents', 'appointment', existing.appointment_id],
        });
      }
    },
  });
};

/**
 * Delete a document instance by id.
 */
export const useDeleteDocumentInstance = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instance: DocumentInstance) => {
      const { error } = await supabase
        .from('document_instances')
        .delete()
        .eq('id', instance.id);

      if (error) throw error;
      return instance;
    },
    onSuccess: (instance) => {
      if (instance.client_id) {
        queryClient.invalidateQueries({
          queryKey: ['documents', 'client', instance.client_id],
        });
      }
      if (instance.appointment_id) {
        queryClient.invalidateQueries({
          queryKey: ['documents', 'appointment', instance.appointment_id],
        });
      }
    },
  });
};

/**
 * Get or create a share token for a document instance (for public view link, e.g. WhatsApp).
 * Returns the token to use in URL: /.netlify/functions/view-document?id=<id>&t=<token>
 */
export const useGetOrCreateDocumentShareToken = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (instance: DocumentInstance) => {
      const id = instance.id;
      if (instance.share_token) return { token: instance.share_token };

      const token = crypto.randomUUID();
      const { error } = await supabase
        .from('document_instances')
        .update({ share_token: token })
        .eq('id', id);

      if (error) throw error;
      return { token };
    },
    onSuccess: (_, instance) => {
      if (instance.client_id) {
        queryClient.invalidateQueries({
          queryKey: ['documents', 'client', instance.client_id],
        });
      }
      if (instance.appointment_id) {
        queryClient.invalidateQueries({
          queryKey: ['documents', 'appointment', instance.appointment_id],
        });
      }
    },
  });
};

