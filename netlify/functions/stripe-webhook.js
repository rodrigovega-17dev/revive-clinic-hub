const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY
);

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  const sig = event.headers['stripe-signature'];
  const body = event.body;

  let stripeEvent;

  try {
    // Verify webhook signature
    stripeEvent = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.VITE_STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook signature verification failed' }),
    };
  }

  try {
    // Handle the event
    switch (stripeEvent.type) {
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionEvent(stripeEvent.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(stripeEvent.data.object);
        break;
      
      case 'invoice.payment_succeeded':
        await handleInvoiceEvent(stripeEvent.data.object);
        break;
      
      case 'invoice.payment_failed':
        await handlePaymentFailed(stripeEvent.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${stripeEvent.type}`);
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ received: true }),
    };
  } catch (error) {
    console.error('Error processing webhook:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

async function handleSubscriptionEvent(subscription) {
  const clinicId = subscription.metadata.clinic_id;
  const planId = subscription.metadata.plan_id;

  if (!clinicId || !planId) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  // Update clinic subscription status
  await supabase
    .from('clinics')
    .update({
      subscription_status: subscription.status,
      subscription_plan_id: planId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
    })
    .eq('id', clinicId);

  // Insert or update clinic_subscriptions record
  await supabase
    .from('clinic_subscriptions')
    .upsert({
      clinic_id: clinicId,
      plan_id: planId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
      trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
      trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    });
}

async function handleSubscriptionDeleted(subscription) {
  const clinicId = subscription.metadata.clinic_id;

  if (!clinicId) {
    console.error('Missing clinic_id in subscription metadata:', subscription.id);
    return;
  }

  // Update clinic to trial status
  await supabase
    .from('clinics')
    .update({
      subscription_status: 'trial',
      subscription_plan_id: null,
      stripe_subscription_id: null,
    })
    .eq('id', clinicId);
}

async function handleInvoiceEvent(invoice) {
  if (!invoice.subscription) return;

  // Get subscription details
  const { data: subscription } = await supabase
    .from('clinic_subscriptions')
    .select('clinic_id, id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (!subscription) return;

  // Save invoice to database
  await supabase
    .from('subscription_invoices')
    .upsert({
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

async function handlePaymentFailed(invoice) {
  if (!invoice.subscription) return;

  // Update subscription status to past_due
  await supabase
    .from('clinic_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription);

  // Update clinic status
  const { data: subscription } = await supabase
    .from('clinic_subscriptions')
    .select('clinic_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (subscription) {
    await supabase
      .from('clinics')
      .update({ subscription_status: 'past_due' })
      .eq('id', subscription.clinic_id);
  }
} 