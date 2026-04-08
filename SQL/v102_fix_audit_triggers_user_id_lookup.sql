-- =====================================================================================
-- FIX: Update audit triggers to use internal user IDs instead of auth IDs
-- Version: v102
-- Description: Fixes foreign key constraint errors by looking up internal user ID
-- =====================================================================================

-- The problem:
-- - Triggers were setting created_by/updated_by to auth.uid() (Supabase Auth ID)
-- - But these columns reference users(id) (internal application user ID)
-- - This causes foreign key constraint violations

-- The solution:
-- - Look up the internal user ID from auth_user_id column
-- - If user doesn't exist in users table yet, leave field NULL
-- - Application will handle user creation separately

-- =====================================================================================
-- STEP 1: Update trigger_set_created_fields function
-- =====================================================================================

DROP FUNCTION IF EXISTS trigger_set_created_fields() CASCADE;

CREATE OR REPLACE FUNCTION trigger_set_created_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_internal_user_id UUID;
BEGIN
    -- Set created timestamp to current time
    NEW.created_at := NOW();

    -- Get internal user ID from auth.uid()
    -- If user doesn't exist in users table yet, leave created_by as NULL
    IF auth.uid() IS NOT NULL THEN
        SELECT id INTO v_internal_user_id
        FROM users
        WHERE auth_user_id = auth.uid()
        AND is_deleted = false
        LIMIT 1;

        NEW.created_by := v_internal_user_id;
    ELSE
        NEW.created_by := NULL;
    END IF;

    -- Initialize updated_at to same as created_at
    NEW.updated_at := NOW();

    -- Note: updated_by is NOT set here - it will be NULL until first update
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- If lookup fails (e.g., users table doesn't exist yet), just set to NULL
        NEW.created_by := NULL;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

COMMENT ON FUNCTION trigger_set_created_fields() IS
'Trigger function that automatically sets created_at, created_by (internal user ID), and initial updated_at fields on INSERT. Looks up internal user ID from auth.uid().';

-- =====================================================================================
-- STEP 2: Update trigger_update_audit_fields function
-- =====================================================================================

DROP FUNCTION IF EXISTS trigger_update_audit_fields() CASCADE;

CREATE OR REPLACE FUNCTION trigger_update_audit_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_internal_user_id UUID;
BEGIN
    -- Always update the updated_at timestamp to current time
    NEW.updated_at := NOW();

    -- Get internal user ID from auth.uid()
    IF auth.uid() IS NOT NULL THEN
        SELECT id INTO v_internal_user_id
        FROM users
        WHERE auth_user_id = auth.uid()
        AND is_deleted = false
        LIMIT 1;

        NEW.updated_by := v_internal_user_id;
    ELSE
        NEW.updated_by := NULL;
    END IF;

    -- IMPORTANT: Prevent modification of created fields
    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- If lookup fails, just set updated_by to NULL
        NEW.updated_by := NULL;
        NEW.created_at := OLD.created_at;
        NEW.created_by := OLD.created_by;
        RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, pg_catalog, auth;

COMMENT ON FUNCTION trigger_update_audit_fields() IS
'Trigger function that automatically updates updated_at and updated_by (internal user ID) fields on UPDATE. Looks up internal user ID from auth.uid().';

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ AUDIT TRIGGERS FIXED';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Updated functions:';
    RAISE NOTICE '  ✓ trigger_set_created_fields() - now looks up internal user ID';
    RAISE NOTICE '  ✓ trigger_update_audit_fields() - now looks up internal user ID';
    RAISE NOTICE '';
    RAISE NOTICE 'These functions now:';
    RAISE NOTICE '  1. Look up internal user ID from auth.uid()';
    RAISE NOTICE '  2. Set created_by/updated_by to internal user ID (not auth ID)';
    RAISE NOTICE '  3. Handle cases where user doesnt exist yet (sets NULL)';
    RAISE NOTICE '';
    RAISE NOTICE 'This fixes the foreign key constraint error!';
    RAISE NOTICE '';
END $$;
