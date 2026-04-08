-- ============================================================================
-- Product Status Account Automation and Triggers
-- Version: v213
-- Description: Automation triggers for Product Status Account synchronization
-- Date: 2026-01-20
-- ============================================================================
--
-- Purpose:
-- Implements automatic Product Status Account creation and updates when
-- product deliverables or product descriptions change.
--
-- Prerequisites:
-- - v211_product_status_account_tables.sql must be run first
-- - v24_structured_pm_mp.sql must be run (product_deliverables table)
-- - v207_product_description_tables.sql must be run (product_descriptions table)
--
-- ============================================================================
-- SECTION 1: TRIGGER ON PRODUCT_DELIVERABLES - Auto-update PSA on status change
-- ============================================================================

-- Trigger: Auto-update Product Status Account when product deliverable status changes
DROP TRIGGER IF EXISTS trg_product_deliverable_status_change ON product_deliverables;
CREATE TRIGGER trg_product_deliverable_status_change
    AFTER UPDATE OF status ON product_deliverables
    FOR EACH ROW
    WHEN (OLD.status IS DISTINCT FROM NEW.status)
    EXECUTE FUNCTION trg_product_deliverable_status_change();

-- ============================================================================
-- SECTION 2: FUNCTION - Auto-create PSA when product deliverable is created (optional)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_product_deliverable_auto_create_psa()
RETURNS TRIGGER AS $$
DECLARE
    v_psa_id UUID;
BEGIN
    -- Auto-create PSA for new product deliverable (only if not already exists)
    -- This is optional - can be enabled/disabled via configuration
    -- For now, we'll create it but it can be controlled via a setting
    
    -- Check if auto-create is enabled (can be controlled via project settings)
    -- For now, we'll create PSA automatically
    BEGIN
        SELECT create_psa_for_product_deliverable(
            NEW.id,
            CURRENT_DATE,
            COALESCE(NEW.updated_by, NEW.created_by)
        ) INTO v_psa_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Silently fail if PSA creation fails (e.g., already exists)
            NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional trigger: Auto-create PSA when product deliverable is created
-- Uncomment to enable automatic PSA creation
-- DROP TRIGGER IF EXISTS trg_product_deliverable_auto_create_psa ON product_deliverables;
-- CREATE TRIGGER trg_product_deliverable_auto_create_psa
--     AFTER INSERT ON product_deliverables
--     FOR EACH ROW
--     EXECUTE FUNCTION trg_product_deliverable_auto_create_psa();

-- ============================================================================
-- SECTION 3: FUNCTION - Auto-create PSA when product description is created (optional)
-- ============================================================================

CREATE OR REPLACE FUNCTION trg_product_description_auto_create_psa()
RETURNS TRIGGER AS $$
DECLARE
    v_psa_id UUID;
BEGIN
    -- Auto-create PSA for new product description (only if not already exists)
    -- This is optional - can be enabled/disabled via configuration
    
    BEGIN
        SELECT create_psa_for_product_description(
            NEW.id,
            COALESCE(NEW.updated_by, NEW.created_by),
            CURRENT_DATE
        ) INTO v_psa_id;
    EXCEPTION
        WHEN OTHERS THEN
            -- Silently fail if PSA creation fails (e.g., already exists)
            NULL;
    END;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Optional trigger: Auto-create PSA when product description is created
-- Uncomment to enable automatic PSA creation
-- DROP TRIGGER IF EXISTS trg_product_description_auto_create_psa ON product_descriptions;
-- CREATE TRIGGER trg_product_description_auto_create_psa
--     AFTER INSERT ON product_descriptions
--     FOR EACH ROW
--     EXECUTE FUNCTION trg_product_description_auto_create_psa();

-- ============================================================================
-- SECTION 4: FUNCTION - Daily progress snapshot (for cron job)
-- ============================================================================

CREATE OR REPLACE FUNCTION create_daily_progress_snapshots()
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER := 0;
    v_psa RECORD;
BEGIN
    -- Create progress snapshots for all active Product Status Accounts
    FOR v_psa IN
        SELECT id, progress_percentage, progress_indicator, planned_completion_date,
               forecast_completion_date, schedule_variance_days, progress_notes
        FROM product_status_accounts
        WHERE is_deleted = false
          AND current_status NOT IN ('cancelled', 'handed_over')
          AND (last_progress_update IS NULL OR last_progress_update < CURRENT_DATE)
    LOOP
        BEGIN
            INSERT INTO psa_progress_snapshots (
                product_status_account_id,
                snapshot_date,
                progress_percentage,
                progress_indicator,
                planned_completion_date,
                forecast_completion_date,
                schedule_variance_days,
                progress_notes,
                created_by
            ) VALUES (
                v_psa.id,
                CURRENT_DATE,
                v_psa.progress_percentage,
                v_psa.progress_indicator,
                v_psa.planned_completion_date,
                v_psa.forecast_completion_date,
                v_psa.schedule_variance_days,
                v_psa.progress_notes,
                NULL -- System-generated
            );
            v_count := v_count + 1;
        EXCEPTION
            WHEN OTHERS THEN
                -- Continue if snapshot already exists for today
                NULL;
        END;
    END LOOP;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Product Status Account automation triggers created';
    RAISE NOTICE 'Note: Auto-create triggers are commented out by default. Uncomment to enable.';
END $$;
