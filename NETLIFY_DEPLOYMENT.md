# Netlify Deployment Guide

This guide will help you deploy Cliniker Hub to Netlify with Stripe webhook support.

## Prerequisites

1. A Netlify account (sign up at https://netlify.com)
2. A GitHub/GitLab/Bitbucket repository with your code
3. Your Supabase project URL and keys
4. Your Stripe API keys

## Step 1: Prepare Your Repository

1. Make sure your code is pushed to your Git repository
2. Ensure you have the following files in your repository:
   - `netlify.toml` (configuration file)
   - `netlify/functions/stripe-webhook.js` (webhook handler)
   - `netlify/functions/package.json` (function dependencies)

## Step 2: Deploy to Netlify

### Option A: Deploy via Netlify UI

1. Go to [Netlify Dashboard](https://app.netlify.com/)
2. Click "Add new site" → "Import an existing project"
3. Connect your Git provider and select your repository
4. Configure the build settings:
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
   - **Node version**: `18`
5. Click "Deploy site"

### Option B: Deploy via Netlify CLI

```bash
# Install Netlify CLI
npm install -g netlify-cli

# Login to Netlify
netlify login

# Initialize and deploy
netlify init
netlify deploy --prod
```

## Step 3: Configure Environment Variables

In your Netlify dashboard, go to **Site settings** → **Environment variables** and add:

### Supabase Variables
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

### Stripe Variables
```
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_your_publishable_key
STRIPE_SECRET_KEY=sk_test_your_secret_key
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret
```

**Important**: Get your Supabase service role key from:
1. Go to your Supabase Dashboard
2. Settings → API
3. Copy the "service_role" key (not the anon key)

## Step 4: Set Up Stripe Webhooks

1. Go to your [Stripe Dashboard](https://dashboard.stripe.com/webhooks)
2. Click "Add endpoint"
3. Set the endpoint URL to: `https://your-site-name.netlify.app/.netlify/functions/stripe-webhook`
4. Select these events:
   - `customer.subscription.created`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
5. Copy the webhook signing secret and add it to your Netlify environment variables as `STRIPE_WEBHOOK_SECRET`

## Step 5: Update Success/Cancel URLs

Update your Stripe checkout configuration to use your Netlify domain:

```javascript
// In your checkout session creation
const successUrl = `https://your-site-name.netlify.app/settings?tab=billing&success=true`;
const cancelUrl = `https://your-site-name.netlify.app/settings?tab=billing&canceled=true`;
```

## Step 6: Test the Deployment

1. Visit your Netlify site URL
2. Test the subscription flow
3. Check that webhooks are working in your Stripe Dashboard
4. Verify that subscription status updates correctly

## Troubleshooting

### Build Errors

If you encounter build errors:

1. Check the build logs in Netlify
2. Ensure all dependencies are in `package.json`
3. Verify Node.js version compatibility

### Webhook Issues

If webhooks aren't working:

1. Check the Netlify function logs
2. Verify the webhook URL is correct
3. Ensure environment variables are set
4. Test the webhook endpoint manually

### Environment Variables

If environment variables aren't working:

1. Redeploy after adding environment variables
2. Check that variable names start with `VITE_` for client-side access
3. Use the service role key for server-side operations

## Custom Domain (Optional)

1. Go to **Domain settings** in your Netlify dashboard
2. Click "Add custom domain"
3. Follow the DNS configuration instructions
4. Update your Stripe webhook URL to use the custom domain

## Monitoring

- **Function logs**: Check Netlify function logs for webhook issues
- **Stripe Dashboard**: Monitor webhook events and subscription status
- **Supabase Dashboard**: Check database updates and RLS policies

## Security Notes

- Never expose service role keys in client-side code
- Use environment variables for all sensitive data
- Enable HTTPS (automatic with Netlify)
- Regularly rotate API keys

## Support

If you encounter issues:

1. Check Netlify build logs
2. Verify all environment variables are set
3. Test webhooks in Stripe Dashboard
4. Check Supabase logs for database errors 