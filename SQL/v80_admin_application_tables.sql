-- =============================================
-- Admin Application Database Tables
-- Version: v80
-- Description: Tables and permissions for the Admin application
-- =============================================

-- =============================================
-- ADMIN ACTIVITY LOGGING TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    action_type VARCHAR(50) NOT NULL,
    action_category VARCHAR(50),
    target_type VARCHAR(50),
    target_id UUID,
    target_name VARCHAR(255),
    old_value JSONB,
    new_value JSONB,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_admin_activity_user ON admin_activity_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_admin_activity_date ON admin_activity_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_activity_type ON admin_activity_log(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_activity_target ON admin_activity_log(target_type, target_id);

COMMENT ON TABLE admin_activity_log IS 'Audit trail for all administrative actions';
COMMENT ON COLUMN admin_activity_log.action_type IS 'Type of action: create, update, delete, view, export, etc.';
COMMENT ON COLUMN admin_activity_log.action_category IS 'Category: user_management, role_management, system_settings, etc.';
COMMENT ON COLUMN admin_activity_log.target_type IS 'Type of entity affected: user, role, permission, menu, etc.';

-- =============================================
-- ADMIN DASHBOARD WIDGETS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_dashboard_widgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    widget_type VARCHAR(50) NOT NULL,
    widget_title VARCHAR(100),
    position INT DEFAULT 0,
    grid_config JSONB DEFAULT '{"x": 0, "y": 0, "w": 1, "h": 1}'::jsonb,
    data_config JSONB,
    is_visible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_admin_dashboard_widgets_user ON admin_dashboard_widgets(user_id);

COMMENT ON TABLE admin_dashboard_widgets IS 'User-specific dashboard widget configuration';
COMMENT ON COLUMN admin_dashboard_widgets.widget_type IS 'Type of widget: stats, chart, activity, etc.';
COMMENT ON COLUMN admin_dashboard_widgets.grid_config IS 'Grid position and size configuration';

-- =============================================
-- ADMIN SYSTEM SETTINGS TABLE
-- =============================================
CREATE TABLE IF NOT EXISTS admin_system_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    setting_key VARCHAR(100) UNIQUE NOT NULL,
    setting_value JSONB,
    setting_category VARCHAR(50),
    setting_type VARCHAR(30) DEFAULT 'string',
    description TEXT,
    is_sensitive BOOLEAN DEFAULT false,
    is_editable BOOLEAN DEFAULT true,
    validation_rules JSONB,
    updated_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for category lookups
CREATE INDEX IF NOT EXISTS idx_admin_system_settings_category ON admin_system_settings(setting_category);

COMMENT ON TABLE admin_system_settings IS 'Global system settings managed through admin application';
COMMENT ON COLUMN admin_system_settings.is_sensitive IS 'If true, value should be masked in UI';
COMMENT ON COLUMN admin_system_settings.setting_type IS 'Data type: string, number, boolean, json, etc.';

-- =============================================
-- ROW LEVEL SECURITY POLICIES
-- =============================================
ALTER TABLE admin_activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_dashboard_widgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_system_settings ENABLE ROW LEVEL SECURITY;

-- Admin activity log - only admins can view
CREATE POLICY admin_activity_log_admin_access ON admin_activity_log
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('system_admin', 'org_admin')
        )
    );

-- Dashboard widgets - users can manage their own
CREATE POLICY admin_dashboard_widgets_user_access ON admin_dashboard_widgets
    FOR ALL USING (user_id = auth.uid());

-- System settings - only system admins can modify, org admins can view
CREATE POLICY admin_system_settings_view ON admin_system_settings
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('system_admin', 'org_admin')
        )
    );

CREATE POLICY admin_system_settings_modify ON admin_system_settings
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name = 'system_admin'
        )
    );

