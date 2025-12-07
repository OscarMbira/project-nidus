-- ============================================================================
-- Platform Terminology Standardization Migration
-- Version: v90
-- Description: Renames all "PM" references to "Platform" throughout database
-- Author: Development Team
-- Date: 2025-12-07
-- ============================================================================

-- Prerequisites:
-- - v82_pm_subscriptions.sql must have been run
-- - Backup database before running this migration
-- - Run during low-traffic period

-- Purpose:
-- Standardizes terminology across the system to use:
-- 1. "Platform" (instead of "PM Platform", "PM Application", etc.)
-- 2. "Simulator" (unchanged)

-- ============================================================================
-- STEP 1: Rename pm_subscriptions table to platform_subscriptions
-- ============================================================================

ALTER TABLE IF EXISTS public.pm_subscriptions
    RENAME TO platform_subscriptions;

-- ============================================================================
-- STEP 2: Rename all indexes
-- ============================================================================

ALTER INDEX IF EXISTS idx_pm_subscriptions_user_id
    RENAME TO idx_platform_subscriptions_user_id;

ALTER INDEX IF EXISTS idx_pm_subscriptions_status
    RENAME TO idx_platform_subscriptions_status;

ALTER INDEX IF EXISTS idx_pm_subscriptions_stripe_customer
    RENAME TO idx_platform_subscriptions_stripe_customer;

ALTER INDEX IF EXISTS idx_pm_subscriptions_stripe_subscription
    RENAME TO idx_platform_subscriptions_stripe_subscription;

ALTER INDEX IF EXISTS idx_pm_subscriptions_plan_type
    RENAME TO idx_platform_subscriptions_plan_type;

ALTER INDEX IF EXISTS idx_pm_subscriptions_expires_at
    RENAME TO idx_platform_subscriptions_expires_at;

ALTER INDEX IF EXISTS idx_pm_subscriptions_grace_period
    RENAME TO idx_platform_subscriptions_grace_period;

-- ============================================================================
-- STEP 3: Update table and column comments
-- ============================================================================

COMMENT ON TABLE public.platform_subscriptions IS 'Platform subscription management - tracks user subscriptions, billing, and access levels';
COMMENT ON COLUMN public.platform_subscriptions.user_id IS 'References Supabase auth.users(id)';
COMMENT ON COLUMN public.platform_subscriptions.plan_type IS 'Subscription tier: free, starter, professional, enterprise, or lifetime variants';
COMMENT ON COLUMN public.platform_subscriptions.is_lifetime IS 'One-time payment subscriptions never expire';
COMMENT ON COLUMN public.platform_subscriptions.grace_period_end IS 'Date when grace period ends after payment failure';
COMMENT ON COLUMN public.platform_subscriptions.max_projects IS 'Project limits: Free=1, Starter=10, Professional=unlimited(-1), Enterprise=unlimited(-1)';
COMMENT ON COLUMN public.platform_subscriptions.max_team_members IS 'Team member limits: Free=5, Starter=20, Professional=100, Enterprise=unlimited(-1)';

-- ============================================================================
-- STEP 4: Update user_platform_access CHECK constraint and comment
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.user_platform_access
    DROP CONSTRAINT IF EXISTS user_platform_access_platform_check;

-- Add new constraint with updated value
ALTER TABLE public.user_platform_access
    ADD CONSTRAINT user_platform_access_platform_check
    CHECK (platform IN ('platform', 'simulator', 'admin'));

-- Update comment
COMMENT ON COLUMN public.user_platform_access.platform IS 'Platform identifier: platform (Project Management Platform), simulator (PM Simulator), admin (Admin Panel)';

-- ============================================================================
-- STEP 5: Update account_links CHECK constraint
-- ============================================================================

-- Drop existing constraint
ALTER TABLE public.account_links
    DROP CONSTRAINT IF EXISTS account_links_platform_check;

-- Add new constraint with updated value
ALTER TABLE public.account_links
    ADD CONSTRAINT account_links_platform_check
    CHECK (platform IN ('platform', 'simulator'));

-- ============================================================================
-- STEP 6: Update existing data in user_platform_access
-- ============================================================================

UPDATE public.user_platform_access
SET platform = 'platform'
WHERE platform = 'pm';

-- ============================================================================
-- STEP 7: Update existing data in account_links
-- ============================================================================

