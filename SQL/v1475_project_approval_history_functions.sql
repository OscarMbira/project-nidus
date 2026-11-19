-- ============================================================================
-- v1475: Approvals History — decided authorisation requests for one project (v1343, slice 4)
-- ============================================================================
-- PRD projectprd/v1343_project_administrator_support_role_PRD.md amendment A4:
-- Governance › Approvals History lists the project's decided record_authorisation_requests,
-- read-only (no Approve / Reject).
--
-- record_authorisation_requests carries table_name + record_id, not a project, so these
-- functions find each request's project through its source table (project_id, or
-- record_project_id for register records; practice_project_id in the Simulator). The caller
-- must be able to open the project (auth_user_can_access_project /
-- sim.auth_user_can_access_practice_project). Read-only, SECURITY DEFINER.
-- Record label: display_id and title / name of the source record when it has them.
-- Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.list_project_approval_history(p_project_id uuid)
RETURNS TABLE (
  request_id uuid, record_type text, table_name text, record_id uuid, record_label text,
  role_label text, approval_level integer, status text,
  submitted_by_name text, authoriser_name text,
  submitted_at timestamptz, decided_at timestamptz, submission_notes text, decision_notes text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_table text;
  v_col text;
BEGIN
  IF p_project_id IS NULL OR NOT public.auth_user_can_access_project(p_project_id) THEN
    RETURN;
  END IF;

  FOR v_table IN
    SELECT DISTINCT r.table_name FROM public.record_authorisation_requests r WHERE r.decided_at IS NOT NULL
  LOOP
    v_col := (
      SELECT c.column_name FROM information_schema.columns c
      WHERE c.table_schema = 'public' AND c.table_name = v_table
        AND c.column_name IN ('project_id', 'record_project_id')
      ORDER BY CASE c.column_name WHEN 'project_id' THEN 0 ELSE 1 END
      LIMIT 1);
    CONTINUE WHEN v_col IS NULL;

    RETURN QUERY EXECUTE format($q$
      SELECT r.id, r.record_type::text, r.table_name::text, r.record_id,
             COALESCE(NULLIF(concat_ws(' — ',
               NULLIF(to_jsonb(s) ->> 'display_id', ''),
               COALESCE(to_jsonb(s) ->> 'title', to_jsonb(s) ->> 'name', to_jsonb(s) ->> 'risk_title',
                        to_jsonb(s) ->> 'issue_title', to_jsonb(s) ->> 'change_title', to_jsonb(s) ->> 'decision_title')), ''),
               r.record_type::text),
             r.role_label::text, r.approval_level, r.status::text,
             su.full_name::text, au.full_name::text,
             r.submitted_at, r.decided_at, r.submission_notes, r.decision_notes
      FROM public.record_authorisation_requests r
      JOIN public.%I s ON s.id = r.record_id
      LEFT JOIN public.users su ON su.id = r.submitted_by
      LEFT JOIN public.users au ON au.id = r.authoriser_id
      WHERE r.table_name = $1 AND r.decided_at IS NOT NULL AND s.%I = $2
    $q$, v_table, v_col) USING v_table, p_project_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION public.list_project_approval_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_project_approval_history(uuid) TO authenticated;
COMMENT ON FUNCTION public.list_project_approval_history(uuid) IS
  'v1475 (v1343 A4): decided authorisation requests for one project, read-only, for Governance › Approvals History.';

CREATE OR REPLACE FUNCTION sim.list_practice_project_approval_history(p_project_id uuid)
RETURNS TABLE (
  request_id uuid, record_type text, table_name text, record_id uuid, record_label text,
  role_label text, approval_level integer, status text,
  submitted_by_name text, authoriser_name text,
  submitted_at timestamptz, decided_at timestamptz, submission_notes text, decision_notes text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = sim, public SET row_security = off
AS $$
DECLARE
  v_table text;
  v_col text;
BEGIN
  IF p_project_id IS NULL OR NOT sim.auth_user_can_access_practice_project(p_project_id) THEN
    RETURN;
  END IF;

  FOR v_table IN
    SELECT DISTINCT r.table_name FROM sim.record_authorisation_requests r WHERE r.decided_at IS NOT NULL
  LOOP
    v_col := (
      SELECT c.column_name FROM information_schema.columns c
      WHERE c.table_schema = 'sim' AND c.table_name = v_table
        AND c.column_name IN ('practice_project_id', 'project_id', 'record_project_id')
      ORDER BY CASE c.column_name WHEN 'practice_project_id' THEN 0 WHEN 'project_id' THEN 1 ELSE 2 END
      LIMIT 1);
    CONTINUE WHEN v_col IS NULL;

    RETURN QUERY EXECUTE format($q$
      SELECT r.id, r.record_type::text, r.table_name::text, r.record_id,
             COALESCE(NULLIF(concat_ws(' — ',
               NULLIF(to_jsonb(s) ->> 'display_id', ''),
               COALESCE(to_jsonb(s) ->> 'title', to_jsonb(s) ->> 'name', to_jsonb(s) ->> 'risk_title',
                        to_jsonb(s) ->> 'issue_title', to_jsonb(s) ->> 'change_title', to_jsonb(s) ->> 'decision_title')), ''),
               r.record_type::text),
             r.role_label::text, r.approval_level, r.status::text,
             su.full_name::text, au.full_name::text,
             r.submitted_at, r.decided_at, r.submission_notes, r.decision_notes
      FROM sim.record_authorisation_requests r
      JOIN sim.%I s ON s.id = r.record_id
      LEFT JOIN public.users su ON su.id = r.submitted_by
      LEFT JOIN public.users au ON au.id = r.authoriser_id
      WHERE r.table_name = $1 AND r.decided_at IS NOT NULL AND s.%I = $2
    $q$, v_table, v_col) USING v_table, p_project_id;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION sim.list_practice_project_approval_history(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION sim.list_practice_project_approval_history(uuid) TO authenticated;
COMMENT ON FUNCTION sim.list_practice_project_approval_history(uuid) IS
  'v1475 (v1343 A4): decided authorisation requests for one practice project, read-only.';

NOTIFY pgrst, 'reload schema';
