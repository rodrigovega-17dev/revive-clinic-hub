import Stripe from 'stripe';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
config({ path: join(__dirname, '..', '.env') });

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.VITE_STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const subscriptionPlans = [
  {
    name: 'Starter',
    description: 'Perfect for small clinics just getting started',
    monthlyPrice: 2900, // $29.00 in cents
    yearlyPrice: 29000, // $290.00 in cents
    maxTherapists: 3,
    features: [
      'Unlimited appointments',
      'Client management', 
      'Basic reporting',
      'Email support'
    ]
  },
  {
    name: 'Professional',
    description: 'Ideal for growing clinics with multiple therapists',
    monthlyPrice: 4900, // $49.00 in cents
    yearlyPrice: 49000, // $490.00 in cents
    maxTherapists: 5,
    features: [
      'Everything in Starter',
      'Advanced reporting',
      'Google Calendar sync',
      'Priority support',
      'Custom branding'
    ]
  },
  {
    name: 'Enterprise',
    description: 'For established clinics with larger teams',
    monthlyPrice: 8900, // $89.00 in cents
    yearlyPrice: 89000, // $890.00 in cents
    maxTherapists: 10,
    features: [
      'Everything in Professional',
      'Advanced analytics',
      'API access',
      'Dedicated support',
      'Custom integrations'
    ]
  }
];

async function createStripeProducts() {
  console.log('Creating Stripe products and prices...\n');

  for (const plan of subscriptionPlans) {
    try {
      // Create product
      const product = await stripe.products.create({
        name: plan.name,
        description: plan.description,
        metadata: {
          max_therapists: plan.maxTherapists.toString(),
          features: JSON.stringify(plan.features)
        }
      });

      console.log(`✅ Created product: ${product.name} (${product.id})`);

      // Create monthly price
      const monthlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.monthlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'month'
        },
        metadata: {
          billing_cycle: 'monthly',
          plan_name: plan.name
        }
      });

      console.log(`  📅 Monthly price: $${(plan.monthlyPrice / 100).toFixed(2)} (${monthlyPrice.id})`);

      // Create yearly price
      const yearlyPrice = await stripe.prices.create({
        product: product.id,
        unit_amount: plan.yearlyPrice,
        currency: 'usd',
        recurring: {
          interval: 'year'
        },
        metadata: {
          billing_cycle: 'yearly',
          plan_name: plan.name
        }
      });

      console.log(`  📅 Yearly price: $${(plan.yearlyPrice / 100).toFixed(2)} (${yearlyPrice.id})`);

      // Generate SQL update statement
      console.log(`\n📝 SQL Update for ${plan.name}:`);
      console.log(`UPDATE subscription_plans SET`);
      console.log(`  stripe_monthly_price_id = '${monthlyPrice.id}',`);
      console.log(`  stripe_yearly_price_id = '${yearlyPrice.id}'`);
      console.log(`WHERE slug = '${plan.name.toLowerCase()}';`);
      console.log('');

    } catch (error) {
      console.error(`❌ Error creating ${plan.name}:`, error.message);
    }
  }

  console.log('🎉 Stripe products and prices created successfully!');
  console.log('\nNext steps:');
  console.log('1. Copy the SQL statements above');
  console.log('2. Run them in your Supabase SQL editor');
  console.log('3. Or use the setup_stripe_prices.sql file and replace the placeholder IDs');
}

// Run the script
createStripeProducts().catch(console.error); 