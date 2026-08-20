-- =============================================================================
-- v891: Fix lessons_reports RLS causing "canceling statement due to statement
--       timeout" (57014) on the report view page and every child-table fetch.
-- Prerequisites: v203/v204 (lessons_reports + child tables + original RLS),
--   v886 (lessons_reports SELECT recursion fix — this migration supersedes
--   v886's policy body, not its distribution-recipient helper).
--
-- Root cause (two compounding problems):
--   1) v886 fixed lessons_reports' OWN select policy to stop recursing into
--      lessons_report_distribution, but never touched the 5 *child* tables
--      (lessons_report_lessons/_recommendations/_approvals/_distribution/
--      _appendices). Their v204 SELECT policies still do
--      `EXISTS (SELECT 1 FROM lessons_reports lr WHERE lr.id = ...)` — a
--      plain (non-SECURITY DEFINER) query against lessons_reports, which
--      re-triggers lessons_reports' own full RLS policy on every row. So
--      fetching any child table pays the full cost of the parent policy too.
--   2) The parent policy itself (v886) calls auth.uid() / get_user_id_from_auth()
--      up to 6 times and re-joins `users` in 4 separate EXISTS branches
--      instead of resolving the current user once. Under RLS's security-
--      barrier semantics these plpgsql calls cannot be common-subexpression-
--      eliminated by the planner, so the cost multiplies per row.
--
-- Together these blew past Postgres's statement_timeout (~15-20s observed)
-- on every one of the 6 requests LessonsReportView.jsx fires in parallel.
--
-- Fix:
--   A) public.user_can_view_lessons_report(...) — resolves the current user
--      ONCE, then short-circuits through cheap checks (author/created_by →
--      project membership → project owner/PM → account owner → admin role →
--      distribution recipient) instead of a 6-way SQL OR of independent
--      EXISTS clauses. Replaces v886's lessons_reports SELECT policy body.
--   B) public.lessons_report_parent_active(report_id) — SECURITY DEFINER
--      existence+not-deleted check that bypasses lessons_reports RLS
--      entirely. Child-table SELECT policies now call this instead of
--      querying lessons_reports directly.
--   C) public.lessons_report_editable_by_current_user(report_id) — SECURITY
--      DEFINER equivalent of the "author in draft/submitted, or pmo/system
--      admin" check already used by the child tables' modify policies —
--      same bypass benefit for INSERT/UPDATE/DELETE.
-- Idempotent — safe to re-run.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- A) Consolidated, short-circuiting visibility check for lessons_reports itself
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.user_can_view_lessons_report(
    p_report_id UUID,
    p_project_id UUID,
    p_author_id UUID,
    p_created_by UUID
) RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
BEGIN
  v_uid := public.get_user_id_from_auth(auth.uid());

  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  IF p_author_id = v_uid OR p_created_by = v_uid THEN
    RETURN TRUE;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_projects up
    WHERE up.user_id = v_uid AND up.project_id = p_project_id AND COALESCE(up.is_deleted, FALSE) = FALSE
  ) THEN RETURN TRUE; END IF;

  IF EXISTS (
    SELECT 1 FROM public.project_memberships pm
    WHERE pm.user_id = v_uid AND pm.project_id = p_project_id AND COALESCE(pm.is_active, TRUE) = TRUE
  ) THEN RETURN TRUE; END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id AND COALESCE(p.is_deleted, FALSE) = FALSE
      AND (p.owner_user_id = v_uid OR p.project_manager_user_id = v_uid)
  ) THEN RETURN TRUE; END IF;

  IF EXISTS (
    SELECT 1 FROM public.projects p
    JOIN public.accounts a ON a.id = p.account_id AND COALESCE(a.is_deleted, FALSE) = FALSE
    WHERE p.id = p_project_id AND COALESCE(p.is_deleted, FALSE) = FALSE
      AND a.owner_user_id = v_uid
  ) THEN RETURN TRUE; END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_uid
      AND r.role_name IN ('pmo_admin', 'System Admin', 'PMO Admin', 'admin')
      AND ur.is_active = TRUE
      AND COALESCE(ur.is_deleted, FALSE) = FALSE
  ) THEN RETURN TRUE; END IF;

  RETURN public.user_is_lessons_report_distribution_recipient(p_report_id);
END;
$$;

COMMENT ON FUNCTION public.user_can_view_lessons_report(UUID, UUID, UUID, UUID) IS
  'Resolves the current user once, then short-circuits through visibility checks for a lessons_reports row. Replaces the 6-way OR of independent EXISTS clauses that was timing out (v891).';

