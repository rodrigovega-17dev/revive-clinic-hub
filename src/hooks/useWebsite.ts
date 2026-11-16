import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import type { SiteContent, ThemeOverrides } from '@/site/types';

// The website tables/columns are newer than the generated Supabase types; use an untyped
// client here until types.ts is regenerated after the migration is applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as unknown as SupabaseClient<any>;

export interface BookingSettings {
  enabled: boolean;
  min_notice_hours: number;
  horizon_days: number;
}

export interface ClinicSiteRow {
  id: string;
  clinic_id: string;
  slug: string;
  is_enabled: boolean;
  theme_key: string;
  theme_overrides: ThemeOverrides;
  content: SiteContent;
  published_theme_key: string | null;
  published_content: SiteContent | null;
  published_at: string | null;
  booking_settings: BookingSettings;
  updated_at: string;
}

export interface WebsiteTreatment {
  id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  price: number | null;
  is_active: boolean | null;
  show_on_site: boolean;
  bookable_online: boolean;
  public_description: string | null;
}

export interface WebsiteTherapist {
  id: string;
  first_name: string | null;
  last_name: string | null;
  specialties: string[] | null;
  is_active: boolean | null;
  archived: boolean;
  show_on_site: boolean;
  bookable_online: boolean;
  public_bio: string | null;
  photo_url: string | null;
  last_online_assigned_at: string | null;
}

export interface BookingRequest {
  id: string;
  start_time: string;
  end_time: string;
  status: string | null;
  booking_status: 'pending' | 'approved' | 'rejected' | null;
  booking_contact: { first_name?: string; last_name?: string; phone?: string; email?: string; notes?: string } | null;
  created_at: string | null;
  therapist_id: string;
  treatment_id: string | null;
  client_id: string;
  clients: { first_name: string; last_name: string; phone: string | null; email: string | null; source?: string } | null;
  therapists: { first_name: string | null; last_name: string | null } | null;
  treatments: { name: string } | null;
}

export const slugify = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50) || 'clinica';

export const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$/;

export const useClinicSite = () => {
  const { clinicId } = useAuth();
  return useQuery({
    queryKey: ['clinic-site', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const { data, error } = await db.from('clinic_sites').select('*').eq('clinic_id', clinicId).maybeSingle();
      if (error) throw error;
      return (data as ClinicSiteRow | null) ?? null;
    },
  });
};

export const useSaveClinicSite = () => {
  const qc = useQueryClient();
  const { clinicId } = useAuth();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<ClinicSiteRow, 'id' | 'clinic_id'>> & { publish?: boolean }) => {
      if (!clinicId) throw new Error('No clinic');
      const { publish, ...rest } = patch;
      const row: Record<string, unknown> = { clinic_id: clinicId, ...rest };
      if (publish) {
        row.published_theme_key = rest.theme_key;
        row.published_theme_overrides = rest.theme_overrides;
        row.published_content = rest.content;
        row.published_at = new Date().toISOString();
      }
      const { data, error } = await db.from('clinic_sites').upsert(row, { onConflict: 'clinic_id' }).select('*').single();
      if (error) throw error;
      return data as ClinicSiteRow;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['clinic-site'] });
    },
  });
};

export const useWebsiteCatalog = () => {
  const { clinicId } = useAuth();
  return useQuery({
    queryKey: ['website-catalog', clinicId],
    enabled: !!clinicId,
    queryFn: async () => {
      const [tr, th, rules] = await Promise.all([
        db.from('treatments')
          .select('id, name, description, duration_minutes, price, is_active, show_on_site, bookable_online, public_description')
          .eq('clinic_id', clinicId).order('name'),
        db.from('therapists')
          .select('id, first_name, last_name, specialties, is_active, archived, show_on_site, bookable_online, public_bio, photo_url, last_online_assigned_at')
          .eq('clinic_id', clinicId).order('first_name'),
        db.from('therapist_schedule_rules')
          .select('weekday, start_time, end_time, is_active')
          .eq('clinic_id', clinicId).is('therapist_id', null).eq('is_active', true),
      ]);
      if (tr.error) throw tr.error;
      if (th.error) throw th.error;
      return {
        treatments: (tr.data ?? []) as WebsiteTreatment[],
        therapists: (th.data ?? []) as WebsiteTherapist[],
        hours: (rules.data ?? []).map((r: { weekday: number; start_time: string; end_time: string }) => ({ weekday: r.weekday, start: r.start_time, end: r.end_time })),
      };
    },
  });
};

export const useUpdateWebsiteTreatment = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<WebsiteTreatment, 'show_on_site' | 'bookable_online' | 'public_description'>>) => {
      const { error } = await db.from('treatments').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-catalog'] }),
  });
};

export const useUpdateWebsiteTherapist = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & Partial<Pick<WebsiteTherapist, 'show_on_site' | 'bookable_online' | 'public_bio' | 'photo_url'>>) => {
      const { error } = await db.from('therapists').update(patch).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['website-catalog'] }),
  });
};

export const useBookingRequests = () => {
  const { clinicId } = useAuth();
  return useQuery({
    queryKey: ['website-booking-requests', clinicId],
    enabled: !!clinicId,
    refetchInterval: 60_000,
    queryFn: async () => {
      const since = new Date(Date.now() - 30 * 86400_000).toISOString();
      const { data, error } = await db
        .from('appointments')
        .select('id, start_time, end_time, status, booking_status, booking_contact, created_at, therapist_id, treatment_id, client_id, clients(first_name, last_name, phone, email, source), therapists(first_name, last_name), treatments(name)')
        .eq('clinic_id', clinicId)
        .eq('source', 'website')
        .or(`booking_status.eq.pending,created_at.gte.${since}`)
        .order('start_time', { ascending: true })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as BookingRequest[];
    },
  });
};

const notifyPatient = async (appointmentId: string, decision: 'approved' | 'rejected') => {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/.netlify/functions/website-booking-notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ appointmentId, decision }),
    });
  } catch {
    // Email is best effort; the decision is already saved.
  }
};

export const useDecideBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: 'approved' | 'rejected' }) => {
      const patch = decision === 'approved'
        ? { status: 'confirmed', booking_status: 'approved' }
        : { status: 'cancelled', booking_status: 'rejected' };
      const { error } = await db.from('appointments').update(patch).eq('id', id).eq('booking_status', 'pending');
      if (error) throw error;
      await notifyPatient(id, decision);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-booking-requests'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export class TherapistConflictError extends Error {}

export const useReassignBooking = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, therapistId, start, end }: { id: string; therapistId: string; start: string; end: string }) => {
      const { data: conflict, error: cErr } = await supabase.rpc('has_appointment_conflict', {
        therapist_id: therapistId, start_time: start, end_time: end, exclude_appointment_id: id,
      });
      if (cErr) throw cErr;
      if (conflict) throw new TherapistConflictError('conflict');
      const { error } = await db.from('appointments').update({ therapist_id: therapistId }).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['website-booking-requests'] });
      qc.invalidateQueries({ queryKey: ['appointments'] });
    },
  });
};

export const uploadSiteImage = async (clinicId: string, file: File) => {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${clinicId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from('site-media').upload(path, file, { cacheControl: '31536000', upsert: false, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from('site-media').getPublicUrl(path).data.publicUrl;
};
