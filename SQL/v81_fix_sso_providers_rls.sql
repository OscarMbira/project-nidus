-- =====================================================================================
-- Version: v81
-- Feature: Fix SSO Providers RLS Policy
-- Description: Allow unauthenticated users to read active SSO providers for login page
-- Author: Development Team
-- Date: 2025-01-XX
-- =====================================================================================

-- Prerequisites:
-- - v51_sso_integration.sql must be run first

-- =====================================================================================
-- Fix: Update RLS Policy for sso_providers
-- =====================================================================================

-- Drop ALL existing policies to start fresh (idempotent)
DROP POLICY IF EXISTS policy_sso_providers_admin_all ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_auth_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_public_read ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_authenticated_read ON sso_providers;

-- Recreate admin policy (for full admin access - INSERT, UPDATE, DELETE)
CREATE POLICY policy_sso_providers_admin_all
    ON sso_providers FOR ALL
    USING (EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id = auth.uid()
        AND r.role_name = 'System Admin'
        AND ur.is_deleted = false
        AND r.is_deleted = false
    ));

-- Create public read policy (allows unauthenticated/anonymous users to read active SSO providers)
-- This is necessary so users can see SSO options on the login page before authenticating
-- CRITICAL: This policy does NOT check auth.role() or auth.uid()
-- This allows Supabase's 'anon' role to access the table
-- The USING clause only checks the data conditions (is_active, is_deleted)
CREATE POLICY policy_sso_providers_public_read
    ON sso_providers FOR SELECT
    USING (is_active = true AND is_deleted = false);

-- =====================================================================================
-- Verification
-- =====================================================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'SSO Providers RLS Policy Fix Applied';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Policy policy_sso_providers_public_read created';
    RAISE NOTICE 'Policy policy_sso_providers_authenticated_read created';
    RAISE NOTICE 'Unauthenticated users can now read active SSO providers';
    RAISE NOTICE '================================================';
END $$;

