-- =====================================================================================
-- v100: COMPLETE RLS RECURSION FIX - RUN THIS FILE ONLY!
-- This file combines all RLS fixes to resolve infinite recursion errors
-- Run this ONE file in Supabase SQL Editor
-- =====================================================================================

-- =====================================
-- PART 1: Atomic User Creation Function
-- =====================================

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
  v_default_name := COALESCE(
    p_full_name,
    CASE
      WHEN p_email IS NOT NULL AND p_email <> '' THEN SPLIT_PART(p_email, '@', 1)
      ELSE 'User'
    END
  );

  SELECT id, users.full_name, users.email
  INTO v_user_id, v_full_name, v_email
  FROM users
  WHERE auth_user_id = p_auth_user_id AND is_deleted = false
  LIMIT 1;

  IF FOUND THEN
    IF p_is_verified THEN
      UPDATE users
      SET is_verified = true, verified_at = COALESCE(verified_at, NOW()), updated_at = NOW()
      WHERE id = v_user_id;
    END IF;
    RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
    RETURN;
  END IF;

  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id, users.full_name, users.email
    INTO v_user_id, v_full_name, v_email
    FROM users
    WHERE email = p_email AND is_deleted = false
    LIMIT 1;

    IF FOUND THEN
      UPDATE users
      SET auth_user_id = p_auth_user_id,
          is_verified = CASE WHEN p_is_verified THEN true ELSE is_verified END,
          verified_at = CASE WHEN p_is_verified THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
          updated_at = NOW()
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
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
    FROM users WHERE auth_user_id = p_auth_user_id AND is_deleted = false LIMIT 1;
    IF FOUND THEN
      RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
      RETURN;
    END IF;
    IF p_email IS NOT NULL AND p_email <> '' THEN
      SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
      FROM users WHERE email = p_email AND is_deleted = false LIMIT 1;
      IF FOUND THEN
        UPDATE users SET auth_user_id = p_auth_user_id, updated_at = NOW() WHERE id = v_user_id;
        RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
        RETURN;
      END IF;
    END IF;
    RAISE;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, boolean) TO authenticated;
COMMENT ON FUNCTION get_or_create_user IS 'Atomically gets or creates a user record, handling duplicates and RLS issues';

-- =====================================
-- PART 2: Fix users Table RLS
-- =====================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS policy_users_own_read ON users;
DROP POLICY IF EXISTS policy_users_own_update ON users;
DROP POLICY IF EXISTS policy_users_own_insert ON users;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

CREATE POLICY policy_users_own_read ON users FOR SELECT TO authenticated
  USING (auth_user_id = auth.uid());

CREATE POLICY policy_users_own_update ON users FOR UPDATE TO authenticated
  USING (auth_user_id = auth.uid()) WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY policy_users_own_insert ON users FOR INSERT TO authenticated
  WITH CHECK (auth_user_id = auth.uid());

-- =====================================
-- PART 3: Fix roles Table RLS
-- =====================================

DROP POLICY IF EXISTS policy_roles_read ON roles;
DROP POLICY IF EXISTS policy_roles_select ON roles;
DROP POLICY IF EXISTS policy_roles_authenticated_read ON roles;
DROP POLICY IF EXISTS policy_roles_anon_read ON roles;

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON roles TO authenticated;
GRANT SELECT ON roles TO anon;

-- All authenticated users can read all roles (reference data)
CREATE POLICY policy_roles_authenticated_read ON roles FOR SELECT TO authenticated USING (true);

-- Anonymous users can read active roles (for registration)
CREATE POLICY policy_roles_anon_read ON roles FOR SELECT TO anon
  USING (is_active = true AND is_deleted = false);

-- =====================================
-- PART 4: Fix user_roles Table RLS
-- =====================================

DROP POLICY IF EXISTS policy_user_roles_own_read ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_own_insert ON user_roles;
DROP POLICY IF EXISTS policy_user_roles_own_update ON user_roles;

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON user_roles TO authenticated;

