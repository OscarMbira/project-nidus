-- ============================================================================
-- v963z: Benefits Transition / Archive at closure (PMIS Core Gap Closure — Phase 7)
-- projectplan/v963_pmis_core_gap_closure_plan.md / projectprd/v963_pmis_core_gap_closure_PRD.md
--
-- Extends the EXISTING public.project_closures table (SQL/v30_closing_project.sql) rather than
-- creating a new one, per the PRD's framing of this as an extension.
--
-- Judgment call: the real closure record is public.project_closures (confirmed via
-- apps/platform/src/services/closingProjectService.js's fetchProjectClosure/
-- createProjectClosure/updateProjectClosure, all of which target 'project_closures').
-- apps/platform/src/services/projectClosureChecklistService.js is a DIFFERENT feature (a
-- process-template-driven checklist via processTemplateCrudFactory / PM Local Forms), not the
-- closure record itself — it is NOT touched by this migration.
--
-- No sim.project_closures mirror: apps/simulator/src/services/closingProjectService.js is a
-- byte-identical copy of the Platform service that also imports `supabase` (=platformDb, public
-- schema) rather than simDb — the Simulator closure flow already reads/writes this same
-- public.project_closures table. There is no separate sim-schema closures table to extend.
-- ============================================================================

ALTER TABLE public.project_closures
  ADD COLUMN IF NOT EXISTS benefits_transition_status VARCHAR(50) NOT NULL DEFAULT 'not_started'
    CHECK (benefits_transition_status IN ('not_started', 'in_progress', 'complete')),
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS archived_by UUID REFERENCES public.users(id);

CREATE INDEX IF NOT EXISTS idx_project_closures_benefits_transition_status
  ON public.project_closures(benefits_transition_status) WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_project_closures_archived_at
  ON public.project_closures(archived_at) WHERE archived_at IS NOT NULL;

COMMENT ON COLUMN public.project_closures.benefits_transition_status IS
  'v963 Phase 7 — tracks handover of benefits realization ownership from the project to BAU/operations at closure: not_started, in_progress, complete.';
COMMENT ON COLUMN public.project_closures.archived_at IS
  'v963 Phase 7 — when this closure record (and, by convention, its project) was archived. NULL = not archived.';
COMMENT ON COLUMN public.project_closures.archived_by IS
  'v963 Phase 7 — user who archived this closure record.';

-- database_tables registry (project_closures already registered by v30 — refresh description).
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('project_closures', 'Main project closure records and tracking, including benefits transition status and archive metadata (v963 Phase 7)', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v963z_project_closures_benefits_transition_archive.sql applied'; END $$;
