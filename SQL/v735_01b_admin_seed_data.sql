-- ============================================================================
-- v735_01b: Admin System — seed roles, permissions, settings, alert rules
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v735_01_admin_schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1.10 — Admin roles (4 roles)
-- ---------------------------------------------------------------------------
INSERT INTO admin.admin_roles (role_key, role_name, role_description, access_level, can_be_invited, max_accounts)
VALUES
    ('super_admin', 'Super Admin',
     'Full system access — manage other admins, system configuration, deployment controls, maintenance mode, emergency lockdown. The highest privilege level. Seeded during deployment, never created via invite.',
     'full', FALSE, 2),
    ('system_admin', 'System Admin',
     'User and organisation management, subscription pricing and plans, system health monitoring, database maintenance, feature flags. Cannot manage other admin accounts or access deployment controls.',
     'elevated', TRUE, NULL),
    ('support_admin', 'Support Admin',
     'User support operations — view user accounts, reset passwords, adjust individual subscriptions, manage support tickets, impersonate users for debugging, create announcements. Read-only access to system settings.',
     'standard', TRUE, NULL),
    ('content_admin', 'Content Admin',
     'Simulator content management only — create and edit scenarios, learning paths, certificates, leaderboard administration, NPC template management. No access to user data, billing, or system settings.',
     'limited', TRUE, NULL)
ON CONFLICT (role_key) DO UPDATE SET
    role_name = EXCLUDED.role_name,
    role_description = EXCLUDED.role_description,
    access_level = EXCLUDED.access_level,
    can_be_invited = EXCLUDED.can_be_invited,
    max_accounts = EXCLUDED.max_accounts;

