-- ============================================================================
-- v413: system_settings — GRANT + RLS fix (403 / permission denied for table)
-- Date: 2026-04-09
--
-- Problem:
--   1) PostgREST returns 403 with Postgres error "permission denied for table
--      system_settings" when the `authenticated` role has no table-level SELECT.
--      v09 enabled RLS but never issued GRANTs for this table (unlike roles,
--      users, notifications in later migrations).
--   2) policy_system_settings_public_read used auth.role() = 'authenticated',
--      which is redundant with TO authenticated and can fail in some contexts.
--   3) policy_system_settings_admin_all matched user_roles.user_id to auth.uid(),
--      but user_roles.user_id references public.users(id), not auth.users — so
--      the admin policy never matched; rely on is_public + GRANT for normal reads.
--
-- Fix: GRANT SELECT (and UPDATE for editable public rows under RLS), recreate
--      public read policies for authenticated + anon, fix admin policy join.
-- Prerequisites: system_settings (v02), v09 RLS, public.is_pmo_admin_user() (v258+)
-- ============================================================================

-- Data: ensure manager-assignment limit is readable via public_read policy (see v412)
UPDATE public.system_settings
SET
  is_public = TRUE,
  updated_at = NOW()
WHERE setting_key = 'pm_max_concurrent_assignments';

-- ----------------------------------------------------------------------------
-- Table privileges (required for REST API; RLS still applies)
-- ----------------------------------------------------------------------------
GRANT SELECT ON public.system_settings TO authenticated;
GRANT UPDATE ON public.system_settings TO authenticated;
GRANT ALL ON public.system_settings TO service_role;

-- Optional: anon may read is_public rows (registration / public UI)
GRANT SELECT ON public.system_settings TO anon;

-- ----------------------------------------------------------------------------
-- RLS: public read (explicit roles; no auth.role() guard)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_system_settings_public_read ON public.system_settings;

CREATE POLICY policy_system_settings_public_read
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND COALESCE(is_public, FALSE) = TRUE
  );

CREATE POLICY policy_system_settings_public_read_anon
  ON public.system_settings
  FOR SELECT
  TO anon
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND COALESCE(is_public, FALSE) = TRUE
  );

-- ----------------------------------------------------------------------------
-- RLS: admin full access (correct users.id ↔ auth.uid() join)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_system_settings_admin_all ON public.system_settings;

CREATE POLICY policy_system_settings_admin_all
  ON public.system_settings
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('system_admin', 'System Admin', 'super_admin')
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('system_admin', 'System Admin', 'super_admin')
        AND COALESCE(ur.is_active, TRUE) = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  );

-- ----------------------------------------------------------------------------
-- RLS: PMO admin — read/update manager assignment limit (even if is_public false)
--      (SELECT + UPDATE only; avoid FOR ALL so DELETE is not granted.)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_system_settings_pmo_manager_assignment ON public.system_settings;

CREATE POLICY policy_system_settings_pmo_select_assignment_limit
  ON public.system_settings
  FOR SELECT
  TO authenticated
  USING (
    setting_key = 'pm_max_concurrent_assignments'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND public.is_pmo_admin_user()
  );

CREATE POLICY policy_system_settings_pmo_update_assignment_limit
  ON public.system_settings
  FOR UPDATE
  TO authenticated
  USING (
    setting_key = 'pm_max_concurrent_assignments'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND public.is_pmo_admin_user()
  )
  WITH CHECK (
    setting_key = 'pm_max_concurrent_assignments'
    AND COALESCE(is_deleted, FALSE) = FALSE
    AND public.is_pmo_admin_user()
  );
