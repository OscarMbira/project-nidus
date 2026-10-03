-- ============================================================================
-- v1110: Make Required Skills mandatory on every project_roles capture path
-- ============================================================================
-- projectplan/v1105_project_roles_from_role_library_plan.md Phase 0.
-- Adds p_role_skills to create_org_custom_role (v912 8-arg), update_org_custom_role
-- (v903 6-arg) and update_builtin_role (v910 8-arg). Each function now REJECTS a
-- blank final skills value — the UI enforces the same rule (rule 62/63.1 style
-- "no silent gap"), this is the server-side guarantee CLAUDE.md rule 65's data-
-- integrity spirit asks for so no future caller (script, import, other UI) can
-- create/keep a role with no skills.
--
-- Also adds fill_org_custom_role_skills_if_blank(): used by "Add from Built-in
-- Roles" (v1105) to save an edited skills value back onto an organisation's OWN
-- custom role when that role's skills are currently blank — never touches a
-- built-in role or another organisation's role (RLS-equivalent guard done in
-- plpgsql since project_roles has no client UPDATE policy at all, per v99/v100).
--
-- Prerequisites: v912 (create_org_custom_role), v903 (update_org_custom_role),
-- v910 (update_builtin_role), v1108 (role_skills column).
-- ============================================================================

-- ── 1. create_org_custom_role — add p_role_skills, require non-blank ────────

DROP FUNCTION IF EXISTS public.create_org_custom_role(UUID, TEXT, TEXT, UUID, BOOLEAN, UUID[], INTEGER, UUID[]);

