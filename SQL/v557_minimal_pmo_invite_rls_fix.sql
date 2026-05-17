-- ============================================================================
-- v557: Minimal fix — PMO invitation RLS + read-only seat check
-- ============================================================================
-- Run ONCE in Supabase → SQL Editor. No helper functions required.
-- After running, hard-refresh the web app (Ctrl+Shift+R / Cmd+Shift+R).
--
-- What this fixes:
--   1. PMO Admin "Send Role Invitations" returns 403/permission denied on INSERT
--   2. Stuck "Sending..." button caused by lock in check_seat_availability
--
-- Two RLS policies (inline — no helper function dependency) and one function fix.
-- ============================================================================

-- 1. PMO/Org/System/Super admin can INSERT project_invitations
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_insert ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_admin_insert
  ON project_invitations FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND lower(
          regexp_replace(
            regexp_replace(trim(COALESCE(r.role_name, '')), '[[:space:]]+', '_', 'g'),
            '-', '_', 'g'
          )
        ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
    )
  );

-- 2. PMO/Org/System/Super admin can SELECT project_invitations
DROP POLICY IF EXISTS policy_project_invitations_pmo_admin_select ON project_invitations;
CREATE POLICY policy_project_invitations_pmo_admin_select
  ON project_invitations FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON r.id = ur.role_id
      JOIN users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND lower(
          regexp_replace(
            regexp_replace(trim(COALESCE(r.role_name, '')), '[[:space:]]+', '_', 'g'),
            '-', '_', 'g'
          )
        ) IN ('pmo_admin', 'org_admin', 'system_admin', 'super_admin')
    )
  );

-- 3. Read-only check_seat_availability (removes the UPDATE that caused lock-wait hangs)
CREATE OR REPLACE FUNCTION public.check_seat_availability(p_project_id UUID)
RETURNS TABLE (
    has_available_seats BOOLEAN,
    current_count       INTEGER,
    total_seats         INTEGER,
    available_seats     INTEGER,
    usage_percentage    DECIMAL
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (psa.available_seats > 0)                                           AS has_available_seats,
        psa.current_user_count                                              AS current_count,
        psa.total_seats,
        psa.available_seats,
        CASE
            WHEN psa.total_seats > 0
                THEN ROUND((psa.current_user_count::DECIMAL / psa.total_seats * 100), 2)
            ELSE 0
        END                                                                 AS usage_percentage
    FROM project_seat_allocations psa
    WHERE psa.project_id = p_project_id;
END;
$$;

COMMENT ON FUNCTION public.check_seat_availability(UUID) IS
  'Read-only seat check (v557). Seat counts are trigger-maintained; no UPDATE performed.';

-- Ask PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

DO $$
BEGIN
  RAISE NOTICE 'v557 applied successfully. Hard-refresh the web app.';
END $$;
