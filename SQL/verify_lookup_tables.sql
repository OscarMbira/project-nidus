-- Verification Query: Check if lookup tables have data
-- Run this in Supabase SQL Editor to check if tables are populated

-- Check project_types
SELECT 'project_types' as table_name, COUNT(*) as total_rows, COUNT(*) FILTER (WHERE is_active = true AND is_deleted = false) as active_rows
FROM project_types
UNION ALL
-- Check project_statuses
SELECT 'project_statuses', COUNT(*), COUNT(*) FILTER (WHERE is_active = true AND is_deleted = false)
FROM project_statuses
UNION ALL
-- Check methodologies
SELECT 'methodologies', COUNT(*), COUNT(*) FILTER (WHERE is_active = true AND is_deleted = false)
FROM methodologies;

-- If any table shows 0 rows, you need to insert seed data
