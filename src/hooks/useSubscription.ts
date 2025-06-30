import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { stripeService } from '@/integrations/stripe/service';
import { useAuth } from './useAuth';
import { useToast } from './use-toast';
import { useTranslation } from 'react-i18next';
import type { 
  SubscriptionPlan, 
  ClinicSubscription, 
  CreateSubscriptionParams,
  CheckoutSessionParams,
  SubscriptionLimits,
  BillingCycle,
  SubscriptionStatus
} from '@/integrations/stripe/types';
import { BILLING_CYCLES } from '@/integrations/stripe/types';

export const useSubscriptionPlans = () => {
  return useQuery({
    queryKey: ['subscription-plans'],
    queryFn: async (): Promise<SubscriptionPlan[]> => {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('sort_order', { ascending: true });
      
      if (error) throw error;
      
      return data.map(plan => ({
        ...plan,
        features: Array.isArray(plan.features) 
          ? plan.features.filter((f): f is string => typeof f === 'string')
          : [],
      }));
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useClinicSubscription = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['clinic-subscription', clinicId],
    queryFn: async (): Promise<ClinicSubscription | null> => {
      if (!clinicId) return null;
      
      const { data, error } = await supabase
        .from('clinic_subscriptions')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            slug,
            description,
            price_monthly,
            price_yearly,
            max_therapists,
            features,
            is_popular,
            sort_order
          )
        `)
        .eq('clinic_id', clinicId)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
      
      if (!data) return null;
      
      return {
        ...data,
        status: data.status as SubscriptionStatus,
        plan: data.subscription_plans ? {
          ...data.subscription_plans,
          features: Array.isArray(data.subscription_plans.features) 
            ? data.subscription_plans.features.filter((f): f is string => typeof f === 'string')
            : [],
        } : undefined,
      };
    },
    enabled: !!clinicId,
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useSubscriptionStatus = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['subscription-status', clinicId],
    queryFn: async () => {
      console.log('useSubscriptionStatus: clinicId =', clinicId);
      if (!clinicId) return null;
      
      // First, check if there's an active subscription in clinic_subscriptions table
      const { data: subscription, error: subscriptionError } = await supabase
        .from('clinic_subscriptions')
        .select(`
          *,
          subscription_plans (
            id,
            name,
            slug,
            max_therapists,
            price_monthly,
            price_yearly
          )
        `)
        .eq('clinic_id', clinicId)
        .in('status', ['active', 'trialing'])
        .single();
      
      console.log('useSubscriptionStatus: subscription query result =', { subscription, subscriptionError });
      
      // If there's an active subscription, use that data
      if (subscription && !subscriptionError) {
        console.log('useSubscriptionStatus: Found active subscription, using subscription data');
        // Get therapist count
        const { count: therapistCount } = await supabase
          .from('therapists')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .eq('is_active', true);
        
        // Get today's appointment count
        const { count: appointmentCount } = await supabase
          .from('appointments')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .gte('start_time', new Date().toISOString().split('T')[0])
          .lt('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
        
        // Get client count
        const { count: clientCount } = await supabase
          .from('clients')
          .select('*', { count: 'exact', head: true })
          .eq('clinic_id', clinicId)
          .eq('is_active', true);
        
        const result = {
          status: subscription.status as SubscriptionStatus,
          trial_ends_at: subscription.trial_end,
          plan: subscription.subscription_plans ? {
            id: subscription.subscription_plans.id,
            name: subscription.subscription_plans.name,
            slug: subscription.subscription_plans.slug,
            max_therapists: subscription.subscription_plans.max_therapists,
            price_monthly: subscription.subscription_plans.price_monthly,
            price_yearly: subscription.subscription_plans.price_yearly
          } : null,
          subscription: subscription,
          usage: {
            therapist_count: therapistCount || 0,
            appointment_count: appointmentCount || 0,
            client_count: clientCount || 0
          }
        };
        
        console.log('useSubscriptionStatus: Returning subscription result =', result);
        return result;
      }
      
      console.log('useSubscriptionStatus: No active subscription found, falling back to clinic data');
      
      // If no active subscription, fall back to clinic data (for trial users)
      const { data: clinic, error } = await supabase
        .from('clinics')
        .select(`
          subscription_status,
          trial_ends_at,
          subscription_plan_id,
          subscription_plans (
            id,
            name,
            slug,
            max_therapists,
            price_monthly,
            price_yearly
          )
        `)
        .eq('id', clinicId)
        .single();
      
      console.log('useSubscriptionStatus: clinic query result =', { clinic, error });
      
      if (error) throw error;
      
      // Get therapist count
      const { count: therapistCount } = await supabase
        .from('therapists')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('is_active', true);
      
      // Get today's appointment count
      const { count: appointmentCount } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .gte('start_time', new Date().toISOString().split('T')[0])
        .lt('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
      
      // Get client count
      const { count: clientCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('is_active', true);
      
      const result = {
        status: clinic.subscription_status || 'trial',
        trial_ends_at: clinic.trial_ends_at,
        plan: clinic.subscription_plans ? {
          id: clinic.subscription_plans.id,
          name: clinic.subscription_plans.name,
          slug: clinic.subscription_plans.slug,
          max_therapists: clinic.subscription_plans.max_therapists,
          price_monthly: clinic.subscription_plans.price_monthly,
          price_yearly: clinic.subscription_plans.price_yearly
        } : null,
        subscription: null,
        usage: {
          therapist_count: therapistCount || 0,
          appointment_count: appointmentCount || 0,
          client_count: clientCount || 0
        }
      };
      
      console.log('useSubscriptionStatus: Returning clinic result =', result);
      return result;
    },
    enabled: !!clinicId,
    staleTime: 1 * 60 * 1000, // 1 minute
  });
};

export const useSubscriptionLimits = (): SubscriptionLimits | null => {
  const { data: subscriptionStatus } = useSubscriptionStatus();
  const { data: therapistCount } = useTherapistCount();
  
  if (!subscriptionStatus) return null;
  
  const plan = subscriptionStatus.plan;
  const currentTherapists = therapistCount || 0;
  const maxTherapists = plan?.max_therapists || 3;
  
  return {
    maxTherapists,
    currentTherapists,
    canAddTherapist: currentTherapists < maxTherapists,
    planName: plan?.name || 'Trial',
    planSlug: plan?.slug || 'trial',
  };
};

export const useTherapistCount = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['therapist-count', clinicId],
    queryFn: async () => {
      if (!clinicId) return 0;
      
      const { count, error } = await supabase
        .from('therapists')
        .select('*', { count: 'exact', head: true })
        .eq('clinic_id', clinicId)
        .eq('is_active', true);
      
      if (error) throw error;
      return count || 0;
    },
    enabled: !!clinicId,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useSubscriptionInvoices = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['subscription-invoices', clinicId],
    queryFn: async () => {
      if (!clinicId) return [];
      
      const { data, error } = await supabase
        .from('subscription_invoices')
        .select('*')
        .eq('clinic_id', clinicId)
        .order('created_at', { ascending: false })
        .limit(12);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!clinicId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (params: CreateSubscriptionParams) => {
      return stripeService.createSubscription(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-count'] });
      
      toast({
        title: t('subscription.created'),
        description: t('subscription.createdSuccess'),
      });
    },
    onError: (error: any) => {
      console.error('Subscription creation error:', error);
      toast({
        title: t('subscription.creationFailed'),
        description: error.message || t('subscription.creationError'),
        variant: 'destructive',
      });
    },
  });
};

export const useCancelSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({ 
      subscriptionId, 
      cancelAtPeriodEnd = true 
    }: { 
      subscriptionId: string; 
      cancelAtPeriodEnd?: boolean;
    }) => {
      return stripeService.cancelSubscription(subscriptionId, cancelAtPeriodEnd);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      
      toast({
        title: t('subscription.canceled'),
        description: t('subscription.canceledSuccess'),
      });
    },
    onError: (error: any) => {
      console.error('Subscription cancellation error:', error);
      toast({
        title: t('subscription.cancellationFailed'),
        description: error.message || t('subscription.cancellationError'),
        variant: 'destructive',
      });
    },
  });
};

export const useReactivateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      return stripeService.reactivateSubscription(subscriptionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      
      toast({
        title: t('subscription.reactivated'),
        description: t('subscription.reactivatedSuccess'),
      });
    },
    onError: (error: any) => {
      console.error('Subscription reactivation error:', error);
      toast({
        title: t('subscription.reactivationFailed'),
        description: error.message || t('subscription.reactivationError'),
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({ 
      subscriptionId, 
      newPlanId, 
      billingCycle 
    }: { 
      subscriptionId: string; 
      newPlanId: string; 
      billingCycle: 'monthly' | 'yearly';
    }) => {
      return stripeService.updateSubscription(subscriptionId, newPlanId, billingCycle);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinic-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-count'] });
      
      toast({
        title: t('subscription.updated'),
        description: t('subscription.updatedSuccess'),
      });
    },
    onError: (error: any) => {
      console.error('Subscription update error:', error);
      toast({
        title: t('subscription.updateFailed'),
        description: error.message || t('subscription.updateError'),
        variant: 'destructive',
      });
    },
  });
};

export const useCreateCheckoutSession = () => {
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (params: CheckoutSessionParams) => {
      return stripeService.createCheckoutSession(params);
    },
    onSuccess: (session) => {
      // Redirect to Stripe Checkout
      if (session.url) {
        window.location.href = session.url;
      }
    },
    onError: (error: any) => {
      console.error('Checkout session creation error:', error);
      toast({
        title: t('subscription.checkoutFailed'),
        description: error.message || t('subscription.checkoutError'),
        variant: 'destructive',
      });
    },
  });
};

export const usePaymentMethods = () => {
  const { data: subscription } = useClinicSubscription();
  
  return useQuery({
    queryKey: ['payment-methods', subscription?.stripe_customer_id],
    queryFn: async () => {
      if (!subscription?.stripe_customer_id) return [];
      
      return stripeService.getCustomerPaymentMethods(subscription.stripe_customer_id);
    },
    enabled: !!subscription?.stripe_customer_id,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useAddPaymentMethod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async ({ 
      paymentMethodId, 
      customerId 
    }: { 
      paymentMethodId: string; 
      customerId: string;
    }) => {
      return stripeService.attachPaymentMethodToCustomer(paymentMethodId, customerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      
      toast({
        title: t('paymentMethod.added'),
        description: t('paymentMethod.addedSuccess'),
      });
    },
    onError: (error: any) => {
      console.error('Payment method addition error:', error);
      toast({
        title: t('paymentMethod.additionFailed'),
        description: error.message || t('paymentMethod.additionError'),
        variant: 'destructive',
      });
    },
  });
};

export const useDeletePaymentMethod = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  
  return useMutation({
    mutationFn: async (paymentMethodId: string) => {
      return stripeService.deletePaymentMethod(paymentMethodId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      
      toast({
        title: t('paymentMethod.deleted'),
        description: t('paymentMethod.deletedSuccess'),
      });
    },
    onError: (error: any) => {
      console.error('Payment method deletion error:', error);
      toast({
        title: t('paymentMethod.deletionFailed'),
        description: error.message || t('paymentMethod.deletionError'),
        variant: 'destructive',
      });
    },
  });
};

// Utility hook to get billing cycles
export const useBillingCycles = (): BillingCycle[] => {
  return BILLING_CYCLES;
};

// Utility hook to check if clinic can add more therapists
export const useCanAddTherapist = (): boolean => {
  const limits = useSubscriptionLimits();
  return limits?.canAddTherapist ?? false;
}; 