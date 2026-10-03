-- ============================================================================
-- v1119: Fix RLS + access model on the v54 GDPR compliance tables
-- ============================================================================
-- projectplan/v1108_data_management_gdpr_plan.md Phase 0.
-- v54_gdpr_compliance.sql's policies check role_name = 'System Admin', which is not today's
-- admin role (today's is 'PMO Admin'/'pmo_admin'), and compare user_id = auth.uid() directly —
-- the same auth_user_id-linkage mismatch class of bug this codebase has fixed before
-- (public.users.id is not the same UUID space as auth.uid(); auth.uid() must resolve through
-- users.auth_user_id). As written, these policies would silently deny access to legitimate users.
--
-- v54 created SIX tables, not five: consent_logs, data_processing_records, data_export_requests,
-- data_deletion_requests, privacy_preferences, data_breach_records. All six get the same fix here.
--
-- Fix approach: add account_id to each table (denormalized tenant-scoping column, same pattern
-- used throughout this schema) so RLS can check "same account" directly instead of reverse-
-- resolving a target user's account on every row read. Backfill existing rows. New helper
-- function is_pmo_admin_or_owner_for_account() follows the established safe pattern (SECURITY
-- DEFINER + row_security off) from auth_user_can_access_account() (v1016) / user_has_access_to_
-- account() (v737).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Helper: is the calling user a PMO Admin or the account owner of p_account_id?
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_pmo_admin_or_owner_for_account(p_account_id UUID)
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
      EXISTS (
        SELECT 1
        FROM public.accounts a
        JOIN public.users u ON u.id = a.owner_user_id
        WHERE a.id = p_account_id
          AND u.auth_user_id = auth.uid()
          AND COALESCE(a.is_deleted, FALSE) = FALSE
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.roles r ON r.id = ur.role_id
        JOIN public.users u ON u.id = ur.user_id
        JOIN public.projects p ON p.id = ur.project_id
        WHERE u.auth_user_id = auth.uid()
          AND p.account_id = p_account_id
          AND r.role_name IN ('PMO Admin', 'pmo_admin', 'System Admin')
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND COALESCE(p.is_deleted, FALSE) = FALSE
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.is_pmo_admin_or_owner_for_account(UUID) TO authenticated;

COMMENT ON FUNCTION public.is_pmo_admin_or_owner_for_account(UUID) IS
  'v1119: TRUE if the caller owns p_account_id or holds an active PMO Admin role on a project within it. SECURITY DEFINER + row_security off, same pattern as auth_user_can_access_account() (v1016).';

-- ----------------------------------------------------------------------------
-- Helper: resolve the calling user's own internal users.id
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_internal_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT id FROM public.users WHERE auth_user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.current_internal_user_id() TO authenticated;

COMMENT ON FUNCTION public.current_internal_user_id() IS
  'v1119: resolves the calling auth user to their public.users.id row, for RLS policies that need it without a nested subquery subject to its own RLS.';

-- ----------------------------------------------------------------------------
-- Helper: resolve a user's own account_id (owner first, else first active project's account)
-- Used only for one-off backfill below — not called per-row in any policy.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.resolve_user_account_id(p_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT COALESCE(
    (SELECT a.id FROM public.accounts a WHERE a.owner_user_id = p_user_id AND COALESCE(a.is_deleted, FALSE) = FALSE LIMIT 1),
    (
      SELECT p.account_id
      FROM public.user_roles ur
      JOIN public.projects p ON p.id = ur.project_id
      WHERE ur.user_id = p_user_id
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND COALESCE(p.is_deleted, FALSE) = FALSE
      ORDER BY ur.assigned_at ASC NULLS LAST
      LIMIT 1
    )
  );
$$;

COMMENT ON FUNCTION public.resolve_user_account_id(UUID) IS
  'v1119: one-off backfill helper — resolves a user''s account via ownership first, else their earliest active project role. Not used in any RLS policy (not row_security-safe to call per-row at scale).';

-- ----------------------------------------------------------------------------
-- consent_logs: add account_id, backfill, fix policy
-- ----------------------------------------------------------------------------
ALTER TABLE public.consent_logs ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
UPDATE public.consent_logs SET account_id = public.resolve_user_account_id(user_id) WHERE account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_consent_logs_account_id ON public.consent_logs(account_id);

DROP POLICY IF EXISTS policy_consent_logs_own_all ON public.consent_logs;
CREATE POLICY policy_consent_logs_v1119 ON public.consent_logs
  FOR ALL TO authenticated
  USING (
    user_id = public.current_internal_user_id()
    OR public.is_pmo_admin_or_owner_for_account(account_id)
  )
  WITH CHECK (
    user_id = public.current_internal_user_id()
    OR public.is_pmo_admin_or_owner_for_account(account_id)
  );

-- ----------------------------------------------------------------------------
-- data_processing_records: add account_id, backfill via created_by, fix policy
-- (Article 30 ROPA — organisation-specific, not global reference data)
-- ----------------------------------------------------------------------------
ALTER TABLE public.data_processing_records ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
UPDATE public.data_processing_records SET account_id = public.resolve_user_account_id(created_by) WHERE account_id IS NULL AND created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_processing_records_account_id ON public.data_processing_records(account_id);

DROP POLICY IF EXISTS policy_data_processing_records_admin_all ON public.data_processing_records;
DROP POLICY IF EXISTS policy_data_processing_records_auth_read ON public.data_processing_records;
CREATE POLICY policy_data_processing_records_v1119 ON public.data_processing_records
  FOR ALL TO authenticated
  USING (public.is_pmo_admin_or_owner_for_account(account_id))
  WITH CHECK (public.is_pmo_admin_or_owner_for_account(account_id));

-- ----------------------------------------------------------------------------
-- data_export_requests: add account_id, backfill, fix policy
-- ----------------------------------------------------------------------------
ALTER TABLE public.data_export_requests ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
UPDATE public.data_export_requests SET account_id = public.resolve_user_account_id(user_id) WHERE account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_export_requests_account_id ON public.data_export_requests(account_id);

DROP POLICY IF EXISTS policy_data_export_requests_own_all ON public.data_export_requests;
CREATE POLICY policy_data_export_requests_v1119 ON public.data_export_requests
  FOR ALL TO authenticated
  USING (
    user_id = public.current_internal_user_id()
    OR public.is_pmo_admin_or_owner_for_account(account_id)
  )
  WITH CHECK (
    user_id = public.current_internal_user_id()
    OR public.is_pmo_admin_or_owner_for_account(account_id)
  );

-- ----------------------------------------------------------------------------
-- data_deletion_requests: add account_id, backfill, fix policy
-- ----------------------------------------------------------------------------
ALTER TABLE public.data_deletion_requests ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
UPDATE public.data_deletion_requests SET account_id = public.resolve_user_account_id(user_id) WHERE account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_account_id ON public.data_deletion_requests(account_id);

DROP POLICY IF EXISTS policy_data_deletion_requests_own_all ON public.data_deletion_requests;
CREATE POLICY policy_data_deletion_requests_v1119 ON public.data_deletion_requests
  FOR ALL TO authenticated
  USING (
    user_id = public.current_internal_user_id()
    OR public.is_pmo_admin_or_owner_for_account(account_id)
  )
  WITH CHECK (
    user_id = public.current_internal_user_id()
    OR public.is_pmo_admin_or_owner_for_account(account_id)
  );

-- ----------------------------------------------------------------------------
-- privacy_preferences: add account_id, backfill, fix policy
-- ----------------------------------------------------------------------------
ALTER TABLE public.privacy_preferences ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
UPDATE public.privacy_preferences SET account_id = public.resolve_user_account_id(user_id) WHERE account_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_privacy_preferences_account_id ON public.privacy_preferences(account_id);

DROP POLICY IF EXISTS policy_privacy_preferences_own_all ON public.privacy_preferences;
CREATE POLICY policy_privacy_preferences_v1119 ON public.privacy_preferences
  FOR ALL TO authenticated
  USING (
    user_id = public.current_internal_user_id()
    OR public.is_pmo_admin_or_owner_for_account(account_id)
  )
  WITH CHECK (
    user_id = public.current_internal_user_id()
    OR public.is_pmo_admin_or_owner_for_account(account_id)
  );

-- ----------------------------------------------------------------------------
-- data_breach_records: add account_id, backfill via created_by, fix policy
-- (admin-only — no self-service angle, affected_users is an array not a single owner)
-- ----------------------------------------------------------------------------
ALTER TABLE public.data_breach_records ADD COLUMN IF NOT EXISTS account_id UUID REFERENCES public.accounts(id);
UPDATE public.data_breach_records SET account_id = public.resolve_user_account_id(created_by) WHERE account_id IS NULL AND created_by IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_data_breach_records_account_id ON public.data_breach_records(account_id);

DROP POLICY IF EXISTS policy_data_breach_records_admin_all ON public.data_breach_records;
CREATE POLICY policy_data_breach_records_v1119 ON public.data_breach_records
  FOR ALL TO authenticated
  USING (public.is_pmo_admin_or_owner_for_account(account_id))
  WITH CHECK (public.is_pmo_admin_or_owner_for_account(account_id));

DO $$ BEGIN
  RAISE NOTICE 'v1119_gdpr_rls_and_access_fix.sql applied successfully';
END $$;
