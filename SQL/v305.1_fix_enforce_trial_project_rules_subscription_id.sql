-- =============================================================================
-- v305.1: Fix enforce_trial_project_rules() when projects has no subscription_id
-- Error: record "new" has no field "subscription_id"
-- When projects table does not have subscription_id (or account_id), skip
-- trial/paid enforcement so inserts (e.g. seed data) succeed.
-- =============================================================================

DROP TRIGGER IF EXISTS enforce_trial_rules_trigger ON projects;

CREATE OR REPLACE FUNCTION enforce_trial_project_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
    v_has_trial BOOLEAN;
    v_subscription_member_limit INTEGER;
    v_has_subscription_id BOOLEAN;
    v_has_account_id BOOLEAN;
BEGIN
    -- Detect if required columns exist (projects may not have subscription_id/account_id in all schemas)
    SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'subscription_id')
         , EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'account_id')
    INTO v_has_subscription_id, v_has_account_id;

    -- Only process if project_mode column exists and is set
    IF NOT (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'project_mode')) THEN
        RETURN NEW;
    END IF;

    IF NEW.project_mode IS NULL THEN
        RETURN NEW;
    END IF;

    -- ========== TRIAL PROJECT RULES ==========
    IF NEW.project_mode = 'trial' THEN
        IF NOT v_has_account_id THEN
            RETURN NEW;
        END IF;
        -- Rule 1: Check if account already has a trial project
        SELECT has_trial_project INTO v_has_trial
        FROM accounts
        WHERE id = NEW.account_id;

        IF v_has_trial = TRUE THEN
            RAISE EXCEPTION 'This organisation already has a trial project. Additional projects must use a paid subscription.';
        END IF;

        -- Rule 2: Set trial start and expiry (only if columns exist)
        IF (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'trial_start_date')) THEN
            NEW.trial_start_date := NOW();
        END IF;
        IF (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'trial_expiry_date')) THEN
            NEW.trial_expiry_date := NOW() + INTERVAL '10 days';
        END IF;

        IF (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'member_limit')) THEN
            NEW.member_limit := 5;
        END IF;
        IF (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'current_member_count')) THEN
            IF NEW.current_member_count IS NULL OR NEW.current_member_count = 0 THEN
                NEW.current_member_count := 1;
            END IF;
        END IF;

        UPDATE accounts
        SET has_trial_project = TRUE,
            updated_at = NOW()
        WHERE id = NEW.account_id;

        RAISE NOTICE 'Trial project created: % (expires: %)', NEW.project_name, NEW.trial_expiry_date;

    -- ========== PAID PROJECT RULES ==========
    ELSIF NEW.project_mode = 'paid' THEN
        -- Skip paid rules if subscription_id column does not exist (e.g. seed/migration inserts)
        IF NOT v_has_subscription_id THEN
            RETURN NEW;
        END IF;

        -- Rule 1: Paid project must have a subscription (only when column exists)
        IF NEW.subscription_id IS NULL THEN
            RAISE EXCEPTION 'Paid projects must be linked to a subscription. Please create or select a subscription first.';
        END IF;

        SELECT member_limit INTO v_subscription_member_limit
        FROM platform_subscriptions
        WHERE id = NEW.subscription_id;

        IF v_subscription_member_limit IS NOT NULL THEN
            NEW.member_limit := v_subscription_member_limit;
        ELSE
            NEW.member_limit := 20;
        END IF;

        IF (SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'projects' AND column_name = 'current_member_count')) THEN
            IF NEW.current_member_count IS NULL OR NEW.current_member_count = 0 THEN
                NEW.current_member_count := 1;
            END IF;
        END IF;

        IF v_has_account_id THEN
            UPDATE accounts
            SET has_paid_project = TRUE,
                updated_at = NOW()
            WHERE id = NEW.account_id;
        END IF;

        RAISE NOTICE 'Paid project created: % (member limit: %)', NEW.project_name, NEW.member_limit;
    END IF;

    RETURN NEW;
END;
$$;

CREATE TRIGGER enforce_trial_rules_trigger
    BEFORE INSERT ON projects
    FOR EACH ROW
    EXECUTE FUNCTION enforce_trial_project_rules();

COMMENT ON FUNCTION enforce_trial_project_rules() IS
'Enforces trial/paid project rules when creating projects; skips checks when subscription_id or account_id columns are missing.';
