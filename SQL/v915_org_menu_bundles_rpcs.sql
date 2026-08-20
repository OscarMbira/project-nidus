-- ============================================================================
-- v915: Menu Bundles — RPCs (Phase 2 of 4, shared public schema)
-- ============================================================================
-- SECURITY DEFINER functions for the Menu Bundles feature (v914 PRD/plan). All writes to
-- org_menu_bundles/org_menu_bundle_items go through these RPCs only (rule 42) — direct client
-- writes stay RLS-restricted (see v914_org_menu_bundles_schema.sql). Reuses
-- user_can_manage_org_roles(p_user_id, p_account_id) as-is (PRD decision 4) — the same admin
-- population that manages custom roles also manages the bundles used to speed that up. Shared
-- by both Platform and Simulator (both apps' services already point at this public schema —
-- see "Correction made during implementation" in projectplan/v914_org_menu_bundles_plan.md).
-- Prerequisites: v914_org_menu_bundles_schema.sql, v903_organisation_custom_roles_rpcs.sql
-- (user_can_manage_org_roles)
-- ============================================================================

-- ── create_org_menu_bundle ───────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.create_org_menu_bundle(
  p_account_id     UUID,
  p_bundle_name    TEXT,
  p_description    TEXT DEFAULT NULL,
  p_menu_item_ids  UUID[] DEFAULT '{}'::UUID[]
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_bundle_id      UUID;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT public.user_can_manage_org_roles(v_caller_user_id, p_account_id) THEN
    RAISE EXCEPTION 'You do not have permission to create menu bundles for this organisation';
  END IF;

  IF p_bundle_name IS NULL OR trim(p_bundle_name) = '' THEN
    RAISE EXCEPTION 'Bundle name is required';
  END IF;

  IF EXISTS (
    SELECT 1 FROM org_menu_bundles
    WHERE account_id = p_account_id
      AND lower(bundle_name) = lower(trim(p_bundle_name))
      AND is_deleted = FALSE
  ) THEN
    RAISE EXCEPTION 'A menu bundle named "%" already exists for this organisation', trim(p_bundle_name);
  END IF;

  INSERT INTO org_menu_bundles (account_id, bundle_name, description, created_by, updated_by)
  VALUES (p_account_id, trim(p_bundle_name), p_description, v_caller_user_id, v_caller_user_id)
  RETURNING id INTO v_bundle_id;

  IF p_menu_item_ids IS NOT NULL AND array_length(p_menu_item_ids, 1) > 0 THEN
    INSERT INTO org_menu_bundle_items (bundle_id, menu_item_id)
    SELECT DISTINCT v_bundle_id, mi
    FROM unnest(p_menu_item_ids) AS mi
    ON CONFLICT (bundle_id, menu_item_id) DO NOTHING;
  END IF;

  RETURN v_bundle_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_org_menu_bundle(UUID, TEXT, TEXT, UUID[]) TO authenticated;

-- ── update_org_menu_bundle ───────────────────────────────────────────────────
-- Full-replace semantics for items — simplest correct approach for a small join table with no
-- per-item history requirement (PRD out-of-scope: no field-level change log for bundles).

CREATE OR REPLACE FUNCTION public.update_org_menu_bundle(
  p_bundle_id      UUID,
  p_bundle_name    TEXT,
  p_description    TEXT DEFAULT NULL,
  p_menu_item_ids  UUID[] DEFAULT '{}'::UUID[]
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_bundle         org_menu_bundles%ROWTYPE;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_bundle FROM org_menu_bundles WHERE id = p_bundle_id AND is_deleted = FALSE;
  IF v_bundle.id IS NULL THEN
    RAISE EXCEPTION 'Menu bundle not found';
  END IF;

  IF NOT public.user_can_manage_org_roles(v_caller_user_id, v_bundle.account_id) THEN
    RAISE EXCEPTION 'You do not have permission to edit menu bundles for this organisation';
  END IF;

  IF p_bundle_name IS NOT NULL AND trim(p_bundle_name) != '' THEN
    IF EXISTS (
      SELECT 1 FROM org_menu_bundles
      WHERE account_id = v_bundle.account_id
        AND lower(bundle_name) = lower(trim(p_bundle_name))
        AND is_deleted = FALSE
        AND id != p_bundle_id
    ) THEN
      RAISE EXCEPTION 'A menu bundle named "%" already exists for this organisation', trim(p_bundle_name);
    END IF;
  END IF;

  UPDATE org_menu_bundles
  SET bundle_name = COALESCE(NULLIF(trim(p_bundle_name), ''), bundle_name),
      description = COALESCE(p_description, description),
      updated_by  = v_caller_user_id,
      updated_at  = NOW()
  WHERE id = p_bundle_id;

  DELETE FROM org_menu_bundle_items WHERE bundle_id = p_bundle_id;

  IF p_menu_item_ids IS NOT NULL AND array_length(p_menu_item_ids, 1) > 0 THEN
    INSERT INTO org_menu_bundle_items (bundle_id, menu_item_id)
    SELECT DISTINCT p_bundle_id, mi
    FROM unnest(p_menu_item_ids) AS mi
    ON CONFLICT (bundle_id, menu_item_id) DO NOTHING;
  END IF;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.update_org_menu_bundle(UUID, TEXT, TEXT, UUID[]) TO authenticated;

-- ── delete_org_menu_bundle ───────────────────────────────────────────────────
-- Soft delete only (PRD decision 6) — unlike custom roles, a bundle has no live dependency to
-- protect (attaching a bundle to a role is a one-time copy, PRD decision 2), so there is no
-- "currently in use" block to check; deleting a bundle only removes it from future "start from
-- a bundle" pickers.

CREATE OR REPLACE FUNCTION public.delete_org_menu_bundle(p_bundle_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_user_id UUID;
  v_bundle         org_menu_bundles%ROWTYPE;
BEGIN
  SELECT id INTO v_caller_user_id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE;
  IF v_caller_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO v_bundle FROM org_menu_bundles WHERE id = p_bundle_id AND is_deleted = FALSE;
  IF v_bundle.id IS NULL THEN
    RAISE EXCEPTION 'Menu bundle not found';
  END IF;

  IF NOT public.user_can_manage_org_roles(v_caller_user_id, v_bundle.account_id) THEN
    RAISE EXCEPTION 'You do not have permission to delete menu bundles for this organisation';
  END IF;

  UPDATE org_menu_bundles
  SET is_active  = FALSE,
      is_deleted = TRUE,
      deleted_at = NOW(),
      deleted_by = v_caller_user_id,
      updated_by = v_caller_user_id,
      updated_at = NOW()
  WHERE id = p_bundle_id;

  RETURN TRUE;
END;
$$;

GRANT EXECUTE ON FUNCTION public.delete_org_menu_bundle(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE 'v915: create/update/delete_org_menu_bundle installed (shared public schema)';
END $$;
