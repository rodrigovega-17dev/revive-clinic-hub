export interface SubscriptionPlan {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price_monthly: number;
  price_yearly: number;
  max_therapists: number;
  features: string[];
  is_popular: boolean;
  sort_order: number;
}

export interface ClinicSubscription {
  id: string;
  clinic_id: string;
  plan_id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  status: SubscriptionStatus;
  current_period_start: string | null;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
  canceled_at: string | null;
  trial_start: string | null;
  trial_end: string | null;
  plan?: SubscriptionPlan;
}

export type SubscriptionStatus = 
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'unpaid'
  | 'trial';

export interface SubscriptionUsage {
  id: string;
  clinic_id: string;
  subscription_id: string;
  date: string;
  therapist_count: number;
  appointment_count: number;
  client_count: number;
}

export interface SubscriptionInvoice {
  id: string;
  clinic_id: string;
  subscription_id: string;
  stripe_invoice_id: string | null;
  amount: number;
  currency: string;
  status: InvoiceStatus;
  invoice_date: string | null;
  due_date: string | null;
  paid_at: string | null;
  invoice_url?: string;
}

export type InvoiceStatus = 
  | 'draft'
  | 'open'
  | 'paid'
  | 'uncollectible'
  | 'void';

export interface CreateSubscriptionParams {
  clinicId: string;
  planId: string;
  customerEmail: string;
  customerName: string;
  billingCycle: 'monthly' | 'yearly';
  paymentMethodId?: string;
}

export interface CheckoutSessionParams {
  clinicId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  successUrl: string;
  cancelUrl: string;
}

export interface PaymentMethod {
  id: string;
  type: 'card';
  card: {
    brand: string;
    last4: string;
    exp_month: number;
    exp_year: number;
  };
  billing_details: {
    name: string | null;
    email: string | null;
  };
}

export interface SubscriptionLimits {
  maxTherapists: number;
  currentTherapists: number;
  canAddTherapist: boolean;
  planName: string;
  planSlug: string;
}

export interface BillingCycle {
  value: 'monthly' | 'yearly';
  label: string;
  discount?: number;
}

export const BILLING_CYCLES: BillingCycle[] = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'yearly', label: 'Yearly', discount: 17 }, // 2 months free
]; 