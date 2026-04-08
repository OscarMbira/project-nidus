# Subscription Plan Configuration Guide

**Version:** 1.0  
**Last Updated:** 2025-01-XX

---

## Overview

This guide explains how to configure subscription plans in the database, including plan types, pricing, features, and billing cycles.

---

## Database Schema

### Table: `subscription_plans`

The `subscription_plans` table stores all available subscription plans.

**Key Columns**:
- `plan_type`: starter, professional, enterprise, lifetime
- `billing_cycle`: monthly, yearly, lifetime
- `price`: Decimal price in USD
- `features`: JSONB array of feature strings
- `member_limit`: Maximum team members
- `is_active`: Whether plan is available
- `display_order`: Order for display in UI

---

## Plan Types

### Starter Plan

**Target Audience**: Small teams, individual users

**Typical Features**:
- Up to 10 team members
- Basic project management
- Standard support
- Limited storage

**Pricing Example**:
- Monthly: $29/month
- Yearly: $290/year (save 17%)

### Professional Plan

**Target Audience**: Growing teams, small businesses

**Typical Features**:
- Up to 50 team members
- Advanced project management
- Advanced reporting
- Priority support
- Increased storage

**Pricing Example**:
- Monthly: $99/month
- Yearly: $990/year (save 17%)

### Enterprise Plan

**Target Audience**: Large organizations

**Typical Features**:
- Unlimited team members
- All features
- Custom integrations
- Dedicated support
- SLA guarantees
- Custom pricing

**Pricing Example**:
- Monthly: $299/month
- Yearly: $2990/year (save 17%)

### Lifetime Plan

**Target Audience**: Long-term users

**Typical Features**:
- One-time payment
- Lifetime access
- All features
- Future updates included

**Pricing Example**:
- One-time: $2,999

---

## Adding a New Plan

### Step 1: Insert Plan Record

```sql
INSERT INTO subscription_plans (
  plan_type,
  billing_cycle,
  plan_name,
  description,
  price,
  currency,
  features,
  member_limit,
  is_active,
  display_order,
  created_at,
  updated_at
) VALUES (
  'starter',                    -- plan_type
  'monthly',                   -- billing_cycle
  'Starter Monthly',           -- plan_name
  'Perfect for small teams',   -- description
  29.00,                       -- price
  'USD',                       -- currency
  '["Up to 10 members", "Basic features", "Standard support"]'::jsonb, -- features
  10,                          -- member_limit
  true,                        -- is_active
  1,                           -- display_order
  NOW(),                       -- created_at
  NOW()                        -- updated_at
);
```

### Step 2: Add Yearly Version

```sql
INSERT INTO subscription_plans (
  plan_type,
  billing_cycle,
  plan_name,
  description,
  price,
  currency,
  features,
  member_limit,
  is_active,
  display_order
) VALUES (
  'starter',
  'yearly',
  'Starter Yearly',
  'Perfect for small teams - Save 17%',
  290.00,
  'USD',
  '["Up to 10 members", "Basic features", "Standard support"]'::jsonb,
  10,
  true,
  2
);
```

### Step 3: Verify Plan

```sql
SELECT * FROM subscription_plans 
WHERE plan_type = 'starter' 
AND is_active = true
ORDER BY display_order;
```

---

## Updating Existing Plans

### Update Price

```sql
UPDATE subscription_plans
SET 
  price = 39.00,
  updated_at = NOW()
WHERE plan_type = 'starter'
AND billing_cycle = 'monthly';
```

### Update Features

```sql
UPDATE subscription_plans
SET 
  features = '["Up to 15 members", "Basic features", "Standard support", "New feature"]'::jsonb,
  member_limit = 15,
  updated_at = NOW()
WHERE plan_type = 'starter'
AND billing_cycle = 'monthly';
```

### Deactivate Plan

```sql
UPDATE subscription_plans
SET 
  is_active = false,
  updated_at = NOW()
WHERE plan_type = 'starter'
AND billing_cycle = 'monthly';
```

---

## Features JSON Format

### Example Features Array

```json
[
  "Up to 10 team members",
  "Unlimited projects",
  "Advanced reporting",
  "Priority support",
  "API access",
  "Custom integrations",
  "99.9% uptime SLA",
  "Dedicated account manager"
]
```

### Best Practices

1. **Keep Features Concise**: Short, clear descriptions
2. **Order Matters**: Most important features first
3. **Use Consistent Language**: Standardize terminology
4. **Highlight Differences**: Emphasize what makes each plan unique

---

## Billing Cycles

### Monthly

