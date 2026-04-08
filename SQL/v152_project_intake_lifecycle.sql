-- ================================================
-- File: v152_project_intake_lifecycle.sql
-- Description: Add project intake lifecycle fields
-- Version: 1.0
-- Date: 2026-01-12
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- Phase: 1 of 6 - PMO Project Creation Governance Upgrade
-- ================================================

-- Prerequisites:
-- - v04_project_core_tables.sql must be run (projects table exists)
-- - v03_user_access_tables.sql must be run (users table exists)

-- Purpose:
-- Adds intake lifecycle fields to projects table to support:
-- - Draft → Authorised workflow
-- - Tracking who created and authorised projects
-- - Rejection and suspension reasons

-- ================================================
-- ADD LIFECYCLE FIELDS TO PROJECTS TABLE
-- ================================================

-- Add intake_status field with default 'draft'
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS intake_status VARCHAR(50) DEFAULT 'draft';

-- Add tracking fields for lifecycle actors
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS created_by_user_id UUID REFERENCES users(id);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS authorised_by_user_id UUID REFERENCES users(id);

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS authorised_at TIMESTAMP;

-- Add rejection and suspension tracking
ALTER TABLE projects
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE projects
ADD COLUMN IF NOT EXISTS suspended_reason TEXT;

-- ================================================
-- ADD CONSTRAINTS
-- ================================================

-- Constraint for intake_status values
ALTER TABLE projects
ADD CONSTRAINT chk_projects_intake_status
CHECK (intake_status IN ('draft', 'readiness_pending', 'authorised', 'rejected', 'suspended'));

-- ================================================
-- ADD INDEXES FOR PERFORMANCE
-- ================================================

-- Index on intake_status for filtering
CREATE INDEX IF NOT EXISTS idx_projects_intake_status
ON projects(intake_status)
WHERE is_deleted = FALSE;

-- Index on authorised_by for audit queries
CREATE INDEX IF NOT EXISTS idx_projects_authorised_by
ON projects(authorised_by_user_id);

-- Index on created_by for ownership queries
CREATE INDEX IF NOT EXISTS idx_projects_created_by
ON projects(created_by_user_id);

-- ================================================
-- ADD COMMENTS
-- ================================================

COMMENT ON COLUMN projects.intake_status IS 'Project intake lifecycle status: draft (initial), readiness_pending (validation in progress), authorised (approved for execution), rejected (declined), suspended (temporarily halted)';

COMMENT ON COLUMN projects.created_by_user_id IS 'User who created this project record (PMO officer)';

COMMENT ON COLUMN projects.authorised_by_user_id IS 'User who authorised this project for execution (PMO admin)';

COMMENT ON COLUMN projects.authorised_at IS 'Timestamp when project was authorised';

COMMENT ON COLUMN projects.rejection_reason IS 'Reason for project rejection (populated when intake_status = rejected)';

COMMENT ON COLUMN projects.suspended_reason IS 'Reason for project suspension (populated when intake_status = suspended)';

-- ================================================
-- UPDATE EXISTING PROJECTS (MIGRATION SAFETY)
-- ================================================

-- Set intake_status to 'authorised' for all existing projects
-- This ensures backward compatibility - existing projects are already active
UPDATE projects
SET intake_status = 'authorised',
    created_by_user_id = created_by,
    authorised_by_user_id = created_by,
    authorised_at = created_at
WHERE intake_status IS NULL
  AND is_deleted = FALSE;

-- ================================================
-- REGISTER TABLE UPDATE
-- ================================================

-- Update table description to reflect new lifecycle support
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES ('projects', 'Main project records with intake lifecycle support (draft → authorised workflow)', false, true, 'project')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_intake_status_exists BOOLEAN;
    v_created_by_user_id_exists BOOLEAN;
    v_authorised_by_user_id_exists BOOLEAN;
    v_constraint_exists BOOLEAN;
    v_existing_projects_count INTEGER;
    v_migrated_projects_count INTEGER;
BEGIN
    -- Check if intake_status column exists
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
          AND column_name = 'intake_status'
    ) INTO v_intake_status_exists;

    -- Check if created_by_user_id column exists
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
          AND column_name = 'created_by_user_id'
    ) INTO v_created_by_user_id_exists;

    -- Check if authorised_by_user_id column exists
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.columns
        WHERE table_name = 'projects'
          AND column_name = 'authorised_by_user_id'
    ) INTO v_authorised_by_user_id_exists;

    -- Check if constraint exists
    SELECT EXISTS(
        SELECT 1
        FROM information_schema.constraint_column_usage
        WHERE constraint_name = 'chk_projects_intake_status'
    ) INTO v_constraint_exists;

    -- Count existing projects
    SELECT COUNT(*) INTO v_existing_projects_count
    FROM projects
    WHERE is_deleted = FALSE;

    -- Count migrated projects (with intake_status set)
    SELECT COUNT(*) INTO v_migrated_projects_count
    FROM projects
    WHERE intake_status IS NOT NULL
      AND is_deleted = FALSE;

    -- Verification results
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Phase 1: Project Intake Lifecycle Migration';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Column intake_status exists: %', v_intake_status_exists;
    RAISE NOTICE 'Column created_by_user_id exists: %', v_created_by_user_id_exists;
    RAISE NOTICE 'Column authorised_by_user_id exists: %', v_authorised_by_user_id_exists;
    RAISE NOTICE 'Constraint chk_projects_intake_status exists: %', v_constraint_exists;
    RAISE NOTICE 'Total existing projects: %', v_existing_projects_count;
    RAISE NOTICE 'Projects with intake_status: %', v_migrated_projects_count;
    RAISE NOTICE '================================================';

    IF NOT v_intake_status_exists THEN
        RAISE EXCEPTION 'Column intake_status was not created';
    END IF;

    IF NOT v_created_by_user_id_exists THEN
        RAISE EXCEPTION 'Column created_by_user_id was not created';
    END IF;

    IF NOT v_authorised_by_user_id_exists THEN
        RAISE EXCEPTION 'Column authorised_by_user_id was not created';
    END IF;

    IF NOT v_constraint_exists THEN
        RAISE EXCEPTION 'Constraint chk_projects_intake_status was not created';
    END IF;

    RAISE NOTICE 'v152_project_intake_lifecycle.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- 1. Update frontend (ProjectsCreate.jsx) to use intake_status field
-- 2. Add "Save Draft" button alongside "Create Project"
-- 3. Update projectService.js to accept new fields
-- 4. Proceed to Phase 2: Add governance fields
