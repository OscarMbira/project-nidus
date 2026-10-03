-- =============================================================================
-- v1095: project_governance_structure — bodies, reporting lines, decision flow
-- Prerequisites: v1020 (project_governance_structure)
-- =============================================================================

ALTER TABLE public.project_governance_structure
  ADD COLUMN IF NOT EXISTS governance_bodies TEXT,
  ADD COLUMN IF NOT EXISTS reporting_lines TEXT,
  ADD COLUMN IF NOT EXISTS decision_flow TEXT;

COMMENT ON COLUMN public.project_governance_structure.governance_bodies IS
  'v1095: Which governance bodies apply (newline-joined list). Membership stays on Steering Committee / Project Board pages.';
COMMENT ON COLUMN public.project_governance_structure.reporting_lines IS
  'v1095: Reporting relationships (newline-joined; one relationship per line).';
COMMENT ON COLUMN public.project_governance_structure.decision_flow IS
  'v1095: How decisions are made / escalated through authority levels (newline-joined list).';
COMMENT ON COLUMN public.project_governance_structure.structure_notes IS
  'Optional free-text overview of the governance model (narrative). Structured capture is in governance_bodies / reporting_lines / decision_flow.';

DO $$
BEGIN
  RAISE NOTICE 'v1095: project_governance_structure bodies / reporting_lines / decision_flow added';
END $$;
