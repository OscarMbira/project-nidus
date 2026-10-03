-- ================================================
-- File: v1168_fix_project_member_manage_permission_equivalence.sql
-- Description: Extend project_permission_matches() so project.manage_users also satisfies
--              user.change_role and user.remove checks, not just user.invite.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v579_project_invite_permission_memberships.sql (defines project_permission_matches)

-- Purpose:
-- apps/platform/src/pages/app/ProjectUsers.jsx's "Project members" page row actions (Edit role /
-- Remove member) are gated behind PermissionGate permission="user.change_role" and
-- permission="user.remove" respectively. project_roles.permissions for 'project_manager' and
-- 'team_manager' (v91 seed) only contains 'project.manage_users' — there is no literal
-- 'user.change_role'/'user.remove' entry. project_permission_matches() already treats
-- 'project.manage_users' as equivalent to 'user.invite' for exactly this reason, but the same
-- equivalence was never extended to 'user.change_role'/'user.remove' — so a Project Manager or
-- Team Manager viewing their own project's member list sees an empty Actions column: they can
-- invite members (the one covered case) but cannot edit a member's role or remove a member,
-- despite 'project.manage_users' conceptually covering all of member management, not just
-- invites. This migration closes that gap.

CREATE OR REPLACE FUNCTION public.project_permission_matches(
  p_role_permissions jsonb,
  p_permission_code varchar
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_role_permissions IS NULL OR jsonb_typeof(p_role_permissions) <> 'array' THEN FALSE
    WHEN p_permission_code IN ('user.invite', 'user.change_role', 'user.remove', 'project.manage_users') THEN
      p_role_permissions @> '["user.invite"]'::jsonb
      OR p_role_permissions @> '["user.change_role"]'::jsonb
      OR p_role_permissions @> '["user.remove"]'::jsonb
      OR p_role_permissions @> '["project.manage_users"]'::jsonb
    ELSE
      p_role_permissions @> jsonb_build_array(p_permission_code)
  END;
$$;

COMMENT ON FUNCTION public.project_permission_matches(jsonb, varchar) IS
  'True when project_roles.permissions JSONB array includes the code — user.invite, '
  'user.change_role, and user.remove are all treated as covered by project.manage_users (v1168), '
  'since that is the one broad "manage project members" permission project_roles templates grant.';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
  v_pm_can_change_role BOOLEAN;
  v_pm_can_remove BOOLEAN;
BEGIN
  SELECT public.project_permission_matches(permissions, 'user.change_role') INTO v_pm_can_change_role
  FROM public.project_roles WHERE role_name = 'project_manager' AND is_template = TRUE LIMIT 1;

  SELECT public.project_permission_matches(permissions, 'user.remove') INTO v_pm_can_remove
  FROM public.project_roles WHERE role_name = 'project_manager' AND is_template = TRUE LIMIT 1;

  RAISE NOTICE '================================================';
  RAISE NOTICE 'project_manager template now satisfies user.change_role: %', v_pm_can_change_role;
  RAISE NOTICE 'project_manager template now satisfies user.remove: %', v_pm_can_remove;
  RAISE NOTICE '================================================';
END $$;
