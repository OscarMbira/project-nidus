-- Migration: v111_subscriptions_project_link.sql
-- Description: Link platform_subscriptions to specific projects
-- Author: Claude AI
-- Date: 2025-12-11
-- Dependencies: Requires v90_rename_pm_to_platform.sql and v110_projects_trial_mode.sql
-- Note: Table was renamed from pm_subscriptions to platform_subscriptions in v90

-- Add project_id and member limit columns to platform_subscriptions
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS member_limit INTEGER DEFAULT 20;
ALTER TABLE platform_subscriptions ADD COLUMN IF NOT EXISTS additional_members INTEGER DEFAULT 0;

-- Add comments to document the new columns
COMMENT ON COLUMN platform_subscriptions.project_id IS 'Links subscription to a specific project (one subscription per project)';
COMMENT ON COLUMN platform_subscriptions.member_limit IS 'Base member limit included in this subscription plan';
COMMENT ON COLUMN platform_subscriptions.additional_members IS 'Number of additional members purchased beyond base limit';

-- Create index for project-subscription lookup
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_project ON platform_subscriptions(project_id)
WHERE project_id IS NOT NULL;

-- Create index for active subscriptions by user
CREATE INDEX IF NOT EXISTS idx_platform_subscriptions_user_active ON platform_subscriptions(user_id, status)
WHERE status = 'active';

-- Add unique constraint: one active subscription per project
CREATE UNIQUE INDEX IF NOT EXISTS idx_platform_subscriptions_project_unique
ON platform_subscriptions(project_id)
WHERE status = 'active' AND project_id IS NOT NULL;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration v111 completed: Linked platform_subscriptions to projects';
END $$;
