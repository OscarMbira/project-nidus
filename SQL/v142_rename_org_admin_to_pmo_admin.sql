-- Migration: Rename org_admin role to pmo_admin (Project Management Office Admin)
-- Version: v142
-- Date: 2025-12-19
-- Description: Renames the org_admin role to pmo_admin throughout the database

-- ============================================================================
-- BACKUP NOTICE
-- ============================================================================
-- Before running this migration, ensure you have backed up:
-- - roles table
-- - user_roles table
-- - menu_items table
-- - role_permissions table
-- ============================================================================

BEGIN;

-- Step 1: Update the role name in the roles table
UPDATE roles
SET role_name = 'pmo_admin',
    role_description = 'Project Management Office Administrator - Full access to organisation management and configuration',
    updated_at = NOW()
WHERE role_name = 'org_admin';

-- Step 2: Update menu items with org_admin in the path, code, or label
-- Note: role_menu_items uses role_id FK, so role relationships update automatically when role_name changes

UPDATE menu_items
SET route_path = REPLACE(route_path, 'organization-admin', 'pmo-admin'),
    updated_at = NOW()
WHERE route_path LIKE '%organization-admin%';

UPDATE menu_items
SET menu_code = REPLACE(menu_code, 'org_admin', 'pmo_admin'),
    updated_at = NOW()
WHERE menu_code LIKE '%org_admin%';

UPDATE menu_items
SET menu_label = REPLACE(menu_label, 'Organization Admin', 'PMO Admin'),
    updated_at = NOW()
WHERE menu_label LIKE '%Organization Admin%';

UPDATE menu_items
SET menu_label = REPLACE(menu_label, 'Organisation Admin', 'PMO Admin'),
    updated_at = NOW()
WHERE menu_label LIKE '%Organisation Admin%';

UPDATE menu_items
SET menu_label = REPLACE(menu_label, 'Org Admin', 'PMO Admin'),
    updated_at = NOW()
WHERE menu_label LIKE '%Org Admin%';

-- Step 4: Update role_permissions if they exist with org_admin references
-- (This assumes role_permissions uses role_id FK, so no update needed)
-- If role_name is used as a string, uncomment below:
-- UPDATE role_permissions
-- SET role_name = 'pmo_admin',
--     updated_at = NOW()
-- WHERE role_name = 'org_admin';

-- Step 5: Log the migration
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('migration_log', 'Tracks database migrations', true, true)
ON CONFLICT (table_name) DO NOTHING;

-- Create migration log table if it doesn't exist
CREATE TABLE IF NOT EXISTS migration_log (
    id BIGSERIAL PRIMARY KEY,
    version VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    executed_at TIMESTAMPTZ DEFAULT NOW(),
    executed_by TEXT DEFAULT current_user
);

-- Log this migration
INSERT INTO migration_log (version, description)
VALUES ('v142', 'Renamed org_admin role to pmo_admin (Project Management Office Admin)');

COMMIT;

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these queries after migration to verify success:

-- Check role was renamed
-- SELECT * FROM roles WHERE role_name = 'pmo_admin';

-- Check no org_admin roles remain
-- SELECT * FROM roles WHERE role_name = 'org_admin';

-- Check menu items updated
-- SELECT menu_code, menu_label, route_path 
-- FROM menu_items 
-- WHERE menu_code LIKE '%pmo_admin%' 
--    OR menu_label LIKE '%PMO Admin%' 
--    OR route_path LIKE '%pmo-admin%';

-- Check user roles (should show pmo_admin via role_id FK)
-- SELECT ur.*, r.role_name 
-- FROM user_roles ur 
-- JOIN roles r ON ur.role_id = r.id 
-- WHERE r.role_name = 'pmo_admin';

-- ============================================================================
-- ROLLBACK SCRIPT (Run in case of issues)
-- ============================================================================
/*
BEGIN;

UPDATE roles
SET role_name = 'org_admin',
    role_description = 'Organization Administrator - Full access to organisation management and configuration',
    updated_at = NOW()
WHERE role_name = 'pmo_admin';

UPDATE menu_items
SET route_path = REPLACE(route_path, 'pmo-admin', 'organization-admin'),
    updated_at = NOW()
WHERE route_path LIKE '%pmo-admin%';

UPDATE menu_items
SET menu_code = REPLACE(menu_code, 'pmo_admin', 'org_admin'),
    updated_at = NOW()
WHERE menu_code LIKE '%pmo_admin%';

UPDATE menu_items
SET menu_label = REPLACE(menu_label, 'PMO Admin', 'Organization Admin'),
    updated_at = NOW()
WHERE menu_label LIKE '%PMO Admin%';

DELETE FROM migration_log WHERE version = 'v142';

COMMIT;
*/
