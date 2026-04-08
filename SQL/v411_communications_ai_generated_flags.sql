-- ============================================================================
-- v411: AI-generated flags on issues / risks (Platform + Simulator practice)
-- Prerequisites: issues, risks, sim.practice_issues, sim.practice_risks (v233/v232)
-- ============================================================================

ALTER TABLE public.issues
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_source_type VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN public.issues.is_ai_generated IS 'TRUE when created or pre-filled by AI (e.g. meeting extraction).';
COMMENT ON COLUMN public.issues.ai_source_type IS 'Source discriminator, e.g. meeting_extraction.';

CREATE INDEX IF NOT EXISTS idx_issues_ai_draft
  ON public.issues (project_id, is_ai_generated)
  WHERE is_ai_generated = TRUE AND status = 'draft' AND COALESCE(is_deleted, FALSE) = FALSE;

ALTER TABLE public.risks
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_source_type VARCHAR(50) DEFAULT NULL;

COMMENT ON COLUMN public.risks.is_ai_generated IS 'TRUE when created or pre-filled by AI (e.g. meeting extraction).';
COMMENT ON COLUMN public.risks.ai_source_type IS 'Source discriminator, e.g. meeting_extraction.';

CREATE INDEX IF NOT EXISTS idx_risks_ai_draft
  ON public.risks (project_id, is_ai_generated)
  WHERE is_ai_generated = TRUE AND status = 'draft' AND COALESCE(is_deleted, FALSE) = FALSE;

-- Simulator: practice_issues — add draft to status constraint
ALTER TABLE sim.practice_issues DROP CONSTRAINT IF EXISTS practice_issues_status_check;

ALTER TABLE sim.practice_issues
  ADD CONSTRAINT practice_issues_status_check
  CHECK (status IN ('draft', 'new', 'assigned', 'in_progress', 'resolved', 'closed', 'reopened', 'cancelled'));

ALTER TABLE sim.practice_issues
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_source_type VARCHAR(50) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sim_practice_issues_ai_draft
  ON sim.practice_issues (practice_project_id, is_ai_generated)
  WHERE is_ai_generated = TRUE AND status = 'draft' AND COALESCE(is_deleted, FALSE) = FALSE;

-- Simulator: practice_risks — add draft to status constraint
ALTER TABLE sim.practice_risks DROP CONSTRAINT IF EXISTS practice_risks_status_check;

ALTER TABLE sim.practice_risks
  ADD CONSTRAINT practice_risks_status_check
  CHECK (status IN ('draft', 'identified', 'assessed', 'mitigated', 'monitored', 'closed', 'realized'));

ALTER TABLE sim.practice_risks
  ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_source_type VARCHAR(50) DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_sim_practice_risks_ai_draft
  ON sim.practice_risks (practice_project_id, is_ai_generated)
  WHERE is_ai_generated = TRUE AND status = 'draft' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE 'v411_communications_ai_generated_flags.sql applied';
END $$;
