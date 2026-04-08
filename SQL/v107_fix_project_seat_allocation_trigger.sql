-- =====================================================================================
-- Fix project seat allocation trigger to use platform_subscriptions
-- Version: v107
-- Description: Updates initialize_project_seat_allocation() function to reference
--              platform_subscriptions instead of pm_subscriptions
-- =====================================================================================

-- The table was renamed from pm_subscriptions to platform_subscriptions in v90,
-- but the trigger function still references the old table name

-- =====================================================================================
-- STEP 1: Update the trigger function
-- =====================================================================================

CREATE OR REPLACE FUNCTION initialize_project_seat_allocation()
RETURNS TRIGGER AS $$
DECLARE
    v_base_seats INTEGER;
    v_subscription_id UUID;
BEGIN
    -- Only initialize if account_id is set
    IF NEW.account_id IS NOT NULL THEN
        -- Get base seats from account subscription
        -- Updated to use platform_subscriptions instead of pm_subscriptions
        SELECT id, base_users_per_project
        INTO v_subscription_id, v_base_seats
        FROM platform_subscriptions
        WHERE account_id = NEW.account_id
        AND status IN ('active', 'trialing')
        ORDER BY created_at DESC
        LIMIT 1;

        -- Default to 30 if no subscription found
        v_base_seats := COALESCE(v_base_seats, 30);

        -- Create seat allocation record
        INSERT INTO project_seat_allocations (
            project_id,
            account_id,
            subscription_id,
            included_seats,
            extra_seats_purchased,
            current_user_count
        )
        VALUES (
            NEW.id,
            NEW.account_id,
            v_subscription_id,
            v_base_seats,
            0,
            0
        )
        ON CONFLICT (project_id) DO NOTHING;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION initialize_project_seat_allocation() IS 'Auto-creates seat allocation when project is created. Updated to use platform_subscriptions table. Uses SECURITY DEFINER to bypass RLS when reading subscription data.';

-- =====================================================================================
-- STEP 2: Update get_user_platforms function
-- =====================================================================================

-- This function was created in v87 but still references pm_subscriptions
-- It needs to be updated to use platform_subscriptions

CREATE OR REPLACE FUNCTION get_user_platforms(p_auth_user_id UUID)
RETURNS TABLE (
    platform VARCHAR,
    has_registered BOOLEAN,
    has_active_subscription BOOLEAN,
    subscription_tier VARCHAR,
    last_access_at TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        upa.platform,
        upa.has_registered,
        CASE
            WHEN upa.platform = 'platform' OR upa.platform = 'pm' THEN
                EXISTS (
                    SELECT 1 FROM platform_subscriptions ps
                    WHERE ps.user_id = p_auth_user_id
                    AND ps.status IN ('active', 'trialing')
                )
            WHEN upa.platform = 'simulator' THEN
                EXISTS (
                    SELECT 1 FROM sim.simulator_subscriptions ss
                    WHERE ss.user_id = p_auth_user_id
                    AND ss.status IN ('active', 'trialing')
                )
            ELSE FALSE
        END as has_active_subscription,
        CASE
            WHEN upa.platform = 'platform' OR upa.platform = 'pm' THEN
                (SELECT plan_type FROM platform_subscriptions WHERE user_id = p_auth_user_id ORDER BY created_at DESC LIMIT 1)
            WHEN upa.platform = 'simulator' THEN
                (SELECT plan_type FROM sim.simulator_subscriptions WHERE user_id = p_auth_user_id ORDER BY created_at DESC LIMIT 1)
            ELSE NULL
        END as subscription_tier,
        upa.last_access_at
    FROM user_platform_access upa
    WHERE upa.user_id = p_auth_user_id
    AND upa.has_registered = TRUE
    ORDER BY upa.is_primary_platform DESC, upa.last_access_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_platforms(UUID) IS 'Returns platforms user has access to with subscription status. Updated to use platform_subscriptions table.';

-- =====================================================================================
-- STEP 3: Add RLS policy for account-based subscription access
-- =====================================================================================

-- Add a policy that allows account members to read subscriptions for their account
-- This is useful for account-based operations, even though the trigger function
-- uses SECURITY DEFINER to bypass RLS

DROP POLICY IF EXISTS policy_platform_subscriptions_account_read ON public.platform_subscriptions;

CREATE POLICY policy_platform_subscriptions_account_read
    ON public.platform_subscriptions FOR SELECT
    USING (
        -- Account owners can read their account's subscription
        EXISTS (
            SELECT 1 FROM accounts a
            INNER JOIN users u ON u.id = a.owner_user_id
            WHERE a.id = platform_subscriptions.account_id
            AND u.auth_user_id = auth.uid()
            AND a.is_deleted = FALSE
        )
        OR
        -- Account members can read their account's subscription
        EXISTS (
            SELECT 1 FROM accounts a
            INNER JOIN projects p ON p.account_id = a.id
            INNER JOIN project_memberships pm ON pm.project_id = p.id
            INNER JOIN users u ON u.id = pm.user_id
            WHERE a.id = platform_subscriptions.account_id
            AND u.auth_user_id = auth.uid()
            AND pm.is_active = TRUE
            AND p.is_deleted = FALSE
            AND a.is_deleted = FALSE
        )
    );

COMMENT ON POLICY policy_platform_subscriptions_account_read ON public.platform_subscriptions IS 
    'Allows account owners and members to read subscriptions for their account';

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
DECLARE
    v_function_exists BOOLEAN;
    v_trigger_exists BOOLEAN;
BEGIN
    -- Check if function exists
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND p.proname = 'initialize_project_seat_allocation'
    ) INTO v_function_exists;

    -- Check if trigger exists
    SELECT EXISTS (
        SELECT 1 FROM pg_trigger t
        JOIN pg_class c ON t.tgrelid = c.oid
        JOIN pg_namespace n ON c.relnamespace = n.oid
        WHERE n.nspname = 'public'
        AND c.relname = 'projects'
        AND t.tgname = 'trg_projects_init_seat_allocation'
    ) INTO v_trigger_exists;

    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ TRIGGER FUNCTION UPDATED';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Function exists: %', v_function_exists;
    RAISE NOTICE 'Trigger exists: %', v_trigger_exists;
    RAISE NOTICE '';
    RAISE NOTICE 'Updated functions:';
    RAISE NOTICE '  - initialize_project_seat_allocation()';
    RAISE NOTICE '  - get_user_platforms()';
    RAISE NOTICE '';
    RAISE NOTICE 'Both functions now reference platform_subscriptions instead of pm_subscriptions.';
    RAISE NOTICE '';

    IF v_function_exists AND v_trigger_exists THEN
        RAISE NOTICE '🎉 All functions have been updated successfully!';
    ELSE
        RAISE WARNING 'Function or trigger may be missing. Please check manually.';
    END IF;

    RAISE NOTICE '';
END $$;

