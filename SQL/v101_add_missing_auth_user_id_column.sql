-- =====================================================================================
-- FIX: Add missing auth_user_id column to users table
-- Version: v101
-- Description: Ensures auth_user_id column exists before running RLS fixes
-- =====================================================================================

-- Check and add auth_user_id column if it doesn't exist
DO $$
BEGIN
    -- Check if auth_user_id column exists
    IF NOT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'auth_user_id'
    ) THEN
        -- Add the missing column
        ALTER TABLE users ADD COLUMN auth_user_id UUID UNIQUE;

        RAISE NOTICE '✓ Added auth_user_id column to users table';

        -- Create index
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id
        ON users(auth_user_id) WHERE is_deleted = FALSE;

        RAISE NOTICE '✓ Created index on auth_user_id';

        -- Add comment
        COMMENT ON COLUMN users.auth_user_id IS 'References Supabase auth.users(id) - NULL for system/service accounts';

        RAISE NOTICE '';
        RAISE NOTICE 'Column auth_user_id has been added successfully!';
        RAISE NOTICE 'You can now run the EMERGENCY_FIX_RUN_THIS_NOW.sql file.';
    ELSE
        RAISE NOTICE '';
        RAISE NOTICE 'Column auth_user_id already exists in users table.';
        RAISE NOTICE 'No changes needed.';
    END IF;
END $$;

-- Verification
DO $$
DECLARE
    v_column_exists BOOLEAN;
BEGIN
    SELECT EXISTS (
        SELECT 1
        FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'auth_user_id'
    ) INTO v_column_exists;

    IF v_column_exists THEN
        RAISE NOTICE '';
        RAISE NOTICE '================================================';
        RAISE NOTICE '✅ VERIFICATION PASSED';
        RAISE NOTICE '================================================';
        RAISE NOTICE 'auth_user_id column exists in users table';
        RAISE NOTICE '';
    ELSE
        RAISE EXCEPTION 'VERIFICATION FAILED: auth_user_id column still missing!';
    END IF;
END $$;
