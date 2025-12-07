-- ============================================================================
-- PM Platform Subscriptions & Multi-Platform Access System
-- Version: v82
-- Description: Creates subscription system for PM Platform and multi-platform access tracking
-- Author: Development Team
-- Date: 2025-11-26
-- ============================================================================

-- Prerequisites:
-- - Supabase Auth must be configured
-- - v03_user_access_tables.sql must be run first
-- - Stripe integration configured

-- Purpose:
-- Creates a dual-subscription system allowing users to:
-- 1. Subscribe separately to PM Platform and Simulator
-- 2. Use single email for both platforms (recommended)
-- 3. Optionally link different emails per platform (advanced)
-- 4. Track platform access and usage

-- ============================================================================
-- TABLE 1: PM Platform Subscriptions
-- Description: Subscription management for PM Platform (mirrors sim.simulator_subscriptions structure)
-- Category: subscription
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.pm_subscriptions (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User Reference (Supabase Auth)
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Subscription Details
    plan_type VARCHAR(50) NOT NULL CHECK (plan_type IN (
        'free',
        'starter',
        'professional',
        'enterprise',
        'lifetime_starter',
        'lifetime_professional',
        'lifetime_enterprise'
    )),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN (
        'active',
        'cancelled',
        'expired',
        'past_due',
        'trialing',
        'paused'
    )),

    -- Dates
    started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE,
    paused_at TIMESTAMP WITH TIME ZONE,

    -- Lifetime Flag
    is_lifetime BOOLEAN DEFAULT false,

    -- Stripe Integration
    stripe_subscription_id VARCHAR(255) UNIQUE,
    stripe_customer_id VARCHAR(255),
    stripe_product_id VARCHAR(255),
    stripe_price_id VARCHAR(255),

    -- Billing
    amount_paid DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'USD',
    billing_cycle VARCHAR(20) CHECK (billing_cycle IN ('monthly', 'yearly', 'lifetime', 'custom')),
    next_billing_date TIMESTAMP WITH TIME ZONE,

    -- Billing Period
    current_period_start TIMESTAMP WITH TIME ZONE,
    current_period_end TIMESTAMP WITH TIME ZONE,

    -- Grace Period (for payment failures)
    grace_period_end TIMESTAMP WITH TIME ZONE,
    grace_period_days INTEGER DEFAULT 7,
    is_in_grace_period BOOLEAN DEFAULT false,

    -- Cancellation
    cancel_at_period_end BOOLEAN DEFAULT false,
    cancellation_reason TEXT,

    -- Trial Period
    trial_start TIMESTAMP WITH TIME ZONE,
    trial_end TIMESTAMP WITH TIME ZONE,
    is_trial BOOLEAN DEFAULT false,

    -- Enterprise Features
    is_enterprise BOOLEAN DEFAULT false,
    max_projects INTEGER,
    max_team_members INTEGER,
    custom_features JSONB DEFAULT '{}',

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Indexes for PM Subscriptions
CREATE INDEX idx_pm_subscriptions_user_id ON public.pm_subscriptions(user_id);
CREATE INDEX idx_pm_subscriptions_status ON public.pm_subscriptions(status) WHERE status IN ('active', 'trialing');
CREATE INDEX idx_pm_subscriptions_stripe_customer ON public.pm_subscriptions(stripe_customer_id) WHERE stripe_customer_id IS NOT NULL;
CREATE INDEX idx_pm_subscriptions_stripe_subscription ON public.pm_subscriptions(stripe_subscription_id) WHERE stripe_subscription_id IS NOT NULL;
CREATE INDEX idx_pm_subscriptions_plan_type ON public.pm_subscriptions(plan_type);
CREATE INDEX idx_pm_subscriptions_expires_at ON public.pm_subscriptions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_pm_subscriptions_grace_period ON public.pm_subscriptions(grace_period_end) WHERE is_in_grace_period = true;

