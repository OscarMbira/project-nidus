-- Migration: v112_trial_project_tracking.sql
-- Description: Create trial_project_tracking table for monitoring trial lifecycle
-- Author: Claude AI
-- Date: 2025-12-11
-- Dependencies: Requires v110_projects_trial_mode.sql

-- Create trial_project_tracking table
CREATE TABLE IF NOT EXISTS trial_project_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    trial_start_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    trial_end_date TIMESTAMP WITH TIME ZONE NOT NULL,
    days_remaining INTEGER,
    status VARCHAR(50) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'expired', 'upgraded', 'cancelled')),
    reminder_3_days_sent BOOLEAN DEFAULT FALSE,
    reminder_1_day_sent BOOLEAN DEFAULT FALSE,
    expiry_notification_sent BOOLEAN DEFAULT FALSE,
    upgraded_at TIMESTAMP WITH TIME ZONE,
    expired_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id)
);

-- Add comments to document the table and columns
COMMENT ON TABLE trial_project_tracking IS 'Tracks trial project lifecycle, expiry dates, and upgrade status';
COMMENT ON COLUMN trial_project_tracking.account_id IS 'Organisation that owns this trial project';
COMMENT ON COLUMN trial_project_tracking.project_id IS 'The trial project being tracked';
COMMENT ON COLUMN trial_project_tracking.trial_start_date IS 'When the trial started';
COMMENT ON COLUMN trial_project_tracking.trial_end_date IS 'When the trial expires (start + 10 days)';
COMMENT ON COLUMN trial_project_tracking.days_remaining IS 'Calculated field: days left in trial';
COMMENT ON COLUMN trial_project_tracking.status IS 'Trial status: active, expired, upgraded, or cancelled';
COMMENT ON COLUMN trial_project_tracking.reminder_3_days_sent IS 'TRUE if 3-day expiry warning email has been sent';
COMMENT ON COLUMN trial_project_tracking.reminder_1_day_sent IS 'TRUE if 1-day expiry warning email has been sent';
COMMENT ON COLUMN trial_project_tracking.expiry_notification_sent IS 'TRUE if trial expiry notification has been sent';
COMMENT ON COLUMN trial_project_tracking.upgraded_at IS 'Timestamp when trial was upgraded to paid';
COMMENT ON COLUMN trial_project_tracking.expired_at IS 'Timestamp when trial expired';

-- Create indexes for efficient queries
CREATE INDEX idx_trial_tracking_account ON trial_project_tracking(account_id);
CREATE INDEX idx_trial_tracking_project ON trial_project_tracking(project_id);
CREATE INDEX idx_trial_tracking_status ON trial_project_tracking(status) WHERE status = 'active';
CREATE INDEX idx_trial_tracking_expiry ON trial_project_tracking(trial_end_date)
    WHERE status = 'active';

-- Create unique constraint: one tracking record per project
CREATE UNIQUE INDEX idx_trial_tracking_project_unique ON trial_project_tracking(project_id);

-- Enable Row Level Security
ALTER TABLE trial_project_tracking ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS trial_tracking_select_policy ON trial_project_tracking;
DROP POLICY IF EXISTS trial_tracking_insert_policy ON trial_project_tracking;
DROP POLICY IF EXISTS trial_tracking_update_policy ON trial_project_tracking;

-- RLS Policy: Users can only see trials for their own organisations
CREATE POLICY trial_tracking_select_policy ON trial_project_tracking
    FOR SELECT
    USING (
        account_id IN (
            SELECT id FROM accounts WHERE owner_user_id = auth.uid()
        )
    );

-- RLS Policy: Users can only insert trials for their own organisations
CREATE POLICY trial_tracking_insert_policy ON trial_project_tracking
    FOR INSERT
    WITH CHECK (
        account_id IN (
            SELECT id FROM accounts WHERE owner_user_id = auth.uid()
        )
    );

-- RLS Policy: Users can only update trials for their own organisations
CREATE POLICY trial_tracking_update_policy ON trial_project_tracking
    FOR UPDATE
    USING (
        account_id IN (
            SELECT id FROM accounts WHERE owner_user_id = auth.uid()
        )
    );

-- Register table in database_tables registry
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
    'trial_project_tracking',
    'Tracks trial project lifecycle, expiry dates, and upgrade status for 10-day trial projects',
    false,
    true
)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration v112 completed: Created trial_project_tracking table with RLS policies';
END $$;
