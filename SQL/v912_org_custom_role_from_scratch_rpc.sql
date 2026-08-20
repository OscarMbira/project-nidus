-- ============================================================================
-- v912: Custom Roles — create from scratch (no clone-from-a-role requirement)
-- ============================================================================
-- Manage Roles' Custom Roles tab "Create Role" no longer requires cloning an existing
-- (built-in or custom) role — built-in roles are unchangeable reference data, so forcing a
-- clone step read as editing them by proxy. create_org_custom_role (v903) now supports BOTH
-- modes: pass p_clone_from_project_role_id to clone (unchanged existing behaviour, kept for any
-- future reuse) or omit it to build a role directly from p_role_level + p_menu_item_ids (the new
-- default the UI now uses).
-- Prerequisites: v902 (account_id columns), v903 (original create_org_custom_role)
-- ============================================================================

DROP FUNCTION IF EXISTS public.create_org_custom_role(UUID, TEXT, TEXT, UUID, BOOLEAN, UUID[]);

CREATE OR REPLACE FUNCTION public.create_org_custom_role(
  p_account_id                 UUID,
  p_display_name               TEXT,
  p_description                TEXT,
  p_clone_from_project_role_id UUID    DEFAULT NULL,
  p_is_governance_only         BOOLEAN DEFAULT FALSE,
  p_excluded_menu_item_ids     UUID[]  DEFAULT '{}'::UUID[],
  p_role_level                 INTEGER DEFAULT 4,
  p_menu_item_ids              UUID[]  DEFAULT '{}'::UUID[]
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
  v_role_level          INTEGER;
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

  IF p_clone_from_project_role_id IS NOT NULL THEN
    -- ── Clone mode (v903, unchanged) ──────────────────────────────────────────
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

    v_role_level := v_source_pr.role_level;

    INSERT INTO project_roles (
      project_id, role_name, role_display_name, role_description,
      is_system_default, is_template, role_level, permissions, is_active,
      account_id, is_governance_only
    ) VALUES (
      NULL, v_candidate_slug, trim(p_display_name), p_description,
      FALSE, TRUE, v_role_level, v_source_pr.permissions, TRUE,
      p_account_id, COALESCE(p_is_governance_only, FALSE)
    ) RETURNING id INTO v_new_project_role_id;

    INSERT INTO roles (
      role_name, role_display_name, role_description, role_level,
      is_system_role, is_default_role, is_active, account_id
    ) VALUES (
      v_candidate_slug, trim(p_display_name), p_description, v_role_level,
      FALSE, FALSE, TRUE, p_account_id
    ) RETURNING id INTO v_new_role_id;

    INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
    SELECT v_new_role_id, rmi.menu_item_id, rmi.can_view, rmi.can_use, TRUE
    FROM role_menu_items rmi
    WHERE rmi.role_id = v_source_role_id
      AND rmi.is_active = TRUE
      AND COALESCE(rmi.is_deleted, FALSE) = FALSE
      AND (p_excluded_menu_item_ids IS NULL OR NOT (rmi.menu_item_id = ANY(p_excluded_menu_item_ids)));
  ELSE
    -- ── From-scratch mode (v912) ──────────────────────────────────────────────
    v_role_level := COALESCE(p_role_level, 4);
    IF v_role_level < 1 THEN
      RAISE EXCEPTION 'Level must be at least 1';
    END IF;

    INSERT INTO project_roles (
      project_id, role_name, role_display_name, role_description,
      is_system_default, is_template, role_level, permissions, is_active,
      account_id, is_governance_only
    ) VALUES (
      NULL, v_candidate_slug, trim(p_display_name), p_description,
      FALSE, TRUE, v_role_level, '[]'::jsonb, TRUE,
      p_account_id, COALESCE(p_is_governance_only, FALSE)
    ) RETURNING id INTO v_new_project_role_id;

    INSERT INTO roles (
      role_name, role_display_name, role_description, role_level,
      is_system_role, is_default_role, is_active, account_id
    ) VALUES (
      v_candidate_slug, trim(p_display_name), p_description, v_role_level,
      FALSE, FALSE, TRUE, p_account_id
    ) RETURNING id INTO v_new_role_id;

    IF p_menu_item_ids IS NOT NULL AND array_length(p_menu_item_ids, 1) > 0 THEN
      INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
      SELECT v_new_role_id, mi, TRUE, TRUE, TRUE
      FROM unnest(p_menu_item_ids) AS mi;
    END IF;
  END IF;

  RETURN QUERY SELECT v_new_project_role_id, v_new_role_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_org_custom_role(UUID, TEXT, TEXT, UUID, BOOLEAN, UUID[], INTEGER, UUID[]) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v912: create_org_custom_role now supports from-scratch creation (no clone required)';
END $$;
