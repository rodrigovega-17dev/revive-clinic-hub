import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubscriptionStatus } from './useSubscription';

export const useSubscriptionRedirect = () => {
  const navigate = useNavigate();
  const { data: subscriptionStatus, isLoading } = useSubscriptionStatus();

  useEffect(() => {
    if (isLoading) return;
    if (window.location.pathname === '/subscription') return;
    if (window.location.pathname === '/auth') return;

    console.log('Subscription redirect check:', {
      subscriptionStatus,
      currentPath: window.location.pathname
    });

    // If no subscription status at all, redirect
    if (!subscriptionStatus) {
      console.log('No subscription status, redirecting to subscription page');
      navigate('/subscription');
      return;
    }

    // If subscription is active, allow access
    if (subscriptionStatus.status === 'active') {
      console.log('Subscription is active, allowing access');
      return;
    }

    // If trial expired
    if (
      subscriptionStatus.status === 'trial' &&
      subscriptionStatus.trial_ends_at &&
      new Date(subscriptionStatus.trial_ends_at) < new Date()
    ) {
      console.log('Trial expired, redirecting to subscription page');
      navigate('/subscription');
      return;
    }

    // If subscription is canceled, past due, or unpaid, redirect
    if (
      ['canceled', 'past_due', 'unpaid', 'incomplete'].includes(subscriptionStatus.status)
    ) {
      console.log('Subscription status requires redirect:', subscriptionStatus.status);
      navigate('/subscription');
      return;
    }

    // If we get here and status is not 'active', redirect to be safe
    if (subscriptionStatus.status !== 'active') {
      console.log('Unknown subscription status, redirecting to subscription page:', subscriptionStatus.status);
      navigate('/subscription');
      return;
    }
  }, [subscriptionStatus, isLoading, navigate]);

  return { subscriptionStatus, isLoading };
}; 