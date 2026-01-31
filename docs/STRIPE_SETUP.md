# Stripe Subscription Setup Guide

This guide will help you set up Stripe integration for the subscription system.

## Prerequisites

1. A Stripe account (sign up at https://stripe.com)
2. Your Stripe API keys
3. Node.js installed on your system

## Step 1: Get Your Stripe API Keys

1. Log into your Stripe Dashboard
2. Go to Developers → API keys
3. Copy your **Publishable key** and **Secret key**
4. Note: Use test keys for development, live keys for production

## Step 2: Set Environment Variables

Add these to your `.env` file:

```env
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key_here
STRIPE_SECRET_KEY=sk_test_your_secret_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
```

## Step 3: Create Stripe Products and Prices

Run the automated script to create products and prices in Stripe:

```bash
npm run setup:stripe
```

This script will:
- Create 3 products (Starter, Professional, Enterprise)
- Create monthly and yearly prices for each product
- Output SQL statements to update your database

## Step 4: Update Database with Stripe Price IDs

After running the script, you'll see SQL statements like this:

```sql
UPDATE subscription_plans SET
  stripe_monthly_price_id = 'price_1ABC123...',
  stripe_yearly_price_id = 'price_1DEF456...'
WHERE slug = 'starter';
```

Copy these statements and run them in your Supabase SQL editor.

## Step 5: Set Up Stripe Webhooks

1. In your Stripe Dashboard, go to Developers → Webhooks
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-domain.com/api/stripe/webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add it to your environment variables

## Step 6: Test the Integration

1. Start your development server: `npm run dev`
2. Go to the subscription page
3. Try selecting a plan - you should be redirected to Stripe Checkout
4. Use Stripe's test card numbers for testing:
   - Success: `4242 4242 4242 4242`
   - Decline: `4000 0000 0000 0002`

## Troubleshooting

### "Stripe price ID not found" Error

This means the subscription plans in your database don't have Stripe price IDs. Follow Step 3 and 4 above.

### "Neither apiKey nor config.authenticator provided" Error

Check that your `STRIPE_SECRET_KEY` environment variable is set correctly.

### Webhook Events Not Working

1. Verify your webhook endpoint URL is correct
2. Check that the webhook secret is set in your environment variables
3. Ensure your server can receive POST requests from Stripe

## Production Deployment

For production:

1. Use live Stripe keys instead of test keys
2. Set up proper webhook endpoints on your production server
3. Configure proper error handling and logging
4. Test the complete subscription flow with real payment methods

## Security Notes

- Never expose your Stripe secret key in client-side code
- Always verify webhook signatures
- Use HTTPS in production
- Implement proper error handling for failed payments

## Support

If you encounter issues:

1. Check the browser console for errors
2. Verify your Stripe Dashboard for webhook events
3. Check your Supabase logs for database errors
4. Ensure all environment variables are set correctly 