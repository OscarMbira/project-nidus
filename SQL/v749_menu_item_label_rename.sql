-- ============================================================================
-- v749: Menu item label rename (System Admin only, no direct menu_items UPDATE)
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v05_configuration_menu_tables.sql, v484_role_menu_items_rls.sql
-- Companion plan: projectplan/v749_Sidebar_Menu_Label_Rename_Plan.md
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_menu_label_management_user()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles ur
    JOIN users u ON ur.user_id = u.id
    JOIN roles r ON ur.role_id = r.id
    WHERE u.auth_user_id = auth.uid()
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
      AND r.role_name IN ('system_admin', 'System Admin', 'super_admin', 'Super Admin')
  );
$$;

COMMENT ON FUNCTION public.is_menu_label_management_user() IS
  'TRUE if current user may rename menu_items.menu_label via rename_menu_item (System Admin only).';

CREATE OR REPLACE FUNCTION public.rename_menu_item(p_menu_item_id UUID, p_new_label TEXT)
RETURNS menu_items
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_row menu_items;
BEGIN
  IF NOT public.is_menu_label_management_user() THEN
    RAISE EXCEPTION 'Permission denied: System Admin required';
  END IF;

  IF p_new_label IS NULL OR trim(p_new_label) = '' THEN
    RAISE EXCEPTION 'Label is required';
  END IF;

  UPDATE menu_items
  SET menu_label = trim(p_new_label),
      updated_at = NOW()
  WHERE id = p_menu_item_id
    AND is_system_menu = FALSE
    AND COALESCE(is_deleted, FALSE) = FALSE
  RETURNING * INTO v_row;

  IF v_row IS NULL THEN
    RAISE EXCEPTION 'Menu item not found or is system-protected';
  END IF;

  RETURN v_row;
END;
$$;

COMMENT ON FUNCTION public.rename_menu_item(UUID, TEXT) IS
  'Rename menu_items.menu_label for non-system rows. System Admin only; structural columns unchanged.';

GRANT EXECUTE ON FUNCTION public.is_menu_label_management_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.rename_menu_item(UUID, TEXT) TO authenticated;

-- Manual verification (SQL editor):
-- 1. As system_admin: SELECT rename_menu_item('<non-system-uuid>', 'New Label');
-- 2. As pmo_admin: same call → Permission denied
-- 3. System menu id → Menu item not found or is system-protected