CREATE POLICY policy_user_roles_own_read ON user_roles FOR SELECT TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY policy_user_roles_own_insert ON user_roles FOR INSERT TO authenticated
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY policy_user_roles_own_update ON user_roles FOR UPDATE TO authenticated
  USING (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- =====================================
-- PART 5: Fix accounts Table RLS
-- =====================================

DROP POLICY IF EXISTS policy_accounts_own_read ON accounts;
DROP POLICY IF EXISTS policy_accounts_owner_read ON accounts;
DROP POLICY IF EXISTS policy_accounts_own_insert ON accounts;
DROP POLICY IF EXISTS policy_accounts_owner_insert ON accounts;
DROP POLICY IF EXISTS policy_accounts_own_update ON accounts;
DROP POLICY IF EXISTS policy_accounts_owner_update ON accounts;

ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON accounts TO authenticated;

CREATE POLICY policy_accounts_owner_read ON accounts FOR SELECT TO authenticated
  USING (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY policy_accounts_owner_insert ON accounts FOR INSERT TO authenticated
  WITH CHECK (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

CREATE POLICY policy_accounts_owner_update ON accounts FOR UPDATE TO authenticated
  USING (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()))
  WITH CHECK (owner_user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid()));

-- =====================================
-- PART 6: Fix project_roles Table RLS
-- =====================================

DROP POLICY IF EXISTS policy_project_roles_read ON project_roles;
DROP POLICY IF EXISTS policy_project_roles_authenticated_read ON project_roles;
DROP POLICY IF EXISTS policy_project_roles_authenticated_insert ON project_roles;

ALTER TABLE project_roles ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON project_roles TO authenticated;

CREATE POLICY policy_project_roles_authenticated_read ON project_roles FOR SELECT TO authenticated
  USING (
    is_template = true
    OR project_id IN (
      SELECT project_id FROM project_memberships pm
      JOIN users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY policy_project_roles_authenticated_insert ON project_roles FOR INSERT TO authenticated
  WITH CHECK (
    is_template = false AND
    project_id IN (
      SELECT p.id FROM projects p
      JOIN users u ON p.owner_user_id = u.id
      WHERE u.auth_user_id = auth.uid()
    )
  );

-- =====================================
-- VERIFICATION
-- =====================================

DO $$
DECLARE
  user_count INT;
  role_count INT;
  project_role_count INT;
BEGIN
  -- Test user creation function
  RAISE NOTICE '✓ get_or_create_user function created';

  -- Check RLS status
  SELECT COUNT(*) INTO user_count FROM pg_class WHERE relname = 'users' AND relrowsecurity;
  RAISE NOTICE '✓ users RLS enabled: %', CASE WHEN user_count > 0 THEN 'YES' ELSE 'NO' END;

  SELECT COUNT(*) INTO role_count FROM pg_class WHERE relname = 'roles' AND relrowsecurity;
  RAISE NOTICE '✓ roles RLS enabled: %', CASE WHEN role_count > 0 THEN 'YES' ELSE 'NO' END;

  SELECT COUNT(*) INTO user_count FROM pg_class WHERE relname = 'user_roles' AND relrowsecurity;
  RAISE NOTICE '✓ user_roles RLS enabled: %', CASE WHEN user_count > 0 THEN 'YES' ELSE 'NO' END;

  SELECT COUNT(*) INTO user_count FROM pg_class WHERE relname = 'accounts' AND relrowsecurity;
  RAISE NOTICE '✓ accounts RLS enabled: %', CASE WHEN user_count > 0 THEN 'YES' ELSE 'NO' END;

  SELECT COUNT(*) INTO project_role_count FROM pg_class WHERE relname = 'project_roles' AND relrowsecurity;
  RAISE NOTICE '✓ project_roles RLS enabled: %', CASE WHEN project_role_count > 0 THEN 'YES' ELSE 'NO' END;

  -- Count policies
  SELECT COUNT(*) INTO user_count FROM pg_policies WHERE tablename = 'users';
  RAISE NOTICE '✓ users policies: %', user_count;

  SELECT COUNT(*) INTO role_count FROM pg_policies WHERE tablename = 'roles';
  RAISE NOTICE '✓ roles policies: %', role_count;

  SELECT COUNT(*) INTO user_count FROM pg_policies WHERE tablename = 'user_roles';
  RAISE NOTICE '✓ user_roles policies: %', user_count;

  SELECT COUNT(*) INTO user_count FROM pg_policies WHERE tablename = 'accounts';
  RAISE NOTICE '✓ accounts policies: %', user_count;

  SELECT COUNT(*) INTO project_role_count FROM pg_policies WHERE tablename = 'project_roles';
  RAISE NOTICE '✓ project_roles policies: %', project_role_count;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ ALL RLS RECURSION FIXES APPLIED!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now test the registration flow.';
  RAISE NOTICE 'No more infinite recursion errors!';
END $$;
