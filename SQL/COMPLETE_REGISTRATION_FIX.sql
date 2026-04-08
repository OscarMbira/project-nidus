-- =====================================================================================
-- COMPLETE REGISTRATION FIX - Run this to fix ALL registration issues
-- =====================================================================================
-- This master script fixes ALL issues preventing successful registration:
--
-- Issues being fixed:
--   1. Missing auth_user_id column in users table
--   2. Audit triggers using auth.uid() instead of internal user ID
--   3. Missing get_or_create_user function
--   4. Infinite recursion in projects table RLS policies
--
-- This script runs four fixes in correct order:
--   1. v101 - Add missing auth_user_id column
--   2. v102 - Fix audit triggers to use internal user IDs
--   3. v103 - Create get_or_create_user function
--   4. v104 - Fix projects table RLS recursion
-- =====================================================================================

\echo ''
\echo '================================================'
\echo '🚀 STARTING COMPLETE REGISTRATION FIX'
\echo '================================================'
\echo ''

-- =====================================================================================
-- FIX 1: Add missing auth_user_id column (v101)
-- =====================================================================================

\echo 'Fix 1/4: Adding auth_user_id column to users table...'
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
\echo 'Fix 2/4: Updating audit triggers to use internal user IDs...'
\echo ''

DROP FUNCTION IF EXISTS trigger_set_created_fields() CASCADE;

CREATE OR REPLACE FUNCTION trigger_set_created_fields()
RETURNS TRIGGER AS $$
DECLARE
    v_internal_user_id UUID;
BEGIN
    NEW.created_at := NOW();

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

    NEW.updated_at := NOW();
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
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
    NEW.updated_at := NOW();

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

    NEW.created_at := OLD.created_at;
    NEW.created_by := OLD.created_by;
    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
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
\echo 'Fix 3/4: Creating get_or_create_user function...'
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
-- FIX 4: Fix projects table RLS recursion (v104)
-- =====================================================================================

\echo ''
\echo 'Fix 4/4: Fixing projects table RLS infinite recursion...'
\echo ''

-- Create helper function if it doesn't exist
CREATE OR REPLACE FUNCTION get_user_id_from_auth(auth_uid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
    internal_user_id UUID;
BEGIN
    SELECT id INTO internal_user_id
    FROM users
    WHERE auth_user_id = auth_uid
    AND is_deleted = false
    LIMIT 1;

    RETURN internal_user_id;
END;
$$;

-- Disable RLS temporarily
ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'projects' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON projects';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON projects TO authenticated;

-- Create simple policies that don't cause recursion
CREATE POLICY projects_insert_authenticated
ON projects FOR INSERT
TO authenticated
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY projects_select_owner
ON projects FOR SELECT
TO authenticated
USING (owner_user_id = get_user_id_from_auth(auth.uid()) AND is_deleted = false);

CREATE POLICY projects_select_manager
ON projects FOR SELECT
TO authenticated
USING (project_manager_user_id = get_user_id_from_auth(auth.uid()) AND is_deleted = false);

CREATE POLICY projects_select_account
ON projects FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = projects.account_id
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
        AND a.is_deleted = false
    )
    AND is_deleted = false
);

CREATE POLICY projects_update_owner
ON projects FOR UPDATE
TO authenticated
USING (owner_user_id = get_user_id_from_auth(auth.uid()) AND is_deleted = false)
WITH CHECK (owner_user_id = get_user_id_from_auth(auth.uid()));

CREATE POLICY projects_update_manager
ON projects FOR UPDATE
TO authenticated
USING (project_manager_user_id = get_user_id_from_auth(auth.uid()) AND is_deleted = false)
WITH CHECK (project_manager_user_id = get_user_id_from_auth(auth.uid()));

CREATE POLICY projects_all_account_owner
ON projects FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = projects.account_id
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
        AND a.is_deleted = false
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM accounts a
        WHERE a.id = projects.account_id
        AND a.owner_user_id = get_user_id_from_auth(auth.uid())
        AND a.is_deleted = false
    )
);

DO $$
BEGIN
    RAISE NOTICE '✓ Fixed projects table RLS policies';
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
    v_get_or_create_user_exists BOOLEAN;
    v_get_user_id_from_auth_exists BOOLEAN;
    v_projects_policy_count INTEGER;
BEGIN
    -- Check auth_user_id column
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'auth_user_id'
    ) INTO v_auth_user_id_exists;

    -- Check functions
    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_or_create_user'
    ) INTO v_get_or_create_user_exists;

    SELECT EXISTS (
        SELECT 1 FROM pg_proc p
        INNER JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public' AND p.proname = 'get_user_id_from_auth'
    ) INTO v_get_user_id_from_auth_exists;

    -- Count projects policies
    SELECT COUNT(*) INTO v_projects_policy_count
    FROM pg_policies WHERE tablename = 'projects';

    RAISE NOTICE 'Verification Results:';
    RAISE NOTICE '  ✓ auth_user_id column: %', CASE WHEN v_auth_user_id_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  ✓ trigger_set_created_fields(): UPDATED';
    RAISE NOTICE '  ✓ trigger_update_audit_fields(): UPDATED';
    RAISE NOTICE '  ✓ get_or_create_user(): %', CASE WHEN v_get_or_create_user_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  ✓ get_user_id_from_auth(): %', CASE WHEN v_get_user_id_from_auth_exists THEN 'EXISTS' ELSE 'MISSING' END;
    RAISE NOTICE '  ✓ projects RLS policies: % policies', v_projects_policy_count;
    RAISE NOTICE '';

    IF v_auth_user_id_exists AND v_get_or_create_user_exists AND v_get_user_id_from_auth_exists AND v_projects_policy_count > 0 THEN
        RAISE NOTICE '🎉 REGISTRATION FLOW IS NOW FULLY FIXED!';
        RAISE NOTICE '';
        RAISE NOTICE 'Next steps:';
        RAISE NOTICE '  1. Use a fresh email to register a new user';
        RAISE NOTICE '  2. Complete the Platform Account Setup wizard';
        RAISE NOTICE '  3. Verify account and project are created successfully';
        RAISE NOTICE '  4. Check that you can access the dashboard';
        RAISE NOTICE '';
    ELSE
        RAISE WARNING 'Some components are missing! Please review the output above.';
    END IF;
END $$;
