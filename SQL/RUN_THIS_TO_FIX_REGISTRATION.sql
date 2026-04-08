-- =====================================================================================
-- MASTER FIX SCRIPT - Run this to fix the registration flow
-- =====================================================================================
-- This script fixes the account creation error during registration
--
-- Error being fixed:
--   "insert or update on table 'accounts' violates foreign key constraint
--    'accounts_created_by_fkey'"
--
-- Root causes:
--   1. Missing auth_user_id column in users table
--   2. Audit triggers using auth.uid() instead of internal user ID
--   3. Missing get_or_create_user function
--
-- This script runs three fixes in correct order:
--   1. v101 - Add missing auth_user_id column
--   2. v102 - Fix audit triggers to use internal user IDs
--   3. v103 - Create get_or_create_user function
-- =====================================================================================

\echo ''
\echo '================================================'
\echo 'STARTING REGISTRATION FIX'
\echo '================================================'
\echo ''

-- =====================================================================================
-- FIX 1: Add missing auth_user_id column (v101)
-- =====================================================================================

\echo 'Fix 1/3: Adding auth_user_id column to users table...'
\echo ''

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

        -- Create index
        CREATE UNIQUE INDEX IF NOT EXISTS idx_users_auth_user_id
        ON users(auth_user_id) WHERE is_deleted = FALSE;

        -- Add comment
        COMMENT ON COLUMN users.auth_user_id IS 'References Supabase auth.users(id) - NULL for system/service accounts';

        RAISE NOTICE '✓ Added auth_user_id column to users table';
        RAISE NOTICE '✓ Created index on auth_user_id';
    ELSE
        RAISE NOTICE '✓ Column auth_user_id already exists';
    END IF;
END $$;

-- =====================================================================================
-- FIX 2: Update audit triggers (v102)
-- =====================================================================================

\echo ''
\echo 'Fix 2/3: Updating audit triggers to use internal user IDs...'
\echo ''

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

DO $$
BEGIN
    RAISE NOTICE '✓ Updated trigger_set_created_fields()';
    RAISE NOTICE '✓ Updated trigger_update_audit_fields()';
END $$;

-- =====================================================================================
-- FIX 3: Create get_or_create_user function (v103)
-- =====================================================================================

\echo ''
\echo 'Fix 3/3: Creating get_or_create_user function...'
\echo ''

DROP FUNCTION IF EXISTS get_or_create_user(uuid, text, text, boolean);

CREATE OR REPLACE FUNCTION get_or_create_user(
  p_auth_user_id uuid,
  p_email text,
  p_full_name text DEFAULT NULL,
  p_is_verified boolean DEFAULT false
)
RETURNS TABLE (
  user_id uuid,
  full_name_out text,
  email_out text,
  is_new boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_full_name text;
  v_email text;
  v_is_new boolean := false;
  v_default_name text;
BEGIN
  v_default_name := COALESCE(p_full_name, SPLIT_PART(COALESCE(p_email, ''), '@', 1), 'User');

  -- Try to find by auth_user_id first
  SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
  FROM users WHERE auth_user_id = p_auth_user_id AND is_deleted = false LIMIT 1;

  IF FOUND THEN
    IF p_is_verified THEN
      UPDATE users SET is_verified = true, verified_at = COALESCE(verified_at, NOW()), updated_at = NOW()
      WHERE id = v_user_id;
    END IF;
    RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
    RETURN;
  END IF;

  -- Try to find by email
  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
    FROM users WHERE email = p_email AND is_deleted = false LIMIT 1;

    IF FOUND THEN
      UPDATE users SET auth_user_id = p_auth_user_id, is_verified = CASE WHEN p_is_verified THEN true ELSE is_verified END,
        verified_at = CASE WHEN p_is_verified THEN COALESCE(verified_at, NOW()) ELSE verified_at END, updated_at = NOW()
      WHERE id = v_user_id;
      RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
      RETURN;
    END IF;
  END IF;

  -- Create new user
  INSERT INTO users (auth_user_id, email, full_name, is_active, is_verified, verified_at)
  VALUES (p_auth_user_id, p_email, v_default_name, true, p_is_verified, CASE WHEN p_is_verified THEN NOW() ELSE NULL END)
  RETURNING id, full_name, email INTO v_user_id, v_full_name, v_email;

  v_is_new := true;
  RETURN QUERY SELECT v_user_id, v_full_name, v_email, v_is_new;

EXCEPTION WHEN unique_violation THEN
  SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
  FROM users WHERE auth_user_id = p_auth_user_id AND is_deleted = false LIMIT 1;

  IF FOUND THEN
    RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
    RETURN;
  END IF;

  IF p_email IS NOT NULL THEN
    SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
    FROM users WHERE email = p_email AND is_deleted = false LIMIT 1;

    IF FOUND THEN
      UPDATE users SET auth_user_id = p_auth_user_id WHERE id = v_user_id;
      RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
      RETURN;
    END IF;
  END IF;

  RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, boolean) TO anon;

DO $$
BEGIN
    RAISE NOTICE '✓ Created get_or_create_user function';
END $$;

-- =====================================================================================
-- FINAL VERIFICATION
-- =====================================================================================

\echo ''
\echo '================================================'
\echo '✅ ALL FIXES APPLIED SUCCESSFULLY!'
\echo '================================================'
\echo ''

DO $$
DECLARE
    v_auth_user_id_exists BOOLEAN;
    v_function_exists BOOLEAN;
BEGIN
    -- Check auth_user_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_user_id'
    ) INTO v_auth_user_id_exists;

    -- Check get_or_create_user function
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_or_create_user'
    ) INTO v_function_exists;

    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '  ✓ auth_user_id column: %', CASE WHEN v_auth_user_id_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  ✓ trigger_set_created_fields(): UPDATED';
    RAISE NOTICE '  ✓ trigger_update_audit_fields(): UPDATED';
    RAISE NOTICE '  ✓ get_or_create_user(): %', CASE WHEN v_function_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '';

    IF v_auth_user_id_exists AND v_function_exists THEN
        RAISE NOTICE '🎉 Registration flow is now fixed!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '  1. Try registering a new user';
        RAISE NOTICE '  2. Complete the account setup wizard';
        RAISE NOTICE '  3. Verify account and project are created successfully';
        RAISE NOTICE '';
    ELSE
        RAISE WARNING 'Some components are missing! Please review the output above.';
    END IF;
END $$;