UPDATE public.account_links
SET platform = 'platform'
WHERE platform = 'pm';

-- ============================================================================
-- STEP 8: Recreate auto_create_free_subscription function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.auto_create_free_subscription()
RETURNS TRIGGER AS $$
DECLARE
    existing_platform_sub UUID;
    existing_sim_sub UUID;
BEGIN
    -- Only proceed if user has registered for the platform
    IF NEW.has_registered = true AND (OLD IS NULL OR OLD.has_registered = false) THEN

        -- Create Platform free subscription if registering for Platform
        IF NEW.platform = 'platform' THEN
            -- Check if user already has a Platform subscription
            SELECT id INTO existing_platform_sub
            FROM public.platform_subscriptions
            WHERE user_id = NEW.user_id
            LIMIT 1;

            -- Create free tier if no subscription exists
            IF existing_platform_sub IS NULL THEN
                INSERT INTO public.platform_subscriptions (
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

                RAISE NOTICE 'Created free Platform subscription for user %', NEW.user_id;
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

COMMENT ON FUNCTION public.auto_create_free_subscription() IS 'Automatically creates free tier subscription when user registers for Platform or Simulator';

-- ============================================================================
-- STEP 9: Recreate get_platform_subscription_status function
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
    IF p_platform = 'platform' THEN
        RETURN QUERY
        SELECT
            EXISTS(SELECT 1 FROM public.platform_subscriptions WHERE user_id = p_user_id) as has_subscription,
            ps.plan_type,
            ps.status,
            (ps.status IN ('active', 'trialing') OR ps.is_in_grace_period = true) as is_active,
            ps.is_lifetime,
            ps.expires_at,
            ps.is_in_grace_period as in_grace_period
        FROM public.platform_subscriptions ps
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

COMMENT ON FUNCTION public.get_platform_subscription_status(UUID, VARCHAR) IS 'Returns current subscription status for specified platform (platform or simulator)';

-- ============================================================================
-- STEP 10: Recreate get_all_user_subscriptions function
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
    -- Platform subscriptions
    SELECT
        'platform'::VARCHAR as platform,
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
    FROM public.platform_subscriptions ps
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

COMMENT ON FUNCTION public.get_all_user_subscriptions(UUID) IS 'Returns all subscriptions (Platform and Simulator) for a user';

-- ============================================================================
-- STEP 11: Recreate check_pm_subscription_grace_period function
-- ============================================================================

CREATE OR REPLACE FUNCTION public.check_platform_subscription_grace_period()
RETURNS void AS $$
DECLARE
    sub_record RECORD;
    now_timestamp TIMESTAMP WITH TIME ZONE;
BEGIN
    now_timestamp := NOW();

    -- Process active Platform subscriptions that have expired
    FOR sub_record IN
        SELECT * FROM public.platform_subscriptions
        WHERE status = 'active'
          AND is_lifetime = false
          AND current_period_end IS NOT NULL
          AND current_period_end < now_timestamp
    LOOP
        -- Check if grace period should start
        IF sub_record.grace_period_end IS NULL THEN
            -- Start grace period
            UPDATE public.platform_subscriptions
            SET
                grace_period_end = now_timestamp + (COALESCE(sub_record.grace_period_days, 7) || ' days')::INTERVAL,
                is_in_grace_period = true,
                updated_at = now_timestamp
            WHERE id = sub_record.id;

            RAISE NOTICE 'Grace period started for Platform subscription %', sub_record.id;

        ELSIF sub_record.grace_period_end < now_timestamp THEN
            -- Grace period expired, mark subscription as expired
            UPDATE public.platform_subscriptions
            SET
                status = 'expired',
                expires_at = now_timestamp,
                is_in_grace_period = false,
                updated_at = now_timestamp
            WHERE id = sub_record.id;

            RAISE NOTICE 'Platform Subscription % expired after grace period', sub_record.id;
        END IF;
    END LOOP;

    -- Process past_due subscriptions
    FOR sub_record IN
        SELECT * FROM public.platform_subscriptions
        WHERE status = 'past_due'
          AND is_lifetime = false
          AND (current_period_end < now_timestamp - INTERVAL '3 days')
    LOOP
        UPDATE public.platform_subscriptions
        SET
            status = 'expired',
            expires_at = now_timestamp,
            updated_at = now_timestamp
        WHERE id = sub_record.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION public.check_platform_subscription_grace_period() IS 'Checks and updates grace period status for expired Platform subscriptions';

-- ============================================================================
-- STEP 12: Drop old RLS policies and create new ones
-- ============================================================================

-- Drop old policies
DROP POLICY IF EXISTS policy_pm_subscriptions_select_own ON public.platform_subscriptions;
DROP POLICY IF EXISTS policy_pm_subscriptions_update_own ON public.platform_subscriptions;
DROP POLICY IF EXISTS policy_pm_subscriptions_insert_system ON public.platform_subscriptions;
DROP POLICY IF EXISTS policy_pm_subscriptions_admin_all ON public.platform_subscriptions;

-- Create new policies with updated names
CREATE POLICY policy_platform_subscriptions_select_own
    ON public.platform_subscriptions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY policy_platform_subscriptions_update_own
    ON public.platform_subscriptions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY policy_platform_subscriptions_insert_system
    ON public.platform_subscriptions FOR INSERT
    WITH CHECK (true);  -- Service role only

CREATE POLICY policy_platform_subscriptions_admin_all
    ON public.platform_subscriptions FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('System Admin', 'Subscription Manager')
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- ============================================================================
-- STEP 13: Update database_tables registry
-- ============================================================================

UPDATE database_tables
SET
    table_name = 'platform_subscriptions',
    table_description = 'Platform subscription management with billing and access control',
    updated_at = NOW()
WHERE table_name = 'pm_subscriptions';

-- Update description for user_platform_access
UPDATE database_tables
SET
    table_description = 'Tracks user registration and access patterns across Platform and Simulator',
    updated_at = NOW()
WHERE table_name = 'user_platform_access';

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

DO $$
DECLARE
    platform_subs_exists BOOLEAN;
    platform_access_exists BOOLEAN;
    account_links_exists BOOLEAN;
    old_table_exists BOOLEAN;
BEGIN
    -- Check new table exists
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'platform_subscriptions'
    ) INTO platform_subs_exists;

    -- Check old table doesn't exist
    SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'pm_subscriptions'
    ) INTO old_table_exists;

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

    IF platform_subs_exists AND platform_access_exists AND account_links_exists AND NOT old_table_exists THEN
        RAISE NOTICE '✓ All tables migrated successfully';
        RAISE NOTICE '  - platform_subscriptions: %', platform_subs_exists;
        RAISE NOTICE '  - user_platform_access: %', platform_access_exists;
        RAISE NOTICE '  - account_links: %', account_links_exists;
        RAISE NOTICE '  - pm_subscriptions removed: %', NOT old_table_exists;
    ELSE
        RAISE EXCEPTION 'Migration verification failed - Old: %, New: %', old_table_exists, platform_subs_exists;
    END IF;
