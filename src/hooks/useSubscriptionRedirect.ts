import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSubscriptionStatus } from './useSubscription';
import { useAuth } from './useAuth';

export const useSubscriptionRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: subscriptionStatus, isLoading: subscriptionLoading } = useSubscriptionStatus();
  const { loading: authLoading, clinicId } = useAuth();

  useEffect(() => {
    // Wait for both auth and subscription data to load
    if (authLoading || subscriptionLoading) {
      console.log('Waiting for data to load - authLoading:', authLoading, 'subscriptionLoading:', subscriptionLoading);
      return;
    }

    const currentPath = location.pathname;
    console.log('Subscription redirect check:', {
      subscriptionStatus,
      currentPath,
      authLoading,
      subscriptionLoading,
      clinicId
    });

    // If no clinic ID, user might not be properly set up
    if (!clinicId) {
      console.log('No clinic ID found, user might not be properly set up');
      return;
    }

    // If no subscription status and not on subscription page, redirect
    if (!subscriptionStatus && currentPath !== '/subscription') {
      console.log('No subscription status, redirecting to subscription page');
      navigate('/subscription');
      return;
    }

    // If subscription is active, allow access
    if (subscriptionStatus.status === 'active') {
      console.log('Subscription is active, allowing access');
      return;
    }

    // If trial is active and not expired, allow access
    if (
      subscriptionStatus.status === 'trial' &&
      subscriptionStatus.trial_ends_at &&
      new Date(subscriptionStatus.trial_ends_at) >= new Date()
    ) {
      console.log('Trial is active, allowing access');
      return;
    }

    // If trial expired or subscription is canceled, past due, unpaid, or incomplete, redirect
    if (
      (subscriptionStatus.status === 'trial' && subscriptionStatus.trial_ends_at && new Date(subscriptionStatus.trial_ends_at) < new Date()) ||
      ['canceled', 'past_due', 'unpaid', 'incomplete'].includes(subscriptionStatus.status)
    ) {
      console.log('Subscription status requires redirect:', subscriptionStatus.status);
      navigate('/subscription');
    }
  }, [subscriptionStatus, location.pathname, navigate, authLoading, subscriptionLoading, clinicId]);

  return { subscriptionStatus, isLoading: subscriptionLoading };
}; 