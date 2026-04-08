-- =============================================================================
-- v224: Document Governance Fields Migration
-- Purpose: Add governance columns to document tables for PMO/PM dashboard enforcement
-- PRD Reference: Documents/PMO_PM_Independent_Dashboards_PRD.md Section 8
-- =============================================================================

-- Add governance columns to communication_management_strategies
ALTER TABLE communication_management_strategies
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

-- Add governance columns to configuration_management_strategies
ALTER TABLE configuration_management_strategies
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

-- Add governance columns to quality_management_strategies
ALTER TABLE quality_management_strategies
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

-- Add governance columns to risk_management_strategies
ALTER TABLE risk_management_strategies
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

-- Add governance columns to project_mandates
ALTER TABLE project_mandates
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

-- Add governance columns to project_briefs
ALTER TABLE project_briefs
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

-- Add governance columns to benefits_review_plans
ALTER TABLE benefits_review_plans
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
-- (Only for strategy tables that support tailoring)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cms_baseline' AND table_name = 'communication_management_strategies'
  ) THEN
    ALTER TABLE communication_management_strategies
      ADD CONSTRAINT fk_cms_baseline FOREIGN KEY (baseline_document_id)
      REFERENCES communication_management_strategies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_cfgms_baseline' AND table_name = 'configuration_management_strategies'
  ) THEN
    ALTER TABLE configuration_management_strategies
      ADD CONSTRAINT fk_cfgms_baseline FOREIGN KEY (baseline_document_id)
      REFERENCES configuration_management_strategies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_qms_baseline' AND table_name = 'quality_management_strategies'
  ) THEN
    ALTER TABLE quality_management_strategies
      ADD CONSTRAINT fk_qms_baseline FOREIGN KEY (baseline_document_id)
      REFERENCES quality_management_strategies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_rms_baseline' AND table_name = 'risk_management_strategies'
  ) THEN
    ALTER TABLE risk_management_strategies
      ADD CONSTRAINT fk_rms_baseline FOREIGN KEY (baseline_document_id)
      REFERENCES risk_management_strategies(id) ON DELETE SET NULL;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_mandates_baseline' AND table_name = 'project_mandates'
  ) THEN
    ALTER TABLE project_mandates
      ADD CONSTRAINT fk_mandates_baseline FOREIGN KEY (baseline_document_id)
      REFERENCES project_mandates(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create indexes for governance queries
CREATE INDEX IF NOT EXISTS idx_cms_baseline ON communication_management_strategies(is_baseline) WHERE is_baseline = TRUE;
CREATE INDEX IF NOT EXISTS idx_cfgms_baseline ON configuration_management_strategies(is_baseline) WHERE is_baseline = TRUE;
CREATE INDEX IF NOT EXISTS idx_qms_baseline ON quality_management_strategies(is_baseline) WHERE is_baseline = TRUE;
CREATE INDEX IF NOT EXISTS idx_rms_baseline ON risk_management_strategies(is_baseline) WHERE is_baseline = TRUE;
CREATE INDEX IF NOT EXISTS idx_mandates_baseline ON project_mandates(is_baseline) WHERE is_baseline = TRUE;
CREATE INDEX IF NOT EXISTS idx_briefs_lifecycle ON project_briefs(lifecycle_stage);
CREATE INDEX IF NOT EXISTS idx_benefits_lifecycle ON benefits_review_plans(lifecycle_stage);
