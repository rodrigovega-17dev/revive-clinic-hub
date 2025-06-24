import Stripe from 'stripe';
import { supabase } from '../supabase/client';
import type { Tables } from '../supabase/types';

// Initialize Stripe with secret key
const stripe = new Stripe(import.meta.env.VITE_STRIPE_SECRET_KEY || '', {
  apiVersion: '2025-05-28.basil',
});

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
  /**
   * Create a Stripe customer
   */
  async createCustomer(email: string, name: string, clinicId: string): Promise<Stripe.Customer> {
    const customer = await stripe.customers.create({
      email,
      name,
      metadata: {
        clinic_id: clinicId,
      },
    });

    // Update clinic with Stripe customer ID
    await supabase
      .from('clinics')
      .update({ stripe_customer_id: customer.id })
      .eq('id', clinicId);

    return customer;
  }

  /**
   * Get or create a Stripe customer for a clinic
   */
  async getOrCreateCustomer(clinicId: string, email: string, name: string): Promise<Stripe.Customer> {
    // Check if clinic already has a Stripe customer
    const { data: clinic } = await supabase
      .from('clinics')
      .select('stripe_customer_id')
      .eq('id', clinicId)
      .single();

    if (clinic?.stripe_customer_id) {
      try {
        return await stripe.customers.retrieve(clinic.stripe_customer_id) as Stripe.Customer;
      } catch (error) {
        console.warn('Failed to retrieve existing customer, creating new one:', error);
      }
    }

    return this.createCustomer(email, name, clinicId);
  }

  /**
   * Create a subscription
   */
  async createSubscription(params: CreateSubscriptionParams): Promise<{
    subscription: Stripe.Subscription;
    customer: Stripe.Customer;
  }> {
    const { clinicId, planId, customerEmail, customerName, billingCycle, paymentMethodId } = params;

    // Get the subscription plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Get or create customer
    const customer = await this.getOrCreateCustomer(clinicId, customerEmail, customerName);

    // Get the appropriate price ID based on billing cycle
    const priceId = billingCycle === 'monthly' 
      ? plan.stripe_monthly_price_id 
      : plan.stripe_yearly_price_id;

    if (!priceId) {
      throw new Error(`Stripe price ID not found for ${billingCycle} billing cycle`);
    }

    // Create subscription parameters
    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customer.id,
      items: [{ price: priceId }],
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
    };

    // Add payment method if provided
    if (paymentMethodId) {
      subscriptionParams.default_payment_method = paymentMethodId;
    }

    // Create the subscription
    const subscription = await stripe.subscriptions.create(subscriptionParams);

    // Save subscription to database
    await supabase.from('clinic_subscriptions').insert({
      clinic_id: clinicId,
      plan_id: planId,
      stripe_customer_id: customer.id,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    });

    // Update clinic subscription status
    await supabase
      .from('clinics')
      .update({ 
        subscription_status: subscription.status,
        subscription_plan_id: planId,
      })
      .eq('id', clinicId);

    return { subscription, customer };
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string, cancelAtPeriodEnd: boolean = true): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: cancelAtPeriodEnd,
    });

    // Update database
    await supabase
      .from('clinic_subscriptions')
      .update({
        status: subscription.status,
        cancel_at_period_end: subscription.cancel_at_period_end,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      })
      .eq('stripe_subscription_id', subscriptionId);

    return subscription;
  }

  /**
   * Reactivate a subscription
   */
  async reactivateSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      cancel_at_period_end: false,
    });

    // Update database
    await supabase
      .from('clinic_subscriptions')
      .update({
        status: subscription.status,
        cancel_at_period_end: false,
        canceled_at: null,
      })
      .eq('stripe_subscription_id', subscriptionId);

    return subscription;
  }

  /**
   * Update subscription (change plan)
   */
  async updateSubscription(
    subscriptionId: string, 
    newPlanId: string, 
    billingCycle: 'monthly' | 'yearly'
  ): Promise<Stripe.Subscription> {
    // Get the new plan
    const { data: newPlan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', newPlanId)
      .single();

    if (!newPlan) {
      throw new Error('New subscription plan not found');
    }

    // Get the appropriate price ID
    const newPriceId = billingCycle === 'monthly' 
      ? newPlan.stripe_monthly_price_id 
      : newPlan.stripe_yearly_price_id;

    if (!newPriceId) {
      throw new Error(`Stripe price ID not found for ${billingCycle} billing cycle`);
    }

    // Get current subscription
    const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);

    // Update subscription with new price
    const subscription = await stripe.subscriptions.update(subscriptionId, {
      items: [{
        id: currentSubscription.items.data[0].id,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations',
    });

    // Update database
    await supabase
      .from('clinic_subscriptions')
      .update({
        plan_id: newPlanId,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      })
      .eq('stripe_subscription_id', subscriptionId);

    // Update clinic plan
    await supabase
      .from('clinics')
      .update({ subscription_plan_id: newPlanId })
      .eq('id', currentSubscription.metadata.clinic_id);

    return subscription;
  }

  /**
   * Get subscription status
   */
  async getSubscriptionStatus(subscriptionId: string): Promise<SubscriptionStatus> {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);

    return {
      status: subscription.status,
      currentPeriodEnd: subscription.current_period_end 
        ? new Date(subscription.current_period_end * 1000).toISOString() 
        : null,
      cancelAtPeriodEnd: subscription.cancel_at_period_end || false,
      trialEnd: subscription.trial_end 
        ? new Date(subscription.trial_end * 1000).toISOString() 
        : null,
    };
  }

  /**
   * Get subscription invoices
   */
  async getSubscriptionInvoices(subscriptionId: string): Promise<InvoiceData[]> {
    const invoices = await stripe.invoices.list({
      subscription: subscriptionId,
      limit: 12,
    });

    return invoices.data.map(invoice => ({
      id: invoice.id,
      amount: invoice.amount_paid / 100, // Convert from cents
      currency: invoice.currency,
      status: invoice.status,
      invoiceDate: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      dueDate: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paidAt: invoice.status === 'paid' && invoice.created 
        ? new Date(invoice.created * 1000).toISOString() 
        : null,
      invoiceUrl: invoice.hosted_invoice_url || undefined,
    }));
  }

  /**
   * Create a payment method
   */
  async createPaymentMethod(
    type: 'card',
    card: {
      number: string;
      exp_month: number;
      exp_year: number;
      cvc: string;
    }
  ): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.create({
      type,
      card,
    });
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethodToCustomer(
    paymentMethodId: string, 
    customerId: string
  ): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.attach(paymentMethodId, {
      customer: customerId,
    });
  }

  /**
   * Get customer payment methods
   */
  async getCustomerPaymentMethods(customerId: string): Promise<Stripe.PaymentMethod[]> {
    const paymentMethods = await stripe.paymentMethods.list({
      customer: customerId,
      type: 'card',
    });

    return paymentMethods.data;
  }

  /**
   * Delete a payment method
   */
  async deletePaymentMethod(paymentMethodId: string): Promise<Stripe.PaymentMethod> {
    return stripe.paymentMethods.detach(paymentMethodId);
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
  }): Promise<Stripe.Checkout.Session> {
    const { clinicId, planId, billingCycle, successUrl, cancelUrl } = params;

    // Get the subscription plan
    const { data: plan } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .single();

    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    // Get the appropriate price ID
    const priceId = billingCycle === 'monthly' 
      ? plan.stripe_monthly_price_id 
      : plan.stripe_yearly_price_id;

    if (!priceId) {
      throw new Error(`Stripe price ID not found for ${billingCycle} billing cycle`);
    }

    // Get clinic info
    const { data: clinic } = await supabase
      .from('clinics')
      .select('name, email')
      .eq('id', clinicId)
      .single();

    if (!clinic) {
      throw new Error('Clinic not found');
    }

    return stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      customer_email: clinic.email,
      metadata: {
        clinic_id: clinicId,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          clinic_id: clinicId,
          plan_id: planId,
        },
      },
    });
  }

  /**
   * Handle webhook events
   */
  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted':
        await this.handleSubscriptionEvent(event.data.object as Stripe.Subscription);
        break;
      
      case 'invoice.payment_succeeded':
      case 'invoice.payment_failed':
        await this.handleInvoiceEvent(event.data.object as Stripe.Invoice);
        break;
      
      default:
        console.log(`Unhandled webhook event: ${event.type}`);
    }
  }

  /**
   * Handle subscription webhook events
   */
  private async handleSubscriptionEvent(subscription: Stripe.Subscription): Promise<void> {
    const clinicId = subscription.metadata.clinic_id;
    const planId = subscription.metadata.plan_id;

    if (!clinicId || !planId) {
      console.error('Missing metadata in subscription:', subscription.id);
      return;
    }

    // Update subscription in database
    await supabase
      .from('clinic_subscriptions')
      .upsert({
        clinic_id: clinicId,
        plan_id: planId,
        stripe_customer_id: subscription.customer as string,
        stripe_subscription_id: subscription.id,
        status: subscription.status,
        current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
        current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
        cancel_at_period_end: subscription.cancel_at_period_end || false,
        canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
        trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
        trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
      });

    // Update clinic subscription status
    await supabase
      .from('clinics')
      .update({ 
        subscription_status: subscription.status,
        subscription_plan_id: planId,
      })
      .eq('id', clinicId);
  }

  /**
   * Handle invoice webhook events
   */
  private async handleInvoiceEvent(invoice: Stripe.Invoice): Promise<void> {
    if (!invoice.subscription) return;

    // Get subscription details
    const { data: subscription } = await supabase
      .from('clinic_subscriptions')
      .select('clinic_id, id')
      .eq('stripe_subscription_id', invoice.subscription as string)
      .single();

    if (!subscription) return;

    // Save invoice to database
    await supabase.from('subscription_invoices').upsert({
      clinic_id: subscription.clinic_id,
      subscription_id: subscription.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      invoice_date: invoice.created ? new Date(invoice.created * 1000).toISOString() : null,
      due_date: invoice.due_date ? new Date(invoice.due_date * 1000).toISOString() : null,
      paid_at: invoice.status === 'paid' && invoice.created 
        ? new Date(invoice.created * 1000).toISOString() 
        : null,
    });
  }
}

export const stripeService = new StripeService(); 