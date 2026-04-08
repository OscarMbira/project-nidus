-- URGENT FIX: RLS Policies for Lookup Tables
-- Copy and paste this ENTIRE file into Supabase SQL Editor and run it

-- Step 1: Drop ALL existing policies (clean slate)
DROP POLICY IF EXISTS "Allow authenticated users to read project types" ON project_types;
DROP POLICY IF EXISTS "Allow authenticated users to read project statuses" ON project_statuses;
DROP POLICY IF EXISTS "Allow authenticated users to read methodologies" ON methodologies;

DROP POLICY IF EXISTS "project_types_select" ON project_types;
DROP POLICY IF EXISTS "project_statuses_select" ON project_statuses;
DROP POLICY IF EXISTS "methodologies_select" ON methodologies;

DROP POLICY IF EXISTS "Enable read access for all users" ON project_types;
DROP POLICY IF EXISTS "Enable read access for all users" ON project_statuses;
DROP POLICY IF EXISTS "Enable read access for all users" ON methodologies;

-- Step 2: Make sure RLS is enabled
ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE methodologies ENABLE ROW LEVEL SECURITY;

-- Step 3: Create simple, permissive SELECT policies
CREATE POLICY "project_types_select_policy"
ON project_types
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "project_statuses_select_policy"
ON project_statuses
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "methodologies_select_policy"
ON methodologies
FOR SELECT
TO authenticated
USING (true);

-- Step 4: Verify policies were created
SELECT
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('project_types', 'project_statuses', 'methodologies')
ORDER BY tablename, policyname;

-- You should see 3 policies (one for each table)
