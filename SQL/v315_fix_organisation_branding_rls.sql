-- ============================================================
-- v315: Fix organisation_branding RLS policies
-- The original INSERT/UPDATE/DELETE policies incorrectly
-- compared ur.user_id = auth.uid(), but user_roles.user_id
-- stores the internal users.id (not the Supabase auth UUID).
-- This migration drops and recreates them with the correct
-- join through the users table (u.auth_user_id = auth.uid()).
-- ============================================================

-- Drop broken policies
DROP POLICY IF EXISTS "organisation_branding_insert_admin"   ON public.organisation_branding;
DROP POLICY IF EXISTS "organisation_branding_update_admin"   ON public.organisation_branding;
DROP POLICY IF EXISTS "organisation_branding_delete_superadmin" ON public.organisation_branding;
DROP POLICY IF EXISTS "organisation_branding_select_own_account" ON public.organisation_branding;

-- ── SELECT: any authenticated user who owns or is a member of the account ──
CREATE POLICY "organisation_branding_select_own_account"
  ON public.organisation_branding FOR SELECT
  USING (
    auth.uid() IS NOT NULL
    AND (
      -- Account owner
      EXISTS (
        SELECT 1 FROM public.accounts a
        JOIN public.users u ON u.id = a.owner_user_id
        WHERE a.id = account_id
          AND u.auth_user_id = auth.uid()
          AND (a.is_deleted = false OR a.is_deleted IS NULL)
      )
      OR
      -- Account member via project roles
      EXISTS (
        SELECT 1 FROM public.projects p
        JOIN public.user_roles ur ON ur.project_id = p.id
        JOIN public.users u ON u.id = ur.user_id
        WHERE p.account_id = account_id
          AND u.auth_user_id = auth.uid()
          AND (p.is_deleted = false OR p.is_deleted IS NULL)
          AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
          AND ur.is_active = true
      )
    )
  );

-- ── INSERT: pmo_admin, super_admin, or org_admin (correct join through users) ──
CREATE POLICY "organisation_branding_insert_admin"
  ON public.organisation_branding FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- ── UPDATE: pmo_admin, super_admin, or org_admin ──
CREATE POLICY "organisation_branding_update_admin"
  ON public.organisation_branding FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- ── DELETE: super_admin only ──
CREATE POLICY "organisation_branding_delete_superadmin"
  ON public.organisation_branding FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name = 'super_admin'
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );
