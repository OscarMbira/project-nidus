-- =============================================
-- v256d: Grant Permissions for Stakeholder Roles Table
-- Description: Fix permission denied error by granting table access
-- =============================================

-- Grant table permissions to authenticated and anon roles
GRANT SELECT ON stakeholder_roles TO authenticated;
GRANT SELECT ON stakeholder_roles TO anon;

-- Grant usage on the schema (if needed)
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- Make sure RLS is enabled
ALTER TABLE stakeholder_roles ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "stakeholder_roles_select_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_anon_select_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_admin_insert_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_admin_update_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_admin_delete_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_read_all" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_read_anon" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_admin_all" ON stakeholder_roles;

-- Create simple read policies
CREATE POLICY "Allow read access for all authenticated users"
    ON stakeholder_roles
    FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow read access for anon users"
    ON stakeholder_roles
    FOR SELECT
    TO anon
    USING (true);

-- Verify it works
SELECT 'Permissions granted. Found ' || COUNT(*) || ' roles.' as result FROM stakeholder_roles;
