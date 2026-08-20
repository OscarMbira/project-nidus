-- ============================================================================
-- v910: System Role Catalog — system_admin editing of built-in roles
-- ============================================================================
-- See projectprd/v910_system_role_catalog_management_PRD.md and
-- projectplan/v910_system_role_catalog_management_plan.md.
--
-- Built-in roles (public.project_roles / public.roles with account_id IS NULL) are shared
-- reference data visible to every organisation — ManageRoles.jsx deliberately blocks org-level
-- admins (even PMO Admin) from editing them, and update_org_custom_role (v903) explicitly
-- rejects account_id IS NULL targets. This RPC is the mirror image: it edits ONLY built-in
-- roles, gated to system_admin/super_admin alone (not the 5-tier org-admin list
-- user_can_manage_org_roles uses), and never touches role_name (other code matches roles by
-- that internal slug). No deactivate/delete — see PRD out-of-scope.
-- Prerequisites: v902 (account_id columns), v906 (industry_category_id)
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_system_admin_user(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND lower(replace(r.role_name, ' ', '_')) IN ('system_admin', 'super_admin')
  );
$$;

COMMENT ON FUNCTION public.is_system_admin_user(UUID) IS
  'TRUE if the given internal user id holds system_admin or super_admin (v910) — the platform-'
  'operator tier, distinct from pmo_admin/org-scoped tiers which manage only their own org''s '
  'custom roles.';

GRANT EXECUTE ON FUNCTION public.is_system_admin_user(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.update_builtin_role(
  p_project_role_id      UUID,
  p_display_name         TEXT,
  p_description          TEXT,
  p_role_level           INTEGER,
  p_industry_category_id UUID,
  p_is_governance_only   BOOLEAN,
  p_add_menu_item_ids    UUID[] DEFAULT '{}'::UUID[],
  p_remove_menu_item_ids UUID[] DEFAULT '{}'::UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_pr             project_roles%ROWTYPE;
  v_role_id        UUID;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.is_system_admin_user(v_caller_user_id) THEN
    RAISE EXCEPTION 'Only system administrators can edit the built-in role catalog';
  END IF;

  SELECT * INTO v_pr FROM project_roles WHERE id = p_project_role_id;
  IF v_pr.id IS NULL OR v_pr.account_id IS NOT NULL THEN
    RAISE EXCEPTION 'Role not found or is not a built-in role';
  END IF;

  SELECT id INTO v_role_id FROM roles WHERE role_name = v_pr.role_name AND account_id IS NULL;

  UPDATE project_roles
  SET role_display_name    = COALESCE(NULLIF(trim(p_display_name), ''), role_display_name),
      role_description     = COALESCE(p_description, role_description),
      role_level           = COALESCE(p_role_level, role_level),
      industry_category_id = p_industry_category_id,
      is_governance_only   = COALESCE(p_is_governance_only, is_governance_only),
      updated_at           = NOW()
  WHERE id = p_project_role_id;

  IF v_role_id IS NOT NULL THEN
    UPDATE roles
    SET role_display_name    = COALESCE(NULLIF(trim(p_display_name), ''), role_display_name),
        role_description     = COALESCE(p_description, role_description),
        role_level           = COALESCE(p_role_level, role_level),
        industry_category_id = p_industry_category_id,
        updated_at           = NOW()
    WHERE id = v_role_id;

    IF p_remove_menu_item_ids IS NOT NULL AND array_length(p_remove_menu_item_ids, 1) > 0 THEN
      UPDATE role_menu_items
      SET is_active = FALSE, updated_at = NOW()
      WHERE role_id = v_role_id AND menu_item_id = ANY(p_remove_menu_item_ids);
    END IF;

    IF p_add_menu_item_ids IS NOT NULL AND array_length(p_add_menu_item_ids, 1) > 0 THEN
      INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
      SELECT v_role_id, mi, TRUE, TRUE, TRUE
      FROM unnest(p_add_menu_item_ids) AS mi
      ON CONFLICT (role_id, menu_item_id) DO UPDATE
      SET is_active = TRUE, can_view = TRUE, can_use = TRUE, updated_at = NOW();
    END IF;
  END IF;

  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.update_builtin_role(UUID, TEXT, TEXT, INTEGER, UUID, BOOLEAN, UUID[], UUID[]) IS
  'system_admin/super_admin-only edit of a built-in (account_id IS NULL) project_roles/roles '
  'pair — display name, description, level, industry, governance flag, and menu grants. '
  'role_name is never editable. Rejects any target with a non-null account_id (custom roles use '
  'update_org_custom_role instead). No deactivate/delete equivalent — edit only (v910).';

GRANT EXECUTE ON FUNCTION public.update_builtin_role(UUID, TEXT, TEXT, INTEGER, UUID, BOOLEAN, UUID[], UUID[]) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v910: is_system_admin_user + update_builtin_role RPCs installed';
END $$;
