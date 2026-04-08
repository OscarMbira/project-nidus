-- Check actual column names in lookup tables
-- Run this to see the exact column structure

-- Project Types columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_types'
ORDER BY ordinal_position;

-- Project Statuses columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'project_statuses'
ORDER BY ordinal_position;

-- Methodologies columns
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'methodologies'
ORDER BY ordinal_position;
