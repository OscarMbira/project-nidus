-- =============================================
-- v256c: Simple Fix for Stakeholder Roles RLS
-- Description: Drop and recreate RLS policies with simpler conditions
-- =============================================

-- Drop ALL existing policies on this table
DROP POLICY IF EXISTS "stakeholder_roles_select_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_anon_select_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_admin_insert_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_admin_update_policy" ON stakeholder_roles;
DROP POLICY IF EXISTS "stakeholder_roles_admin_delete_policy" ON stakeholder_roles;

-- Create a simple SELECT policy - allow ALL authenticated users to read
CREATE POLICY "stakeholder_roles_read_all" ON stakeholder_roles
    FOR SELECT
    TO authenticated
    USING (true);

-- Also allow anon users to read (for public access if needed)
CREATE POLICY "stakeholder_roles_read_anon" ON stakeholder_roles
    FOR SELECT
    TO anon
    USING (true);

-- Allow admins to insert/update/delete
CREATE POLICY "stakeholder_roles_admin_all" ON stakeholder_roles
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('super_admin', 'pmo_admin', 'org_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('super_admin', 'pmo_admin', 'org_admin')
        )
    );

-- Verify RLS is enabled
ALTER TABLE stakeholder_roles ENABLE ROW LEVEL SECURITY;

-- Test query (should return data)
SELECT 'RLS policies updated. Table has ' || COUNT(*) || ' roles.' as status FROM stakeholder_roles;
