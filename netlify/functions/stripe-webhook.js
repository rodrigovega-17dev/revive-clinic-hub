const Stripe = require('stripe');
const { createClient } = require('@supabase/supabase-js');

// Access environment variables directly (server-side)
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2025-05-28.basil',
});

// Check if required environment variables are set
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Helper function to safely convert Stripe timestamps
function safeDateConversion(timestamp) {
  if (!timestamp || timestamp === null || timestamp === undefined) {
    return null;
  }
  try {
    return new Date(timestamp * 1000).toISOString();
  } catch (error) {
    console.error('Error converting timestamp:', timestamp, error);
    return null;
  }
}

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
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Webhook signature verification failed' }),
    };
  }

  try {
    console.log('Processing webhook event:', stripeEvent.type);
    
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
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};

async function handleSubscriptionEvent(subscription) {
  console.log('Handling subscription event for subscription:', subscription.id);
  
  const clinicId = subscription.metadata.clinic_id;
  const planId = subscription.metadata.plan_id;

  if (!clinicId || !planId) {
    console.error('Missing metadata in subscription:', subscription.id);
    return;
  }

  console.log('Updating clinic:', clinicId, 'with plan:', planId);

  // Update clinic subscription status
  const { error: clinicError } = await supabase
    .from('clinics')
    .update({
      subscription_status: subscription.status,
      subscription_plan_id: planId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
    })
    .eq('id', clinicId);

  if (clinicError) {
    console.error('Error updating clinic:', clinicError);
    throw clinicError;
  }

  console.log('Clinic updated successfully');

  // Insert or update clinic_subscriptions record
  const { error: subscriptionError } = await supabase
    .from('clinic_subscriptions')
    .upsert({
      clinic_id: clinicId,
      plan_id: planId,
      stripe_customer_id: subscription.customer,
      stripe_subscription_id: subscription.id,
      status: subscription.status,
      current_period_start: safeDateConversion(subscription.current_period_start),
      current_period_end: safeDateConversion(subscription.current_period_end),
      cancel_at_period_end: subscription.cancel_at_period_end || false,
      canceled_at: safeDateConversion(subscription.canceled_at),
      trial_start: safeDateConversion(subscription.trial_start),
      trial_end: safeDateConversion(subscription.trial_end),
    });

  if (subscriptionError) {
    console.error('Error updating clinic_subscriptions:', subscriptionError);
    throw subscriptionError;
  }

  console.log('Subscription record updated successfully');
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Handling subscription deleted for subscription:', subscription.id);
  
  const clinicId = subscription.metadata.clinic_id;

  if (!clinicId) {
    console.error('Missing clinic_id in subscription metadata:', subscription.id);
    return;
  }

  // Update clinic to trial status
  const { error } = await supabase
    .from('clinics')
    .update({
      subscription_status: 'trial',
      subscription_plan_id: null,
      stripe_subscription_id: null,
    })
    .eq('id', clinicId);

  if (error) {
    console.error('Error updating clinic after subscription deletion:', error);
    throw error;
  }

  console.log('Clinic updated to trial status after subscription deletion');
}

async function handleInvoiceEvent(invoice) {
  console.log('Handling invoice event for invoice:', invoice.id);
  
  if (!invoice.subscription) {
    console.log('No subscription associated with invoice');
    return;
  }

  // Get subscription details
  const { data: subscription, error: subscriptionError } = await supabase
    .from('clinic_subscriptions')
    .select('clinic_id, id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (subscriptionError) {
    console.error('Error fetching subscription for invoice:', subscriptionError);
    return;
  }

  if (!subscription) {
    console.log('No subscription found for invoice subscription ID:', invoice.subscription);
    return;
  }

  // Save invoice to database
  const { error: invoiceError } = await supabase
    .from('subscription_invoices')
    .upsert({
      clinic_id: subscription.clinic_id,
      subscription_id: subscription.id,
      stripe_invoice_id: invoice.id,
      amount: invoice.amount_paid / 100,
      currency: invoice.currency,
      status: invoice.status,
      invoice_date: safeDateConversion(invoice.created),
      due_date: safeDateConversion(invoice.due_date),
      paid_at: invoice.status === 'paid' ? safeDateConversion(invoice.created) : null,
    });

  if (invoiceError) {
    console.error('Error saving invoice:', invoiceError);
    throw invoiceError;
  }

  console.log('Invoice saved successfully');
}

async function handlePaymentFailed(invoice) {
  console.log('Handling payment failed for invoice:', invoice.id);
  
  if (!invoice.subscription) {
    console.log('No subscription associated with failed payment invoice');
    return;
  }

  // Update subscription status to past_due
  const { error: subscriptionError } = await supabase
    .from('clinic_subscriptions')
    .update({ status: 'past_due' })
    .eq('stripe_subscription_id', invoice.subscription);

  if (subscriptionError) {
    console.error('Error updating subscription status to past_due:', subscriptionError);
    throw subscriptionError;
  }

  // Update clinic status
  const { data: subscription, error: fetchError } = await supabase
    .from('clinic_subscriptions')
    .select('clinic_id')
    .eq('stripe_subscription_id', invoice.subscription)
    .single();

  if (fetchError) {
    console.error('Error fetching subscription for clinic update:', fetchError);
    return;
  }

  if (subscription) {
    const { error: clinicError } = await supabase
      .from('clinics')
      .update({ subscription_status: 'past_due' })
      .eq('id', subscription.clinic_id);

    if (clinicError) {
      console.error('Error updating clinic status to past_due:', clinicError);
      throw clinicError;
    }

    console.log('Clinic status updated to past_due');
  }
} 