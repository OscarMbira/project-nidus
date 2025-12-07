-- ============================================================================
-- Fix RLS Recursion Issue in pm_subscriptions
-- Version: v89
-- Description: Fixes infinite recursion error (42P17) in pm_subscriptions RLS policies
-- Author: Development Team
-- Date: 2025-11-27
-- ============================================================================

-- Prerequisites:
-- - v82_pm_subscriptions.sql

-- Purpose:
-- Fix the infinite recursion error in pm_subscriptions RLS policies
-- The admin policy references user_roles which might cause recursion

-- ============================================================================
-- FIX RLS POLICIES
-- ============================================================================

-- Drop existing admin policy that causes recursion
-- The admin policy references user_roles which can cause infinite recursion
DROP POLICY IF EXISTS policy_pm_subscriptions_admin_all ON public.pm_subscriptions;

-- Note: Admin operations should use service role (bypasses RLS)
-- The existing policies are sufficient:
-- - policy_pm_subscriptions_select_own: Users can view their own subscriptions
-- - policy_pm_subscriptions_update_own: Users can update their own subscriptions  
-- - policy_pm_subscriptions_insert_system: System can insert (service role)

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
    policies_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO policies_count
    FROM pg_policies
    WHERE schemaname = 'public'
    AND tablename = 'pm_subscriptions';

    RAISE NOTICE '========================================';
    RAISE NOTICE '✓ v89 PM Subscriptions RLS Fix';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Policies on pm_subscriptions: %', policies_count;
    RAISE NOTICE '';
    RAISE NOTICE 'Removed complex admin policy to prevent recursion';
    RAISE NOTICE 'Users can still access their own subscriptions';
    RAISE NOTICE 'Admin operations should use service role';
    RAISE NOTICE '========================================';
END $$;

