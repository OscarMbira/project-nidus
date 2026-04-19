-- ============================================================================
-- v484: role_menu_items — grants + RLS for UI-managed role menu customisation
-- PMO Admin + System Admin may INSERT/UPDATE rows subject to target-role rules.
-- System-protected menu_items (is_system_menu) cannot be modified via RLS.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.is_role_menu_management_user()
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
      AND r.role_name IN (
        'pmo_admin', 'PMO Admin',
        'system_admin', 'System Admin',
        'super_admin', 'Super Admin'
      )
  );
$$;

COMMENT ON FUNCTION public.is_role_menu_management_user() IS
  'TRUE if current user may use the Role Menu Access management UI (PMO or System Admin).';

-- Pure SQL (no PL/pgSQL variables): some clients split scripts on ";" and break DECLARE/INTO,
-- which surfaces as bogus errors like relation "v_target_name" does not exist.
CREATE OR REPLACE FUNCTION public.can_manage_role_menu_target(p_target_role_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT
    auth.uid() IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM user_roles ur
        JOIN users u ON ur.user_id = u.id
        JOIN roles r ON ur.role_id = r.id
        WHERE u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND r.role_name IN ('system_admin', 'System Admin', 'super_admin', 'Super Admin')
      )
      OR EXISTS (
        SELECT 1
        FROM roles tr
        INNER JOIN LATERAL (
          SELECT COALESCE(MAX(r.role_level), -1) AS pmo_lvl
          FROM user_roles ur
          JOIN users u ON ur.user_id = u.id
          JOIN roles r ON ur.role_id = r.id
          WHERE u.auth_user_id = auth.uid()
            AND ur.is_active = TRUE
            AND COALESCE(ur.is_deleted, FALSE) = FALSE
            AND r.role_name IN ('pmo_admin', 'PMO Admin')
        ) cap ON TRUE
        WHERE tr.id = p_target_role_id
          AND tr.role_name NOT IN ('system_admin', 'System Admin')
          AND tr.role_level <= cap.pmo_lvl
          AND cap.pmo_lvl >= 0
      )
    );
$$;

COMMENT ON FUNCTION public.can_manage_role_menu_target(UUID) IS
  'TRUE if current user may INSERT/UPDATE role_menu_items for the given target role.';

CREATE OR REPLACE FUNCTION public.role_menu_item_targets_system_menu(p_menu_item_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT mi.is_system_menu FROM menu_items mi WHERE mi.id = p_menu_item_id),
    FALSE
  );
$$;

GRANT INSERT, UPDATE ON role_menu_items TO authenticated;

DROP POLICY IF EXISTS policy_role_menu_items_select_management_full ON role_menu_items;
CREATE POLICY policy_role_menu_items_select_management_full
  ON role_menu_items
  FOR SELECT
  TO authenticated
  USING (
    is_deleted = FALSE
    AND public.is_role_menu_management_user()
  );

DROP POLICY IF EXISTS policy_role_menu_items_insert_management ON role_menu_items;
CREATE POLICY policy_role_menu_items_insert_management
  ON role_menu_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.can_manage_role_menu_target(role_id)
    AND NOT public.role_menu_item_targets_system_menu(menu_item_id)
  );

DROP POLICY IF EXISTS policy_role_menu_items_update_management ON role_menu_items;
CREATE POLICY policy_role_menu_items_update_management
  ON role_menu_items
  FOR UPDATE
  TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.can_manage_role_menu_target(role_id)
    AND NOT public.role_menu_item_targets_system_menu(menu_item_id)
  )
  WITH CHECK (
    COALESCE(is_deleted, FALSE) = FALSE
    AND public.can_manage_role_menu_target(role_id)
    AND NOT public.role_menu_item_targets_system_menu(menu_item_id)
  );
