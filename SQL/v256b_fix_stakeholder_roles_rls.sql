-- =============================================
-- v256b: Fix Stakeholder Roles RLS and Data
-- Description: Fix RLS policy to handle NULL values and ensure data is accessible
-- =============================================

-- First, update any NULL is_deleted values to false
UPDATE stakeholder_roles SET is_deleted = false WHERE is_deleted IS NULL;

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "stakeholder_roles_select_policy" ON stakeholder_roles;

-- Create a more permissive SELECT policy that handles NULL values
CREATE POLICY "stakeholder_roles_select_policy" ON stakeholder_roles
    FOR SELECT
    TO authenticated
    USING (
        (is_deleted IS NULL OR is_deleted = false)
        AND (is_active IS NULL OR is_active = true)
    );

-- Also add a policy for anon users (in case they need to see roles on public pages)
DROP POLICY IF EXISTS "stakeholder_roles_anon_select_policy" ON stakeholder_roles;
CREATE POLICY "stakeholder_roles_anon_select_policy" ON stakeholder_roles
    FOR SELECT
    TO anon
    USING (
        (is_deleted IS NULL OR is_deleted = false)
        AND (is_active IS NULL OR is_active = true)
    );

-- Verify the data exists and is properly set
SELECT COUNT(*) as total_roles,
       COUNT(*) FILTER (WHERE is_active = true) as active_roles,
       COUNT(*) FILTER (WHERE is_deleted = false OR is_deleted IS NULL) as not_deleted
FROM stakeholder_roles;
