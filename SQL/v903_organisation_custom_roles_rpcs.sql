-- ============================================================================
-- v903: Organisation Custom Roles — RPCs (Phase 2 of 3)
-- ============================================================================
-- SECURITY DEFINER functions for the "Manage Roles" feature (v902 PRD/plan).
-- All authorization is re-derived server-side from auth.uid() — never trust a
-- client-supplied "creator" or "account" id without checking it (rule 42: do
-- not bypass RLS as a workaround — these RPCs are the only write path into
-- roles/project_roles/role_menu_items for non-built-in rows; direct table
-- writes stay RLS-restricted).
-- Prerequisites: v902_organisation_custom_roles_schema.sql
-- ============================================================================

-- ── Helper: role-name slugifier ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.slugify_role_name(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT trim(both '_' FROM regexp_replace(lower(trim(p_text)), '[^a-z0-9]+', '_', 'g'));
$$;

-- ── Helper: can this user manage custom roles for this organisation? ───────
-- Qualifies via: (a) owns the account AND holds the system-level pmo_admin
-- tier (or legacy org_admin/system_admin/super_admin aliases — matches
-- PMO_SUITE_ADMIN_ROLE_NAMES in apps/*/src/services/pmoSuiteRoleAccess.js), or
-- (b) holds portfolio_manager/programme_manager/project_manager/team_manager
-- on any active, non-deleted project that belongs to this account.

CREATE OR REPLACE FUNCTION public.user_can_manage_org_roles(p_user_id UUID, p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owns_account            BOOLEAN;
  v_is_pmo_admin            BOOLEAN;
  v_is_project_manager_tier BOOLEAN;
BEGIN
  IF p_user_id IS NULL OR p_account_id IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM accounts
    WHERE id = p_account_id AND owner_user_id = p_user_id AND is_deleted = FALSE
  ) INTO v_owns_account;

  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN roles r ON r.id = ur.role_id
    WHERE ur.user_id = p_user_id
      AND ur.is_active = TRUE
      AND ur.project_id IS NULL
      AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
  ) INTO v_is_pmo_admin;

  IF v_owns_account AND v_is_pmo_admin THEN
    RETURN TRUE;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM project_memberships pm
    JOIN projects pr       ON pr.id = pm.project_id
    JOIN project_roles prl ON prl.id = pm.project_role_id
    WHERE pm.user_id   = p_user_id
      AND pm.is_active = TRUE
      AND pr.account_id = p_account_id
      AND pr.is_deleted = FALSE
      AND lower(replace(prl.role_name, ' ', '_')) IN
        ('portfolio_manager', 'programme_manager', 'project_manager', 'team_manager')
  ) INTO v_is_project_manager_tier;

  RETURN COALESCE(v_is_project_manager_tier, FALSE);
END;
$$;

GRANT EXECUTE ON FUNCTION public.user_can_manage_org_roles(UUID, UUID) TO authenticated;

-- ── create_org_custom_role ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_org_custom_role(
  p_account_id                 UUID,
  p_display_name               TEXT,
  p_description                TEXT,
  p_clone_from_project_role_id UUID,
  p_is_governance_only         BOOLEAN DEFAULT FALSE,
  p_excluded_menu_item_ids     UUID[]  DEFAULT '{}'::UUID[]
)
RETURNS TABLE(project_role_id UUID, role_id UUID)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id      UUID;
  v_source_pr           project_roles%ROWTYPE;
  v_source_role_id      UUID;
  v_base_slug           TEXT;
  v_candidate_slug      TEXT;
  v_suffix              INT := 1;
  v_new_project_role_id UUID;
  v_new_role_id         UUID;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_org_roles(v_caller_user_id, p_account_id) THEN
    RAISE EXCEPTION 'You do not have permission to create roles for this organisation';
  END IF;

  IF p_display_name IS NULL OR trim(p_display_name) = '' THEN
    RAISE EXCEPTION 'Role name is required';
  END IF;

  SELECT * INTO v_source_pr
  FROM project_roles
  WHERE id = p_clone_from_project_role_id
    AND is_active = TRUE
    AND (account_id IS NULL OR account_id = p_account_id);

  IF v_source_pr.id IS NULL THEN
    RAISE EXCEPTION 'Clone source role not found or not available to this organisation';
  END IF;

  SELECT id INTO v_source_role_id
  FROM roles
  WHERE role_name = v_source_pr.role_name
    AND (account_id IS NULL OR account_id = p_account_id)
    AND is_active = TRUE
  LIMIT 1;

  IF v_source_role_id IS NULL THEN
    RAISE EXCEPTION 'Clone source role has no matching menu-access definition — cannot clone';
  END IF;

  v_base_slug := public.slugify_role_name(p_display_name);
  IF v_base_slug = '' THEN
    RAISE EXCEPTION 'Role name must contain at least one letter or number';
  END IF;

  v_candidate_slug := v_base_slug;
  WHILE EXISTS (
    SELECT 1 FROM project_roles WHERE role_name = v_candidate_slug AND account_id = p_account_id
    UNION ALL
    SELECT 1 FROM roles WHERE role_name = v_candidate_slug AND account_id = p_account_id
  ) LOOP
    v_suffix := v_suffix + 1;
    v_candidate_slug := v_base_slug || '_' || v_suffix;
  END LOOP;

  INSERT INTO project_roles (
    project_id, role_name, role_display_name, role_description,
    is_system_default, is_template, role_level, permissions, is_active,
    account_id, is_governance_only
  ) VALUES (
    NULL, v_candidate_slug, trim(p_display_name), p_description,
    FALSE, TRUE, v_source_pr.role_level, v_source_pr.permissions, TRUE,
    p_account_id, COALESCE(p_is_governance_only, FALSE)
  ) RETURNING id INTO v_new_project_role_id;

  INSERT INTO roles (
    role_name, role_display_name, role_description, role_level,
    is_system_role, is_default_role, is_active, account_id
  ) VALUES (
    v_candidate_slug, trim(p_display_name), p_description, v_source_pr.role_level,
    FALSE, FALSE, TRUE, p_account_id
  ) RETURNING id INTO v_new_role_id;

  INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
  SELECT v_new_role_id, rmi.menu_item_id, rmi.can_view, rmi.can_use, TRUE
  FROM role_menu_items rmi
  WHERE rmi.role_id = v_source_role_id
    AND rmi.is_active = TRUE
    AND COALESCE(rmi.is_deleted, FALSE) = FALSE
    AND (p_excluded_menu_item_ids IS NULL OR NOT (rmi.menu_item_id = ANY(p_excluded_menu_item_ids)));

  RETURN QUERY SELECT v_new_project_role_id, v_new_role_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_org_custom_role(UUID, TEXT, TEXT, UUID, BOOLEAN, UUID[]) TO authenticated;

-- ── update_org_custom_role ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.update_org_custom_role(
  p_project_role_id      UUID,
  p_display_name         TEXT,
  p_description          TEXT,
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

  SELECT * INTO v_pr FROM project_roles WHERE id = p_project_role_id;
  IF v_pr.id IS NULL OR v_pr.account_id IS NULL THEN
    RAISE EXCEPTION 'Role not found or is a built-in role (not editable)';
  END IF;

  IF NOT public.user_can_manage_org_roles(v_caller_user_id, v_pr.account_id) THEN
    RAISE EXCEPTION 'You do not have permission to edit roles for this organisation';
  END IF;

  SELECT id INTO v_role_id FROM roles WHERE role_name = v_pr.role_name AND account_id = v_pr.account_id;

  UPDATE project_roles
  SET role_display_name  = COALESCE(NULLIF(trim(p_display_name), ''), role_display_name),
      role_description   = COALESCE(p_description, role_description),
      is_governance_only = COALESCE(p_is_governance_only, is_governance_only),
      updated_at         = NOW()
  WHERE id = p_project_role_id;

  IF v_role_id IS NOT NULL THEN
    UPDATE roles
    SET role_display_name = COALESCE(NULLIF(trim(p_display_name), ''), role_display_name),
        role_description  = COALESCE(p_description, role_description),
        updated_at        = NOW()
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

GRANT EXECUTE ON FUNCTION public.update_org_custom_role(UUID, TEXT, TEXT, BOOLEAN, UUID[], UUID[]) TO authenticated;

-- ── deactivate_org_custom_role ───────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.deactivate_org_custom_role(p_project_role_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_pr             project_roles%ROWTYPE;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_pr FROM project_roles WHERE id = p_project_role_id;
  IF v_pr.id IS NULL OR v_pr.account_id IS NULL THEN
    RAISE EXCEPTION 'Role not found or is a built-in role (not editable)';
  END IF;

  IF NOT public.user_can_manage_org_roles(v_caller_user_id, v_pr.account_id) THEN
    RAISE EXCEPTION 'You do not have permission to deactivate roles for this organisation';
  END IF;

  UPDATE project_roles SET is_active = FALSE, updated_at = NOW() WHERE id = p_project_role_id;
  UPDATE roles SET is_active = FALSE, updated_at = NOW()
  WHERE role_name = v_pr.role_name AND account_id = v_pr.account_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.deactivate_org_custom_role(UUID) TO authenticated;

-- ── delete_org_custom_role ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.delete_org_custom_role(p_project_role_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id    UUID;
  v_pr                project_roles%ROWTYPE;
  v_role_id           UUID;
  v_membership_count  INT;
  v_user_roles_count  INT;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_pr FROM project_roles WHERE id = p_project_role_id;
  IF v_pr.id IS NULL OR v_pr.account_id IS NULL THEN
    RAISE EXCEPTION 'Role not found or is a built-in role (not deletable)';
  END IF;

  IF NOT public.user_can_manage_org_roles(v_caller_user_id, v_pr.account_id) THEN
    RAISE EXCEPTION 'You do not have permission to delete roles for this organisation';
  END IF;

  SELECT id INTO v_role_id FROM roles WHERE role_name = v_pr.role_name AND account_id = v_pr.account_id;

  SELECT COUNT(*) INTO v_membership_count
  FROM project_memberships WHERE project_role_id = p_project_role_id AND is_active = TRUE;

  SELECT COUNT(*) INTO v_user_roles_count
  FROM user_roles WHERE role_id = v_role_id AND is_active = TRUE AND is_deleted = FALSE;

  IF (v_membership_count + v_user_roles_count) > 0 THEN
    RAISE EXCEPTION 'Cannot delete: role is currently assigned to % member(s). Reassign them or deactivate the role instead.',
      (v_membership_count + v_user_roles_count);
  END IF;

  DELETE FROM role_menu_items WHERE role_id = v_role_id;
  DELETE FROM project_roles WHERE id = p_project_role_id;
  IF v_role_id IS NOT NULL THEN
    DELETE FROM roles WHERE id = v_role_id;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_org_custom_role(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v903: create/update/deactivate/delete_org_custom_role RPCs installed';
END $$;
