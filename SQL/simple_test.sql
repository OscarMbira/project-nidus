-- Simplest possible test - just select everything
-- Run this in Supabase SQL Editor

SELECT * FROM project_types LIMIT 5;
SELECT * FROM project_statuses LIMIT 5;
SELECT * FROM methodologies LIMIT 5;

-- This will show you:
-- 1. If tables are accessible (RLS check)
-- 2. What columns actually exist
-- 3. What data is in the tables