GRANT EXECUTE ON FUNCTION public.user_can_view_lessons_report(UUID, UUID, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.user_can_view_lessons_report(UUID, UUID, UUID, UUID) TO service_role;

DROP POLICY IF EXISTS policy_lessons_reports_auth_select ON public.lessons_reports;
CREATE POLICY policy_lessons_reports_auth_select ON public.lessons_reports
  FOR SELECT
  TO authenticated
  USING (
    COALESCE(is_deleted, false) = false
    AND public.user_can_view_lessons_report(id, project_id, author_id, created_by)
  );

-- ---------------------------------------------------------------------------
-- B) Cheap existence check for child tables (bypasses lessons_reports RLS)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lessons_report_parent_active(p_report_id UUID)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.lessons_reports WHERE id = p_report_id AND is_deleted = FALSE
  );
$$;

COMMENT ON FUNCTION public.lessons_report_parent_active(UUID) IS
  'SECURITY DEFINER existence+not-deleted check for a lessons_reports row, bypassing its RLS. Used by child-table policies so they do not re-trigger the parent''s full visibility policy (v891).';

GRANT EXECUTE ON FUNCTION public.lessons_report_parent_active(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lessons_report_parent_active(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- C) Cheap "can I edit this report" check for child-table modify policies
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.lessons_report_editable_by_current_user(p_report_id UUID)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_author_id UUID;
  v_status VARCHAR;
BEGIN
  v_uid := public.get_user_id_from_auth(auth.uid());
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT author_id, report_status INTO v_author_id, v_status
  FROM public.lessons_reports
  WHERE id = p_report_id;

  IF v_author_id IS NOT NULL AND v_author_id = v_uid AND v_status IN ('draft', 'submitted') THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_uid
      AND r.role_name IN ('pmo_admin', 'System Admin')
      AND ur.is_active = TRUE
  );
END;
$$;

COMMENT ON FUNCTION public.lessons_report_editable_by_current_user(UUID) IS
  'SECURITY DEFINER "author in draft/submitted, or pmo/system admin" check, bypassing lessons_reports RLS. Used by child-table modify policies (v891).';

GRANT EXECUTE ON FUNCTION public.lessons_report_editable_by_current_user(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lessons_report_editable_by_current_user(UUID) TO service_role;

-- Narrower variant for lessons_report_revision_history, whose original v204 INSERT
-- policy checks author-or-admin WITHOUT a report_status gate — kept separate so this
-- migration doesn't silently tighten that policy's semantics.
CREATE OR REPLACE FUNCTION public.lessons_report_author_or_admin(p_report_id UUID)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_author_id UUID;
BEGIN
  v_uid := public.get_user_id_from_auth(auth.uid());
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  SELECT author_id INTO v_author_id
  FROM public.lessons_reports
  WHERE id = p_report_id;

  IF v_author_id IS NOT NULL AND v_author_id = v_uid THEN
    RETURN TRUE;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.roles r ON r.id = ur.role_id
    WHERE ur.user_id = v_uid
      AND r.role_name IN ('pmo_admin', 'System Admin')
      AND ur.is_active = TRUE
  );
END;
$$;

COMMENT ON FUNCTION public.lessons_report_author_or_admin(UUID) IS
  'SECURITY DEFINER "author, or pmo/system admin" check (no report_status gate), bypassing lessons_reports RLS. Used by lessons_report_revision_history INSERT (v891).';

