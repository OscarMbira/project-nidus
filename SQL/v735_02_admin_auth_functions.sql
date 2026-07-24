-- ============================================================================
-- v735_02: Admin System — authentication & security functions
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v735_01_admin_schema.sql, v735_01b_admin_seed_data.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- admin.get_system_setting — read typed setting value
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.get_system_setting(p_key TEXT, p_default TEXT DEFAULT NULL)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = admin, public
AS $$
  SELECT COALESCE(
    (SELECT setting_value FROM admin.system_settings WHERE setting_key = p_key LIMIT 1),
    p_default
  );
$$;

-- ---------------------------------------------------------------------------
-- admin.check_admin_permission
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.check_admin_permission(
    p_admin_user_id UUID,
    p_permission_key TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = admin, public
AS $$
DECLARE
    v_role TEXT;
    v_is_active BOOLEAN;
BEGIN
    SELECT role, (activation_status = 'active')
    INTO v_role, v_is_active
    FROM admin.admin_users
    WHERE id = p_admin_user_id;

    IF NOT FOUND OR NOT v_is_active THEN
        RETURN FALSE;
    END IF;

    IF v_role = 'super_admin' THEN
        RETURN TRUE;
    END IF;

    RETURN EXISTS (
        SELECT 1
        FROM admin.role_permissions rp
        INNER JOIN admin.admin_permissions ap ON ap.permission_key = rp.permission_key
        WHERE rp.role = v_role
          AND rp.permission_key = p_permission_key
          AND ap.is_active = TRUE
    );
END;
$$;

COMMENT ON FUNCTION admin.check_admin_permission(UUID, TEXT) IS
  'Returns TRUE when the admin user has the given permission via role_permissions.';

-- ---------------------------------------------------------------------------
-- admin.log_admin_action
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.log_admin_action(
    p_admin_user_id UUID,
    p_action TEXT,
    p_target_type TEXT DEFAULT NULL,
    p_target_id UUID DEFAULT NULL,
    p_target_details JSONB DEFAULT NULL,
    p_previous_value JSONB DEFAULT NULL,
    p_new_value JSONB DEFAULT NULL,
    p_ip_address INET DEFAULT NULL,
    p_user_agent TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public
AS $$
DECLARE
    v_role TEXT;
    v_log_id UUID;
BEGIN
    SELECT role INTO v_role
    FROM admin.admin_users
    WHERE id = p_admin_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Admin user not found: %', p_admin_user_id;
    END IF;

    INSERT INTO admin.admin_audit_log (
        admin_user_id,
        admin_role,
        action,
        target_type,
        target_id,
        target_details,
        previous_value,
        new_value,
        ip_address,
        user_agent
    )
    VALUES (
        p_admin_user_id,
        v_role,
        p_action,
        p_target_type,
        p_target_id,
        p_target_details,
        p_previous_value,
        p_new_value,
        p_ip_address,
        p_user_agent
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

COMMENT ON FUNCTION admin.log_admin_action IS
  'Append-only audit log entry for admin actions. Returns the new audit log row id.';

-- ---------------------------------------------------------------------------
-- admin.lock_admin_account
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.lock_admin_account(
    p_admin_user_id UUID,
    p_locked_until TIMESTAMPTZ DEFAULT NULL,
    p_reason TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public
AS $$
DECLARE
    v_lockout_minutes INTEGER;
    v_locked_until TIMESTAMPTZ;
BEGIN
    IF p_locked_until IS NOT NULL THEN
        v_locked_until := p_locked_until;
    ELSE
        v_lockout_minutes := COALESCE(
            admin.get_system_setting('login.lockout_minutes', '30')::INTEGER,
            30
        );
        v_locked_until := NOW() + (v_lockout_minutes || ' minutes')::INTERVAL;
    END IF;

    UPDATE admin.admin_users
    SET locked_until = v_locked_until,
        suspended_reason = COALESCE(p_reason, suspended_reason),
        updated_at = NOW()
    WHERE id = p_admin_user_id;

    UPDATE admin.admin_sessions
    SET is_active = FALSE,
        ended_at = NOW()
    WHERE admin_user_id = p_admin_user_id
      AND is_active = TRUE;
END;
$$;

COMMENT ON FUNCTION admin.lock_admin_account IS
  'Locks an admin account until locked_until and terminates active sessions.';

-- ---------------------------------------------------------------------------
-- admin.validate_admin_session
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.validate_admin_session(p_session_token TEXT)
RETURNS TABLE (
    is_valid BOOLEAN,
    admin_user_id UUID,
    admin_email TEXT,
    admin_role TEXT,
    session_id UUID,
    expires_at TIMESTAMPTZ
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = admin, public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        (
            s.is_active = TRUE
            AND s.expires_at > NOW()
            AND s.ended_at IS NULL
            AND u.activation_status = 'active'
            AND (u.locked_until IS NULL OR u.locked_until <= NOW())
        ) AS is_valid,
        u.id,
        u.email,
        u.role,
        s.id,
        s.expires_at
    FROM admin.admin_sessions s
    INNER JOIN admin.admin_users u ON u.id = s.admin_user_id
    WHERE s.session_token = p_session_token
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION admin.validate_admin_session(TEXT) IS
  'Validates an admin session token and returns session metadata.';

-- ---------------------------------------------------------------------------
-- admin.validate_admin_login
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.validate_admin_login(p_email TEXT)
RETURNS TABLE (
    admin_user_id UUID,
    activation_status TEXT,
    admin_role TEXT,
    is_locked BOOLEAN,
    locked_until TIMESTAMPTZ,
    requires_2fa BOOLEAN,
    is_2fa_configured BOOLEAN,
    can_login BOOLEAN
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = admin, public
AS $$
BEGIN
    RETURN QUERY
    SELECT
        u.id,
        u.activation_status::TEXT,
        u.role::TEXT,
        (u.locked_until IS NOT NULL AND u.locked_until > NOW()) AS is_locked,
        u.locked_until,
        u.requires_2fa,
        u.is_2fa_configured,
        (
            u.activation_status = 'active'
            AND (u.locked_until IS NULL OR u.locked_until <= NOW())
        ) AS can_login
    FROM admin.admin_users u
    WHERE lower(u.email) = lower(trim(p_email))
    LIMIT 1;
END;
$$;

COMMENT ON FUNCTION admin.validate_admin_login(TEXT) IS
  'Pre-auth lookup: activation status, role, lockout state for admin login flow.';

-- ---------------------------------------------------------------------------
-- admin.record_login_attempt
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.record_login_attempt(
    p_email TEXT,
    p_ip INET DEFAULT NULL,
    p_success BOOLEAN DEFAULT FALSE
)
RETURNS TABLE (
    admin_user_id UUID,
    failed_attempts INTEGER,
    is_locked BOOLEAN,
    locked_until TIMESTAMPTZ,
    activation_status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public
AS $$
DECLARE
    v_user admin.admin_users%ROWTYPE;
    v_max_attempts INTEGER;
    v_lockout_minutes INTEGER;
BEGIN
    v_max_attempts := COALESCE(admin.get_system_setting('login.max_failed_attempts', '5')::INTEGER, 5);
    v_lockout_minutes := COALESCE(admin.get_system_setting('login.lockout_minutes', '30')::INTEGER, 30);

    SELECT * INTO v_user
    FROM admin.admin_users
    WHERE lower(email) = lower(trim(p_email))
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    IF p_success THEN
        UPDATE admin.admin_users
        SET failed_login_attempts = 0,
            locked_until = NULL,
            last_login_at = NOW(),
            last_login_ip = COALESCE(p_ip, last_login_ip),
            updated_at = NOW()
        WHERE id = v_user.id
        RETURNING * INTO v_user;
    ELSE
        UPDATE admin.admin_users
        SET failed_login_attempts = failed_login_attempts + 1,
            updated_at = NOW()
        WHERE id = v_user.id
        RETURNING * INTO v_user;

        IF v_user.failed_login_attempts >= v_max_attempts THEN
            UPDATE admin.admin_users
            SET locked_until = NOW() + (v_lockout_minutes || ' minutes')::INTERVAL,
                updated_at = NOW()
            WHERE id = v_user.id
            RETURNING * INTO v_user;
        END IF;
    END IF;

    RETURN QUERY
    SELECT
        v_user.id,
        v_user.failed_login_attempts,
        (v_user.locked_until IS NOT NULL AND v_user.locked_until > NOW()),
        v_user.locked_until,
        v_user.activation_status::TEXT;
END;
$$;

COMMENT ON FUNCTION admin.record_login_attempt(TEXT, INET, BOOLEAN) IS
  'Tracks failed/successful login attempts and applies account lockout from system settings.';

GRANT EXECUTE ON FUNCTION admin.get_system_setting(TEXT, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.check_admin_permission(UUID, TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.log_admin_action TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.lock_admin_account TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.validate_admin_session(TEXT) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.validate_admin_login(TEXT) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.record_login_attempt(TEXT, INET, BOOLEAN) TO anon, authenticated, service_role;