END $$;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

COMMENT ON SCHEMA public IS 'Public schema with standardized Platform and Simulator terminology';

-- Final summary
DO $$
BEGIN
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Platform Terminology Standardization Migration v90 - COMPLETE';
    RAISE NOTICE '============================================================================';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '  ✓ pm_subscriptions → platform_subscriptions';
    RAISE NOTICE '  ✓ All indexes renamed';
    RAISE NOTICE '  ✓ All functions updated';
    RAISE NOTICE '  ✓ All RLS policies updated';
    RAISE NOTICE '  ✓ CHECK constraints updated (pm → platform)';
    RAISE NOTICE '  ✓ Existing data migrated';
    RAISE NOTICE '  ✓ Comments and documentation updated';
    RAISE NOTICE '';
    RAISE NOTICE 'Database Registry Updated:';
    RAISE NOTICE '  ✓ database_tables entries updated';
    RAISE NOTICE '';
    RAISE NOTICE 'Next Steps:';
    RAISE NOTICE '  1. Update application code:';
    RAISE NOTICE '     - Rename pmSubscriptionService.js → platformSubscriptionService.js';
    RAISE NOTICE '     - Update all references from pm_subscriptions to platform_subscriptions';
    RAISE NOTICE '     - Update platform identifiers from "pm" to "platform"';
    RAISE NOTICE '  2. Test all subscription functionality';
    RAISE NOTICE '  3. Update UI text and labels';
    RAISE NOTICE '  4. Update documentation';
    RAISE NOTICE '============================================================================';
END $$;
