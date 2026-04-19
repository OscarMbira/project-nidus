-- =============================================================================
-- v472: RPC get_executive_summary_pm_scope — portfolio & programme rows for dashboard
-- Purpose: Executive summary must read programme_projects / portfolio_projects even when
--          RLS on linking tables is missing or misconfigured (client gets "permission denied").
--          This function runs as SECURITY DEFINER, aggregates only rows tied to the account
--          via projects.account_id, and returns JSON for KPI breakdowns.
-- Database: PostgreSQL 15+ (Supabase public schema)
-- Prerequisites: projects, portfolio_projects, programme_projects, portfolios, programmes
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_executive_summary_pm_scope(p_account_id UUID)
RETURNS JSONB
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH project_ids AS (
    SELECT id
    FROM projects
    WHERE account_id = p_account_id
      AND COALESCE(is_deleted, FALSE) = FALSE
  ),
  pp_ids AS (
    SELECT DISTINCT pp.portfolio_id AS id
    FROM portfolio_projects pp
    INNER JOIN project_ids pj ON pj.id = pp.project_id
    WHERE COALESCE(pp.is_deleted, FALSE) = FALSE
  ),
  prog_link AS (
    SELECT DISTINCT pr.programme_id AS id
    FROM programme_projects pr
    INNER JOIN project_ids pj ON pj.id = pr.project_id
    WHERE COALESCE(pr.is_deleted, FALSE) = FALSE
  ),
  prog_rows AS (
    SELECT p.id, p.portfolio_id, p.programme_status
    FROM programmes p
    INNER JOIN prog_link gl ON gl.id = p.id
    WHERE COALESCE(p.is_deleted, FALSE) = FALSE
  ),
  extra_portfolios AS (
    SELECT DISTINCT pr.portfolio_id AS id
    FROM prog_rows pr
    WHERE pr.portfolio_id IS NOT NULL
  ),
  all_portfolio_ids AS (
    SELECT id FROM pp_ids
    UNION
    SELECT id FROM extra_portfolios
  ),
  port_rows AS (
    SELECT po.id, po.portfolio_status
    FROM portfolios po
    WHERE po.id IN (SELECT id FROM all_portfolio_ids)
      AND COALESCE(po.is_deleted, FALSE) = FALSE
  )
  SELECT CASE
    WHEN NOT EXISTS (SELECT 1 FROM project_ids) THEN
      jsonb_build_object('portfolios', '[]'::jsonb, 'programmes', '[]'::jsonb)
    ELSE
      jsonb_build_object(
        'portfolios', COALESCE(
          (SELECT jsonb_agg(jsonb_build_object('id', id, 'portfolio_status', portfolio_status)) FROM port_rows),
          '[]'::jsonb
        ),
        'programmes', COALESCE(
          (SELECT jsonb_agg(jsonb_build_object(
            'id', id,
            'portfolio_id', portfolio_id,
            'programme_status', programme_status
          )) FROM prog_rows),
          '[]'::jsonb
        )
      )
  END;
$$;

COMMENT ON FUNCTION public.get_executive_summary_pm_scope(UUID) IS
  'v472: Returns portfolio and programme status rows scoped to an account via projects (dashboard executive summary). SECURITY DEFINER; read-only aggregation.';

REVOKE ALL ON FUNCTION public.get_executive_summary_pm_scope(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_executive_summary_pm_scope(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_executive_summary_pm_scope(UUID) TO service_role;
