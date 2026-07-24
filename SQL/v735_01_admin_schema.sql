-- ============================================================================
-- v735_01: Admin System — schema, core tables, RLS
-- PostgreSQL 15+ / Supabase
-- Run before: v735_01b_admin_seed_data.sql
--
-- NOTE: Helper functions (current_admin_user_id, is_active_admin) are defined
-- AFTER admin_users is created. PostgreSQL validates SQL-function bodies at
-- CREATE time — defining them earlier causes "relation does not exist" (42P01).
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS admin;

COMMENT ON SCHEMA admin IS 'Dedicated schema for the Project Nidus Admin application (v735)';

-- ---------------------------------------------------------------------------
-- admin_roles
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.admin_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_key VARCHAR(50) UNIQUE NOT NULL,
    role_name VARCHAR(100) NOT NULL,
    role_description TEXT NOT NULL,
    access_level VARCHAR(20) NOT NULL CHECK (access_level IN ('full', 'elevated', 'standard', 'limited')),
    is_active BOOLEAN DEFAULT TRUE,
    can_be_invited BOOLEAN DEFAULT TRUE,
    max_accounts INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admin.admin_roles IS 'Admin role definitions (super_admin, system_admin, support_admin, content_admin)';

-- ---------------------------------------------------------------------------
-- admin_users (FK to self deferred — add after table exists)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    auth_user_id UUID REFERENCES auth.users(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'system_admin', 'support_admin', 'content_admin')),
    activation_status VARCHAR(30) NOT NULL DEFAULT 'invited'
        CHECK (activation_status IN ('invited', 'pending_activation', 'active', 'rejected', 'suspended', 'deactivated')),
    activated_by UUID,
    activated_at TIMESTAMPTZ,
    rejection_reason TEXT,
    suspended_reason TEXT,
    requires_2fa BOOLEAN DEFAULT TRUE,
    is_2fa_configured BOOLEAN DEFAULT FALSE,
    last_login_at TIMESTAMPTZ,
    last_login_ip INET,
    registration_ip INET,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMPTZ,
    created_by UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admin.admin_users
    DROP CONSTRAINT IF EXISTS admin_users_activated_by_fkey,
    ADD CONSTRAINT admin_users_activated_by_fkey
        FOREIGN KEY (activated_by) REFERENCES admin.admin_users(id);

ALTER TABLE admin.admin_users
    DROP CONSTRAINT IF EXISTS admin_users_created_by_fkey,
    ADD CONSTRAINT admin_users_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES admin.admin_users(id);

CREATE INDEX IF NOT EXISTS idx_admin_users_auth_user_id ON admin.admin_users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_users_email ON admin.admin_users(email);
CREATE INDEX IF NOT EXISTS idx_admin_users_role ON admin.admin_users(role);
CREATE INDEX IF NOT EXISTS idx_admin_users_activation_status ON admin.admin_users(activation_status);

COMMENT ON TABLE admin.admin_users IS 'Admin application user accounts — login allowed only when activation_status = active';

-- ---------------------------------------------------------------------------
-- Helper: resolve active admin user from Supabase Auth session
-- (MUST be created after admin_users — SQL functions validate relations at CREATE time)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.current_admin_user_id()
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = admin, public
AS $$
  SELECT au.id
  FROM admin.admin_users au
  WHERE au.auth_user_id = auth.uid()
    AND au.activation_status = 'active'
  LIMIT 1;
$$;

COMMENT ON FUNCTION admin.current_admin_user_id() IS
  'Returns admin.admin_users.id for the current auth session when activation_status is active.';

CREATE OR REPLACE FUNCTION admin.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = admin, public
AS $$
  SELECT admin.current_admin_user_id() IS NOT NULL;
$$;

COMMENT ON FUNCTION admin.is_active_admin() IS
  'TRUE when the authenticated user is an active admin account.';

-- ---------------------------------------------------------------------------
-- admin_invitations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.admin_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token VARCHAR(128) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    target_role VARCHAR(50) NOT NULL CHECK (target_role IN ('system_admin', 'support_admin', 'content_admin')),
    custom_message TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'used', 'expired', 'revoked')),
    invited_by UUID NOT NULL REFERENCES admin.admin_users(id),
    used_at TIMESTAMPTZ,
    used_by_ip INET,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    revoked_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_invitations_email ON admin.admin_invitations(email);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_token ON admin.admin_invitations(token);
CREATE INDEX IF NOT EXISTS idx_admin_invitations_status ON admin.admin_invitations(status);

COMMENT ON TABLE admin.admin_invitations IS 'Invite-only admin registration tokens (super_admin excluded from invites)';

