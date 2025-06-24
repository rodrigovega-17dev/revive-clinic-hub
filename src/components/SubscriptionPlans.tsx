import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Check, Crown, Star } from 'lucide-react';
import { useSubscriptionPlans, useBillingCycles, useCreateCheckoutSession } from '@/hooks/useSubscription';
import { useAuth } from '@/hooks/useAuth';
import { formatCurrency } from '@/lib/utils';
import type { SubscriptionPlan } from '@/integrations/stripe/types';

interface SubscriptionPlansProps {
  onPlanSelect?: (plan: SubscriptionPlan) => void;
  showCurrentPlan?: boolean;
}

const SubscriptionPlans: React.FC<SubscriptionPlansProps> = ({ 
  onPlanSelect, 
  showCurrentPlan = false 
}) => {
  const { t } = useTranslation();
  const { data: plans, isLoading } = useSubscriptionPlans();
  const billingCycles = useBillingCycles();
  const [selectedBillingCycle, setSelectedBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const { clinic } = useAuth();
  const createCheckoutSession = useCreateCheckoutSession();

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!clinic) {
      console.error('No clinic data available');
      return;
    }

    console.log('Starting subscription process for plan:', plan.id);
    console.log('Clinic ID:', clinic.id);
    console.log('Billing cycle:', selectedBillingCycle);

    // Use current origin for URLs (works for both localhost and production)
    const baseUrl = window.location.origin;
    const successUrl = `${baseUrl}/settings?tab=billing&success=true`;
    const cancelUrl = `${baseUrl}/settings?tab=billing&canceled=true`;

    try {
      await createCheckoutSession.mutateAsync({
        clinicId: clinic.id,
        planId: plan.id,
        billingCycle: selectedBillingCycle,
        successUrl,
        cancelUrl,
      });
    } catch (error) {
      console.error('Error creating checkout session:', error);
    }
  };

  const getPrice = (plan: SubscriptionPlan) => {
    return selectedBillingCycle === 'monthly' 
      ? plan.price_monthly 
      : plan.price_yearly;
  };

  const getBillingCycleDiscount = () => {
    const cycle = billingCycles.find(c => c.value === selectedBillingCycle);
    return cycle?.discount || 0;
  };

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-8 bg-muted rounded w-1/3"></div>
                <div className="space-y-2">
                  {[1, 2, 3, 4].map((j) => (
                    <div key={j} className="h-4 bg-muted rounded"></div>
                  ))}
                </div>
                <div className="h-10 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Billing Cycle Selector */}
      <div className="flex justify-center">
        <div className="flex items-center space-x-2 bg-muted rounded-lg p-1">
          {billingCycles.map((cycle) => (
            <Button
              key={cycle.value}
              variant={selectedBillingCycle === cycle.value ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setSelectedBillingCycle(cycle.value)}
              className="relative"
            >
              {cycle.label}
              {cycle.discount && (
                <Badge 
                  variant="secondary" 
                  className="absolute -top-2 -right-2 text-xs"
                >
                  -{cycle.discount}%
                </Badge>
              )}
            </Button>
          ))}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans?.map((plan) => (
          <Card 
            key={plan.id} 
            className={`relative transition-all duration-200 hover:shadow-lg ${
              plan.is_popular 
                ? 'ring-2 ring-primary shadow-lg scale-105' 
                : 'hover:scale-105'
            }`}
          >
            {plan.is_popular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-primary text-primary-foreground flex items-center gap-1">
                  <Star className="h-3 w-3" />
                  {t('subscription.mostPopular')}
                </Badge>
              </div>
            )}

            <CardHeader className="text-center pb-4">
              <CardTitle className="flex items-center justify-center gap-2">
                {plan.name}
                {plan.is_popular && <Crown className="h-4 w-4 text-primary" />}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {plan.description}
              </p>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Price */}
              <div className="text-center">
                <div className="text-3xl font-bold">
                  {formatCurrency(getPrice(plan))}
                </div>
                <div className="text-muted-foreground text-sm">
                  /{t(`subscription.${selectedBillingCycle}`)}
                </div>
                {selectedBillingCycle === 'yearly' && getBillingCycleDiscount() > 0 && (
                  <div className="text-xs text-green-600 mt-1">
                    {t('subscription.savePercent', { percent: getBillingCycleDiscount() })}
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-3">
                <div className="text-sm font-medium">
                  {t('subscription.includes')}:
                </div>
                <ul className="space-y-2">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Therapist Limit */}
              <div className="text-center p-3 bg-muted/50 rounded-lg">
                <div className="text-sm text-muted-foreground">
                  {t('subscription.upTo')}
                </div>
                <div className="text-lg font-semibold">
                  {plan.max_therapists} {t('subscription.therapists')}
                </div>
              </div>

              {/* Action Button */}
              <Button
                className="w-full"
                variant={plan.is_popular ? 'default' : 'outline'}
                onClick={() => handleSubscribe(plan)}
                disabled={createCheckoutSession.isPending}
              >
                {createCheckoutSession.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('subscription.processing')}
                  </>
                ) : (
                  t('subscription.selectPlan')
                )}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default SubscriptionPlans; 