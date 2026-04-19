-- ============================================================================
-- v475 — PMO dashboard executive metrics (REFERENCE ONLY)
-- Database: PostgreSQL 15+ (Supabase public schema)
-- ============================================================================
-- This file does NOT create or alter schema objects. It documents the data
-- sources and logical SQL patterns that mirror src/services/dashboardService.js
-- (v475: getPmoExtendedMetrics, getAggregatedEvmMetrics, getCriticalPathSummary,
-- getRiskIssueSummary, getExecutiveAlerts).
--
-- Rationale for app-side aggregation:
--   Supabase RLS applies to the authenticated user’s project scope. Centralising
--   counts in JS via platformDb keeps behaviour aligned with existing policies.
--   Use this file when designing future RPCs or materialised views (SECURITY
--   INVOKER / careful RLS review required).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1) ORG PROJECT SCOPE (all v475 queries filter through this)
-- ---------------------------------------------------------------------------
--   SELECT id, account_id, status_id, planned_end_date, budget_amount,
--          actual_cost, updated_at, health_status, percentage_complete
--   FROM projects
--   WHERE account_id = :organization_id
--     AND is_deleted = FALSE;
--
-- project_statuses: join on projects.status_id for bucketProjectExecutiveKey
-- (active / completed / on hold / planned) in application code.

-- ---------------------------------------------------------------------------
-- 2) LATEST EVM SNAPSHOT PER PROJECT (rollup in JS: SUM EV, PV, AC; BAC from
--    projects.budget_amount)
-- ---------------------------------------------------------------------------
--   WITH latest AS (
--     SELECT DISTINCT ON (project_id)
--       project_id,
--       period_date,
--       planned_value,
--       earned_value,
--       actual_cost
--     FROM project_evm_snapshots
--     WHERE project_id = ANY (:project_ids)
--     ORDER BY project_id, period_date DESC
--   )
--   SELECT * FROM latest;
--
-- Portfolio / programme CPI, SPI: aggregate EV/PV/AC and BAC across the
-- relevant project_id set, then CPI = SUM(ev)/SUM(ac), SPI = SUM(ev)/SUM(pv)
-- (same as dashboardService computeEvmMetrics roll helper).

-- ---------------------------------------------------------------------------
-- 3) BASELINE COVERAGE
-- ---------------------------------------------------------------------------
--   SELECT DISTINCT project_id
--   FROM project_plans
--   WHERE project_id = ANY (:project_ids)
--     AND is_baseline = TRUE
--     AND is_deleted = FALSE;
-- Missing baseline count = org projects minus those with a row above.

-- ---------------------------------------------------------------------------
-- 4) STALE UPDATES (14 days)
-- ---------------------------------------------------------------------------
-- Projects (active bucket only in app):
--   updated_at < NOW() - INTERVAL '14 days'
-- Programmes linked to org via programme_projects:
--   programmes.updated_at < NOW() - INTERVAL '14 days'

-- ---------------------------------------------------------------------------
-- 5) CRITICAL PATH PROXY (tasks)
-- ---------------------------------------------------------------------------
-- Uses tasks.is_critical_path (see v18_gantt_enhancements.sql), not full CPM.
--   SELECT id, project_id, planned_end_date, due_date, percentage_complete,
--          is_blocked, is_milestone, is_critical_path
--   FROM tasks
--   WHERE project_id = ANY (:project_ids) AND is_deleted = FALSE;
-- task_dependencies: predecessor incomplete → successor “blocked” proxy.

-- ---------------------------------------------------------------------------
-- 6) RISKS (open + scores)
-- ---------------------------------------------------------------------------
-- Open: risks.status_enum NOT IN ('closed', 'expired') OR legacy status not in
-- closed/realized. Critical/high: pre_risk_score IN ('very_high','high') or
-- risk_level = 'critical'. Proximity: proximity = 'imminent'.
-- Unmitigated critical: critical open risk with no row in risk_responses.
--   SELECT id, project_id, status_enum, pre_risk_score, risk_level,
--          proximity, next_review_date, risk_owner_id, escalated_to_issue_id
--   FROM risks
--   WHERE project_id = ANY (:project_ids) AND is_deleted = FALSE;

-- ---------------------------------------------------------------------------
-- 7) ISSUES + ISSUE ACTIONS
-- ---------------------------------------------------------------------------
-- Open issues: status NOT IN ('closed','cancelled').
--   issue_actions: target_date < CURRENT_DATE and status in open action states.
--   Filter actions to issues whose project_id is in org scope.

-- ---------------------------------------------------------------------------
-- 8) CHANGE REQUESTS
-- ---------------------------------------------------------------------------
-- Open: status NOT IN ('implemented','rejected','cancelled').
-- Pending approval > 7 days: status = 'pending-approval' AND submission_date
--   < CURRENT_DATE - 7.

-- ---------------------------------------------------------------------------
-- 9) GOVERNANCE COMPLIANCE
-- ---------------------------------------------------------------------------
--   SELECT project_id, compliance_percentage, missing_mandatory_docs, ...
--   FROM pmo_document_compliance_view
--   WHERE project_id = ANY (:project_ids);
-- (Defined in v149_document_governance_views.sql.)

-- ---------------------------------------------------------------------------
-- 10) BENEFITS (programme-scoped)
-- ---------------------------------------------------------------------------
-- Org programmes via programme_projects → programme_ids, then:
--   SELECT target_value, realized_value FROM programme_benefits
--   WHERE programme_id = ANY (:programme_ids) AND is_deleted = FALSE;
-- Realization % ≈ SUM(realized_value) / NULLIF(SUM(target_value),0).

-- ---------------------------------------------------------------------------
-- 11) PROGRAMME DEPENDENCIES (blocked / high risk proxy)
-- ---------------------------------------------------------------------------
-- programme_dependencies: dependency_status IN
-- ('identified','confirmed','active') AND risk_level IN ('high','critical').

-- ---------------------------------------------------------------------------
-- 12) RESOURCE OVER-ALLOCATION
-- ---------------------------------------------------------------------------
-- cross_project_resource_allocations: SUM(allocation_percentage) per
-- resource_id across org projects; conflict if sum > 100.

-- ============================================================================
-- End of reference. No DDL above.
-- ============================================================================

-- Sanity check when executed in psql / Supabase SQL editor (returns one row):
SELECT
  1 AS v475_reference_ok,
  'v475_pmo_dashboard_metrics_reference.sql — see comments for metric mapping'::text AS note;
