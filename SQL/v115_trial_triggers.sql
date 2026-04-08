-- Migration: v115_trial_triggers.sql
-- Description: Create triggers to enforce trial project rules automatically
-- Author: Claude AI
-- Date: 2025-12-11
-- Dependencies: Requires v109, v110, v112, v114

-- ============================================================================
-- TRIGGER 1: Enforce Trial Project Rules on Insert
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS enforce_trial_rules_trigger ON projects;
DROP FUNCTION IF EXISTS enforce_trial_project_rules();

-- Create trigger function to enforce trial project rules
CREATE OR REPLACE FUNCTION enforce_trial_project_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_trial BOOLEAN;
    v_subscription_member_limit INTEGER;
BEGIN
    -- Only process if project_mode is set
    IF NEW.project_mode IS NULL THEN
        RETURN NEW;
    END IF;

    -- ========== TRIAL PROJECT RULES ==========
    IF NEW.project_mode = 'trial' THEN
        -- Rule 1: Check if account already has a trial project
        SELECT has_trial_project INTO v_has_trial
        FROM accounts
        WHERE id = NEW.account_id;

        IF v_has_trial = TRUE THEN
            RAISE EXCEPTION 'This organisation already has a trial project. Additional projects must use a paid subscription.';
        END IF;

        -- Rule 2: Set trial start and expiry dates automatically
        NEW.trial_start_date := NOW();
        NEW.trial_expiry_date := NOW() + INTERVAL '10 days';

        -- Rule 3: Enforce 5 member limit for trial projects
        NEW.member_limit := 5;

        -- Rule 4: Set initial member count (creator counts as 1)
        IF NEW.current_member_count IS NULL OR NEW.current_member_count = 0 THEN
            NEW.current_member_count := 1;
        END IF;

        -- Rule 5: Update account flag to mark trial project exists
        UPDATE accounts
        SET has_trial_project = TRUE,
            updated_at = NOW()
        WHERE id = NEW.account_id;

        RAISE NOTICE 'Trial project created: % (expires: %)', NEW.project_name, NEW.trial_expiry_date;

    -- ========== PAID PROJECT RULES ==========
    ELSIF NEW.project_mode = 'paid' THEN
        -- Rule 1: Paid project must have a subscription
        IF NEW.subscription_id IS NULL THEN
            RAISE EXCEPTION 'Paid projects must be linked to a subscription. Please create or select a subscription first.';
        END IF;

        -- Rule 2: Get member limit from subscription
        SELECT member_limit INTO v_subscription_member_limit
        FROM platform_subscriptions
        WHERE id = NEW.subscription_id;

        IF v_subscription_member_limit IS NOT NULL THEN
            NEW.member_limit := v_subscription_member_limit;
        ELSE
            -- Default to 20 if subscription not found
            NEW.member_limit := 20;
        END IF;

        -- Rule 3: Set initial member count (creator counts as 1)
        IF NEW.current_member_count IS NULL OR NEW.current_member_count = 0 THEN
            NEW.current_member_count := 1;
        END IF;

        -- Rule 4: Update account flag to mark paid project exists
        UPDATE accounts
        SET has_paid_project = TRUE,
            updated_at = NOW()
        WHERE id = NEW.account_id;

        RAISE NOTICE 'Paid project created: % (member limit: %)', NEW.project_name, NEW.member_limit;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER enforce_trial_rules_trigger
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION enforce_trial_project_rules();

COMMENT ON FUNCTION enforce_trial_project_rules() IS
'Automatically enforces trial and paid project rules when creating new projects';

-- ============================================================================
-- TRIGGER 2: Create Trial Tracking Record on Trial Project Insert
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS create_trial_tracking_trigger ON projects;
DROP FUNCTION IF EXISTS create_trial_tracking_record();

-- Create trigger function to automatically create trial tracking record
CREATE OR REPLACE FUNCTION create_trial_tracking_record()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Only create tracking for trial projects
    IF NEW.project_mode = 'trial' THEN
        INSERT INTO trial_project_tracking (
            account_id,
            project_id,
            trial_start_date,
            trial_end_date,
            days_remaining,
            status,
            created_by
        ) VALUES (
            NEW.account_id,
            NEW.id,
            NEW.trial_start_date,
            NEW.trial_expiry_date,
            10, -- Initial days
            'active',
            NEW.created_by
        );

        RAISE NOTICE 'Trial tracking record created for project: %', NEW.project_name;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger (AFTER INSERT to ensure project exists)
CREATE TRIGGER create_trial_tracking_trigger
    AFTER INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION create_trial_tracking_record();

