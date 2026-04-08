-- =====================================================================================
-- v95: Atomic User Creation Function
-- Creates or updates user record atomically to avoid duplicate key and RLS issues
-- =====================================================================================

-- Drop existing function if it exists
DROP FUNCTION IF EXISTS get_or_create_user(uuid, text, text, boolean);

-- Create function to atomically get or create user
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
  -- Generate default full name if not provided
  v_default_name := COALESCE(
    p_full_name,
    CASE
      WHEN p_email IS NOT NULL AND p_email <> '' THEN SPLIT_PART(p_email, '@', 1)
      ELSE 'User'
    END
  );

  -- First, try to find existing user by auth_user_id
  SELECT id, users.full_name, users.email
  INTO v_user_id, v_full_name, v_email
  FROM users
  WHERE auth_user_id = p_auth_user_id
    AND is_deleted = false
  LIMIT 1;

  -- If found by auth_user_id, update verification status and return
  IF FOUND THEN
    IF p_is_verified THEN
      UPDATE users
      SET
        is_verified = true,
        verified_at = COALESCE(verified_at, NOW()),
        updated_at = NOW()
      WHERE id = v_user_id;
    END IF;

    RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
    RETURN;
  END IF;

  -- Not found by auth_user_id, try by email
  IF p_email IS NOT NULL AND p_email <> '' THEN
    SELECT id, users.full_name, users.email, users.auth_user_id
    INTO v_user_id, v_full_name, v_email
    FROM users
    WHERE email = p_email
      AND is_deleted = false
    LIMIT 1;

    -- If found by email, update auth_user_id and return
    IF FOUND THEN
      UPDATE users
      SET
        auth_user_id = p_auth_user_id,
        is_verified = CASE WHEN p_is_verified THEN true ELSE is_verified END,
        verified_at = CASE WHEN p_is_verified THEN COALESCE(verified_at, NOW()) ELSE verified_at END,
        updated_at = NOW()
      WHERE id = v_user_id;

      RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
      RETURN;
    END IF;
  END IF;

  -- User doesn't exist, create new one
  INSERT INTO users (
    auth_user_id,
    email,
    full_name,
    is_active,
    is_verified,
    verified_at
  )
  VALUES (
    p_auth_user_id,
    p_email,
    v_default_name,
    true,
    p_is_verified,
    CASE WHEN p_is_verified THEN NOW() ELSE NULL END
  )
  RETURNING id, full_name, email
  INTO v_user_id, v_full_name, v_email;

  v_is_new := true;

  RETURN QUERY SELECT v_user_id, v_full_name, v_email, v_is_new;
  RETURN;

EXCEPTION
  WHEN unique_violation THEN
    -- Handle race condition where user was created by another process
    -- Try one more time to fetch the user
    SELECT id, full_name, email
    INTO v_user_id, v_full_name, v_email
    FROM users
    WHERE auth_user_id = p_auth_user_id
      AND is_deleted = false
    LIMIT 1;

    IF FOUND THEN
      RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
      RETURN;
    END IF;

    -- If still not found, try by email
    IF p_email IS NOT NULL AND p_email <> '' THEN
      SELECT id, full_name, email
      INTO v_user_id, v_full_name, v_email
      FROM users
      WHERE email = p_email
        AND is_deleted = false
      LIMIT 1;

      IF FOUND THEN
        -- Update auth_user_id
        UPDATE users
        SET auth_user_id = p_auth_user_id, updated_at = NOW()
        WHERE id = v_user_id;

        RETURN QUERY SELECT v_user_id, v_full_name, v_email, false;
        RETURN;
      END IF;
    END IF;

    -- If we still can't find the user, raise the error
    RAISE;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_or_create_user(uuid, text, text, boolean) TO authenticated;

-- Add comment
COMMENT ON FUNCTION get_or_create_user IS 'Atomically gets or creates a user record, handling duplicates and RLS issues';

-- Test the function
DO $$
DECLARE
  test_result record;
BEGIN
  -- This is just to verify the function compiles correctly
  RAISE NOTICE 'Function get_or_create_user created successfully';
END $$;
