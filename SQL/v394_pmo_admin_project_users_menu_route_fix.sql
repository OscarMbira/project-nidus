-- ============================================================================
-- Fix PMO Admin "Add users to project" menu route
-- Version: v394
-- Description: v393 used /app/project-users which was not registered as an
--              explicit route and redirected to /platform/project-users (no match).
--              Canonical URL is /platform/project-members (alias: /platform/project-users).
-- ============================================================================

UPDATE menu_items
SET
  route_path = '/platform/project-members',
  updated_at = NOW()
WHERE menu_code = 'pmo_admin_add_project_users'
  AND is_deleted = FALSE;
