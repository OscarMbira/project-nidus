-- ============================================================================
-- v899: Fix legacy pm_* invitation role display names
-- ============================================================================
-- Problem: SQL/v580_ensure_pm_invitation_roles.sql seeded 'pm_quality_assurance'
-- and 'pm_change_authority' into public.roles with role_display_name values
-- that carry a stray " (PM)" suffix ('Quality Assurance (PM)', 'Change
-- Authority (PM)'). These rows exist only as an FK target for
-- project_invitations.role_id (see projectMembershipService.js
-- PROJECT_ROLE_TO_LEGACY_INVITATION_ROLE) — the actual project role a member
-- ends up with comes from public.project_roles, which already has the clean
-- name ('Change Authority', 'Quality Assurance').
--
-- The stray suffix leaked into user-facing UI wherever roles.role_display_name
-- is read directly: the SystemHeader role badge (fixed separately in
-- apps/*/src/services/roleService.js getUserSystemRoles by excluding
-- project-scoped user_roles rows) and the admin Role Assignment page
-- (apps/*/src/pages/admin/RoleAssignment.jsx), which reads public.roles
-- directly and has no such filter.
--
-- Fix: align the two display names with their already-correct siblings
-- ('pm_team_member' -> 'Team Member', 'pm_team_manager' -> 'Team Manager',
-- 'pm_project_assurance' -> 'Project Assurance' all have no suffix).
-- ============================================================================

UPDATE public.roles
SET role_display_name = 'Quality Assurance',
    updated_at = NOW()
WHERE role_name = 'pm_quality_assurance'
  AND role_display_name = 'Quality Assurance (PM)';

UPDATE public.roles
SET role_display_name = 'Change Authority',
    updated_at = NOW()
WHERE role_name = 'pm_change_authority'
  AND role_display_name = 'Change Authority (PM)';

DO $$
BEGIN
  RAISE NOTICE 'v899: pm_quality_assurance / pm_change_authority display names cleaned up';
END $$;
