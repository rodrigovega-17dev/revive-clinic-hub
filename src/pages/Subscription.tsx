import React from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, Package, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import SubscriptionPlans from '@/components/SubscriptionPlans';

const Subscription = (): JSX.Element => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
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