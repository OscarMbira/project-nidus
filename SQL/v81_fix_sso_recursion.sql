-- =====================================================================================
-- Fix SSO Providers Infinite Recursion Error
-- The issue: Admin policy creates infinite recursion when checking user_roles
-- Solution: Simplify policies to avoid recursion
-- =====================================================================================

-- Step 1: Drop the problematic admin policy
DROP POLICY IF EXISTS policy_sso_providers_admin_all ON sso_providers;
DROP POLICY IF EXISTS policy_sso_providers_public_read ON sso_providers;

-- Step 2: Create a simple public read policy that works for EVERYONE
-- No user_roles check = no recursion
CREATE POLICY policy_sso_providers_select_all
    ON sso_providers
    FOR SELECT
    USING (is_active = true AND is_deleted = false);

-- Step 3: Create admin policies for INSERT, UPDATE, DELETE separately
-- We'll use a direct role check instead of joining tables to avoid recursion
CREATE POLICY policy_sso_providers_admin_insert
    ON sso_providers
    FOR INSERT
    TO authenticated
    WITH CHECK (
        -- Check if user has System Admin role using a simpler query
        auth.uid() IN (
            SELECT user_id
            FROM user_roles
            WHERE role_id IN (SELECT id FROM roles WHERE role_name = 'System Admin')
            AND is_deleted = false
        )
    );

CREATE POLICY policy_sso_providers_admin_update
    ON sso_providers
    FOR UPDATE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id
            FROM user_roles
            WHERE role_id IN (SELECT id FROM roles WHERE role_name = 'System Admin')
            AND is_deleted = false
        )
    );

CREATE POLICY policy_sso_providers_admin_delete
    ON sso_providers
    FOR DELETE
    TO authenticated
    USING (
        auth.uid() IN (
            SELECT user_id
            FROM user_roles
            WHERE role_id IN (SELECT id FROM roles WHERE role_name = 'System Admin')
            AND is_deleted = false
        )
    );

-- Verify
SELECT 'Policies Created: ' || COUNT(*)::TEXT AS result
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sso_providers';

SELECT policyname AS "Policy Name", cmd AS "Operation"
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'sso_providers'
ORDER BY policyname;
