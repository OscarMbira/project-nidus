-- Migration: v110_projects_trial_mode.sql
-- Description: Add trial mode tracking to projects table
-- Author: Claude AI
-- Date: 2025-12-11
-- Dependencies: Requires v109_accounts_trial_enhancements.sql

-- Add trial mode and tracking columns to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS project_mode VARCHAR(20)
    CHECK (project_mode IN ('trial', 'paid')) DEFAULT 'paid';

ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_expiry_date TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS member_limit INTEGER DEFAULT 20;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS current_member_count INTEGER DEFAULT 0;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS trial_upgraded_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS locked_at TIMESTAMP WITH TIME ZONE;

-- Add comments to document the new columns
COMMENT ON COLUMN projects.project_mode IS 'Project type: trial (10-day, 5 members) or paid (subscription-based)';
COMMENT ON COLUMN projects.trial_start_date IS 'Start date of trial period (set automatically when project_mode = trial)';
COMMENT ON COLUMN projects.trial_expiry_date IS 'Expiry date of trial period (trial_start_date + 10 days)';
COMMENT ON COLUMN projects.member_limit IS 'Maximum number of team members allowed (5 for trial, 20+ for paid)';
COMMENT ON COLUMN projects.current_member_count IS 'Current number of active team members in this project';
COMMENT ON COLUMN projects.trial_upgraded_at IS 'Timestamp when trial project was upgraded to paid';
COMMENT ON COLUMN projects.locked_at IS 'Timestamp when project was locked (due to trial expiry or other reasons)';

-- Add check constraint for trial project member limit
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_trial_member_limit;
ALTER TABLE projects ADD CONSTRAINT check_trial_member_limit
    CHECK (
        (project_mode = 'trial' AND member_limit <= 5) OR
        (project_mode = 'paid' AND member_limit >= 20) OR
        project_mode IS NULL
    );

-- Create index for trial expiry queries (used by cron job)
-- Note: status_id is a foreign key, so we check locked_at instead of status
CREATE INDEX IF NOT EXISTS idx_projects_trial_expiry ON projects(trial_expiry_date)
WHERE project_mode = 'trial' AND locked_at IS NULL AND is_deleted = FALSE;

-- Create index for project mode filtering
CREATE INDEX IF NOT EXISTS idx_projects_mode ON projects(project_mode, is_deleted)
WHERE project_mode IS NOT NULL;

-- Create index for member count tracking
CREATE INDEX IF NOT EXISTS idx_projects_member_count ON projects(current_member_count, member_limit)
WHERE is_deleted = FALSE;

-- Update existing projects to set default project_mode as 'paid'
-- (Assumption: all existing projects are paid projects)
UPDATE projects
SET project_mode = 'paid'
WHERE project_mode IS NULL;

-- Ensure existing projects have member_limit set
UPDATE projects
SET member_limit = 20
WHERE member_limit IS NULL OR member_limit = 0;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration v110 completed: Added trial mode tracking to projects table';
END $$;