-- ---------------------------------------------------------------------------
-- 1.11 — Admin permissions (79 permission keys per v735 plan)
-- ---------------------------------------------------------------------------
INSERT INTO admin.admin_permissions (permission_key, permission_name, category, description)
VALUES
    ('users.view',             'View Users',              'users',         'View user list and user profile details'),
    ('users.edit',             'Edit Users',              'users',         'Edit user profile information'),
    ('users.create',           'Create Users',            'users',         'Create new user accounts'),
    ('users.deactivate',       'Deactivate Users',        'users',         'Suspend or deactivate user accounts'),
    ('users.password_reset',   'Reset User Passwords',    'users',         'Trigger password reset for user accounts'),
    ('users.impersonate',      'Impersonate Users',       'users',         'Log in as a user to debug their issues'),
    ('orgs.view',              'View Organisations',      'users',         'View organisation list and details'),
    ('orgs.edit',              'Edit Organisations',      'users',         'Edit organisation information'),
    ('orgs.verify',            'Verify Organisations',    'users',         'Manually verify organisation accounts'),
    ('orgs.suspend',           'Suspend Organisations',   'users',         'Suspend organisation and all member access'),
    ('subscriptions.view',     'View Subscriptions',      'subscriptions', 'View subscription list and details'),
    ('subscriptions.edit',     'Edit Subscriptions',      'subscriptions', 'Modify individual subscription plans'),
    ('subscriptions.create',   'Create Subscriptions',    'subscriptions', 'Create new subscription records manually'),
    ('subscriptions.cancel',   'Cancel Subscriptions',    'subscriptions', 'Cancel active subscriptions'),
    ('subscriptions.refund',   'Process Refunds',         'subscriptions', 'Process payment refunds via Paynow'),
    ('pricing.view',           'View Pricing Plans',      'subscriptions', 'View subscription plan pricing'),
    ('pricing.edit',           'Edit Pricing Plans',      'subscriptions', 'Modify subscription plan pricing'),
    ('platform.projects.view', 'View Platform Projects',  'platform',      'View all projects across all organisations'),
    ('platform.projects.edit', 'Edit Platform Projects',  'platform',      'Edit project settings and status'),
    ('platform.settings.view', 'View Platform Settings',  'platform',      'View Platform-specific configuration'),
    ('platform.settings.edit', 'Edit Platform Settings',  'platform',      'Modify Platform-specific configuration'),
    ('simulator.scenarios.view',       'View Scenarios',          'simulator', 'View simulation scenario list'),
    ('simulator.scenarios.edit',       'Edit Scenarios',          'simulator', 'Edit existing simulation scenarios'),
    ('simulator.scenarios.create',     'Create Scenarios',        'simulator', 'Create new simulation scenarios'),
    ('simulator.scenarios.delete',     'Delete Scenarios',        'simulator', 'Archive or delete simulation scenarios'),
    ('simulator.learning_paths.view',  'View Learning Paths',     'simulator', 'View learning path configurations'),
    ('simulator.learning_paths.edit',  'Edit Learning Paths',     'simulator', 'Edit learning path content and structure'),
    ('simulator.certificates.view',    'View Certificates',       'simulator', 'View issued certificates'),
    ('simulator.certificates.edit',    'Edit Certificates',       'simulator', 'Edit certificate templates and criteria'),
    ('simulator.certificates.revoke',  'Revoke Certificates',     'simulator', 'Revoke issued certificates'),
    ('simulator.leaderboard.view',     'View Leaderboard',        'simulator', 'View leaderboard data'),
    ('simulator.leaderboard.reset',    'Reset Leaderboard',       'simulator', 'Reset leaderboard entries'),
    ('system.settings.view',       'View System Settings',    'system',  'View system-wide configuration'),
    ('system.settings.edit',       'Edit System Settings',    'system',  'Modify system-wide configuration'),
    ('system.maintenance.toggle',  'Toggle Maintenance Mode', 'system',  'Enable or disable maintenance mode'),
    ('system.feature_flags.view',  'View Feature Flags',      'system',  'View feature flag states'),
    ('system.feature_flags.edit',  'Edit Feature Flags',      'system',  'Toggle feature flags on/off'),
    ('system.deploy.view',         'View Deploy Status',      'system',  'View deployment status and history'),
    ('support.tickets.view',       'View Support Tickets',    'support', 'View support ticket list and details'),
    ('support.tickets.manage',     'Manage Support Tickets',  'support', 'Update ticket status, priority, and assignment'),
    ('support.tickets.assign',     'Assign Support Tickets',  'support', 'Assign tickets to admin users'),
    ('support.announcements.create','Create Announcements',   'support', 'Create and publish system-wide announcements'),
    ('errors.dashboard.view',      'View Error Dashboard',    'errors',  'View error monitoring dashboard and error groups'),
    ('errors.status.manage',       'Manage Error Status',     'errors',  'Update error status (acknowledge, resolve, ignore)'),
    ('errors.alert_rules.edit',    'Edit Alert Rules',        'errors',  'Create and modify error auto-ticketing rules'),
    ('audit.logs.view',            'View Audit Logs',         'audit',   'View admin audit trail and activity logs'),
    ('audit.logs.export',          'Export Audit Logs',        'audit',   'Export audit logs to CSV, JSON, or PDF'),
    ('security.settings.view',     'View Security Settings',  'security',  'View security configuration (MFA, password policy, IP allowlist)'),
    ('security.settings.edit',     'Edit Security Settings',  'security',  'Modify security configuration'),
    ('security.sso.view',          'View SSO Config',         'security',  'View SSO provider configuration'),
    ('security.sso.edit',          'Edit SSO Config',         'security',  'Manage SSO providers (SAML, OAuth)'),
    ('security.incidents.view',    'View Security Incidents', 'security',  'View security alerts and incidents'),
    ('security.incidents.manage',  'Manage Security Incidents','security', 'Create, assign, and resolve security incidents'),
    ('security.gdpr.view',         'View GDPR Requests',      'security',  'View data export/deletion requests and consent logs'),
    ('security.gdpr.manage',       'Manage GDPR Requests',    'security',  'Process data export/deletion requests and breach records'),
    ('content.docs.view',          'View Documentation CMS',  'content',   'View documentation articles'),
    ('content.docs.edit',          'Edit Documentation CMS',  'content',   'Create and edit documentation articles'),
    ('content.help.view',          'View Help Articles',      'content',   'View help articles and guided tours'),
    ('content.help.edit',          'Edit Help Articles',      'content',   'Create and edit help articles and tours'),
    ('content.pwa.view',           'View PWA Settings',       'content',   'View PWA configuration'),
    ('content.pwa.edit',           'Edit PWA Settings',       'content',   'Modify PWA icons, manifest, install prompt'),
    ('content.menus.view',         'View Menu Config',        'content',   'View system-wide role-menu configuration'),
    ('content.menus.edit',         'Edit Menu Config',        'content',   'Modify which menu items each role can see'),
    ('feedback.bugs.view',         'View Bug Reports',        'feedback',  'View bug reports submitted by users'),
    ('feedback.bugs.manage',       'Manage Bug Reports',      'feedback',  'Update status, assign, and resolve bug reports'),
    ('feedback.requests.view',     'View Feature Requests',   'feedback',  'View feature requests from users'),
    ('feedback.requests.manage',   'Manage Feature Requests', 'feedback',  'Approve, reject, and prioritise feature requests'),
    ('feedback.analysis.view',     'View Feedback Analysis',  'feedback',  'View user feedback trends and analytics'),
    ('feedback.backlog.view',      'View Improvement Backlog','feedback',  'View system improvement backlog'),
    ('feedback.backlog.manage',    'Manage Improvement Backlog','feedback','Create, prioritise, and track improvement items'),
    ('admins.view',                'View Admin Users',        'admin_mgmt', 'View list of admin users'),
    ('admins.create',              'Create Admin Users',      'admin_mgmt', 'Create admin user records'),
    ('admins.invite',              'Invite Admin Users',      'admin_mgmt', 'Send admin invitation emails'),
    ('admins.activate',            'Activate Admin Users',    'admin_mgmt', 'Activate pending admin registrations'),
    ('admins.reject',              'Reject Admin Users',      'admin_mgmt', 'Reject pending admin registrations'),
    ('admins.suspend',             'Suspend Admin Users',     'admin_mgmt', 'Suspend active admin accounts'),
    ('admins.reactivate',          'Reactivate Admin Users',  'admin_mgmt', 'Reactivate suspended admin accounts'),
    ('admins.deactivate',          'Deactivate Admin Users',  'admin_mgmt', 'Permanently deactivate admin accounts'),
    ('admins.roles.assign',        'Assign Admin Roles',      'admin_mgmt', 'Change admin user role assignments')