-- ---------------------------------------------------------------------------
-- admin_permissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.admin_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(100) UNIQUE NOT NULL,
    permission_name VARCHAR(255) NOT NULL,
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_admin_permissions_category ON admin.admin_permissions(category);

COMMENT ON TABLE admin.admin_permissions IS 'Granular permission keys for admin RBAC';

-- ---------------------------------------------------------------------------
-- role_permissions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.role_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role VARCHAR(50) NOT NULL,
    permission_key VARCHAR(100) NOT NULL REFERENCES admin.admin_permissions(permission_key),
    granted_at TIMESTAMPTZ DEFAULT NOW(),
    granted_by UUID REFERENCES admin.admin_users(id),
    UNIQUE (role, permission_key)
);

CREATE INDEX IF NOT EXISTS idx_role_permissions_role ON admin.role_permissions(role);

COMMENT ON TABLE admin.role_permissions IS 'Maps admin roles to permission keys';

-- ---------------------------------------------------------------------------
-- admin_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.admin_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin.admin_users(id),
    session_token VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    ended_at TIMESTAMPTZ,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_user_id ON admin.admin_sessions(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_token ON admin.admin_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_active ON admin.admin_sessions(is_active) WHERE is_active = TRUE;

COMMENT ON TABLE admin.admin_sessions IS 'Active and historical admin login sessions';

-- ---------------------------------------------------------------------------
-- admin_audit_log (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.admin_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID REFERENCES admin.admin_users(id),
    admin_role VARCHAR(50) NOT NULL,
    action VARCHAR(100) NOT NULL,
    target_type VARCHAR(50),
    target_id UUID,
    target_details JSONB,
    previous_value JSONB,
    new_value JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_audit_log_admin_user_id ON admin.admin_audit_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_action ON admin.admin_audit_log(action);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_created_at ON admin.admin_audit_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin.admin_audit_log(target_type, target_id);

COMMENT ON TABLE admin.admin_audit_log IS 'Immutable audit trail for all admin actions';

CREATE OR REPLACE FUNCTION admin.prevent_audit_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'admin.admin_audit_log is append-only — updates and deletes are not permitted';
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_audit_log_no_mutation ON admin.admin_audit_log;
CREATE TRIGGER trg_admin_audit_log_no_mutation
    BEFORE UPDATE OR DELETE ON admin.admin_audit_log
    FOR EACH ROW
    EXECUTE FUNCTION admin.prevent_audit_log_mutation();

-- ---------------------------------------------------------------------------
-- system_settings
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    setting_type VARCHAR(30) NOT NULL CHECK (setting_type IN ('integer', 'boolean', 'text', 'time', 'json')),
    category VARCHAR(50) NOT NULL,
    description TEXT,
    is_sensitive BOOLEAN DEFAULT FALSE,
    updated_by UUID REFERENCES admin.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_system_settings_category ON admin.system_settings(category);

COMMENT ON TABLE admin.system_settings IS 'Admin-managed system-wide configuration (v735 consolidated settings store)';

-- ---------------------------------------------------------------------------
-- error_alert_rules (minimal stub — full indexes/triggers in v735_06)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.error_alert_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_name VARCHAR(255) NOT NULL UNIQUE,
    error_type VARCHAR(30),
    page_route_pattern VARCHAR(500),
    system VARCHAR(20) CHECK (system IN ('platform', 'simulator')),
    threshold_users INTEGER DEFAULT 3,
    threshold_occurrences INTEGER DEFAULT 10,
    time_window_minutes INTEGER DEFAULT 60,
    auto_ticket_priority VARCHAR(20) DEFAULT 'high',
    notify_role VARCHAR(50) DEFAULT 'support_admin',
    is_active BOOLEAN DEFAULT TRUE,
    created_by UUID REFERENCES admin.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE admin.error_alert_rules IS 'Configurable error auto-ticketing thresholds (stub in v735_01; extended in v735_06)';

-- ---------------------------------------------------------------------------
-- updated_at trigger for admin_users / system_settings
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_admin_users_updated_at ON admin.admin_users;
CREATE TRIGGER trg_admin_users_updated_at
    BEFORE UPDATE ON admin.admin_users
    FOR EACH ROW
    EXECUTE FUNCTION admin.set_updated_at();

DROP TRIGGER IF EXISTS trg_admin_system_settings_updated_at ON admin.system_settings;
CREATE TRIGGER trg_admin_system_settings_updated_at
    BEFORE UPDATE ON admin.system_settings
    FOR EACH ROW
    EXECUTE FUNCTION admin.set_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
ALTER TABLE admin.admin_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.admin_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.admin_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.admin_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.admin_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.admin_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.error_alert_rules ENABLE ROW LEVEL SECURITY;

-- admin_roles
DROP POLICY IF EXISTS admin_roles_select ON admin.admin_roles;
CREATE POLICY admin_roles_select ON admin.admin_roles
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

-- admin_users
DROP POLICY IF EXISTS admin_users_select ON admin.admin_users;
CREATE POLICY admin_users_select ON admin.admin_users
    FOR SELECT TO authenticated
    USING (admin.is_active_admin() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS admin_users_update ON admin.admin_users;
CREATE POLICY admin_users_update ON admin.admin_users
    FOR UPDATE TO authenticated
    USING (admin.is_active_admin() OR auth_user_id = auth.uid())
    WITH CHECK (admin.is_active_admin() OR auth_user_id = auth.uid());

DROP POLICY IF EXISTS admin_users_insert ON admin.admin_users;
CREATE POLICY admin_users_insert ON admin.admin_users
    FOR INSERT TO authenticated
    WITH CHECK (auth_user_id = auth.uid() OR admin.is_active_admin());

-- admin_invitations
DROP POLICY IF EXISTS admin_invitations_all ON admin.admin_invitations;
CREATE POLICY admin_invitations_all ON admin.admin_invitations
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

-- admin_permissions & role_permissions (read-only for admins via RLS)
DROP POLICY IF EXISTS admin_permissions_select ON admin.admin_permissions;
CREATE POLICY admin_permissions_select ON admin.admin_permissions
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

DROP POLICY IF EXISTS role_permissions_select ON admin.role_permissions;
CREATE POLICY role_permissions_select ON admin.role_permissions
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

-- admin_sessions
DROP POLICY IF EXISTS admin_sessions_all ON admin.admin_sessions;
CREATE POLICY admin_sessions_all ON admin.admin_sessions
    FOR ALL TO authenticated
    USING (
        admin.is_active_admin()
        OR admin_user_id IN (
            SELECT id FROM admin.admin_users WHERE auth_user_id = auth.uid()
        )
    )
    WITH CHECK (
        admin.is_active_admin()
        OR admin_user_id IN (
            SELECT id FROM admin.admin_users WHERE auth_user_id = auth.uid()
        )
    );

-- admin_audit_log — insert + select for active admins only
DROP POLICY IF EXISTS admin_audit_log_select ON admin.admin_audit_log;
CREATE POLICY admin_audit_log_select ON admin.admin_audit_log
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

DROP POLICY IF EXISTS admin_audit_log_insert ON admin.admin_audit_log;
CREATE POLICY admin_audit_log_insert ON admin.admin_audit_log
    FOR INSERT TO authenticated
    WITH CHECK (admin.is_active_admin());

-- system_settings
DROP POLICY IF EXISTS admin_system_settings_select ON admin.system_settings;
CREATE POLICY admin_system_settings_select ON admin.system_settings
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

DROP POLICY IF EXISTS admin_system_settings_modify ON admin.system_settings;
CREATE POLICY admin_system_settings_modify ON admin.system_settings
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

-- error_alert_rules (stub)
DROP POLICY IF EXISTS error_alert_rules_select ON admin.error_alert_rules;
CREATE POLICY error_alert_rules_select ON admin.error_alert_rules
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

DROP POLICY IF EXISTS error_alert_rules_modify ON admin.error_alert_rules;
CREATE POLICY error_alert_rules_modify ON admin.error_alert_rules
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
GRANT USAGE ON SCHEMA admin TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA admin TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA admin TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA admin TO authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA admin
    GRANT SELECT, INSERT, UPDATE ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA admin
    GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA admin
    GRANT EXECUTE ON FUNCTIONS TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Register tables in database_tables
-- ---------------------------------------------------------------------------
INSERT INTO public.database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
    ('admin_roles', 'Admin role definitions and access levels', 'admin', TRUE, TRUE, 'admin'),
    ('admin_users', 'Admin application user accounts and activation state', 'admin', FALSE, TRUE, 'admin'),
    ('admin_invitations', 'Invite-only admin registration tokens', 'admin', FALSE, TRUE, 'admin'),
    ('admin_permissions', 'Granular permission keys for admin RBAC', 'admin', TRUE, TRUE, 'admin'),
    ('role_permissions', 'Maps admin roles to permission keys', 'admin', TRUE, TRUE, 'admin'),
    ('admin_sessions', 'Active and historical admin login sessions', 'admin', TRUE, TRUE, 'admin'),
    ('admin_audit_log', 'Immutable audit trail for admin actions', 'admin', TRUE, TRUE, 'admin'),
    ('system_settings', 'Admin-managed system-wide configuration', 'admin', TRUE, TRUE, 'admin'),
    ('error_alert_rules', 'Configurable error auto-ticketing thresholds', 'admin', TRUE, TRUE, 'admin')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    schema_name = EXCLUDED.schema_name,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
