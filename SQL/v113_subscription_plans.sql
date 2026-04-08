-- Migration: v113_subscription_plans.sql
-- Description: Create subscription_plans configuration table with sample data
-- Author: Claude AI
-- Date: 2025-12-11
-- Dependencies: None (standalone configuration table)

-- Create subscription_plans table
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_name VARCHAR(100) NOT NULL,
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN ('starter', 'professional', 'enterprise', 'lifetime')),
    billing_cycle VARCHAR(20) NOT NULL CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime')),
    price DECIMAL(10, 2) NOT NULL,
    original_price DECIMAL(10, 2), -- For showing discounts
    currency VARCHAR(3) DEFAULT 'USD',
    member_limit INTEGER NOT NULL DEFAULT 20,
    project_limit INTEGER, -- NULL = unlimited
    additional_member_price DECIMAL(10, 2) NOT NULL DEFAULT 5.00,
    features JSONB,
    platform_included BOOLEAN DEFAULT TRUE,
    simulator_included BOOLEAN DEFAULT FALSE,
    is_popular BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    display_order INTEGER DEFAULT 0,
    stripe_price_id VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add comments to document the table and columns
COMMENT ON TABLE subscription_plans IS 'Configuration table for available subscription plans and pricing';
COMMENT ON COLUMN subscription_plans.plan_name IS 'Display name of the plan (e.g., "Starter Monthly")';
COMMENT ON COLUMN subscription_plans.plan_type IS 'Plan tier: starter, professional, enterprise, or lifetime';
COMMENT ON COLUMN subscription_plans.billing_cycle IS 'How often billed: monthly, yearly, or lifetime (one-time)';
COMMENT ON COLUMN subscription_plans.price IS 'Current price for this plan';
COMMENT ON COLUMN subscription_plans.original_price IS 'Original price before discount (for displaying savings)';
COMMENT ON COLUMN subscription_plans.member_limit IS 'Base number of team members included';
COMMENT ON COLUMN subscription_plans.project_limit IS 'Maximum projects allowed (NULL = unlimited)';
COMMENT ON COLUMN subscription_plans.additional_member_price IS 'Cost per additional member beyond base limit';
COMMENT ON COLUMN subscription_plans.features IS 'JSON array of feature descriptions';
COMMENT ON COLUMN subscription_plans.platform_included IS 'Whether Platform module is included';
COMMENT ON COLUMN subscription_plans.simulator_included IS 'Whether Simulator module is included';
COMMENT ON COLUMN subscription_plans.is_popular IS 'Highlight as "Most Popular" plan';
COMMENT ON COLUMN subscription_plans.stripe_price_id IS 'Stripe Price ID for payment integration';

-- Create unique index on plan_type + billing_cycle
CREATE UNIQUE INDEX idx_subscription_plans_unique ON subscription_plans(plan_type, billing_cycle);

-- Create index for active plans
CREATE INDEX idx_subscription_plans_active ON subscription_plans(is_active, display_order)
WHERE is_active = TRUE;

-- Enable Row Level Security
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if it exists
DROP POLICY IF EXISTS subscription_plans_public_read ON subscription_plans;

-- RLS Policy: Public read access to active plans
CREATE POLICY subscription_plans_public_read ON subscription_plans
    FOR SELECT
    USING (is_active = TRUE);

-- Insert default subscription plans
INSERT INTO subscription_plans (
    plan_name,
    plan_type,
    billing_cycle,
    price,
    original_price,
    member_limit,
    project_limit,
    additional_member_price,
    features,
    platform_included,
    simulator_included,
    is_popular,
    display_order
) VALUES
    -- Starter Monthly
    (
        'Starter Monthly',
        'starter',
        'monthly',
        29.00,
        NULL,
        20,
        NULL, -- Unlimited projects
        5.00,
        '[
            "Up to 20 team members",
            "Unlimited projects",
            "Unlimited tasks",
            "Basic Gantt charts",
            "Email support",
            "Mobile app access"
        ]'::jsonb,
        TRUE,
        FALSE,
        FALSE,
        1
    ),
    -- Starter Yearly (Save 17%)
    (
        'Starter Yearly',
        'starter',
        'yearly',
        290.00,
        348.00, -- Show original price for savings display
        20,
        NULL,
        5.00,
        '[
            "Up to 20 team members",
            "Unlimited projects",
            "Unlimited tasks",
            "Basic Gantt charts",
            "Email support",
            "Mobile app access",
            "Save 17% vs monthly"
        ]'::jsonb,
        TRUE,
        FALSE,
        FALSE,
        2
    ),
    -- Professional Monthly (Most Popular)
    (
        'Professional Monthly',
        'professional',
        'monthly',
        79.00,
        NULL,
        50,
        NULL,
        3.00,
        '[
            "Up to 50 team members",
            "Unlimited projects",
            "Advanced Gantt charts",
            "Resource management",
            "Time tracking",
            "Custom reports",
            "Priority support",
            "API access",
            "Simulator module included"
        ]'::jsonb,
        TRUE,
        TRUE, -- Simulator included
        TRUE, -- Most popular
        3
    ),
    -- Professional Yearly (Most Popular, Save 17%)
    (
        'Professional Yearly',
        'professional',
        'yearly',
        790.00,
        948.00,
        50,
        NULL,
        3.00,
        '[
            "Up to 50 team members",
            "Unlimited projects",
            "Advanced Gantt charts",
            "Resource management",
            "Time tracking",
            "Custom reports",
            "Priority support",
            "API access",
            "Simulator module included",
            "Save 17% vs monthly"
        ]'::jsonb,
        TRUE,
        TRUE,
        TRUE,
        4
    ),
    -- Enterprise Monthly
    (
        'Enterprise',
        'enterprise',
        'monthly',
        199.00,
        NULL,
        200,
        NULL,
        2.00,
        '[
            "Up to 200 team members",
            "Everything in Professional",
            "Custom integrations",
            "Dedicated account manager",
            "SLA guarantee",
            "Advanced security",
            "On-premise option",
            "Custom training"
        ]'::jsonb,
        TRUE,
        TRUE,
        FALSE,
        5
    ),
    -- Lifetime Access (One-time payment)
    (
        'Lifetime Access',
        'lifetime',
        'lifetime',
        999.00,
        1999.00,
        100,
        NULL,
        4.00,
        '[
            "One-time payment",
            "100 team members",
            "All Professional features",
            "Lifetime updates",
            "No recurring fees",
            "Best value",
            "Priority support forever"
        ]'::jsonb,
        TRUE,
        TRUE,
        FALSE,
        6
    )
ON CONFLICT (plan_type, billing_cycle) DO UPDATE SET
    plan_name = EXCLUDED.plan_name,
    price = EXCLUDED.price,
    original_price = EXCLUDED.original_price,
    member_limit = EXCLUDED.member_limit,
    additional_member_price = EXCLUDED.additional_member_price,
    features = EXCLUDED.features,
    platform_included = EXCLUDED.platform_included,
    simulator_included = EXCLUDED.simulator_included,
    is_popular = EXCLUDED.is_popular,
    display_order = EXCLUDED.display_order,
    updated_at = NOW();

-- Register table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
    'subscription_plans',
    'Configuration table for available subscription plans and pricing tiers',
    false,
    true
)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- Log migration completion
DO $$
DECLARE
    plan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO plan_count FROM subscription_plans WHERE is_active = TRUE;
    RAISE NOTICE 'Migration v113 completed: Created subscription_plans table with % active plans', plan_count;
END $$;
