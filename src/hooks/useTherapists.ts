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

export const useTherapists = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['therapists', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('therapists')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false });
      
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

      const payload = rules.map((rule) => ({
        clinic_id: clinicId,
        therapist_id: therapistId,
        weekday: rule.weekday,
        start_time: normalizeTimeForSave(rule.start_time),
        end_time: normalizeTimeForSave(rule.end_time),
        slot_minutes: rule.slot_minutes,
        buffer_minutes: rule.buffer_minutes,
        is_active: rule.is_active,
      }));

      const { error } = await supabase
        .from('therapist_schedule_rules')
        .upsert(payload, { onConflict: 'clinic_id,therapist_id,weekday' });

      if (error) throw error;
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
    },
  });
};
