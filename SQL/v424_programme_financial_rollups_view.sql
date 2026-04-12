-- ============================================================================
-- v424: Read model for programme-level financial rollups
-- Aggregates per-project cost/revenue first to avoid join fan-out double counting
-- ============================================================================

CREATE OR REPLACE VIEW public.programme_financial_rollups AS
WITH proj AS (
  SELECT pp.programme_id, pp.project_id
  FROM public.programme_projects pp
  INNER JOIN public.projects pj ON pj.id = pp.project_id AND COALESCE(pj.is_deleted, FALSE) = FALSE
),
costs AS (
  SELECT ce.project_id, SUM(ce.amount)::NUMERIC(18, 2) AS total_cost
  FROM public.project_cost_entries ce
  WHERE COALESCE(ce.is_deleted, FALSE) = FALSE
  GROUP BY ce.project_id
),
revs AS (
  SELECT re.project_id, SUM(re.amount)::NUMERIC(18, 2) AS total_rev
  FROM public.project_revenue_entries re
  WHERE COALESCE(re.is_deleted, FALSE) = FALSE
  GROUP BY re.project_id
)
SELECT
  pr.id AS programme_id,
  pr.programme_code,
  pr.programme_name,
  COUNT(DISTINCT proj.project_id)::INT AS project_count,
  COALESCE(SUM(costs.total_cost), 0)::NUMERIC(18, 2) AS total_actual_cost,
  COALESCE(SUM(revs.total_rev), 0)::NUMERIC(18, 2) AS total_revenue,
  (COALESCE(SUM(revs.total_rev), 0) - COALESCE(SUM(costs.total_cost), 0))::NUMERIC(18, 2) AS cost_variance
FROM public.programmes pr
LEFT JOIN proj ON proj.programme_id = pr.id
LEFT JOIN costs ON costs.project_id = proj.project_id
LEFT JOIN revs ON revs.project_id = proj.project_id
WHERE COALESCE(pr.is_deleted, FALSE) = FALSE
GROUP BY pr.id, pr.programme_code, pr.programme_name;

COMMENT ON VIEW public.programme_financial_rollups IS
  'v349/v424: Programme-level sums of actual cost and revenue from project child records.';

GRANT SELECT ON public.programme_financial_rollups TO authenticated;
