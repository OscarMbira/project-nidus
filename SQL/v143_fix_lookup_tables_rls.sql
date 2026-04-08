/**
 * Fix RLS Policies for Lookup/Reference Tables
 *
 * Issue: Lookup tables (project_types, project_statuses, methodologies) have
 * RLS enabled but no read policies, causing "permission denied" errors.
 *
 * Solution: Add SELECT policies for authenticated users to read these reference tables.
 * These are lookup tables that should be readable by all authenticated users.
 */

-- Enable RLS on lookup tables (if not already enabled)
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE methodologies ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to allow recreation)
DROP POLICY IF EXISTS "Allow authenticated users to read project types" ON project_types;
DROP POLICY IF EXISTS "Allow authenticated users to read project statuses" ON project_statuses;
DROP POLICY IF EXISTS "Allow authenticated users to read methodologies" ON methodologies;

-- ============================================================================
-- PROJECT TYPES - Allow all authenticated users to read
-- ============================================================================
CREATE POLICY "Allow authenticated users to read project types"
ON project_types
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- PROJECT STATUSES - Allow all authenticated users to read
-- ============================================================================
CREATE POLICY "Allow authenticated users to read project statuses"
ON project_statuses
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- METHODOLOGIES - Allow all authenticated users to read
-- ============================================================================
CREATE POLICY "Allow authenticated users to read methodologies"
ON methodologies
FOR SELECT
TO authenticated
USING (true);

-- ============================================================================
-- Verification Queries
-- ============================================================================
-- Run these to verify policies are working:

-- Check RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('project_types', 'project_statuses', 'methodologies');

-- Check policies exist
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('project_types', 'project_statuses', 'methodologies')
ORDER BY tablename, policyname;

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON POLICY "Allow authenticated users to read project types" ON project_types IS
'Lookup table - all authenticated users need read access to populate dropdowns';

COMMENT ON POLICY "Allow authenticated users to read project statuses" ON project_statuses IS
'Lookup table - all authenticated users need read access to populate dropdowns';

COMMENT ON POLICY "Allow authenticated users to read methodologies" ON methodologies IS
'Lookup table - all authenticated users need read access to populate dropdowns';
