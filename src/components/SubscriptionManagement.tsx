import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  CreditCard, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Clock,
  Users,
  FileText
} from 'lucide-react';
import { 
  useClinicSubscription, 
  useSubscriptionStatus, 
  useSubscriptionLimits,
  useCancelSubscription,
  useReactivateSubscription,
  useSubscriptionInvoices
} from '@/hooks/useSubscription';
import { formatCurrency, formatDate } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import type { SubscriptionStatus } from '@/integrations/stripe/types';

const SubscriptionManagement: React.FC = () => {
  const { t } = useTranslation();
  const { data: subscription, isLoading } = useClinicSubscription();
  const { data: status } = useSubscriptionStatus();
  const limits = useSubscriptionLimits();
  const { data: invoices } = useSubscriptionInvoices();
  const { data: authData } = useAuth();
  
  const cancelSubscription = useCancelSubscription();
  const reactivateSubscription = useReactivateSubscription();
  
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showInvoices, setShowInvoices] = useState(false);

  const getStatusColor = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'past_due':
      case 'unpaid':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'canceled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getStatusIcon = (status: SubscriptionStatus) => {
    switch (status) {
      case 'active':
      case 'trialing':
        return <CheckCircle className="h-4 w-4" />;
      case 'past_due':
      case 'unpaid':
        return <XCircle className="h-4 w-4" />;
      case 'canceled':
        return <XCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;
    
    await cancelSubscription.mutateAsync({
      subscriptionId: subscription.stripe_subscription_id,
      cancelAtPeriodEnd: true,
    });
    setShowCancelDialog(false);
  };

  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;
    
    await reactivateSubscription.mutateAsync(subscription.stripe_subscription_id);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Card className="animate-pulse">
          <CardHeader>
            <div className="h-6 bg-muted rounded w-1/3"></div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="h-4 bg-muted rounded w-1/2"></div>
              <div className="h-4 bg-muted rounded w-3/4"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!subscription && !status) {
    return (
      <Alert>
        <AlertTriangle className="h-4 w-4" />
        <AlertDescription>
          {t('subscription.noSubscriptionFound')}
        </AlertDescription>
      </Alert>
    );
  }

  const isTrial = status?.status === 'trial';
  const isActive = subscription?.status === 'active' || subscription?.status === 'trialing';
  const isCanceled = subscription?.status === 'canceled' || subscription?.cancel_at_period_end;

  return (
    <div className="space-y-6">
      {/* Current Plan Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{t('subscription.currentPlan')}</span>
            <Badge className={getStatusColor(subscription?.status || 'trial')}>
              {getStatusIcon(subscription?.status || 'trial')}
              <span className="ml-1">
                {t(`subscription.status.${subscription?.status || 'trial'}`)}
              </span>
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">
                {t('subscription.plan')}
              </div>
              <div className="text-lg font-semibold">
                {subscription?.plan?.name || t('subscription.trialPlan')}
              </div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">
                {t('subscription.price')}
              </div>
              <div className="text-lg font-semibold">
                {subscription?.plan 
                  ? formatCurrency(subscription.plan.price_monthly)
                  : t('subscription.free')
                }
                <span className="text-sm text-muted-foreground ml-1">
                  /{t('subscription.month')}
                </span>
              </div>
            </div>
            
            <div>
              <div className="text-sm text-muted-foreground">
                {t('subscription.therapists')}
              </div>
              <div className="text-lg font-semibold">
                {limits?.currentTherapists || 0} / {limits?.maxTherapists || 3}
              </div>
            </div>
          </div>

          {/* Trial Information */}
          {isTrial && status?.trial_ends_at && (
            <Alert>
              <Clock className="h-4 w-4" />
              <AlertDescription>
                {t('subscription.trialEndsOn', { 
                  date: formatDate(status.trial_ends_at) 
                })}
              </AlertDescription>
            </Alert>
          )}

          {/* Canceled Subscription Warning */}
          {isCanceled && subscription?.current_period_end && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {t('subscription.canceledWarning', { 
                  date: formatDate(subscription.current_period_end) 
                })}
              </AlertDescription>
            </Alert>
          )}

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2">
            {isActive && !isCanceled && (
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(true)}
                disabled={cancelSubscription.isPending}
              >
                {cancelSubscription.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                    {t('subscription.canceling')}
                  </>
                ) : (
                  t('subscription.cancelSubscription')
                )}
              </Button>
            )}
            
            {isCanceled && (
              <Button
                onClick={handleReactivateSubscription}
                disabled={reactivateSubscription.isPending}
              >
                {reactivateSubscription.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('subscription.reactivating')}
                  </>
                ) : (
                  t('subscription.reactivateSubscription')
                )}
              </Button>
            )}
            
            <Button
              variant="outline"
              onClick={() => setShowInvoices(true)}
            >
              <FileText className="h-4 w-4 mr-2" />
              {t('subscription.viewInvoices')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Usage Statistics */}
      {status?.usage && (
        <Card>
          <CardHeader>
            <CardTitle>{t('subscription.usage')}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {status.usage.therapist_count}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('subscription.activeTherapists')}
                </div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Calendar className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {status.usage.appointment_count}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('subscription.todayAppointments')}
                </div>
              </div>
              
              <div className="text-center p-4 bg-muted/50 rounded-lg">
                <Users className="h-8 w-8 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-bold">
                  {status.usage.client_count}
                </div>
                <div className="text-sm text-muted-foreground">
                  {t('subscription.activeClients')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cancel Subscription Dialog */}
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('subscription.cancelSubscription')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-muted-foreground">
              {t('subscription.cancelConfirmation')}
            </p>
            {subscription?.current_period_end && (
              <Alert>
                <Calendar className="h-4 w-4" />
                <AlertDescription>
                  {t('subscription.accessUntil', { 
                    date: formatDate(subscription.current_period_end) 
                  })}
                </AlertDescription>
              </Alert>
            )}
            <div className="flex justify-end space-x-2">
              <Button
                variant="outline"
                onClick={() => setShowCancelDialog(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={cancelSubscription.isPending}
              >
                {cancelSubscription.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    {t('subscription.canceling')}
                  </>
                ) : (
                  t('subscription.confirmCancel')
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoices Dialog */}
      <Dialog open={showInvoices} onOpenChange={setShowInvoices}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('subscription.invoices')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {invoices && invoices.length > 0 ? (
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {invoices.map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between p-3 border rounded-lg"
                  >
                    <div>
                      <div className="font-medium">
                        {formatCurrency(invoice.amount)} {invoice.currency.toUpperCase()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invoice.invoice_date && formatDate(invoice.invoice_date)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        invoice.status === 'paid' ? 'default' : 
                        invoice.status === 'open' ? 'secondary' : 'destructive'
                      }>
                        {t(`subscription.invoiceStatus.${invoice.status}`)}
                      </Badge>
                      {invoice.stripe_invoice_id && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            // Open Stripe invoice in new tab
                            window.open(
                              `https://dashboard.stripe.com/invoices/${invoice.stripe_invoice_id}`,
                              '_blank'
                            );
                          }}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-8">
                {t('subscription.noInvoices')}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SubscriptionManagement; 