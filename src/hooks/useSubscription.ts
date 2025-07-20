import React from 'react';
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
    staleTime: 15 * 60 * 1000, // 15 minutes - subscription plans rarely change
    gcTime: 60 * 60 * 1000, // 1 hour - keep in cache longer for static data
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    // Enable background refetch for stale-while-revalidate
    refetchOnMount: 'always',
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    // Prefetch on hover for better UX
    refetchInterval: false, // Don't auto-refetch since plans are static
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
    staleTime: 3 * 60 * 1000, // 3 minutes - subscription data changes less frequently
    gcTime: 15 * 60 * 1000, // 15 minutes - keep in cache longer
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useSubscriptionStatus = () => {
  const { clinicId } = useAuth();
  
  return useQuery({
    queryKey: ['subscription-status', clinicId],
    queryFn: async () => {
      if (!clinicId) return null;
      
      try {
        // First, try to get active subscription data (most common case)
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
          .maybeSingle();
        
        // Get usage counts in parallel (only if we need them)
        const [therapistResult, appointmentResult, clientResult] = await Promise.all([
          supabase
            .from('therapists')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('is_active', true),
          supabase
            .from('appointments')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .gte('start_time', new Date().toISOString().split('T')[0])
            .lt('start_time', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0]),
          supabase
            .from('clients')
            .select('*', { count: 'exact', head: true })
            .eq('clinic_id', clinicId)
            .eq('is_active', true)
        ]);
        
        const usage = {
          therapist_count: therapistResult.count || 0,
          appointment_count: appointmentResult.count || 0,
          client_count: clientResult.count || 0
        };
        
        // If there's an active subscription, return that data
        if (subscription && !subscriptionError) {
          return {
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
            usage
          };
        }
        
        // If no active subscription, try to get clinic data (fallback for trial users)
        const { data: clinic, error: clinicError } = await supabase
          .from('clinics')
          .select(`
            subscription_status,
            trial_ends_at,
            subscription_plan_id
          `)
          .eq('id', clinicId)
          .single();
        
        if (clinicError) {
          console.error('Error fetching clinic data:', clinicError);
          // Return a default trial status if clinic data fails
          return {
            status: 'trial' as SubscriptionStatus,
            trial_ends_at: null,
            plan: null,
            subscription: null,
            usage
          };
        }
        
        // Get plan data separately if we have a plan_id
        let planData = null;
        if (clinic.subscription_plan_id) {
          const { data: plan } = await supabase
            .from('subscription_plans')
            .select(`
              id,
              name,
              slug,
              max_therapists,
              price_monthly,
              price_yearly
            `)
            .eq('id', clinic.subscription_plan_id)
            .single();
          
          planData = plan;
        }
        
        // Return clinic-based subscription status (for trial users)
        return {
          status: (clinic.subscription_status || 'trial') as SubscriptionStatus,
          trial_ends_at: clinic.trial_ends_at,
          plan: planData,
          subscription: null,
          usage
        };
        
      } catch (error) {
        console.error('Error in subscription status query:', error);
        
        // Return a safe default to prevent blocking the UI
        return {
          status: 'trial' as SubscriptionStatus,
          trial_ends_at: null,
          plan: null,
          subscription: null,
          usage: {
            therapist_count: 0,
            appointment_count: 0,
            client_count: 0
          }
        };
      }
    },
    enabled: !!clinicId,
    staleTime: 1 * 60 * 1000, // 1 minute - faster refresh for critical subscription data
    gcTime: 10 * 60 * 1000, // 10 minutes - keep in cache
    retry: 1, // Reduce retries to fail faster
    retryDelay: 1000, // Shorter retry delay
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
    // Disable automatic refetch on mount to use cached data when available
    refetchOnMount: false,
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
    staleTime: 2 * 60 * 1000, // 2 minutes - therapist count changes less frequently
    gcTime: 10 * 60 * 1000, // 10 minutes
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
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
    staleTime: 10 * 60 * 1000, // 10 minutes - invoices don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });
};

export const useCreateSubscription = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { clinicId } = useAuth();
  
  return useMutation({
    mutationFn: async (params: CreateSubscriptionParams) => {
      return stripeService.createSubscription(params);
    },
    onSuccess: () => {
      // Comprehensive cache invalidation for subscription-related data
      queryClient.invalidateQueries({ queryKey: ['clinic-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-count'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      
      // Prefetch updated subscription data for better UX
      if (clinicId) {
        queryClient.prefetchQuery({
          queryKey: ['subscription-status', clinicId],
          staleTime: 0, // Force fresh data
        });
      }
      
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
  const { clinicId } = useAuth();
  
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
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ queryKey: ['clinic-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] });
      
      // Prefetch updated subscription status for immediate UI update
      if (clinicId) {
        queryClient.prefetchQuery({
          queryKey: ['subscription-status', clinicId],
          staleTime: 0,
        });
      }
      
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
  const { clinicId } = useAuth();
  
  return useMutation({
    mutationFn: async (subscriptionId: string) => {
      return stripeService.reactivateSubscription(subscriptionId);
    },
    onSuccess: () => {
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ queryKey: ['clinic-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] });
      
      // Prefetch updated subscription status for immediate UI update
      if (clinicId) {
        queryClient.prefetchQuery({
          queryKey: ['subscription-status', clinicId],
          staleTime: 0,
        });
      }
      
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
  const { clinicId } = useAuth();
  
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
      // Comprehensive cache invalidation
      queryClient.invalidateQueries({ queryKey: ['clinic-subscription'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-status'] });
      queryClient.invalidateQueries({ queryKey: ['therapist-count'] });
      queryClient.invalidateQueries({ queryKey: ['subscription-invoices'] });
      
      // Prefetch updated subscription status for immediate UI update
      if (clinicId) {
        queryClient.prefetchQuery({
          queryKey: ['subscription-status', clinicId],
          staleTime: 0,
        });
      }
      
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
    staleTime: 10 * 60 * 1000, // 10 minutes - payment methods don't change frequently
    gcTime: 30 * 60 * 1000, // 30 minutes - keep in cache longer
    retry: 2,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
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
    onSuccess: (_, { customerId }) => {
      // Invalidate and prefetch payment methods for immediate UI update
      queryClient.invalidateQueries({ queryKey: ['payment-methods'] });
      queryClient.prefetchQuery({
        queryKey: ['payment-methods', customerId],
        staleTime: 0,
      });
      
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
      // Invalidate payment methods cache for immediate UI update
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

// Utility hook for prefetching subscription data for better UX
export const usePrefetchSubscriptionData = () => {
  const queryClient = useQueryClient();
  const { clinicId } = useAuth();
  
  const prefetchSubscriptionData = React.useCallback(() => {
    if (!clinicId) return;
    
    // Prefetch critical subscription data
    queryClient.prefetchQuery({
      queryKey: ['subscription-status', clinicId],
      staleTime: 0, // Force fresh data
    });
    
    queryClient.prefetchQuery({
      queryKey: ['clinic-subscription', clinicId],
      staleTime: 0,
    });
    
    queryClient.prefetchQuery({
      queryKey: ['subscription-plans'],
      staleTime: 0,
    });
    
    queryClient.prefetchQuery({
      queryKey: ['therapist-count', clinicId],
      staleTime: 0,
    });
  }, [queryClient, clinicId]);
  
  return { prefetchSubscriptionData };
};

// Enhanced hook for subscription plans with prefetching on hover
export const useSubscriptionPlansWithPrefetch = () => {
  const queryResult = useSubscriptionPlans();
  const { prefetchSubscriptionData } = usePrefetchSubscriptionData();
  
  const handlePlanHover = React.useCallback(() => {
    // Prefetch subscription data when user hovers over plans
    prefetchSubscriptionData();
  }, [prefetchSubscriptionData]);
  
  return {
    ...queryResult,
    onPlanHover: handlePlanHover,
  };
}; 