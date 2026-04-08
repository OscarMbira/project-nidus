-- ================================================
-- File: v266_project_tolerance_quality_risk_benefits.sql
-- Description: Add Quality, Risk, and Benefits tolerance fields to projects (after scope tolerance).
-- Version: 1.0
-- ================================================

-- Add tolerance columns (text descriptions, same pattern as tolerance_scope_description)
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS tolerance_quality_description TEXT;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS tolerance_risk_description TEXT;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS tolerance_benefits_description TEXT;

-- Comments
COMMENT ON COLUMN projects.tolerance_quality_description IS 'Description of acceptable quality variance without escalation';
COMMENT ON COLUMN projects.tolerance_risk_description IS 'Description of acceptable risk tolerance or thresholds';
COMMENT ON COLUMN projects.tolerance_benefits_description IS 'Description of acceptable benefits variance without escalation';
