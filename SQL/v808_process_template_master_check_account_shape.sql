-- =============================================================================
-- v808: Add the account-level shape to the process_template master/project CHECK
-- constraint — v632's constraint was never updated when v804 added this shape
-- to RLS, so account-level copies (is_master=false, project_id=NULL,
-- account_id=<org>) pass RLS but are rejected at the CHECK-constraint level:
--   ERROR: new row for relation "team_performance_assessments" violates check
--   constraint "team_performance_assessments_master_project_check"
--
-- Why this happens: copyTemplateNodeForAccount's primary path (no project
-- context — "PMO customises the org's own copy of a Global template",
-- pmTemplateCopyService.js) inserts exactly this shape by design. v804's own
-- comment ("This is an RLS-only change, no column/schema change needed") was
-- the wrong assumption — the v632 CHECK constraint is a separate, additional
-- gate that RLS passing does not bypass.
--
-- Scope: public schema only, same 24 tables as v632/v804. Sim's mirror tables
-- have no RLS policies at all yet (flagged in v804, still unfixed, unrelated
-- to this CHECK-constraint-only change) — not touched here.
-- =============================================================================

DO $$
DECLARE
  t text;
  public_tables text[] := ARRAY[
    'project_charters', 'assumption_logs', 'project_management_plans',
    'requirements_management_plans', 'requirements_documentation', 'wbs_dictionary_entries',
    'activity_attributes', 'activity_resource_requirements', 'resource_breakdown_structure',
    'activity_duration_estimates', 'cost_management_plans', 'activity_cost_estimates',
    'cost_baselines', 'resource_management_plans', 'stakeholder_engagement_plans',
    'procurement_management_plans', 'quality_checklists', 'team_performance_assessments',
    'make_or_buy_decisions', 'variance_analysis_reports', 'evm_status_reports',
    'scope_acceptance_forms', 'project_closure_checklists', 'contract_closure_documents'
  ];
BEGIN
  FOREACH t IN ARRAY public_tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I_master_project_check',
      t, t
    );
    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I_master_project_check CHECK (
        (is_master = true AND project_id IS NULL)
        OR (is_master = false AND project_id IS NOT NULL)
        OR (is_master = false AND project_id IS NULL AND account_id IS NOT NULL)
      )',
      t, t
    );
  END LOOP;
END $$;

DO $$
BEGIN
  RAISE NOTICE 'v808: process_template master/project CHECK constraint now allows the account-level shape (24 public tables).';
END $$;
