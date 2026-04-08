-- ============================================================================
-- Add Project Code and Project Name to Project Mandates
-- Version: v250
-- Description: Add optional project_code and project_name fields to project_mandates table
-- Date: 2026-01-26
-- ============================================================================
--
-- Purpose:
-- Allow capturing project code and name at mandate creation stage, even though
-- the project may not exist yet. These fields are optional since they may not
-- be available when the mandate is being created.
--
-- Prerequisites:
-- - v160_project_mandate_tables.sql must be run first
--
-- ============================================================================

-- Add project_code field (optional, VARCHAR to match projects table)
ALTER TABLE project_mandates 
ADD COLUMN IF NOT EXISTS project_code VARCHAR(50);

-- Add project_name field (optional, VARCHAR to match projects table)
ALTER TABLE project_mandates 
ADD COLUMN IF NOT EXISTS project_name VARCHAR(200);

-- Add comments for documentation
COMMENT ON COLUMN project_mandates.project_code IS 'Optional: Project code if known at mandate creation. May not be available until project is created.';
COMMENT ON COLUMN project_mandates.project_name IS 'Optional: Project name if known at mandate creation. May not be available until project is created.';

-- Note: No unique constraint on project_code since:
-- 1. It's optional and may be NULL
-- 2. Multiple mandates may reference the same project code before project creation
-- 3. The actual unique constraint exists on the projects table
