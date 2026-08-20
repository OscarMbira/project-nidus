-- ============================================================================
-- v908: get_assignable_project_roles — level-based role-assignment restriction (Phase 3 of 4)
-- ============================================================================
-- Centralizes role-list resolution for every role-picker surface (Assign Roles,
-- invitations, bulk invite, edit member role) behind one function, replacing the
-- 4+ separate duplicated queries found during investigation (orgAdminService.
-- getProjectRoles, pmoAdminService.getAssignableRolesForPMOAdmin,
-- bulkRoleService.fetchAvailableRoles, RoleAssignment.jsx's own source).
--
-- IMPORTANT — role_level is NOT one unified scale: public.roles uses a 5-100
-- "org tier" scale (system_admin=100, pmo_admin=80, project_manager=60, ...),
-- while public.project_roles uses a 4-12 "project tier" scale (project_manager=9,
-- team_manager=8, ...). The SAME role_name ('project_manager') appears in both
-- tables with DIFFERENT role_level values on DIFFERENT scales. This restriction
-- therefore operates entirely within the project_roles 4-12 scale:
--   - Org-wide admin tiers (pmo_admin/system_admin/super_admin/account_owner/
--     org_admin — same list as user_can_manage_org_roles in v903) bypass the
--     restriction entirely (see decision 4 in the v906 PRD — this is the
--     explicit bypass that reasoning assumed would fall out "naturally"; it
--     does not, because of the scale mismatch, so it is implemented directly).
--   - Everyone else is capped at the highest project_roles.role_level across
--     their own active project_memberships (scoped to p_project_id when given,
--     else the highest across all their projects).
-- Prerequisites: v902 (account_id columns), v906/v907 (industry_category_id,
-- new role catalog)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_assignable_project_roles(
  p_account_id UUID,
  p_project_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  role_name VARCHAR,
  role_display_name VARCHAR,
  role_description TEXT,
  role_level INTEGER,
  industry_category_id UUID,
  is_governance_only BOOLEAN,
  account_id UUID
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_is_org_admin BOOLEAN;
  v_max_level INTEGER;
BEGIN
  IF p_account_id IS NULL OR auth.uid() IS NULL THEN
    RETURN;
  END IF;

  SELECT u.id INTO v_user_id FROM users u WHERE u.auth_user_id = auth.uid();
  IF v_user_id IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_user_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND lower(replace(r.role_name, ' ', '_')) IN
        ('pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner')
  ) INTO v_is_org_admin;

  IF v_is_org_admin THEN
    v_max_level := 999;
  ELSE
    SELECT COALESCE(MAX(pr.role_level), 0) INTO v_max_level
    FROM project_memberships pm
    JOIN project_roles pr ON pr.id = pm.project_role_id
    WHERE pm.user_id = v_user_id
      AND pm.is_active = TRUE
      AND (p_project_id IS NULL OR pm.project_id = p_project_id);
  END IF;

  RETURN QUERY
  SELECT pr.id, pr.role_name, pr.role_display_name, pr.role_description, pr.role_level,
         pr.industry_category_id, pr.is_governance_only, pr.account_id
  FROM project_roles pr
  WHERE pr.is_template = TRUE
    AND pr.is_active = TRUE
    AND (pr.account_id IS NULL OR pr.account_id = p_account_id)
    AND pr.role_level <= v_max_level
  ORDER BY pr.role_level DESC, pr.role_display_name;
END;
$$;

COMMENT ON FUNCTION public.get_assignable_project_roles(UUID, UUID) IS
  'Returns built-in + this org''s custom project_roles templates the caller is allowed to '
  'assign to someone else, capped at their own highest project-tier role_level (v906/v908). '
  'Org-wide admin tiers (pmo_admin/system_admin/super_admin/account_owner/org_admin) see the '
  'full catalog. Pass p_project_id to scope the cap to one project; omit for the caller''s '
  'highest level across all their projects.';

GRANT EXECUTE ON FUNCTION public.get_assignable_project_roles(UUID, UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v908: get_assignable_project_roles RPC installed';
END $$;