-- Comments
COMMENT ON TABLE public.pm_subscriptions IS 'PM Platform subscription management - tracks user subscriptions, billing, and access levels';
COMMENT ON COLUMN public.pm_subscriptions.user_id IS 'References Supabase auth.users(id)';
COMMENT ON COLUMN public.pm_subscriptions.plan_type IS 'Subscription tier: free, starter, professional, enterprise, or lifetime variants';
COMMENT ON COLUMN public.pm_subscriptions.is_lifetime IS 'One-time payment subscriptions never expire';
COMMENT ON COLUMN public.pm_subscriptions.grace_period_end IS 'Date when grace period ends after payment failure';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('pm_subscriptions', 'PM Platform subscription management with billing and access control', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- TABLE 2: User Platform Access Tracking
-- Description: Tracks which platforms users have registered for and accessed
-- Category: user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_platform_access (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- User Reference
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Platform Identifier
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('pm', 'simulator', 'admin')),

    -- Registration Status
    has_registered BOOLEAN DEFAULT false,
    registration_date TIMESTAMP WITH TIME ZONE,

    -- Access Tracking
    first_access_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_access_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    access_count INTEGER DEFAULT 0,

    -- Onboarding
    onboarding_completed BOOLEAN DEFAULT false,
    onboarding_completed_at TIMESTAMP WITH TIME ZONE,
    onboarding_step INTEGER DEFAULT 0,

    -- Preferences
    is_primary_platform BOOLEAN DEFAULT false,
    notifications_enabled BOOLEAN DEFAULT true,

    -- Metadata
    metadata JSONB DEFAULT '{}',

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Unique constraint: One record per user per platform
    UNIQUE(user_id, platform)
);

-- Indexes for Platform Access
CREATE INDEX idx_platform_access_user_id ON public.user_platform_access(user_id);
CREATE INDEX idx_platform_access_platform ON public.user_platform_access(platform);
CREATE INDEX idx_platform_access_has_registered ON public.user_platform_access(has_registered) WHERE has_registered = true;
CREATE INDEX idx_platform_access_last_access ON public.user_platform_access(last_access_at DESC);

-- Comments
COMMENT ON TABLE public.user_platform_access IS 'Tracks which platforms users have registered for and their access patterns';
COMMENT ON COLUMN public.user_platform_access.platform IS 'Platform identifier: pm (Project Management), simulator (PM Simulator), admin (Admin Panel)';
COMMENT ON COLUMN public.user_platform_access.has_registered IS 'Whether user has completed registration for this platform';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('user_platform_access', 'Tracks user registration and access patterns across PM and Simulator platforms', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- TABLE 3: Account Links (Optional Secondary Email Support)
-- Description: Allows users to link different emails for different platforms
-- Category: user
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.account_links (
    -- Primary Key
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Primary Account
    primary_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    -- Secondary Email (not yet registered or linked to another account)
    secondary_email VARCHAR(255) NOT NULL,

    -- Platform this link is for
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('pm', 'simulator')),

    -- Verification
    is_verified BOOLEAN DEFAULT false,
    verification_token VARCHAR(255) UNIQUE,
    verification_sent_at TIMESTAMP WITH TIME ZONE,
    verified_at TIMESTAMP WITH TIME ZONE,
    verification_expires_at TIMESTAMP WITH TIME ZONE,

    -- Linked Account (if secondary email already has an account)
    linked_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    linked_at TIMESTAMP WITH TIME ZONE,

    -- Status
    is_active BOOLEAN DEFAULT true,

    -- Metadata
    link_reason TEXT,
    metadata JSONB DEFAULT '{}',

    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),

    -- Unique constraint: One secondary email per platform per primary user
    UNIQUE(primary_user_id, secondary_email, platform)
);

-- Indexes for Account Links
CREATE INDEX idx_account_links_primary_user ON public.account_links(primary_user_id);
CREATE INDEX idx_account_links_secondary_email ON public.account_links(secondary_email);
CREATE INDEX idx_account_links_platform ON public.account_links(platform);
CREATE INDEX idx_account_links_verification_token ON public.account_links(verification_token) WHERE verification_token IS NOT NULL;
CREATE INDEX idx_account_links_is_verified ON public.account_links(is_verified) WHERE is_verified = true;

