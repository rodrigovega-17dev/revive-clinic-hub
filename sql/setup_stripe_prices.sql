-- Update subscription plans with Stripe price IDs
-- Run this after creating products and prices in your Stripe dashboard

-- You need to replace these placeholder price IDs with actual Stripe price IDs
-- from your Stripe dashboard

-- Update Starter plan
UPDATE subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1YOUR_MONTHLY_STARTER_PRICE_ID',
  stripe_yearly_price_id = 'price_1YOUR_YEARLY_STARTER_PRICE_ID'
WHERE slug = 'starter';

-- Update Professional plan  
UPDATE subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1YOUR_MONTHLY_PROFESSIONAL_PRICE_ID',
  stripe_yearly_price_id = 'price_1YOUR_YEARLY_PROFESSIONAL_PRICE_ID'
WHERE slug = 'professional';

-- Update Enterprise plan
UPDATE subscription_plans 
SET 
  stripe_monthly_price_id = 'price_1YOUR_MONTHLY_ENTERPRISE_PRICE_ID',
  stripe_yearly_price_id = 'price_1YOUR_YEARLY_ENTERPRISE_PRICE_ID'
WHERE slug = 'enterprise';

-- Verify the updates
SELECT 
  name,
  slug,
  price_monthly,
  price_yearly,
  stripe_monthly_price_id,
  stripe_yearly_price_id
FROM subscription_plans
ORDER BY sort_order; 