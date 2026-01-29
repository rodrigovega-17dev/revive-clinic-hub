import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { Tables, TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

type Therapist = Tables<'therapists'>;
type TherapistInsert = TablesInsert<'therapists'>;
type TherapistUpdate = TablesUpdate<'therapists'>;

export type TherapistScheduleRuleInput = {
  weekday: number;
  start_time: string;
  end_time: string;
  slot_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
};

const DEFAULT_RULES: TherapistScheduleRuleInput[] = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  start_time: '08:00',
  end_time: '18:00',
  slot_minutes: 60,
  buffer_minutes: 0,
  is_active: true,
}));

export const createDefaultScheduleRules = () =>
  DEFAULT_RULES.map((rule) => ({ ...rule }));

const normalizeTimeForForm = (value?: string | null) => {
  if (!value) return '08:00';
  return value.slice(0, 5);
};

const normalizeTimeForSave = (value: string) => {
  return value.length === 5 ? `${value}:00` : value;
};

/** Ensure start < end for DB CHECK. Use 08:00–18:00 if invalid. */
const sanitizeRuleForDb = (rule: TherapistScheduleRuleInput) => {
  let start = normalizeTimeForSave(rule.start_time);
  let end = normalizeTimeForSave(rule.end_time);
  if (start >= end) {
    start = '08:00:00';
    end = '18:00:00';
  }
  return {
    ...rule,
    start_time: start,
    end_time: end,
  };
};

const buildRulesByWeekday = (
  rules: Array<{
    therapist_id: string | null;
    weekday: number;
    start_time: string;
    end_time: string;
    slot_minutes: number;
    buffer_minutes: number;
    is_active: boolean;
  }>,
  therapistId?: string
) => {
  const defaults = createDefaultScheduleRules();

  return defaults.map((defaultRule) => {
    const therapistRule = therapistId
      ? rules.find((rule) => rule.weekday === defaultRule.weekday && rule.therapist_id === therapistId)
      : null;
    const clinicRule = rules.find(
      (rule) => rule.weekday === defaultRule.weekday && rule.therapist_id === null
    );
    const source = therapistRule || clinicRule || defaultRule;

    return {
      weekday: defaultRule.weekday,
      start_time: normalizeTimeForForm(source.start_time),
      end_time: normalizeTimeForForm(source.end_time),
      slot_minutes: source.slot_minutes ?? defaultRule.slot_minutes,
      buffer_minutes: source.buffer_minutes ?? defaultRule.buffer_minutes,
      is_active: source.is_active ?? defaultRule.is_active,
    };
  });
};

export const useTherapists = (opts?: { includeArchived?: boolean }) => {
  const { clinicId } = useAuth();
  const includeArchived = opts?.includeArchived ?? false;

  return useQuery({
    queryKey: ['therapists', clinicId, includeArchived],
    queryFn: async () => {
      if (!clinicId) return [];
      let q = supabase
        .from('therapists')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      if (!includeArchived) q = q.eq('archived', false);
      const { data, error } = await q;
      if (error) throw error;
      return data;
    },
    enabled: !!clinicId,
  });
};

export const useTherapistScheduleRules = (therapistId?: string) => {
  const { clinicId } = useAuth();

  return useQuery({
    queryKey: ['therapist-schedule-rules', clinicId, therapistId],
    queryFn: async () => {
      if (!clinicId) {
        return createDefaultScheduleRules();
      }

      const query = supabase
        .from('therapist_schedule_rules')
        .select('therapist_id, weekday, start_time, end_time, slot_minutes, buffer_minutes, is_active')
        .eq('clinic_id', clinicId);

      const { data, error } = therapistId
        ? await query.or(`therapist_id.eq.${therapistId},therapist_id.is.null`)
        : await query.is('therapist_id', null);

      if (error) throw error;

      return buildRulesByWeekday(data || [], therapistId);
    },
    enabled: !!clinicId,
  });
};

export const useUpsertTherapistScheduleRules = () => {
  const { clinicId } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      therapistId,
      rules,
    }: {
      therapistId: string;
      rules: TherapistScheduleRuleInput[];
    }) => {
      if (!clinicId) throw new Error('No clinic ID available');

      const payload = rules.map((r) => {
        const sane = sanitizeRuleForDb(r);
        return {
          clinic_id: clinicId,
          therapist_id: therapistId,
          weekday: sane.weekday,
          start_time: sane.start_time,
          end_time: sane.end_time,
          slot_minutes: sane.slot_minutes,
          buffer_minutes: sane.buffer_minutes,
          is_active: sane.is_active,
        };
      });

      const { error: delErr } = await supabase
        .from('therapist_schedule_rules')
        .delete()
        .eq('clinic_id', clinicId)
        .eq('therapist_id', therapistId);

      if (delErr) throw delErr;

      const { error: insErr } = await supabase
        .from('therapist_schedule_rules')
        .insert(payload);

      if (insErr) throw insErr;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['therapist-schedule-rules', clinicId, variables.therapistId],
      });
    },
  });
};

export const useCreateTherapist = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  
  return useMutation({
    mutationFn: async (therapist: Omit<TherapistInsert, 'clinic_id'>) => {
      if (!clinicId) throw new Error('No clinic ID available');
      
      const therapistWithClinic: TherapistInsert = {
        ...therapist,
        clinic_id: clinicId,
      };
      
      const { data, error } = await supabase
        .from('therapists')
        .insert(therapistWithClinic)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
    },
  });
};

export const useUpdateTherapist = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();

  return useMutation({
    mutationFn: async ({ id, ...updates }: { id: string } & Partial<TherapistUpdate>) => {
      const { data, error } = await supabase
        .from('therapists')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['therapists'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-count'] });
      if (clinicId) queryClient.invalidateQueries({ queryKey: ['subscription-status', clinicId] });
    },
  });
};
