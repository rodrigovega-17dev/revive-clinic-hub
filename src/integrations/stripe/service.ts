import { supabase } from '../supabase/client';
import type { PaymentMethod } from './types';

export interface CreateSubscriptionParams {
  clinicId: string;
  planId: string;
  customerEmail: string;
  customerName: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
}

export interface SubscriptionStatus {
  status: string;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
}

export interface InvoiceData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  invoiceDate: string | null;
  dueDate: string | null;
  paidAt: string | null;
  invoiceUrl?: string;
}

class StripeService {
  // Use the auth session to authorize server-side Stripe operations.
  private async getAccessToken(): Promise<string> {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error('User session is required for Stripe operations');
    }
    return token;
  }

  private async callStripeService<T>(action: string, payload: Record<string, unknown>): Promise<T> {
    const token = await this.getAccessToken();
    const response = await fetch('/.netlify/functions/stripe-service', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action, payload }),
    });

    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || 'Stripe request failed');
    }

    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  /**
   * Create a subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<{
    subscription: Record<string, unknown>;
    customer: Record<string, unknown>;
  }> {
    return this.callStripeService('createSubscription', params as unknown as Record<string, unknown>);
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Record<string, unknown>> {
    return this.callStripeService('cancelSubscription', { subscriptionId, cancelAtPeriodEnd });
  }

  /**
   * Reactivate a subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Record<string, unknown>> {
    return this.callStripeService('reactivateSubscription', { subscriptionId });
  }

  /**
   * Update subscription (change plan)
   */
  async updateSubscription(
    subscriptionId: string,
    newPlanId: string,
    billingCycle: 'monthly' | 'yearly'
  ): Promise<Record<string, unknown>> {
    return this.callStripeService('updateSubscription', {
      subscriptionId,
      newPlanId,
      billingCycle,
    });
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    return this.callStripeService('getSubscriptionStatus', { subscriptionId });
  }

  /**
   * Get subscription invoices
   */
  async getSubscriptionInvoices(subscriptionId: string): Promise<InvoiceData[]> {
    return this.callStripeService('getSubscriptionInvoices', { subscriptionId });
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethodToCustomer(paymentMethodId: string, customerId: string): Promise<PaymentMethod> {
    return this.callStripeService('attachPaymentMethodToCustomer', { paymentMethodId, customerId });
  }

  /**
   * Get customer payment methods
   */
  async getCustomerPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
    return this.callStripeService('getCustomerPaymentMethods', { customerId });
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<PaymentMethod> {
    return this.callStripeService('deletePaymentMethod', { paymentMethodId });
  }

  /**
   * Create a checkout session for subscription
   */
  async createCheckoutSession(params: {
    clinicId: string;
    planId: string;
    billingCycle: 'monthly' | 'yearly';
    successUrl: string;
    cancelUrl: string;
  }): Promise<{ url?: string }> {
    return this.callStripeService('createCheckoutSession', params as unknown as Record<string, unknown>);
  }

  /**
   * Webhook handling is intentionally server-side only.
   */
  async handleWebhookEvent(): Promise<void> {
    throw new Error('Webhook handling must run on the server');
  }
}

export const stripeService = new StripeService(); 