COMMENT ON FUNCTION create_trial_tracking_record() IS
'Automatically creates a trial_project_tracking record when a trial project is created';

-- ============================================================================
-- TRIGGER 3: Update Trial Tracking Days Remaining
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_trial_days_trigger ON trial_project_tracking;
DROP FUNCTION IF EXISTS update_trial_days_remaining();

-- Create trigger function to update days_remaining on any update
CREATE OR REPLACE FUNCTION update_trial_days_remaining()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Calculate days remaining if trial is still active
    IF NEW.status = 'active' THEN
        NEW.days_remaining := GREATEST(0, EXTRACT(DAY FROM (NEW.trial_end_date - NOW()))::INTEGER);
    END IF;

    -- Always update the updated_at timestamp
    NEW.updated_at := NOW();

    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER update_trial_days_trigger
    BEFORE UPDATE ON trial_project_tracking
    FOR EACH ROW
    EXECUTE FUNCTION update_trial_days_remaining();

COMMENT ON FUNCTION update_trial_days_remaining() IS
'Automatically updates days_remaining field whenever trial_project_tracking is updated';

-- ============================================================================
-- TRIGGER 4: Prevent Project Mode Changes (Security)
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS prevent_project_mode_change_trigger ON projects;
DROP FUNCTION IF EXISTS prevent_project_mode_change();

-- Create trigger function to prevent changing project_mode after creation
CREATE OR REPLACE FUNCTION prevent_project_mode_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Allow change only if upgrading from trial to paid
    IF OLD.project_mode = 'trial' AND NEW.project_mode = 'paid' THEN
        -- This is an upgrade - allow it
        -- Also ensure trial_upgraded_at is set
        IF NEW.trial_upgraded_at IS NULL THEN
            NEW.trial_upgraded_at := NOW();
        END IF;

        RAISE NOTICE 'Trial project upgraded to paid: %', NEW.project_name;
        RETURN NEW;
    END IF;

    -- Prevent any other changes to project_mode
    IF OLD.project_mode IS DISTINCT FROM NEW.project_mode THEN
        RAISE EXCEPTION 'Cannot change project mode from % to %. Only trial → paid upgrades are allowed.',
            OLD.project_mode, NEW.project_mode;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER prevent_project_mode_change_trigger
    BEFORE UPDATE ON projects
    FOR EACH ROW
    WHEN (OLD.project_mode IS NOT NULL)
    EXECUTE FUNCTION prevent_project_mode_change();

COMMENT ON FUNCTION prevent_project_mode_change() IS
'Prevents changing project_mode except for trial → paid upgrades';

-- ============================================================================
-- TRIGGER 5: Update Trial Tracking on Project Upgrade
-- ============================================================================

-- Drop existing trigger and function if they exist
DROP TRIGGER IF EXISTS update_trial_on_upgrade_trigger ON projects;
DROP FUNCTION IF EXISTS update_trial_on_upgrade();

-- Create trigger function to update trial tracking when project is upgraded
CREATE OR REPLACE FUNCTION update_trial_on_upgrade()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    -- Check if this is an upgrade from trial to paid
    IF OLD.project_mode = 'trial' AND NEW.project_mode = 'paid' THEN
        -- Update trial tracking to mark as upgraded
        UPDATE trial_project_tracking
        SET
            status = 'upgraded',
            upgraded_at = NOW(),
            updated_at = NOW()
        WHERE project_id = NEW.id
        AND status = 'active';

        RAISE NOTICE 'Trial tracking updated for upgraded project: %', NEW.project_name;
    END IF;

    RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER update_trial_on_upgrade_trigger
    AFTER UPDATE ON projects
    FOR EACH ROW
    WHEN (OLD.project_mode = 'trial' AND NEW.project_mode = 'paid')
    EXECUTE FUNCTION update_trial_on_upgrade();

COMMENT ON FUNCTION update_trial_on_upgrade() IS
'Automatically updates trial_project_tracking status when a trial project is upgraded to paid';

-- Log migration completion
DO $$
BEGIN
    RAISE NOTICE 'Migration v115 completed: Created 5 triggers for automatic trial project management:';
    RAISE NOTICE '  1. enforce_trial_rules_trigger - Enforces trial/paid project rules';
    RAISE NOTICE '  2. create_trial_tracking_trigger - Creates tracking records for trial projects';
    RAISE NOTICE '  3. update_trial_days_trigger - Updates days_remaining automatically';
    RAISE NOTICE '  4. prevent_project_mode_change_trigger - Prevents invalid mode changes';
    RAISE NOTICE '  5. update_trial_on_upgrade_trigger - Updates tracking on upgrade';
END $$;
