-- =============================================================================
-- v244: Practice Document Governance Fields Migration
-- Purpose: Add governance columns to practice document tables in sim schema for PMO/PM dashboard enforcement
-- PRD Reference: Simulator_PMO_PM_Independent_Dashboards_Implementation_Plan.md Phase 7
-- =============================================================================

-- Add governance columns to practice_communication_management_strategies
ALTER TABLE sim.practice_communication_management_strategies
  ADD COLUMN IF NOT EXISTS initiated_by_role TEXT CHECK (initiated_by_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS primary_author_role TEXT CHECK (primary_author_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS governance_owner TEXT CHECK (governance_owner IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS baseline_document_id UUID,
  ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tailoring_justification TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft', 'refined', 'approved', 'under_review', 'archived')),
  ADD COLUMN IF NOT EXISTS pm_permission TEXT DEFAULT 'tailor' CHECK (pm_permission IN ('read', 'write', 'tailor')),
  ADD COLUMN IF NOT EXISTS pmo_permission TEXT DEFAULT 'write' CHECK (pmo_permission IN ('read', 'write', 'approve'));

-- Add governance columns to practice_configuration_management_strategies
ALTER TABLE sim.practice_configuration_management_strategies
  ADD COLUMN IF NOT EXISTS initiated_by_role TEXT CHECK (initiated_by_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS primary_author_role TEXT CHECK (primary_author_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS governance_owner TEXT CHECK (governance_owner IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS baseline_document_id UUID,
  ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tailoring_justification TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft', 'refined', 'approved', 'under_review', 'archived')),
  ADD COLUMN IF NOT EXISTS pm_permission TEXT DEFAULT 'tailor' CHECK (pm_permission IN ('read', 'write', 'tailor')),
  ADD COLUMN IF NOT EXISTS pmo_permission TEXT DEFAULT 'write' CHECK (pmo_permission IN ('read', 'write', 'approve'));

-- Add governance columns to practice_quality_management_strategies
ALTER TABLE sim.practice_quality_management_strategies
  ADD COLUMN IF NOT EXISTS initiated_by_role TEXT CHECK (initiated_by_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS primary_author_role TEXT CHECK (primary_author_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS governance_owner TEXT CHECK (governance_owner IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS baseline_document_id UUID,
  ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tailoring_justification TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft', 'refined', 'approved', 'under_review', 'archived')),
  ADD COLUMN IF NOT EXISTS pm_permission TEXT DEFAULT 'tailor' CHECK (pm_permission IN ('read', 'write', 'tailor')),
  ADD COLUMN IF NOT EXISTS pmo_permission TEXT DEFAULT 'write' CHECK (pmo_permission IN ('read', 'write', 'approve'));

-- Add governance columns to practice_risk_management_strategies
ALTER TABLE sim.practice_risk_management_strategies
  ADD COLUMN IF NOT EXISTS initiated_by_role TEXT CHECK (initiated_by_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS primary_author_role TEXT CHECK (primary_author_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS governance_owner TEXT CHECK (governance_owner IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS baseline_document_id UUID,
  ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tailoring_justification TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft', 'refined', 'approved', 'under_review', 'archived')),
  ADD COLUMN IF NOT EXISTS pm_permission TEXT DEFAULT 'tailor' CHECK (pm_permission IN ('read', 'write', 'tailor')),
  ADD COLUMN IF NOT EXISTS pmo_permission TEXT DEFAULT 'write' CHECK (pmo_permission IN ('read', 'write', 'approve'));

-- Add governance columns to practice_project_briefs
ALTER TABLE sim.practice_project_briefs
  ADD COLUMN IF NOT EXISTS initiated_by_role TEXT CHECK (initiated_by_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS primary_author_role TEXT CHECK (primary_author_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS governance_owner TEXT CHECK (governance_owner IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS baseline_document_id UUID,
  ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tailoring_justification TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft', 'refined', 'approved', 'under_review', 'archived')),
  ADD COLUMN IF NOT EXISTS pm_permission TEXT DEFAULT 'write' CHECK (pm_permission IN ('read', 'write', 'tailor')),
  ADD COLUMN IF NOT EXISTS pmo_permission TEXT DEFAULT 'approve' CHECK (pmo_permission IN ('read', 'write', 'approve'));

-- Add governance columns to practice_business_cases
ALTER TABLE sim.practice_business_cases
  ADD COLUMN IF NOT EXISTS initiated_by_role TEXT CHECK (initiated_by_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS primary_author_role TEXT CHECK (primary_author_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS governance_owner TEXT CHECK (governance_owner IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS baseline_document_id UUID,
  ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tailoring_justification TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft', 'refined', 'approved', 'under_review', 'archived')),
  ADD COLUMN IF NOT EXISTS pm_permission TEXT DEFAULT 'write' CHECK (pm_permission IN ('read', 'write', 'tailor')),
  ADD COLUMN IF NOT EXISTS pmo_permission TEXT DEFAULT 'approve' CHECK (pmo_permission IN ('read', 'write', 'approve'));

-- Add governance columns to practice_benefits_review_plans
ALTER TABLE sim.practice_benefits_review_plans
  ADD COLUMN IF NOT EXISTS initiated_by_role TEXT CHECK (initiated_by_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS primary_author_role TEXT CHECK (primary_author_role IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS governance_owner TEXT CHECK (governance_owner IN ('PMO', 'PM')),
  ADD COLUMN IF NOT EXISTS is_baseline BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS baseline_document_id UUID,
  ADD COLUMN IF NOT EXISTS is_tailored BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS tailoring_justification TEXT,
  ADD COLUMN IF NOT EXISTS lifecycle_stage TEXT DEFAULT 'draft' CHECK (lifecycle_stage IN ('draft', 'refined', 'approved', 'under_review', 'archived')),
  ADD COLUMN IF NOT EXISTS pm_permission TEXT DEFAULT 'write' CHECK (pm_permission IN ('read', 'write', 'tailor')),
  ADD COLUMN IF NOT EXISTS pmo_permission TEXT DEFAULT 'approve' CHECK (pmo_permission IN ('read', 'write', 'approve'));

-- Add self-referencing foreign key for baseline_document_id where applicable
-- (Only for practice strategy tables that support tailoring)
DO $$
BEGIN
  -- Add foreign key for practice_communication_management_strategies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_practice_cms_baseline' 
    AND table_schema = 'sim'
  ) THEN
    ALTER TABLE sim.practice_communication_management_strategies
      ADD CONSTRAINT fk_practice_cms_baseline 
      FOREIGN KEY (baseline_document_id) 
      REFERENCES sim.practice_communication_management_strategies(id);
  END IF;

  -- Add foreign key for practice_configuration_management_strategies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_practice_config_ms_baseline' 
    AND table_schema = 'sim'
  ) THEN
    ALTER TABLE sim.practice_configuration_management_strategies
      ADD CONSTRAINT fk_practice_config_ms_baseline 
      FOREIGN KEY (baseline_document_id) 
      REFERENCES sim.practice_configuration_management_strategies(id);
  END IF;

  -- Add foreign key for practice_quality_management_strategies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_practice_qms_baseline' 
    AND table_schema = 'sim'
  ) THEN
    ALTER TABLE sim.practice_quality_management_strategies
      ADD CONSTRAINT fk_practice_qms_baseline 
      FOREIGN KEY (baseline_document_id) 
      REFERENCES sim.practice_quality_management_strategies(id);
  END IF;

  -- Add foreign key for practice_risk_management_strategies
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_practice_rms_baseline' 
    AND table_schema = 'sim'
  ) THEN
    ALTER TABLE sim.practice_risk_management_strategies
      ADD CONSTRAINT fk_practice_rms_baseline 
      FOREIGN KEY (baseline_document_id) 
      REFERENCES sim.practice_risk_management_strategies(id);
  END IF;

  -- Add foreign key for practice_project_briefs
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_practice_briefs_baseline' 
    AND table_schema = 'sim'
  ) THEN
    ALTER TABLE sim.practice_project_briefs
      ADD CONSTRAINT fk_practice_briefs_baseline 
      FOREIGN KEY (baseline_document_id) 
      REFERENCES sim.practice_project_briefs(id);
  END IF;
END $$;

-- Add comments
COMMENT ON COLUMN sim.practice_communication_management_strategies.initiated_by_role IS 'Role that initiated this practice document (PMO or PM)';
COMMENT ON COLUMN sim.practice_communication_management_strategies.is_baseline IS 'Whether this is a practice baseline document (PMO-authored organizational standard)';
COMMENT ON COLUMN sim.practice_communication_management_strategies.is_tailored IS 'Whether this is a tailored copy of a practice baseline';
COMMENT ON COLUMN sim.practice_communication_management_strategies.lifecycle_stage IS 'Current lifecycle stage of the practice document';
