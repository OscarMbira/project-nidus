-- Migration: v114_trial_functions.sql
-- Description: Create database functions for trial project management
-- Author: Claude AI
-- Date: 2025-12-11
-- Dependencies: Requires v109, v110, v112

-- Function 1: Check if account is eligible for trial project
-- Returns TRUE if account has never created a trial project
CREATE OR REPLACE FUNCTION check_trial_eligibility(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if account already has a trial project
    RETURN NOT EXISTS (
        SELECT 1
        FROM accounts
        WHERE id = p_account_id
        AND has_trial_project = TRUE
    );
END;
$$;

COMMENT ON FUNCTION check_trial_eligibility(UUID) IS
'Checks if an account is eligible to create a trial project (only one trial allowed per organisation)';

-- Function 2: Calculate days remaining in trial
-- Returns number of days left (0 if expired)
CREATE OR REPLACE FUNCTION calculate_trial_days_remaining(p_project_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_days_left INTEGER;
BEGIN
    -- Calculate days between now and trial end date
    SELECT GREATEST(0, EXTRACT(DAY FROM (trial_end_date - NOW()))::INTEGER)
    INTO v_days_left
    FROM trial_project_tracking
    WHERE project_id = p_project_id
    AND status = 'active';

    -- Return 0 if no active trial found
    RETURN COALESCE(v_days_left, 0);
END;
$$;

COMMENT ON FUNCTION calculate_trial_days_remaining(UUID) IS
'Calculates the number of days remaining in a trial project (returns 0 if expired or not found)';

-- Function 3: Get trials expiring within a threshold (used by cron job)
-- Returns list of trials expiring in the next N days
CREATE OR REPLACE FUNCTION get_expiring_trials(days_threshold INTEGER DEFAULT 3)
RETURNS TABLE (
    project_id UUID,
    account_id UUID,
    project_name VARCHAR,
    days_remaining INTEGER,
    owner_email VARCHAR,
    trial_end_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS project_id,
        p.account_id,
        p.project_name,
        EXTRACT(DAY FROM (tpt.trial_end_date - NOW()))::INTEGER AS days_remaining,
        u.email AS owner_email,
        tpt.trial_end_date
    FROM projects p
    INNER JOIN trial_project_tracking tpt ON p.id = tpt.project_id
    INNER JOIN accounts a ON p.account_id = a.id
    INNER JOIN users u ON a.owner_user_id = u.id
    WHERE p.project_mode = 'trial'
    AND tpt.status = 'active'
    AND tpt.trial_end_date > NOW() -- Not yet expired
    AND tpt.trial_end_date <= NOW() + (days_threshold || ' days')::INTERVAL
    ORDER BY tpt.trial_end_date ASC;
END;
$$;

COMMENT ON FUNCTION get_expiring_trials(INTEGER) IS
'Gets all trial projects expiring within the specified number of days (used for sending reminder emails)';

-- Function 4: Get all expired trials that need to be locked
-- Returns trials that have passed expiry date but are still active
CREATE OR REPLACE FUNCTION get_expired_trials()
RETURNS TABLE (
    project_id UUID,
    account_id UUID,
    project_name VARCHAR,
    owner_email VARCHAR,
    trial_end_date TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id AS project_id,
        p.account_id,
        p.project_name,
        u.email AS owner_email,
        tpt.trial_end_date
    FROM projects p
    INNER JOIN trial_project_tracking tpt ON p.id = tpt.project_id
    INNER JOIN accounts a ON p.account_id = a.id
    INNER JOIN users u ON a.owner_user_id = u.id
    WHERE p.project_mode = 'trial'
    AND p.status != 'locked' -- Not already locked
    AND tpt.status = 'active'
    AND tpt.trial_end_date <= NOW() -- Has expired
    ORDER BY tpt.trial_end_date ASC;
END;
$$;

COMMENT ON FUNCTION get_expired_trials() IS
'Gets all trial projects that have expired and need to be locked (used by cron job)';

-- Function 5: Lock an expired trial project
-- Locks the project and updates tracking status
CREATE OR REPLACE FUNCTION lock_expired_trial_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_success BOOLEAN := FALSE;
BEGIN
    -- Lock the project
    UPDATE projects
    SET
        status = 'locked',
        locked_at = NOW(),
        updated_at = NOW()
    WHERE id = p_project_id
    AND project_mode = 'trial'
    AND status != 'locked';

    -- Check if update was successful
    IF FOUND THEN
        -- Update trial tracking
        UPDATE trial_project_tracking
        SET
            status = 'expired',
            expired_at = NOW(),
            updated_at = NOW()
        WHERE project_id = p_project_id
        AND status = 'active';

        v_success := TRUE;
    END IF;

    RETURN v_success;
END;
$$;

COMMENT ON FUNCTION lock_expired_trial_project(UUID) IS
'Locks an expired trial project and updates tracking status to expired';

-- Function 6: Get trial status for a project
-- Returns comprehensive trial status information
CREATE OR REPLACE FUNCTION get_trial_status(p_project_id UUID)
RETURNS TABLE (
    project_id UUID,
    account_id UUID,
    trial_start_date TIMESTAMP WITH TIME ZONE,
    trial_end_date TIMESTAMP WITH TIME ZONE,
    days_remaining INTEGER,
    status VARCHAR,
    is_expired BOOLEAN,
    upgraded_at TIMESTAMP WITH TIME ZONE
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT
        tpt.project_id,
        tpt.account_id,
        tpt.trial_start_date,
        tpt.trial_end_date,
        GREATEST(0, EXTRACT(DAY FROM (tpt.trial_end_date - NOW()))::INTEGER) AS days_remaining,
        tpt.status,
        (tpt.trial_end_date <= NOW()) AS is_expired,
        tpt.upgraded_at
    FROM trial_project_tracking tpt
    WHERE tpt.project_id = p_project_id;
END;
$$;

COMMENT ON FUNCTION get_trial_status(UUID) IS
'Gets comprehensive trial status for a specific project including days remaining and expiry state';

-- Grant execute permissions to authenticated users
GRANT EXECUTE ON FUNCTION check_trial_eligibility(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_trial_days_remaining(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_trial_status(UUID) TO authenticated;

-- Grant execute permissions to service role for cron jobs
GRANT EXECUTE ON FUNCTION get_expiring_trials(INTEGER) TO service_role;
GRANT EXECUTE ON FUNCTION get_expired_trials() TO service_role;
GRANT EXECUTE ON FUNCTION lock_expired_trial_project(UUID) TO service_role;

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration v114 completed: Created 6 trial management functions with appropriate permissions';
END $$;
