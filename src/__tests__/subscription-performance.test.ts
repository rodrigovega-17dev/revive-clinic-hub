/**
 * Automated performance tests for subscription flows
 * Tests loading times, query performance, and alerts for slow operations
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';
import { 
  useSubscriptionPlans, 
  useClinicSubscription, 
  useSubscriptionStatus,
  useCreateCheckoutSession
} from '@/hooks/useSubscription';
import { performanceMonitor } from '@/lib/performance-monitor';

// Mock Supabase client
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            // Mock successful response with delay
            then: vi.fn((callback) => {
              setTimeout(() => {
                callback({
                  data: [
                    {
                      id: '1',
                      name: 'Basic Plan',
                      price_monthly: 29,
                      price_yearly: 290,
                      features: ['Feature 1', 'Feature 2'],
                      is_active: true,
                      sort_order: 1
                    }
                  ],
                  error: null
                });
              }, 100); // 100ms delay
            })
          })),
          single: vi.fn(() => ({
            then: vi.fn((callback) => {
              setTimeout(() => {
                callback({
                  data: {
                    id: '1',
                    status: 'active',
                    subscription_plans: {
                      id: '1',
                      name: 'Basic Plan',
                      features: ['Feature 1']
                    }
                  },
                  error: null
                });
              }, 150); // 150ms delay
            })
          })),
          maybeSingle: vi.fn(() => ({
            then: vi.fn((callback) => {
              setTimeout(() => {
                callback({
                  data: null,
                  error: null
                });
              }, 200); // 200ms delay
            })
          }))
        })),
        in: vi.fn(() => ({
          maybeSingle: vi.fn(() => ({
            then: vi.fn((callback) => {
              setTimeout(() => {
                callback({
                  data: null,
                  error: null
                });
              }, 200);
            })
          }))
        }))
      }))
    }))
  }
}));

// Mock Stripe service
vi.mock('@/integrations/stripe/service', () => ({
  stripeService: {
    createCheckoutSession: vi.fn(() => 
      new Promise((resolve) => {
        setTimeout(() => {
          resolve({ url: 'https://checkout.stripe.com/test' });
        }, 300); // 300ms delay
      })
    )
  }
}));

// Mock auth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    clinicId: 'test-clinic-id',
    clinic: { id: 'test-clinic-id', name: 'Test Clinic' }
  })
}));

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock translation hook
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}));

describe('Subscription Performance Tests', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
          gcTime: 0,
        },
      },
    });
    performanceMonitor.clear();
  });

  afterEach(() => {
    queryClient.clear();
    performanceMonitor.clear();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    React.createElement(QueryClientProvider, { client: queryClient }, children)
  );

  describe('Subscription Plans Loading Performance', () => {
    it('should load subscription plans within 2 seconds', async () => {
      const startTime = performance.now();
      
      const { result } = renderHook(() => useSubscriptionPlans(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 2000 });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(2000);
      expect(result.current.data).toBeDefined();
    });

    it('should track performance metrics for subscription plans loading', async () => {
      const { result } = renderHook(() => useSubscriptionPlans(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      const metrics = performanceMonitor.getMetrics('subscription-plans-load');
      expect(metrics.length).toBeGreaterThan(0);
      
      const latestMetric = metrics[metrics.length - 1];
      expect(latestMetric.duration).toBeDefined();
      expect(latestMetric.duration!).toBeGreaterThan(0);
    });

    it('should generate alert for slow subscription plans loading', async () => {
      // Set a very low threshold to trigger alert
      performanceMonitor.setThreshold('subscription-plans-load', 50);
      
      const { result } = renderHook(() => useSubscriptionPlans(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      const alerts = performanceMonitor.getAlerts('subscription-plans-load');
      expect(alerts.length).toBeGreaterThan(0);
      
      const alert = alerts[0];
      expect(alert.operation).toBe('subscription-plans-load');
      expect(alert.duration).toBeGreaterThan(alert.threshold);
    });
  });

  describe('Clinic Subscription Loading Performance', () => {
    it('should load clinic subscription within 1.5 seconds', async () => {
      const startTime = performance.now();
      
      const { result } = renderHook(() => useClinicSubscription(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 1500 });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1500);
    });

    it('should track performance metrics for clinic subscription loading', async () => {
      const { result } = renderHook(() => useClinicSubscription(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      const metrics = performanceMonitor.getMetrics('clinic-subscription-load');
      expect(metrics.length).toBeGreaterThan(0);
      
      const latestMetric = metrics[metrics.length - 1];
      expect(latestMetric.duration).toBeDefined();
      expect(latestMetric.metadata?.clinicId).toBe('test-clinic-id');
    });
  });

  describe('Subscription Status Loading Performance', () => {
    it('should load subscription status within 1.5 seconds', async () => {
      const startTime = performance.now();
      
      const { result } = renderHook(() => useSubscriptionStatus(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 1500 });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(1500);
    });

    it('should track performance metrics for subscription status loading', async () => {
      const { result } = renderHook(() => useSubscriptionStatus(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      const metrics = performanceMonitor.getMetrics('subscription-status-load');
      expect(metrics.length).toBeGreaterThan(0);
      
      const latestMetric = metrics[metrics.length - 1];
      expect(latestMetric.duration).toBeDefined();
      expect(latestMetric.metadata?.clinicId).toBe('test-clinic-id');
    });
  });

  describe('Checkout Session Creation Performance', () => {
    it('should create checkout session within 4 seconds', async () => {
      const { result } = renderHook(() => useCreateCheckoutSession(), { wrapper });
      
      const startTime = performance.now();
      
      result.current.mutate({
        clinicId: 'test-clinic-id',
        planId: 'plan-1',
        billingCycle: 'monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      }, { timeout: 4000 });
      
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      expect(duration).toBeLessThan(4000);
    });

    it('should track performance metrics for checkout session creation', async () => {
      const { result } = renderHook(() => useCreateCheckoutSession(), { wrapper });
      
      result.current.mutate({
        clinicId: 'test-clinic-id',
        planId: 'plan-1',
        billingCycle: 'monthly',
        successUrl: 'https://example.com/success',
        cancelUrl: 'https://example.com/cancel'
      });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      const metrics = performanceMonitor.getMetrics('checkout-session-create');
      expect(metrics.length).toBeGreaterThan(0);
      
      const latestMetric = metrics[metrics.length - 1];
      expect(latestMetric.duration).toBeDefined();
      expect(latestMetric.metadata?.planId).toBe('plan-1');
      expect(latestMetric.metadata?.billingCycle).toBe('monthly');
    });
  });

  describe('Performance Statistics', () => {
    it('should calculate performance statistics correctly', async () => {
      // Trigger multiple operations
      const { result: plansResult } = renderHook(() => useSubscriptionPlans(), { wrapper });
      const { result: subscriptionResult } = renderHook(() => useClinicSubscription(), { wrapper });
      
      await waitFor(() => {
        expect(plansResult.current.isSuccess).toBe(true);
        expect(subscriptionResult.current.isSuccess).toBe(true);
      });
      
      const plansStats = performanceMonitor.getStats('subscription-plans-load');
      expect(plansStats).toBeDefined();
      expect(plansStats!.count).toBeGreaterThan(0);
      expect(plansStats!.averageDuration).toBeGreaterThan(0);
      expect(plansStats!.minDuration).toBeGreaterThan(0);
      expect(plansStats!.maxDuration).toBeGreaterThan(0);
      
      const subscriptionStats = performanceMonitor.getStats('clinic-subscription-load');
      expect(subscriptionStats).toBeDefined();
      expect(subscriptionStats!.count).toBeGreaterThan(0);
    });

    it('should export performance data correctly', async () => {
      // Trigger some operations
      const { result } = renderHook(() => useSubscriptionPlans(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      const exportedData = performanceMonitor.exportData();
      
      expect(exportedData.metrics).toBeDefined();
      expect(exportedData.alerts).toBeDefined();
      expect(exportedData.stats).toBeDefined();
      
      expect(exportedData.metrics.length).toBeGreaterThan(0);
      expect(exportedData.stats['subscription-plans-load']).toBeDefined();
    });
  });

  describe('Performance Thresholds', () => {
    it('should respect custom performance thresholds', () => {
      const customThreshold = 1000;
      performanceMonitor.setThreshold('test-operation', customThreshold);
      
      const trackingId = performanceMonitor.startTracking('test-operation');
      
      // Simulate operation taking longer than threshold
      setTimeout(() => {
        performanceMonitor.endTracking(trackingId);
      }, customThreshold + 100);
      
      // Wait for operation to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const alerts = performanceMonitor.getAlerts('test-operation');
          expect(alerts.length).toBeGreaterThan(0);
          expect(alerts[0].threshold).toBe(customThreshold);
          resolve();
        }, customThreshold + 200);
      });
    });
  });

  describe('Performance Alert System', () => {
    it('should trigger alerts for slow operations', async () => {
      let alertReceived = false;
      let receivedAlert: any = null;
      
      const alertListener = (alert: any) => {
        alertReceived = true;
        receivedAlert = alert;
      };
      
      performanceMonitor.addAlertListener(alertListener);
      performanceMonitor.setThreshold('subscription-plans-load', 50); // Very low threshold
      
      const { result } = renderHook(() => useSubscriptionPlans(), { wrapper });
      
      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true);
      });
      
      // Wait a bit for alert to be processed
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(alertReceived).toBe(true);
      expect(receivedAlert).toBeDefined();
      expect(receivedAlert.operation).toBe('subscription-plans-load');
      
      performanceMonitor.removeAlertListener(alertListener);
    });
  });
});