ON CONFLICT (permission_key) DO UPDATE SET
    permission_name = EXCLUDED.permission_name,
    category = EXCLUDED.category,
    description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- 1.12 — Role-permission mappings
-- ---------------------------------------------------------------------------
INSERT INTO admin.role_permissions (role, permission_key)
SELECT 'super_admin', permission_key FROM admin.admin_permissions
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO admin.role_permissions (role, permission_key)
SELECT 'system_admin', permission_key FROM admin.admin_permissions
WHERE category != 'admin_mgmt'
  AND permission_key != 'system.deploy.view'
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO admin.role_permissions (role, permission_key)
VALUES
    ('support_admin', 'users.view'),
    ('support_admin', 'users.password_reset'),
    ('support_admin', 'users.impersonate'),
    ('support_admin', 'orgs.view'),
    ('support_admin', 'subscriptions.view'),
    ('support_admin', 'subscriptions.edit'),
    ('support_admin', 'platform.projects.view'),
    ('support_admin', 'platform.settings.view'),
    ('support_admin', 'simulator.scenarios.view'),
    ('support_admin', 'simulator.learning_paths.view'),
    ('support_admin', 'simulator.certificates.view'),
    ('support_admin', 'simulator.leaderboard.view'),
    ('support_admin', 'system.settings.view'),
    ('support_admin', 'system.feature_flags.view'),
    ('support_admin', 'support.tickets.view'),
    ('support_admin', 'support.tickets.manage'),
    ('support_admin', 'support.tickets.assign'),
    ('support_admin', 'support.announcements.create'),
    ('support_admin', 'errors.dashboard.view'),
    ('support_admin', 'errors.status.manage'),
    ('support_admin', 'audit.logs.view'),
    ('support_admin', 'security.incidents.view'),
    ('support_admin', 'feedback.bugs.view'),
    ('support_admin', 'feedback.bugs.manage'),
    ('support_admin', 'feedback.requests.view'),
    ('support_admin', 'feedback.requests.manage'),
    ('support_admin', 'feedback.analysis.view')
ON CONFLICT (role, permission_key) DO NOTHING;

INSERT INTO admin.role_permissions (role, permission_key)
VALUES
    ('content_admin', 'simulator.scenarios.view'),
    ('content_admin', 'simulator.scenarios.edit'),
    ('content_admin', 'simulator.scenarios.create'),
    ('content_admin', 'simulator.scenarios.delete'),
    ('content_admin', 'simulator.learning_paths.view'),
    ('content_admin', 'simulator.learning_paths.edit'),
    ('content_admin', 'simulator.certificates.view'),
    ('content_admin', 'simulator.certificates.edit'),
    ('content_admin', 'simulator.certificates.revoke'),
    ('content_admin', 'simulator.leaderboard.view'),
    ('content_admin', 'simulator.leaderboard.reset'),
    ('content_admin', 'content.docs.view'),
    ('content_admin', 'content.docs.edit'),
    ('content_admin', 'content.help.view'),
    ('content_admin', 'content.help.edit')
