-- =====================================================================================
-- Create atomic user creation function
-- Version: v103
-- Description: Ensures users are created in users table when they sign up
-- =====================================================================================

-- This function is critical for registration flow:
-- 1. Checks if user exists by auth_user_id
-- 2. If not, checks by email
-- 3. If still not found, creates new user
-- 4. Returns user ID, full_name, email, and is_new flag

-- Drop existing function if it exists
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
  -- Generate default name from email or use provided name
  v_default_name := COALESCE(p_full_name, SPLIT_PART(COALESCE(p_email, ''), '@', 1), 'User');

  -- Try to find by auth_user_id first
  SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
  FROM users
  WHERE auth_user_id = p_auth_user_id
  AND is_deleted = false
  LIMIT 1;

  IF FOUND THEN
    -- User exists, update verification if needed
    IF p_is_verified THEN
      UPDATE users
      SET is_verified = true,
          verified_at = COALESCE(verified_at, NOW()),
          updated_at = NOW()
      WHERE id = v_user_id;
    END IF;

    RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
    RETURN;
  END IF;

  -- Try to find by email if provided
  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
    FROM users
    WHERE email = p_email
    AND is_deleted = false
    LIMIT 1;

    IF FOUND THEN
      -- User exists with this email, link auth_user_id
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

  -- User doesn't exist, create new one
  INSERT INTO users (auth_user_id, email, full_name, is_active, is_verified, verified_at)
  VALUES (
    p_auth_user_id,
    p_email,
    v_default_name,
    true,
    p_is_verified,
    CASE WHEN p_is_verified THEN NOW() ELSE NULL END
  )
  RETURNING id, full_name, email INTO v_user_id, v_full_name, v_email;

  v_is_new := true;
  RETURN QUERY SELECT v_user_id, v_full_name, v_email, v_is_new;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition - another request created the user simultaneously
    SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
    FROM users
    WHERE auth_user_id = p_auth_user_id
    AND is_deleted = false
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
      RETURN;
    END IF;

    -- Try by email as backup
    IF p_email IS NOT NULL THEN
      SELECT id, full_name, email INTO v_user_id, v_full_name, v_email
      FROM users
      WHERE email = p_email
      AND is_deleted = false
      LIMIT 1;

      IF FOUND THEN
        UPDATE users SET auth_user_id = p_auth_user_id WHERE id = v_user_id;
        RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
        RETURN;
      END IF;
    END IF;

    -- If we still don't have a user, re-raise the error
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, boolean) TO anon;

-- Add comment
COMMENT ON FUNCTION get_or_create_user(uuid, text, text, boolean) IS
'Atomically gets or creates a user record. Returns user_id, full_name, email, and is_new flag. Handles race conditions and email/auth_user_id lookup.';

-- =====================================================================================
-- VERIFICATION
-- =====================================================================================

DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '================================================';
    RAISE NOTICE '✅ USER CREATION FUNCTION READY';
    RAISE NOTICE '================================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Function created:';
    RAISE NOTICE '  ✓ get_or_create_user(auth_user_id, email, full_name, is_verified)';
    RAISE NOTICE '';
    RAISE NOTICE 'This function:';
    RAISE NOTICE '  1. Finds existing user by auth_user_id or email';
    RAISE NOTICE '  2. Creates new user if not found';
    RAISE NOTICE '  3. Handles race conditions';
    RAISE NOTICE '  4. Returns user_id, full_name, email, is_new';
    RAISE NOTICE '';
    RAISE NOTICE 'Use this during registration to ensure user exists!';
    RAISE NOTICE '';
END $$;