CREATE OR REPLACE FUNCTION public.create_org_custom_role(
  p_account_id                 UUID,
  p_display_name               TEXT,
  p_description                TEXT,
  p_clone_from_project_role_id UUID    DEFAULT NULL,
  p_is_governance_only         BOOLEAN DEFAULT FALSE,
  p_excluded_menu_item_ids     UUID[]  DEFAULT '{}'::UUID[],
  p_role_level                 INTEGER DEFAULT 4,
  p_menu_item_ids               UUID[]  DEFAULT '{}'::UUID[],
  p_role_skills                TEXT    DEFAULT NULL
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
  v_role_skills         TEXT;
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

  v_role_skills := NULLIF(btrim(p_role_skills), '');

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

    -- Cloning without typing new skills inherits the source role's skills.
    IF v_role_skills IS NULL THEN
      v_role_skills := NULLIF(btrim(v_source_pr.role_skills), '');
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

    IF v_role_skills IS NULL THEN
      RAISE EXCEPTION 'At least one required skill is needed for this role';
    END IF;

    INSERT INTO project_roles (
      project_id, role_name, role_display_name, role_description,
      is_system_default, is_template, role_level, permissions, is_active,
      account_id, is_governance_only, role_skills
    ) VALUES (
      NULL, v_candidate_slug, trim(p_display_name), p_description,
      FALSE, TRUE, v_role_level, v_source_pr.permissions, TRUE,
      p_account_id, COALESCE(p_is_governance_only, FALSE), v_role_skills
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

    IF v_role_skills IS NULL THEN
      RAISE EXCEPTION 'At least one required skill is needed for this role';
    END IF;

    INSERT INTO project_roles (
      project_id, role_name, role_display_name, role_description,
      is_system_default, is_template, role_level, permissions, is_active,
      account_id, is_governance_only, role_skills
    ) VALUES (
      NULL, v_candidate_slug, trim(p_display_name), p_description,
      FALSE, TRUE, v_role_level, '[]'::jsonb, TRUE,
      p_account_id, COALESCE(p_is_governance_only, FALSE), v_role_skills
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

COMMENT ON FUNCTION public.create_org_custom_role(UUID, TEXT, TEXT, UUID, BOOLEAN, UUID[], INTEGER, UUID[], TEXT) IS
  'v1110: creates an org custom role (clone or from-scratch). p_role_skills is required — '
  'blank/omitted raises, except when cloning with skills already set on the source role.';

GRANT EXECUTE ON FUNCTION public.create_org_custom_role(UUID, TEXT, TEXT, UUID, BOOLEAN, UUID[], INTEGER, UUID[], TEXT) TO authenticated;

-- ── 2. update_org_custom_role — add p_role_skills, require non-blank result ─

DROP FUNCTION IF EXISTS public.update_org_custom_role(UUID, TEXT, TEXT, BOOLEAN, UUID[], UUID[]);

CREATE OR REPLACE FUNCTION public.update_org_custom_role(
  p_project_role_id      UUID,
  p_display_name         TEXT,
  p_description          TEXT,
  p_is_governance_only   BOOLEAN,
  p_add_menu_item_ids    UUID[] DEFAULT '{}'::UUID[],
  p_remove_menu_item_ids UUID[] DEFAULT '{}'::UUID[],
  p_role_skills          TEXT   DEFAULT NULL
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
  v_final_skills   TEXT;
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

  v_final_skills := COALESCE(NULLIF(btrim(p_role_skills), ''), v_pr.role_skills);
  IF v_final_skills IS NULL OR btrim(v_final_skills) = '' THEN
    RAISE EXCEPTION 'At least one required skill is needed for this role';
  END IF;

  SELECT id INTO v_role_id FROM roles WHERE role_name = v_pr.role_name AND account_id = v_pr.account_id;

  UPDATE project_roles
  SET role_display_name  = COALESCE(NULLIF(trim(p_display_name), ''), role_display_name),
      role_description   = COALESCE(p_description, role_description),
      is_governance_only = COALESCE(p_is_governance_only, is_governance_only),
      role_skills        = v_final_skills,
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

COMMENT ON FUNCTION public.update_org_custom_role(UUID, TEXT, TEXT, BOOLEAN, UUID[], UUID[], TEXT) IS
  'v1110: edits an org custom role. p_role_skills is optional per call (omit to keep the '
  'existing value) but the FINAL value can never be blank — raises otherwise.';

GRANT EXECUTE ON FUNCTION public.update_org_custom_role(UUID, TEXT, TEXT, BOOLEAN, UUID[], UUID[], TEXT) TO authenticated;

-- ── 3. update_builtin_role — add p_role_skills, require non-blank result ────

DROP FUNCTION IF EXISTS public.update_builtin_role(UUID, TEXT, TEXT, INTEGER, UUID, BOOLEAN, UUID[], UUID[]);

CREATE OR REPLACE FUNCTION public.update_builtin_role(
  p_project_role_id      UUID,
  p_display_name         TEXT,
  p_description          TEXT,
  p_role_level           INTEGER,
  p_industry_category_id UUID,
  p_is_governance_only   BOOLEAN,
  p_add_menu_item_ids    UUID[] DEFAULT '{}'::UUID[],
  p_remove_menu_item_ids UUID[] DEFAULT '{}'::UUID[],
  p_role_skills          TEXT   DEFAULT NULL
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
  v_final_skills   TEXT;
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

  v_final_skills := COALESCE(NULLIF(btrim(p_role_skills), ''), v_pr.role_skills);
  IF v_final_skills IS NULL OR btrim(v_final_skills) = '' THEN
    RAISE EXCEPTION 'At least one required skill is needed for this role';
  END IF;

  SELECT id INTO v_role_id FROM roles WHERE role_name = v_pr.role_name AND account_id IS NULL;

  UPDATE project_roles
  SET role_display_name    = COALESCE(NULLIF(trim(p_display_name), ''), role_display_name),
      role_description     = COALESCE(p_description, role_description),
      role_level           = COALESCE(p_role_level, role_level),
      industry_category_id = p_industry_category_id,
      is_governance_only   = COALESCE(p_is_governance_only, is_governance_only),
      role_skills          = v_final_skills,
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

COMMENT ON FUNCTION public.update_builtin_role(UUID, TEXT, TEXT, INTEGER, UUID, BOOLEAN, UUID[], UUID[], TEXT) IS
  'v1110: system_admin/super_admin-only edit of a built-in project_roles/roles pair. '
  'p_role_skills is optional per call (omit to keep the existing value) but the FINAL value can '
  'never be blank — raises otherwise. role_name is never editable.';

GRANT EXECUTE ON FUNCTION public.update_builtin_role(UUID, TEXT, TEXT, INTEGER, UUID, BOOLEAN, UUID[], UUID[], TEXT) TO authenticated;

-- ── 4. fill_org_custom_role_skills_if_blank — guarded write-back for "Add from
--      Built-in Roles" (v1105) picking a custom org role whose skills are blank ─

CREATE OR REPLACE FUNCTION public.fill_org_custom_role_skills_if_blank(
  p_project_role_id UUID,
  p_role_skills     TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_pr             project_roles%ROWTYPE;
  v_skills         TEXT;
BEGIN
  v_skills := NULLIF(btrim(p_role_skills), '');
  IF v_skills IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Built-in roles (account_id IS NULL) are never touched by this function.
  SELECT * INTO v_pr FROM project_roles WHERE id = p_project_role_id AND account_id IS NOT NULL;
  IF v_pr.id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF NOT public.user_can_manage_org_roles(v_caller_user_id, v_pr.account_id) THEN
    RETURN FALSE;
  END IF;

  IF v_pr.role_skills IS NOT NULL AND btrim(v_pr.role_skills) <> '' THEN
    RETURN FALSE; -- already has skills — never overwrite
  END IF;

  UPDATE project_roles SET role_skills = v_skills, updated_at = NOW() WHERE id = p_project_role_id;
  RETURN TRUE;
END;
$$;

COMMENT ON FUNCTION public.fill_org_custom_role_skills_if_blank(UUID, TEXT) IS
  'v1110: fills role_skills on the caller''s OWN organisation''s custom role, only if it is '
  'currently blank. No-op (returns FALSE) for a built-in role, another organisation''s role, a '
  'role that already has skills, or a caller without manage-roles permission on that org. Used by '
  '"Add from Built-in Roles" (v1105) so editing skills while adding a role to a project also '
  'backfills the source custom role — never a built-in, never silently overwritten.';

GRANT EXECUTE ON FUNCTION public.fill_org_custom_role_skills_if_blank(UUID, TEXT) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v1110_role_functions_required_skills.sql applied successfully';
END $$;