GRANT EXECUTE ON FUNCTION public.lessons_report_author_or_admin(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.lessons_report_author_or_admin(UUID) TO service_role;

-- ---------------------------------------------------------------------------
-- Rewire the 5 child tables to use (B) and (C) instead of a direct
-- lessons_reports subquery. Same effective authorization rules as v204 —
-- only the underlying visibility check changed from "re-run full parent RLS"
-- to "bypass RLS, look up the same facts directly".
-- ---------------------------------------------------------------------------

-- lessons_report_lessons
DROP POLICY IF EXISTS policy_lessons_report_lessons_auth_select ON public.lessons_report_lessons;
CREATE POLICY policy_lessons_report_lessons_auth_select ON public.lessons_report_lessons
  FOR SELECT TO authenticated
  USING (public.lessons_report_parent_active(lessons_report_id));

DROP POLICY IF EXISTS policy_lessons_report_lessons_auth_modify ON public.lessons_report_lessons;
CREATE POLICY policy_lessons_report_lessons_auth_modify ON public.lessons_report_lessons
  FOR ALL TO authenticated
  USING (public.lessons_report_editable_by_current_user(lessons_report_id));

-- lessons_report_recommendations
DROP POLICY IF EXISTS policy_lessons_report_recommendations_auth_select ON public.lessons_report_recommendations;
CREATE POLICY policy_lessons_report_recommendations_auth_select ON public.lessons_report_recommendations
  FOR SELECT TO authenticated
  USING (public.lessons_report_parent_active(lessons_report_id));

DROP POLICY IF EXISTS policy_lessons_report_recommendations_auth_modify ON public.lessons_report_recommendations;
CREATE POLICY policy_lessons_report_recommendations_auth_modify ON public.lessons_report_recommendations
  FOR ALL TO authenticated
  USING (public.lessons_report_editable_by_current_user(lessons_report_id));

-- lessons_report_revision_history
DROP POLICY IF EXISTS policy_lessons_report_revision_history_auth_select ON public.lessons_report_revision_history;
CREATE POLICY policy_lessons_report_revision_history_auth_select ON public.lessons_report_revision_history
  FOR SELECT TO authenticated
  USING (public.lessons_report_parent_active(lessons_report_id));

DROP POLICY IF EXISTS policy_lessons_report_revision_history_auth_insert ON public.lessons_report_revision_history;
CREATE POLICY policy_lessons_report_revision_history_auth_insert ON public.lessons_report_revision_history
  FOR INSERT TO authenticated
  WITH CHECK (
    revised_by = public.get_user_id_from_auth(auth.uid())
    AND public.lessons_report_author_or_admin(lessons_report_id)
  );

-- lessons_report_approvals
DROP POLICY IF EXISTS policy_lessons_report_approvals_auth_select ON public.lessons_report_approvals;
CREATE POLICY policy_lessons_report_approvals_auth_select ON public.lessons_report_approvals
  FOR SELECT TO authenticated
  USING (public.lessons_report_parent_active(lessons_report_id));

DROP POLICY IF EXISTS policy_lessons_report_approvals_auth_insert ON public.lessons_report_approvals;
CREATE POLICY policy_lessons_report_approvals_auth_insert ON public.lessons_report_approvals
  FOR INSERT TO authenticated
  WITH CHECK (public.lessons_report_author_or_admin(lessons_report_id));

DROP POLICY IF EXISTS policy_lessons_report_approvals_auth_update ON public.lessons_report_approvals;
CREATE POLICY policy_lessons_report_approvals_auth_update ON public.lessons_report_approvals
  FOR UPDATE TO authenticated
  USING (
    approver_id = public.get_user_id_from_auth(auth.uid())
    OR public.lessons_report_author_or_admin(lessons_report_id)
  );

-- lessons_report_distribution
DROP POLICY IF EXISTS policy_lessons_report_distribution_auth_select ON public.lessons_report_distribution;
CREATE POLICY policy_lessons_report_distribution_auth_select ON public.lessons_report_distribution
  FOR SELECT TO authenticated
  USING (public.lessons_report_parent_active(lessons_report_id));

DROP POLICY IF EXISTS policy_lessons_report_distribution_auth_modify ON public.lessons_report_distribution;
CREATE POLICY policy_lessons_report_distribution_auth_modify ON public.lessons_report_distribution
  FOR ALL TO authenticated
  USING (public.lessons_report_author_or_admin(lessons_report_id));

DROP POLICY IF EXISTS policy_lessons_report_distribution_auth_status_update ON public.lessons_report_distribution;
CREATE POLICY policy_lessons_report_distribution_auth_status_update ON public.lessons_report_distribution
  FOR UPDATE TO authenticated
  USING (recipient_id = public.get_user_id_from_auth(auth.uid()))
  WITH CHECK (recipient_id = public.get_user_id_from_auth(auth.uid()));

-- lessons_report_appendices
DROP POLICY IF EXISTS policy_lessons_report_appendices_auth_select ON public.lessons_report_appendices;
CREATE POLICY policy_lessons_report_appendices_auth_select ON public.lessons_report_appendices
  FOR SELECT TO authenticated
  USING (public.lessons_report_parent_active(lessons_report_id));

DROP POLICY IF EXISTS policy_lessons_report_appendices_auth_modify ON public.lessons_report_appendices;
CREATE POLICY policy_lessons_report_appendices_auth_modify ON public.lessons_report_appendices
  FOR ALL TO authenticated
  USING (public.lessons_report_editable_by_current_user(lessons_report_id));

DO $$
BEGIN
  RAISE NOTICE 'v891_fix_lessons_reports_rls_statement_timeout.sql applied';
END $$;
