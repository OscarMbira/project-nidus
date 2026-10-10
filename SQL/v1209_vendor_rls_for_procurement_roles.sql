-- =============================================================================
-- v1209: Let procurement roles save vendors
-- =============================================================================
-- policy_vendors (v644) only allowed is_user_pmo_admin(), so Create Vendor
-- failed with "new row violates row-level security policy for table vendors"
-- for a project manager, team manager, or team lead.
-- The same people who can open Vendors / Vendor Categories may read and write
-- vendors and vendor categories for their organisation.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.vendor_role_name_allowed(p_role_name TEXT, p_role_display_name TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM (VALUES (p_role_name), (p_role_display_name)) AS names(src)
    WHERE lower(
      regexp_replace(
        regexp_replace(trim(COALESCE(src, '')), '[[:space:]]+', '_', 'g'),
        '[^a-z0-9_]', '', 'g'
      )
    ) IN (
      'pmo', 'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
      'project_manager', 'pm_project_manager', 'programme_manager', 'pm_programme_manager',
      'team_manager', 'pm_team_manager',
      'team_lead', 'pm_team_lead'
    )
  );
$$;

CREATE OR REPLACE FUNCTION public.auth_user_can_manage_vendors(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_account_id IS NOT NULL
    AND (
      public.is_user_pmo_admin(auth.uid())
      OR public.is_pmo_admin_or_owner_for_account(p_account_id)
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        JOIN public.users u ON u.id IN (p.project_manager_user_id, p.owner_user_id)
        WHERE p.account_id = p_account_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND u.auth_user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_memberships pm
        JOIN public.projects p ON p.id = pm.project_id
        JOIN public.users u ON u.id = pm.user_id
        JOIN public.project_roles pr ON pr.id = pm.project_role_id
        WHERE p.account_id = p_account_id
          AND COALESCE(p.is_deleted, FALSE) = FALSE
          AND u.auth_user_id = auth.uid()
          AND pm.is_active = TRUE
          AND pm.invitation_status = 'accepted'
          AND public.vendor_role_name_allowed(pr.role_name, pr.role_display_name)
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        JOIN public.users u ON u.id = ur.user_id
        LEFT JOIN public.projects p ON p.id = ur.project_id
        WHERE u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND COALESCE(r.is_deleted, FALSE) = FALSE
          AND COALESCE(r.is_active, TRUE) = TRUE
          AND public.vendor_role_name_allowed(r.role_name, r.role_display_name)
          AND (
            p.account_id = p_account_id
            OR (ur.project_id IS NULL AND r.account_id = p_account_id)
          )
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.vendor_role_name_allowed(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_manage_vendors(UUID) TO authenticated;

COMMENT ON FUNCTION public.auth_user_can_manage_vendors(UUID) IS
  'v1209: TRUE when the caller may read and write vendors for this account — PMO admin, account owner, named project manager/owner, or an active PMO, project manager, team manager, or team lead role. SECURITY DEFINER + row_security off.';

DROP POLICY IF EXISTS policy_vendors ON public.vendors;
CREATE POLICY policy_vendors ON public.vendors
  FOR ALL TO authenticated
  USING (public.auth_user_can_manage_vendors(account_id))
  WITH CHECK (public.auth_user_can_manage_vendors(account_id));

DROP POLICY IF EXISTS policy_vendor_categories ON public.vendor_categories;
CREATE POLICY policy_vendor_categories ON public.vendor_categories
  FOR ALL TO authenticated
  USING (public.auth_user_can_manage_vendors(account_id))
  WITH CHECK (public.auth_user_can_manage_vendors(account_id));
