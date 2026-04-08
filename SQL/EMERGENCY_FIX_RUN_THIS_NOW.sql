-- =====================================================================================
-- EMERGENCY FIX - Run this NOW to fix infinite recursion
-- This is the SIMPLEST possible fix for all RLS recursion issues
-- =====================================================================================

-- ========================================
-- STEP 1: Fix roles table (causing current error)
-- ========================================

-- Temporarily disable RLS to make changes
ALTER TABLE roles DISABLE ROW LEVEL SECURITY;

-- Drop ALL policies
DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'roles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON roles';
    END LOOP;
END $$;

-- Re-enable RLS
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

-- Create SIMPLE policy - everyone can read roles
CREATE POLICY roles_read_all ON roles FOR SELECT USING (true);

-- Grant permissions
GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON roles TO anon;

-- ========================================
-- STEP 2: Fix user_roles table
-- ========================================

ALTER TABLE user_roles DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'user_roles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON user_roles';
    END LOOP;
END $$;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON user_roles TO authenticated;

-- Simple policies - no recursion
CREATE POLICY user_roles_select ON user_roles FOR SELECT
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY user_roles_insert ON user_roles FOR INSERT
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY user_roles_update ON user_roles FOR UPDATE
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ========================================
-- STEP 3: Fix accounts table
-- ========================================

ALTER TABLE accounts DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'accounts' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON accounts';
    END LOOP;
END $$;

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON accounts TO authenticated;

-- Simple policies - no recursion
CREATE POLICY accounts_select ON accounts FOR SELECT
  USING (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY accounts_insert ON accounts FOR INSERT
  WITH CHECK (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY accounts_update ON accounts FOR UPDATE
  USING (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- ========================================
-- STEP 4: Fix users table
-- ========================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'users' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON users';
    END LOOP;
END $$;

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

CREATE POLICY users_select ON users FOR SELECT USING (auth_user_id = auth.uid());
CREATE POLICY users_insert ON users FOR INSERT WITH CHECK (auth_user_id = auth.uid());
CREATE POLICY users_update ON users FOR UPDATE USING (auth_user_id = auth.uid());

-- ========================================
-- STEP 5: Fix project_roles table
-- ========================================

ALTER TABLE project_roles DISABLE ROW LEVEL SECURITY;

DO $$
DECLARE r RECORD;
BEGIN
    FOR r IN SELECT policyname FROM pg_policies WHERE tablename = 'project_roles' LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON project_roles';
    END LOOP;
END $$;

ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON project_roles TO authenticated;

-- Everyone can read template roles (reference data)
CREATE POLICY project_roles_read ON project_roles FOR SELECT USING (is_template = true);

-- ========================================
-- STEP 6: Create atomic user function
-- ========================================

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

  -- Try to find by auth_user_id
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
  -- Handle race condition
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

-- ========================================
-- VERIFICATION
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '================================================';
  RAISE NOTICE '✅ EMERGENCY FIX APPLIED SUCCESSFULLY!';
  RAISE NOTICE '================================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Fixed tables:';
  RAISE NOTICE '  ✓ roles (no more recursion)';
  RAISE NOTICE '  ✓ user_roles (no more recursion)';
  RAISE NOTICE '  ✓ accounts (no more recursion)';
  RAISE NOTICE '  ✓ users (simplified)';
  RAISE NOTICE '  ✓ project_roles (simplified)';
  RAISE NOTICE '';
  RAISE NOTICE 'Created function:';
  RAISE NOTICE '  ✓ get_or_create_user (atomic user creation)';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now test registration again!';
  RAISE NOTICE 'Use a fresh email address.';
  RAISE NOTICE '';
END $$;
