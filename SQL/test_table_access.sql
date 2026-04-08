-- Test if authenticated users can access lookup tables
-- Run this in Supabase SQL Editor while logged in as a regular user (not service role)

-- Test 1: Can we select from project_types?
SELECT id, type_name FROM project_types WHERE is_active = true AND is_deleted = false LIMIT 1;

-- Test 2: Can we select from project_statuses?
SELECT id, status_name FROM project_statuses WHERE is_active = true AND is_deleted = false LIMIT 1;

-- Test 3: Can we select from methodologies?
SELECT id, methodology_name FROM methodologies WHERE is_active = true AND is_deleted = false LIMIT 1;

-- Test 4: Check what columns actually exist
SELECT column_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('project_types', 'project_statuses', 'methodologies')
ORDER BY table_name, ordinal_position;

-- Test 5: Verify RLS policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('project_types', 'project_statuses', 'methodologies');
