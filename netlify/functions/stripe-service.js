 
const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY environment variable is required');
}

if (!supabaseUrl) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!supabaseServiceKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2025-05-28.basil',
});

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const TRIAL_PERIOD_DAYS = 14;

const jsonResponse = (statusCode, body) => ({
  statusCode,
  body: JSON.stringify(body),
});

const getAuthToken = (event) => {
  const header = event.headers.authorization || event.headers.Authorization || '';
  if (!header.startsWith('Bearer ')) return null;
  return header.slice('Bearer '.length).trim();
};

const getUser = async (event) => {
  const token = getAuthToken(event);
  if (!token) return null;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user;
};

const getClinicIdForUser = async (userId) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('clinic_id')
    .eq('id', userId)
    .single();

  if (error) {
    throw new Error('Failed to resolve clinic for user');
  }

  return data?.clinic_id || null;
};

const assertClinicAccess = async (userId, clinicId) => {
  const userClinicId = await getClinicIdForUser(userId);
  if (!userClinicId || userClinicId !== clinicId) {
    throw new Error('Unauthorized clinic access');
  }
};

const getClinicIdBySubscription = async (subscriptionId) => {
  const { data, error } = await supabase
    .from('clinic_subscriptions')
    .select('clinic_id')
    .eq('stripe_subscription_id', subscriptionId)
    .single();

  if (error) {
    throw new Error('Failed to resolve subscription clinic');
  }

  return data?.clinic_id || null;
};

const assertSubscriptionAccess = async (userId, subscriptionId) => {
  const clinicId = await getClinicIdBySubscription(subscriptionId);
  if (!clinicId) {
    throw new Error('Subscription not found');
  }
  await assertClinicAccess(userId, clinicId);
  return clinicId;
};

const assertCustomerAccess = async (userId, customerId) => {
  const userClinicId = await getClinicIdForUser(userId);
  if (!userClinicId) {
    throw new Error('Clinic not found');
  }

  const { data, error } = await supabase
    .from('clinics')
    .select('id')
    .eq('id', userClinicId)
    .eq('stripe_customer_id', customerId)
    .single();

  if (error || !data) {
    throw new Error('Unauthorized customer access');
  }

  return userClinicId;
};

const getPlanById = async (planId) => {
  const { data, error } = await supabase
    .from('subscription_plans')
    .select('*')
    .eq('id', planId)
    .single();

  if (error || !data) {
    throw new Error('Subscription plan not found');
  }

  return data;
};

const getOrCreateCustomer = async ({ clinicId, customerEmail, customerName }) => {
  const { data: clinic } = await supabase
    .from('clinics')
    .select('stripe_customer_id')
    .eq('id', clinicId)
    .single();

  if (clinic?.stripe_customer_id) {
    try {
      return await stripe.customers.retrieve(clinic.stripe_customer_id);
    } catch (error) {
      // Fall through to create a new customer.
    }
  }

  const customer = await stripe.customers.create({
    email: customerEmail,
    name: customerName,
    metadata: { clinic_id: clinicId },
  });

  await supabase
    .from('clinics')
    .update({ stripe_customer_id: customer.id })
    .eq('id', clinicId);

  return customer;
};

const createSubscription = async (payload) => {
  const plan = await getPlanById(payload.planId);
  const priceId = payload.billingCycle === 'monthly'
    ? plan.stripe_monthly_price_id
    : plan.stripe_yearly_price_id;

  if (!priceId) {
    throw new Error(`Stripe price ID not found for ${payload.billingCycle} billing cycle`);
  }

  const customer = await getOrCreateCustomer(payload);

  const subscriptionParams = {
    customer: customer.id,
    items: [{ price: priceId }],
    payment_behavior: 'default_incomplete',
    payment_settings: { save_default_payment_method: 'on_subscription' },
    expand: ['latest_invoice.payment_intent'],
    trial_period_days: TRIAL_PERIOD_DAYS,
    metadata: {
      clinic_id: payload.clinicId,
      plan_id: payload.planId,
      billing_cycle: payload.billingCycle,
    },
  };

  if (payload.paymentMethodId) {
    subscriptionParams.default_payment_method = payload.paymentMethodId;
  }

  const subscription = await stripe.subscriptions.create(subscriptionParams);

  const toIso = (secs) => (secs ? new Date(secs * 1000).toISOString() : null);

  await supabase.from('clinic_subscriptions').upsert({
    clinic_id: payload.clinicId,
    plan_id: payload.planId,
    stripe_customer_id: customer.id,
    stripe_subscription_id: subscription.id,
    status: subscription.status,
    current_period_start: toIso(subscription.current_period_start),
    current_period_end: toIso(subscription.current_period_end),
    trial_start: toIso(subscription.trial_start),
    trial_end: toIso(subscription.trial_end),
  }, { onConflict: 'clinic_id' });

  await supabase
    .from('clinics')
    .update({
      subscription_status: subscription.status,
      subscription_plan_id: payload.planId,
    })
    .eq('id', payload.clinicId);

  return { subscription, customer };
};

const cancelSubscription = async ({ subscriptionId, cancelAtPeriodEnd }) => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: cancelAtPeriodEnd !== false,
  });

  await supabase
    .from('clinic_subscriptions')
    .update({
      status: subscription.status,
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    })
    .eq('stripe_subscription_id', subscriptionId);

  return subscription;
};

