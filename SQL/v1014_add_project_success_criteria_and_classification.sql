-- ============================================================================
-- v1014: Add success_criteria and project_classification to projects
-- ============================================================================
-- Phase 13 (verify/extend) of projectplan/v966_core_pm_menu_rationalisation_plan.md
-- found taxonomy §3's "Project Setup > Project Details" leaves Success Criteria and
-- Classification had no backing fields anywhere (Overview/Objectives/Metadata were
-- already covered by existing project fields; these two were not).
--
-- Platform only — no Simulator equivalent. There is no sim.projects table: Simulator's
-- real project concept is sim.practice_projects (see practiceProjectService.js), a much
-- simpler, purpose-built table (project_name/description/type/status/dates/budget/
-- priority only — no methodology, business case, tolerances, or industry classification
-- at all). It isn't a lagging mirror of public.projects, so this rich taxonomy field pair
-- doesn't map onto it the way rule 34.1 parity normally would; see
-- Documentation memory note project_simulator_projects_change_pages_dead.md for the full
-- discovery (the apps/simulator/src/pages/Projects*.jsx trio that WOULD have mirrored this
-- is itself dead, unmounted code).
--
-- success_criteria: free-text, one criterion per line (same MultiLineListInput
-- pattern as v1009's project_constraints/project_assumptions/key_deliverables/
-- required_approvals).
-- project_classification: fixed 3-value strategic tier, per user decision
-- (2026-09-07) — Strategic / Tactical / Operational, distinct from Methodology
-- (delivery_methodology) and Project Type (project_type_id), which already exist.
-- ============================================================================

ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS success_criteria TEXT;
ALTER TABLE public.projects ADD COLUMN IF NOT EXISTS project_classification TEXT;

ALTER TABLE public.projects DROP CONSTRAINT IF EXISTS projects_classification_check;
ALTER TABLE public.projects ADD CONSTRAINT projects_classification_check
  CHECK (project_classification IS NULL OR project_classification IN ('strategic', 'tactical', 'operational'));

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1014: success_criteria + project_classification added to public.projects (Platform only — see file header)';
  RAISE NOTICE '================================================';
END $$;
