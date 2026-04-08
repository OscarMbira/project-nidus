-- =============================================================================
-- v293: Grant SELECT on programme_rollup_view
-- Purpose: Fix "permission denied for view programme_rollup_view" on Programme
--          Dashboard (/platform/programme/dashboard). View created in v145;
--          authenticated role needs SELECT to read rollup data.
-- Safe to re-run.
-- =============================================================================

GRANT SELECT ON programme_rollup_view TO authenticated;

COMMENT ON VIEW programme_rollup_view IS 'Programme aggregated metrics - rolls up project health, budget, benefits, risks, and exceptions for PMO oversight. SELECT granted to authenticated for Programme Dashboard.';
