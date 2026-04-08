-- EMERGENCY: Temporarily disable RLS to test if that's the issue
-- WARNING: This makes tables publicly readable - ONLY for testing!
-- Run this in Supabase SQL Editor

-- Disable RLS on lookup tables
ALTER TABLE project_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE project_statuses DISABLE ROW LEVEL SECURITY;
ALTER TABLE methodologies DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('project_types', 'project_statuses', 'methodologies');

-- Expected result: rowsecurity should be 'f' (false) for all 3 tables

-- IMPORTANT: After testing, re-enable RLS with:
-- ALTER TABLE project_types ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE project_statuses ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE methodologies ENABLE ROW LEVEL SECURITY;