const reactivateSubscription = async ({ subscriptionId }) => {
  const subscription = await stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: false,
  });

  await supabase
    .from('clinic_subscriptions')
    .update({
      status: subscription.status,
      cancel_at_period_end: false,
      canceled_at: null,
    })
    .eq('stripe_subscription_id', subscriptionId);

  return subscription;
};

const updateSubscription = async ({ subscriptionId, newPlanId, billingCycle }) => {
  const plan = await getPlanById(newPlanId);
  const newPriceId = billingCycle === 'monthly'
    ? plan.stripe_monthly_price_id
    : plan.stripe_yearly_price_id;

  if (!newPriceId) {
    throw new Error(`Stripe price ID not found for ${billingCycle} billing cycle`);
  }

  const currentSubscription = await stripe.subscriptions.retrieve(subscriptionId);
  const currentItem = currentSubscription.items.data[0];

  const subscription = await stripe.subscriptions.update(subscriptionId, {
    items: [{ id: currentItem.id, price: newPriceId }],
    proration_behavior: 'create_prorations',
    metadata: {
      clinic_id: currentSubscription.metadata?.clinic_id || '',
      plan_id: newPlanId,
      billing_cycle: billingCycle,
    },
  });

  await supabase
    .from('clinic_subscriptions')
    .update({
      plan_id: newPlanId,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    })
    .eq('stripe_subscription_id', subscriptionId);

  if (currentSubscription.metadata?.clinic_id) {
    await supabase
      .from('clinics')
      .update({ subscription_plan_id: newPlanId })
      .eq('id', currentSubscription.metadata.clinic_id);
  }

  return subscription;
};

const createCheckoutSession = async ({ clinicId, planId, billingCycle, successUrl, cancelUrl }) => {
  const plan = await getPlanById(planId);
  const priceId = billingCycle === 'monthly'
    ? plan.stripe_monthly_price_id
    : plan.stripe_yearly_price_id;

  if (!priceId) {
    throw new Error(`Stripe price ID not found for ${billingCycle} billing cycle`);
  }

  const { data: clinic } = await supabase
    .from('clinics')
    .select('name, email')
    .eq('id', clinicId)
    .single();

  if (!clinic) {
    throw new Error('Clinic not found');
  }

  const sessionSeparator = successUrl.includes('?') ? '&' : '?';
  return stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [{ price: priceId, quantity: 1 }],
    mode: 'subscription',
    success_url: `${successUrl}${sessionSeparator}session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    customer_email: clinic.email,
    metadata: {
      clinic_id: clinicId,
      plan_id: planId,
      billing_cycle: billingCycle,
    },
    subscription_data: {
      trial_period_days: TRIAL_PERIOD_DAYS,
      metadata: {
        clinic_id: clinicId,
        plan_id: planId,
      },
    },
  });
};

const getCustomerPaymentMethods = async ({ customerId }) => {
  const paymentMethods = await stripe.paymentMethods.list({
    customer: customerId,
    type: 'card',
  });

  return paymentMethods.data;
};

const attachPaymentMethodToCustomer = async ({ paymentMethodId, customerId }) => {
  return stripe.paymentMethods.attach(paymentMethodId, { customer: customerId });
};

const deletePaymentMethod = async ({ paymentMethodId, userId }) => {
  const paymentMethod = await stripe.paymentMethods.retrieve(paymentMethodId);
  if (paymentMethod?.customer) {
    await assertCustomerAccess(userId, paymentMethod.customer);
  }
  return stripe.paymentMethods.detach(paymentMethodId);
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const user = await getUser(event);
  if (!user) {
    return jsonResponse(401, { error: 'Unauthorized' });
  }

  let body;
  try {
    body = JSON.parse(event.body || '{}');
  } catch (error) {
    return jsonResponse(400, { error: 'Invalid JSON payload' });
  }

  const { action, payload } = body || {};
  if (!action) {
    return jsonResponse(400, { error: 'Missing action' });
  }

  try {
    let result;

    switch (action) {
      case 'createSubscription':
        await assertClinicAccess(user.id, payload.clinicId);
        result = await createSubscription(payload);
        break;
      case 'cancelSubscription':
        await assertSubscriptionAccess(user.id, payload.subscriptionId);
        result = await cancelSubscription(payload);
        break;
      case 'reactivateSubscription':
        await assertSubscriptionAccess(user.id, payload.subscriptionId);
        result = await reactivateSubscription(payload);
        break;
      case 'updateSubscription':
        await assertSubscriptionAccess(user.id, payload.subscriptionId);
        result = await updateSubscription(payload);
        break;
      case 'createCheckoutSession':
        await assertClinicAccess(user.id, payload.clinicId);
        result = await createCheckoutSession(payload);
        break;
      case 'getCustomerPaymentMethods':
        await assertCustomerAccess(user.id, payload.customerId);
        result = await getCustomerPaymentMethods(payload);
        break;
      case 'attachPaymentMethodToCustomer':
        await assertCustomerAccess(user.id, payload.customerId);
        result = await attachPaymentMethodToCustomer(payload);
        break;
      case 'deletePaymentMethod':
        result = await deletePaymentMethod({ ...payload, userId: user.id });
        break;
      default:
        return jsonResponse(400, { error: 'Unknown action' });
    }

    return jsonResponse(200, result);
  } catch (error) {
    return jsonResponse(500, { error: error.message || 'Stripe request failed' });
  }
};
