-- =============================================================================
-- v1009: Add Constraints, Assumptions, Deliverables, Required Approvals to projects
-- Purpose: New free-text project wizard fields (Platform + Simulator share
--          public.projects, so a single migration covers both apps' Create/Edit
--          wizards). Stakeholders and Main Milestones are deliberately NOT new
--          columns here — they link out to the existing stakeholders / milestones
--          registers instead of duplicating those features.
-- =============================================================================

ALTER TABLE projects
  ADD COLUMN IF NOT EXISTS project_constraints TEXT,
  ADD COLUMN IF NOT EXISTS project_assumptions TEXT,
  ADD COLUMN IF NOT EXISTS key_deliverables TEXT,
  ADD COLUMN IF NOT EXISTS required_approvals TEXT;

COMMENT ON COLUMN projects.project_constraints IS 'Free-text known constraints for the project (schedule, budget, resource, technical, etc.), captured via the project wizard.';
COMMENT ON COLUMN projects.project_assumptions IS 'Free-text planning assumptions for the project, captured via the project wizard.';
COMMENT ON COLUMN projects.key_deliverables IS 'Free-text list of key project deliverables, captured via the project wizard. Distinct from the PRINCE2-specific product_deliverables table used by Managing Product Delivery.';
COMMENT ON COLUMN projects.required_approvals IS 'Free-text list of required approvals/sign-offs for the project, captured via the project wizard.';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1009_add_project_planning_narrative_fields.sql completed successfully';
  RAISE NOTICE 'Added to projects: project_constraints, project_assumptions, key_deliverables, required_approvals';
  RAISE NOTICE '================================================';
END $$;