- **Recurring**: Charged every month
- **Flexibility**: Easy to cancel
- **Higher Cost**: More expensive per year

### Yearly

- **Recurring**: Charged once per year
- **Discount**: Typically 17% savings
- **Commitment**: Annual commitment
- **Lower Cost**: Better value

### Lifetime

- **One-Time**: Single payment
- **No Recurring**: No future charges
- **Best Value**: Highest upfront cost, but lifetime access

---

## Display Order

### Recommended Order

1. **Starter Monthly** (order: 1)
2. **Starter Yearly** (order: 2)
3. **Professional Monthly** (order: 3)
4. **Professional Yearly** (order: 4)
5. **Enterprise Monthly** (order: 5)
6. **Enterprise Yearly** (order: 6)
7. **Lifetime** (order: 7)

### Updating Display Order

```sql
UPDATE subscription_plans
SET display_order = 3
WHERE plan_type = 'professional'
AND billing_cycle = 'monthly';
```

---

## Plan Activation/Deactivation

### Activate Plan

```sql
UPDATE subscription_plans
SET is_active = true
WHERE plan_type = 'starter'
AND billing_cycle = 'monthly';
```

### Deactivate Plan

```sql
UPDATE subscription_plans
SET is_active = false
WHERE plan_type = 'starter'
AND billing_cycle = 'monthly';
```

**Note**: Deactivating a plan:
- Hides it from the UI
- Does not affect existing subscriptions
- Existing subscribers keep their plan

---

## API Usage

### Get Available Plans

```javascript
import { getAvailablePlans } from '@/services/subscriptionPlanService';

const plans = await getAvailablePlans();
// Returns all active plans ordered by display_order
```

### Get Plan by Type

```javascript
import { getPlanByType } from '@/services/subscriptionPlanService';

const plan = await getPlanByType('starter', 'monthly');
// Returns specific plan
```

### Get Pricing Summary

```javascript
import { getPricingSummary } from '@/services/subscriptionPlanService';

const summary = await getPricingSummary('starter', 20); // 20 members
// Returns: { basePrice, memberPrice, totalPrice, ... }
```

---

## Sample Data

### Complete Starter Plan Setup

```sql
-- Monthly
INSERT INTO subscription_plans (
  plan_type, billing_cycle, plan_name, description,
  price, currency, features, member_limit,
  is_active, display_order
) VALUES (
  'starter', 'monthly', 'Starter Monthly',
  'Perfect for small teams getting started',
  29.00, 'USD',
  '["Up to 10 members", "Unlimited projects", "Basic reporting", "Email support"]'::jsonb,
  10, true, 1
);

-- Yearly
INSERT INTO subscription_plans (
  plan_type, billing_cycle, plan_name, description,
  price, currency, features, member_limit,
  is_active, display_order
) VALUES (
  'starter', 'yearly', 'Starter Yearly',
  'Perfect for small teams - Save 17%',
  290.00, 'USD',
  '["Up to 10 members", "Unlimited projects", "Basic reporting", "Email support"]'::jsonb,
  10, true, 2
);
```

---

## Best Practices

### Pricing Strategy

1. **Clear Value Proposition**: Each tier should offer clear value
2. **Reasonable Gaps**: Price differences should make sense
3. **Yearly Discount**: Offer 15-20% discount for yearly
4. **Lifetime Option**: Consider lifetime for long-term value

### Feature Differentiation

1. **Member Limits**: Clear progression (10 → 50 → unlimited)
2. **Feature Tiers**: Basic → Advanced → Enterprise
3. **Support Levels**: Standard → Priority → Dedicated
4. **Storage**: Increase with each tier

### Plan Management

1. **Test Before Activating**: Verify plan displays correctly
2. **Document Changes**: Keep changelog of plan updates
3. **Monitor Usage**: Track which plans are popular
4. **Gather Feedback**: Collect user feedback on plans

---

## Troubleshooting

### Issue: Plan not showing in UI

**Check**:
1. `is_active = true`
2. `display_order` is set
3. Plan exists in database
4. Frontend is fetching plans correctly

### Issue: Wrong price displayed

**Check**:
1. `price` column value
2. `currency` column value
3. Frontend currency conversion
4. Caching issues

### Issue: Features not displaying

**Check**:
1. `features` JSONB format is valid
2. Frontend parsing of features
3. Features array structure

---

## Support

For plan configuration issues:
- **Email**: devops@yourdomain.com
- **Subject**: "Subscription Plan Configuration"
- **Include**: Plan details, error messages, screenshots

---

**Last Updated**: 2025-01-XX