ON CONFLICT (role, permission_key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 1.14 — Default system settings
-- ---------------------------------------------------------------------------
INSERT INTO admin.system_settings (setting_key, setting_value, setting_type, category, description)
VALUES
    ('session.timeout_minutes',       '30',     'integer', 'security',     'Admin session timeout in minutes of inactivity'),
    ('session.max_concurrent',        '2',      'integer', 'security',     'Maximum concurrent admin sessions per user'),
    ('session.heartbeat_interval',    '5',      'integer', 'security',     'Session heartbeat interval in minutes'),
    ('login.max_failed_attempts',     '5',      'integer', 'security',     'Failed login attempts before account lockout'),
    ('login.lockout_minutes',         '30',     'integer', 'security',     'Account lockout duration in minutes'),
    ('login.rate_limit_attempts',     '3',      'integer', 'security',     'Max login attempts per IP per rate window'),
    ('login.rate_limit_window',       '15',     'integer', 'security',     'Rate limit window in minutes'),
    ('login.captcha_after_attempts',  '2',      'integer', 'security',     'Show CAPTCHA after this many failed attempts'),
    ('login.require_2fa',             'true',   'boolean', 'security',     'Require 2FA for all admin logins'),
    ('invite.expiry_hours',           '48',     'integer', 'invitations',  'Invitation link expiry in hours'),
    ('invite.max_expiry_hours',       '72',     'integer', 'invitations',  'Maximum allowed invitation expiry in hours'),
    ('password.min_length',           '12',     'integer', 'security',     'Minimum password length'),
    ('password.require_uppercase',    'true',   'boolean', 'security',     'Require uppercase characters in password'),
    ('password.require_lowercase',    'true',   'boolean', 'security',     'Require lowercase characters in password'),
    ('password.require_number',       'true',   'boolean', 'security',     'Require numeric characters in password'),
    ('password.require_special',      'true',   'boolean', 'security',     'Require special characters in password'),
    ('password.history_count',        '5',      'integer', 'security',     'Number of previous passwords to prevent reuse'),
    ('access.business_hours_start',   '06:00',  'time',    'security',     'Admin access allowed from (local time)'),
    ('access.business_hours_end',     '22:00',  'time',    'security',     'Admin access allowed until (local time)'),
    ('access.enforce_business_hours', 'false',  'boolean', 'security',     'Enforce business hours restriction on logins'),
    ('errors.retention_days',         '90',     'integer', 'monitoring',   'Days to retain raw error log entries before archiving'),
    ('errors.auto_ticket_user_threshold',   '3',  'integer', 'monitoring', 'Unique users hitting same error to trigger auto-ticket'),
    ('errors.auto_ticket_count_threshold', '10',  'integer', 'monitoring', 'Error occurrences to trigger auto-ticket'),
    ('errors.auto_ticket_window_minutes',  '60',  'integer', 'monitoring', 'Time window for auto-ticket thresholds'),
    ('errors.escalation_hours',       '4',      'integer', 'monitoring',   'Hours before unresolved auto-ticket escalates to System Admin'),
    ('errors.daily_digest_enabled',   'true',   'boolean', 'monitoring',   'Send daily error digest email to Support Admin'),
    ('maintenance.platform_enabled',  'false',  'boolean', 'system',       'Platform maintenance mode active'),
    ('maintenance.simulator_enabled', 'false',  'boolean', 'system',       'Simulator maintenance mode active'),
    ('maintenance.message',           '',       'text',    'system',       'Maintenance mode message displayed to users'),
    ('notifications.login_alert_email',   'true',  'boolean', 'notifications', 'Email Super Admin on every admin login'),
    ('notifications.login_alert_sms',     'false', 'boolean', 'notifications', 'SMS Super Admin on every admin login'),
    ('notifications.new_registration',    'true',  'boolean', 'notifications', 'Notify Super Admin of new admin registrations pending activation')
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    description = EXCLUDED.description;

-- ---------------------------------------------------------------------------
-- 1.15 — Default error alert rules (requires stub table from v735_01)
-- ---------------------------------------------------------------------------
INSERT INTO admin.error_alert_rules (
    rule_name, error_type, threshold_users, threshold_occurrences,
    time_window_minutes, auto_ticket_priority, notify_role
)
VALUES
    ('Critical — RLS/permission errors',       'rls_error',    1,  1,  60, 'critical', 'system_admin'),
    ('Critical — Payment page errors',          NULL,          1,  1,  60, 'critical', 'system_admin'),
    ('High — Multiple users same error',        NULL,          3,  10, 60, 'high',     'support_admin'),
    ('Medium — Recurring resolved errors',      NULL,          1,  3,  60, 'high',     'support_admin'),
    ('Low — Slow page loads',                   'slow_load',   5,  20, 60, 'medium',   'support_admin')
ON CONFLICT (rule_name) DO UPDATE SET
    error_type = EXCLUDED.error_type,
    threshold_users = EXCLUDED.threshold_users,
    threshold_occurrences = EXCLUDED.threshold_occurrences,
    time_window_minutes = EXCLUDED.time_window_minutes,
    auto_ticket_priority = EXCLUDED.auto_ticket_priority,
    notify_role = EXCLUDED.notify_role;

UPDATE admin.error_alert_rules
SET page_route_pattern = '*/checkout*|*/payment*|*/subscription*'
WHERE rule_name = 'Critical — Payment page errors'
  AND page_route_pattern IS NULL;
