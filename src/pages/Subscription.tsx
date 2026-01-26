import React, { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Package, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate, useSearchParams } from 'react-router-dom';
import SubscriptionPlans from '@/components/SubscriptionPlans';
import { useAuth } from '@/hooks/useAuth';
import { useSubscriptionStatus } from '@/hooks/useSubscription';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

const Subscription = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { signOut, clinicId } = useAuth();
  const { data: subscriptionStatus, isLoading: subscriptionLoading, refetch } = useSubscriptionStatus();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Ensure subscription back action logs the user out and returns to auth.
  const handleBackLogout = async () => {
    const { error } = await signOut();
    if (!error) {
      navigate('/auth');
    }
  };

  useEffect(() => {
    const successParam = searchParams.get('success');
    const isSuccess = typeof successParam === 'string' && successParam.startsWith('true');
    const isCanceled = searchParams.get('canceled') === 'true';

    if (isCanceled) {
      toast({
        title: t('subscription.checkoutCanceled'),
        description: t('subscription.checkoutCanceledDescription'),
        variant: 'destructive',
      });
    }

    if (!isSuccess) {
      return;
    }

    let attempts = 0;
    const maxAttempts = 12;
    let hasNavigated = false; // Prevent multiple navigations
    
    const interval = setInterval(async () => {
      if (hasNavigated) {
        clearInterval(interval);
        return;
      }
      
      attempts += 1;
      
      // Invalidate cache to ensure fresh data
      if (clinicId) {
        await queryClient.invalidateQueries({ queryKey: ['subscription-status', clinicId] });
        await queryClient.invalidateQueries({ queryKey: ['clinic-subscription', clinicId] });
      }
      
      const latest = await refetch();
      const status = latest.data?.status;
      
      if (status === 'active' || status === 'trialing') {
        hasNavigated = true;
        clearInterval(interval);
        
        toast({
          title: t('subscription.checkoutSuccess'),
          description: t('subscription.checkoutSuccessDescription'),
        });
        
        // Small delay to ensure toast shows and cache is updated
        setTimeout(() => {
          navigate('/dashboard', { replace: true });
        }, 100);
        return;
      }

      if (attempts >= maxAttempts) {
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [searchParams, subscriptionLoading, subscriptionStatus, toast, navigate, t, refetch, queryClient, clinicId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackLogout}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            {t('common.back')}
          </Button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <CreditCard className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {t('subscription.choosePlan')}
              </h1>
              <p className="text-gray-600 dark:text-gray-300">
                {t('subscription.choosePlanDescription')}
              </p>
            </div>
          </div>
        </div>

        {/* Subscription Plans */}
        <div className="max-w-6xl mx-auto">
          <SubscriptionPlans />
        </div>

        {/* Footer */}
        <div className="mt-12 text-center text-gray-600 dark:text-gray-400">
          <p className="text-sm">
            {t('subscription.needHelp')} 
            <Button variant="link" className="p-0 h-auto text-sm">
              {t('subscription.contactSupport')}
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Subscription; 