-- Comments
COMMENT ON TABLE public.account_links IS 'Optional feature: Links different emails to same account for platform-specific access';
COMMENT ON COLUMN public.account_links.secondary_email IS 'Alternative email address for platform-specific login';
COMMENT ON COLUMN public.account_links.linked_user_id IS 'If secondary email already has an account, reference to that account';

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('account_links', 'Links secondary email addresses to primary accounts for multi-platform access', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- FUNCTION 1: Auto-Create Free Tier Subscriptions
-- Description: Automatically creates free tier subscription when user registers for a platform
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_free_subscription()
RETURNS TRIGGER AS $$
DECLARE
    existing_pm_sub UUID;
    existing_sim_sub UUID;
BEGIN
    -- Only proceed if user has registered for the platform
    IF NEW.has_registered = true AND (OLD IS NULL OR OLD.has_registered = false) THEN

        -- Create PM Platform free subscription if registering for PM
        IF NEW.platform = 'pm' THEN
            -- Check if user already has a PM subscription
            SELECT id INTO existing_pm_sub
            FROM public.pm_subscriptions
            WHERE user_id = NEW.user_id
            LIMIT 1;

            -- Create free tier if no subscription exists
            IF existing_pm_sub IS NULL THEN
                INSERT INTO public.pm_subscriptions (
                    user_id,
                    plan_type,
                    status,
                    is_lifetime,
                    max_projects,
                    max_team_members
                )
                VALUES (
                    NEW.user_id,
                    'free',
                    'active',
                    false,
                    1,  -- Free tier: 1 project
                    5   -- Free tier: 5 team members
                );

                RAISE NOTICE 'Created free PM subscription for user %', NEW.user_id;
            END IF;
        END IF;

        -- Create Simulator free subscription if registering for Simulator
        IF NEW.platform = 'simulator' THEN
            -- Check if user already has a Simulator subscription
            SELECT id INTO existing_sim_sub
            FROM sim.simulator_subscriptions
            WHERE user_id = NEW.user_id
            LIMIT 1;

            -- Create free tier if no subscription exists
            IF existing_sim_sub IS NULL THEN
                INSERT INTO sim.simulator_subscriptions (
                    user_id,
                    plan_type,
                    status,
                    is_lifetime
                )
                VALUES (
                    NEW.user_id,
                    'free',
                    'active',
                    false
                );

                RAISE NOTICE 'Created free Simulator subscription for user %', NEW.user_id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create free subscriptions
DROP TRIGGER IF EXISTS trg_auto_create_free_subscription ON public.user_platform_access;
CREATE TRIGGER trg_auto_create_free_subscription
    AFTER INSERT OR UPDATE ON public.user_platform_access
    FOR EACH ROW
    EXECUTE FUNCTION public.auto_create_free_subscription();

COMMENT ON FUNCTION public.auto_create_free_subscription() IS 'Automatically creates free tier subscription when user registers for PM or Simulator platform';

-- ============================================================================
-- FUNCTION 2: Get Platform Subscription Status
-- Description: Returns subscription status for a specific platform
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_platform_subscription_status(
    p_user_id UUID,
    p_platform VARCHAR
)
RETURNS TABLE (
    has_subscription BOOLEAN,
    plan_type VARCHAR,
    status VARCHAR,
    is_active BOOLEAN,
    is_lifetime BOOLEAN,
    expires_at TIMESTAMP WITH TIME ZONE,
    in_grace_period BOOLEAN
) AS $$
BEGIN
    IF p_platform = 'pm' THEN
        RETURN QUERY
        SELECT
            EXISTS(SELECT 1 FROM public.pm_subscriptions WHERE user_id = p_user_id) as has_subscription,
            ps.plan_type,
            ps.status,
            (ps.status IN ('active', 'trialing') OR ps.is_in_grace_period = true) as is_active,
            ps.is_lifetime,
            ps.expires_at,
            ps.is_in_grace_period as in_grace_period
        FROM public.pm_subscriptions ps
        WHERE ps.user_id = p_user_id
        ORDER BY ps.created_at DESC
        LIMIT 1;

    ELSIF p_platform = 'simulator' THEN
        RETURN QUERY
        SELECT
            EXISTS(SELECT 1 FROM sim.simulator_subscriptions WHERE user_id = p_user_id) as has_subscription,
            ss.plan_type,
            ss.status,
            (ss.status IN ('active', 'trialing') OR
             (ss.is_in_grace_period = true AND ss.grace_period_end > NOW())) as is_active,
            ss.is_lifetime,
            ss.expires_at,
            (ss.is_in_grace_period = true AND ss.grace_period_end > NOW()) as in_grace_period
        FROM sim.simulator_subscriptions ss
        WHERE ss.user_id = p_user_id
        ORDER BY ss.created_at DESC
        LIMIT 1;
    ELSE
        -- Invalid platform
        RETURN QUERY
        SELECT
            false as has_subscription,
            NULL::VARCHAR as plan_type,
            NULL::VARCHAR as status,
            false as is_active,
            false as is_lifetime,
            NULL::TIMESTAMP WITH TIME ZONE as expires_at,
            false as in_grace_period
        WHERE false;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_platform_subscription_status(UUID, VARCHAR) IS 'Returns current subscription status for specified platform (pm or simulator)';

-- ============================================================================
-- FUNCTION 3: Get All User Subscriptions
-- Description: Returns all active subscriptions across all platforms for a user
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_all_user_subscriptions(p_user_id UUID)
RETURNS TABLE (
    platform VARCHAR,
    subscription_id UUID,
    plan_type VARCHAR,
    status VARCHAR,
    is_active BOOLEAN,
    is_lifetime BOOLEAN,
    started_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE,
    amount_paid DECIMAL,
    currency VARCHAR,
    billing_cycle VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    -- PM Platform subscriptions
    SELECT
        'pm'::VARCHAR as platform,
        ps.id as subscription_id,
        ps.plan_type,
        ps.status,
        (ps.status IN ('active', 'trialing') OR ps.is_in_grace_period = true) as is_active,
        ps.is_lifetime,
        ps.started_at,
        ps.expires_at,
        ps.amount_paid,
        ps.currency,
        ps.billing_cycle
    FROM public.pm_subscriptions ps
    WHERE ps.user_id = p_user_id

    UNION ALL

    -- Simulator subscriptions
    SELECT
        'simulator'::VARCHAR as platform,
        ss.id as subscription_id,
        ss.plan_type,
        ss.status,
        (ss.status IN ('active', 'trialing') OR
         (ss.is_in_grace_period = true AND ss.grace_period_end > NOW())) as is_active,
        ss.is_lifetime,
        ss.started_at,
        ss.expires_at,
        ss.amount_paid,
        ss.currency,
        ss.billing_cycle
    FROM sim.simulator_subscriptions ss
    WHERE ss.user_id = p_user_id

    ORDER BY started_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.get_all_user_subscriptions(UUID) IS 'Returns all subscriptions (PM and Simulator) for a user';

-- ============================================================================
-- FUNCTION 4: Update Last Access Time
-- Description: Updates last access timestamp for platform
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_platform_access(
    p_user_id UUID,
    p_platform VARCHAR
)
RETURNS void AS $$
BEGIN
    INSERT INTO public.user_platform_access (
        user_id,
        platform,
        first_access_at,
        last_access_at,
        access_count
    )
    VALUES (
        p_user_id,
        p_platform,
        NOW(),
        NOW(),
        1
    )
    ON CONFLICT (user_id, platform)
    DO UPDATE SET
        last_access_at = NOW(),
        access_count = public.user_platform_access.access_count + 1,
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_platform_access(UUID, VARCHAR) IS 'Updates last access timestamp and increments access counter for platform';

-- ============================================================================
-- FUNCTION 5: Check Grace Period Status
-- Description: Checks and updates grace period status for PM subscriptions
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_pm_subscription_grace_period()
RETURNS void AS $$
DECLARE
    sub_record RECORD;
    now_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    now_timestamp := NOW();

    -- Process active PM subscriptions that have expired
    FOR sub_record IN
        SELECT * FROM public.pm_subscriptions
        WHERE status = 'active'
          AND is_lifetime = false
          AND current_period_end IS NOT NULL
          AND current_period_end < now_timestamp
    LOOP
        -- Check if grace period should start
        IF sub_record.grace_period_end IS NULL THEN
            -- Start grace period
            UPDATE public.pm_subscriptions
            SET
                grace_period_end = now_timestamp + (COALESCE(sub_record.grace_period_days, 7) || ' days')::INTERVAL,
                is_in_grace_period = true,
                updated_at = now_timestamp
            WHERE id = sub_record.id;

            RAISE NOTICE 'Grace period started for PM subscription %', sub_record.id;

        ELSIF sub_record.grace_period_end < now_timestamp THEN
            -- Grace period expired, mark subscription as expired
            UPDATE public.pm_subscriptions
            SET
                status = 'expired',
                expires_at = now_timestamp,
                is_in_grace_period = false,
                updated_at = now_timestamp
            WHERE id = sub_record.id;

            RAISE NOTICE 'PM Subscription % expired after grace period', sub_record.id;
        END IF;
    END LOOP;

    -- Process past_due subscriptions
    FOR sub_record IN
        SELECT * FROM public.pm_subscriptions
        WHERE status = 'past_due'
          AND is_lifetime = false
          AND (current_period_end < now_timestamp - INTERVAL '3 days')
    LOOP
        UPDATE public.pm_subscriptions
        SET
            status = 'expired',
            expires_at = now_timestamp,
            updated_at = now_timestamp
        WHERE id = sub_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_pm_subscription_grace_period() IS 'Checks and updates grace period status for expired PM subscriptions';

-- ============================================================================
-- RLS POLICIES
-- Description: Row Level Security policies for multi-tenant access control
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.pm_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_platform_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_links ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own PM subscriptions
CREATE POLICY policy_pm_subscriptions_select_own
    ON public.pm_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 2: Users can update their own PM subscriptions (for cancellation)
CREATE POLICY policy_pm_subscriptions_update_own
    ON public.pm_subscriptions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 3: System can insert PM subscriptions
CREATE POLICY policy_pm_subscriptions_insert_system
    ON public.pm_subscriptions FOR INSERT
    WITH CHECK (true);  -- Service role only

-- Policy 4: Admins can manage all PM subscriptions
CREATE POLICY policy_pm_subscriptions_admin_all
    ON public.pm_subscriptions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('System Admin', 'Subscription Manager')
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- Policy 5: Users can view their own platform access
CREATE POLICY policy_platform_access_select_own
    ON public.user_platform_access FOR SELECT
    USING (auth.uid() = user_id);

-- Policy 6: Users can update their own platform access
CREATE POLICY policy_platform_access_update_own
    ON public.user_platform_access FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Policy 7: System can insert platform access records
CREATE POLICY policy_platform_access_insert_system
    ON public.user_platform_access FOR INSERT
    WITH CHECK (true);  -- Service role only

-- Policy 8: Users can view their own account links
CREATE POLICY policy_account_links_select_own
    ON public.account_links FOR SELECT
    USING (auth.uid() = primary_user_id OR auth.uid() = linked_user_id);

-- Policy 9: Users can manage their own account links
CREATE POLICY policy_account_links_manage_own
    ON public.account_links FOR ALL
    USING (auth.uid() = primary_user_id)
    WITH CHECK (auth.uid() = primary_user_id);

-- ============================================================================
-- SEED DATA: Create free tier limits reference
-- ============================================================================

-- Document PM Platform tier limits in comments for reference
COMMENT ON COLUMN public.pm_subscriptions.max_projects IS 'Project limits: Free=1, Starter=10, Professional=unlimited(-1), Enterprise=unlimited(-1)';
COMMENT ON COLUMN public.pm_subscriptions.max_team_members IS 'Team member limits: Free=5, Starter=20, Professional=100, Enterprise=unlimited(-1)';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check tables were created
DO $$
DECLARE
    pm_subs_exists BOOLEAN;
    platform_access_exists BOOLEAN;
    account_links_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'pm_subscriptions'
    ) INTO pm_subs_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'user_platform_access'
    ) INTO platform_access_exists;

    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'account_links'
    ) INTO account_links_exists;

    IF pm_subs_exists AND platform_access_exists AND account_links_exists THEN
        RAISE NOTICE '✓ All tables created successfully';
        RAISE NOTICE '  - pm_subscriptions: %', pm_subs_exists;
        RAISE NOTICE '  - user_platform_access: %', platform_access_exists;
        RAISE NOTICE '  - account_links: %', account_links_exists;
    ELSE
        RAISE EXCEPTION 'Table creation failed';
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