-- =============================================
-- ADMIN PERMISSIONS
-- =============================================
INSERT INTO permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type)
VALUES
    -- PM Admin permissions
    ('admin_dashboard_view', 'View Admin Dashboard', 'Access the admin dashboard', 'admin', 'dashboard', 'read'),
    ('admin_users_view', 'View Users', 'View user list and details', 'admin', 'users', 'read'),
    ('admin_users_create', 'Create Users', 'Create new user accounts', 'admin', 'users', 'create'),
    ('admin_users_edit', 'Edit Users', 'Edit user information and settings', 'admin', 'users', 'update'),
    ('admin_users_delete', 'Delete Users', 'Delete or deactivate user accounts', 'admin', 'users', 'delete'),
    ('admin_roles_view', 'View Roles', 'View role definitions', 'admin', 'roles', 'read'),
    ('admin_roles_manage', 'Manage Roles', 'Create, edit, delete roles', 'admin', 'roles', 'manage'),
    ('admin_permissions_view', 'View Permissions', 'View permission definitions', 'admin', 'permissions', 'read'),
    ('admin_permissions_manage', 'Manage Permissions', 'Assign permissions to roles', 'admin', 'permissions', 'manage'),
    ('admin_menus_view', 'View Menus', 'View menu configuration', 'admin', 'menus', 'read'),
    ('admin_menus_manage', 'Manage Menus', 'Configure navigation menus', 'admin', 'menus', 'manage'),
    ('admin_orgs_view', 'View Organizations', 'View organization list', 'admin', 'organizations', 'read'),
    ('admin_orgs_manage', 'Manage Organizations', 'Manage organization accounts', 'admin', 'organizations', 'manage'),
    ('admin_methodologies_manage', 'Manage Methodologies', 'Configure methodologies', 'admin', 'methodologies', 'manage'),
    ('admin_system_settings_view', 'View System Settings', 'View system configuration', 'admin', 'system', 'read'),
    ('admin_system_settings_manage', 'Manage System Settings', 'Configure system-wide settings', 'admin', 'system', 'manage'),

    -- Simulator Admin permissions
    ('admin_sim_scenarios_view', 'View Scenarios', 'View simulator scenarios', 'admin', 'simulator', 'read'),
    ('admin_sim_scenarios_manage', 'Manage Scenarios', 'Create and edit scenarios', 'admin', 'simulator', 'manage'),
    ('admin_sim_modules_view', 'View Modules', 'View simulation modules', 'admin', 'simulator', 'read'),
    ('admin_sim_modules_manage', 'Manage Modules', 'Configure simulation modules', 'admin', 'simulator', 'manage'),
    ('admin_sim_ai_config', 'Configure AI Events', 'Configure AI event settings', 'admin', 'simulator', 'manage'),
    ('admin_sim_pricing_view', 'View Pricing', 'View pricing configuration', 'admin', 'simulator', 'read'),
    ('admin_sim_pricing_manage', 'Manage Pricing', 'Configure pricing and plans', 'admin', 'simulator', 'manage'),
    ('admin_sim_certificates_view', 'View Certificates', 'View certificate templates', 'admin', 'simulator', 'read'),
    ('admin_sim_certificates_manage', 'Manage Certificates', 'Configure certificate templates', 'admin', 'simulator', 'manage'),
    ('admin_sim_leaderboards_manage', 'Manage Leaderboards', 'Configure leaderboard settings', 'admin', 'simulator', 'manage'),
    ('admin_sim_analytics', 'View Simulator Analytics', 'View simulator analytics', 'admin', 'simulator', 'read'),

    -- Security Admin permissions
    ('admin_security_monitoring', 'Security Monitoring', 'View security monitoring dashboard', 'admin', 'security', 'read'),
    ('admin_security_alerts', 'Manage Security Alerts', 'Configure security alerts', 'admin', 'security', 'manage'),
    ('admin_security_incidents', 'Manage Incidents', 'Manage security incidents', 'admin', 'security', 'manage'),
    ('admin_audit_logs', 'View Audit Logs', 'View system audit logs', 'admin', 'security', 'read'),
    ('admin_gdpr_compliance', 'GDPR Compliance', 'Manage GDPR compliance', 'admin', 'security', 'manage'),
    ('admin_sso_manage', 'Manage SSO', 'Configure SSO providers', 'admin', 'security', 'manage'),

    -- Support Admin permissions
    ('admin_help_manage', 'Manage Help Content', 'Manage help articles', 'admin', 'support', 'manage'),
    ('admin_bugs_manage', 'Manage Bug Reports', 'Manage bug tracking', 'admin', 'support', 'manage'),
    ('admin_feedback_view', 'View Feedback', 'View user feedback', 'admin', 'support', 'read'),
    ('admin_features_manage', 'Manage Feature Requests', 'Manage feature requests', 'admin', 'support', 'manage'),
    ('admin_maintenance_manage', 'Manage Maintenance', 'Manage maintenance schedules', 'admin', 'support', 'manage'),

    -- Monitoring permissions
    ('admin_performance_view', 'View Performance', 'View performance metrics', 'admin', 'monitoring', 'read'),
    ('admin_system_monitoring', 'System Monitoring', 'View system status', 'admin', 'monitoring', 'read')
ON CONFLICT (permission_code) DO NOTHING;

-- =============================================
-- ASSIGN ADMIN PERMISSIONS TO SYSTEM_ADMIN ROLE
-- =============================================
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'system_admin'
AND p.permission_category = 'admin'
ON CONFLICT DO NOTHING;

-- Assign view-only permissions to org_admin for most admin features
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
CROSS JOIN permissions p
WHERE r.role_name = 'org_admin'
AND p.permission_category = 'admin'
AND (p.permission_type = 'read' OR p.permission_code IN (
    'admin_dashboard_view',
    'admin_users_view',
    'admin_users_create',
    'admin_users_edit',
    'admin_roles_view',
    'admin_permissions_view',
    'admin_orgs_view',
    'admin_sim_analytics',
    'admin_audit_logs',
    'admin_feedback_view',
    'admin_performance_view',
    'admin_system_monitoring'
))
ON CONFLICT DO NOTHING;

-- =============================================
-- REGISTER TABLES IN DATABASE_TABLES REGISTRY
-- =============================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('admin_activity_log', 'Admin action audit trail for tracking all administrative operations', true, true),
    ('admin_dashboard_widgets', 'User-specific dashboard widget configuration for admin app', false, true),
    ('admin_system_settings', 'Global system settings managed through admin application', true, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =============================================
-- DEFAULT SYSTEM SETTINGS
-- =============================================
INSERT INTO admin_system_settings (setting_key, setting_value, setting_category, setting_type, description, is_sensitive, is_editable)
VALUES
    ('app_name', '"Project Nidus"', 'general', 'string', 'Application display name', false, true),
    ('maintenance_mode', 'false', 'general', 'boolean', 'Enable maintenance mode', false, true),
    ('max_upload_size_mb', '50', 'storage', 'number', 'Maximum file upload size in MB', false, true),
    ('session_timeout_minutes', '60', 'security', 'number', 'User session timeout in minutes', false, true),
    ('password_min_length', '8', 'security', 'number', 'Minimum password length', false, true),
    ('require_mfa', 'false', 'security', 'boolean', 'Require MFA for all users', false, true),
    ('email_notifications_enabled', 'true', 'notifications', 'boolean', 'Enable email notifications', false, true),
    ('default_theme', '"dark"', 'appearance', 'string', 'Default application theme', false, true)
ON CONFLICT (setting_key) DO NOTHING;