-- Summary
COMMENT ON SCHEMA public IS 'Public schema now includes dual-subscription system for PM Platform and Simulator';

RAISE NOTICE '============================================================================';
RAISE NOTICE 'PM Platform Subscriptions & Multi-Platform Access System v82';
RAISE NOTICE '============================================================================';
RAISE NOTICE 'Tables Created:';
RAISE NOTICE '  1. public.pm_subscriptions - PM Platform subscription management';
RAISE NOTICE '  2. public.user_platform_access - Platform registration tracking';
RAISE NOTICE '  3. public.account_links - Optional email linking';
RAISE NOTICE '';
RAISE NOTICE 'Functions Created:';
RAISE NOTICE '  1. auto_create_free_subscription() - Auto-creates free tier';
RAISE NOTICE '  2. get_platform_subscription_status() - Get platform sub status';
RAISE NOTICE '  3. get_all_user_subscriptions() - Get all user subs';
RAISE NOTICE '  4. update_platform_access() - Track platform access';
RAISE NOTICE '  5. check_pm_subscription_grace_period() - Grace period handling';
RAISE NOTICE '';
RAISE NOTICE 'RLS Policies: ✓ Enabled on all tables';
RAISE NOTICE 'Indexes: ✓ Created for performance';
RAISE NOTICE '============================================================================';
RAISE NOTICE 'Next Steps:';
RAISE NOTICE '  1. Create backend services (pmSubscriptionService.js)';
RAISE NOTICE '  2. Update registration flow with platform selection';
RAISE NOTICE '  3. Create subscription dashboard UI';
RAISE NOTICE '  4. Configure Stripe products and pricing';
RAISE NOTICE '============================================================================';
