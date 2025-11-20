-- =====================================================================================
-- Phase 8: Security Hardening & Compliance Module
-- Version: v57
-- Feature: Phase 8 Menu Items
-- Description: Menu items for security, GDPR compliance, authentication, and encryption features
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- Prerequisites:
-- - v01 through v56 must be run first
-- - v14_seed_data_menus.sql must be run first (menu_items table must exist)
-- - v12_seed_data_rbac.sql must be run first (roles must exist)

-- =====================================================================================
-- SECTION 1: SECURITY MENU (Admin only)
-- =====================================================================================

-- Security Parent Menu (under Administration)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
SELECT 'security', 'Security', 'Security monitoring and management', id, 2, 1, '/admin/security', 'shield', '#EF4444', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Security Monitoring
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'security_monitoring', 'Security Monitoring', 'Security dashboard and real-time monitoring', id, 3, 1, '/admin/security/monitoring', 'activity', true, true
FROM menu_items WHERE menu_code = 'security'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Security Alerts
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'security_alerts', 'Security Alerts', 'Security alerts and incident management', id, 3, 2, '/admin/security/alerts', 'alert-triangle', true, true
FROM menu_items WHERE menu_code = 'security'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Security Incidents
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'security_incidents', 'Security Incidents', 'Security incident tracking and resolution', id, 3, 3, '/admin/security/incidents', 'alert-circle', true, true
FROM menu_items WHERE menu_code = 'security'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Audit Logs
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'audit_logs', 'Audit Logs', 'Comprehensive audit log viewer', id, 3, 4, '/admin/security/audit-logs', 'file-text', true, true
FROM menu_items WHERE menu_code = 'security'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Data Access Logs
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'data_access_logs', 'Data Access Logs', 'Data access tracking for GDPR compliance', id, 3, 5, '/admin/security/data-access-logs', 'database', true, true
FROM menu_items WHERE menu_code = 'security'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- =====================================================================================
-- SECTION 2: GDPR COMPLIANCE MENU (Admin only)
-- =====================================================================================

-- GDPR Compliance Parent Menu (under Administration)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
SELECT 'gdpr_compliance', 'GDPR Compliance', 'GDPR compliance and data protection management', id, 2, 2, '/admin/gdpr', 'shield-check', '#10B981', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Consent Management
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'consent_management', 'Consent Management', 'User consent tracking and management', id, 3, 1, '/admin/gdpr/consent', 'check-circle', true, true
FROM menu_items WHERE menu_code = 'gdpr_compliance'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Data Export Requests
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'data_export_requests', 'Data Export Requests', 'Manage data export requests', id, 3, 2, '/admin/gdpr/export-requests', 'download', true, true
FROM menu_items WHERE menu_code = 'gdpr_compliance'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Data Deletion Requests
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'data_deletion_requests', 'Data Deletion Requests', 'Manage right to be forgotten requests', id, 3, 3, '/admin/gdpr/deletion-requests', 'trash-2', true, true
FROM menu_items WHERE menu_code = 'gdpr_compliance'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Data Breach Management
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'data_breach_management', 'Data Breach Management', 'Data breach incident tracking', id, 3, 4, '/admin/gdpr/data-breaches', 'alert-octagon', true, true
FROM menu_items WHERE menu_code = 'gdpr_compliance'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Compliance Reports
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'compliance_reports', 'Compliance Reports', 'GDPR compliance reports and analytics', id, 3, 5, '/admin/gdpr/reports', 'file-bar-chart', true, true
FROM menu_items WHERE menu_code = 'gdpr_compliance'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- =====================================================================================
-- SECTION 3: AUTHENTICATION MENU (Admin only)
-- =====================================================================================

-- Authentication Parent Menu (under Administration)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
SELECT 'authentication', 'Authentication', 'Authentication and SSO management', id, 2, 3, '/admin/authentication', 'key', '#8B5CF6', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- SSO Providers
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'sso_providers', 'SSO Providers', 'Configure SSO providers (SAML, OAuth, OIDC)', id, 3, 1, '/admin/authentication/sso-providers', 'users', true, true
FROM menu_items WHERE menu_code = 'authentication'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- MFA Policies
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'mfa_policies', 'MFA Policies', 'Multi-factor authentication policies', id, 3, 2, '/admin/authentication/mfa-policies', 'shield', true, true
FROM menu_items WHERE menu_code = 'authentication'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Password Policies
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'password_policies', 'Password Policies', 'Password complexity and expiration policies', id, 3, 3, '/admin/authentication/password-policies', 'lock', true, true
FROM menu_items WHERE menu_code = 'authentication'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Session Management
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'session_management', 'Session Management', 'User session management and monitoring', id, 3, 4, '/admin/authentication/sessions', 'clock', true, true
FROM menu_items WHERE menu_code = 'authentication'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- =====================================================================================
-- SECTION 4: ENCRYPTION MENU (Admin only)
-- =====================================================================================

-- Encryption Parent Menu (under Administration)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
SELECT 'encryption', 'Encryption', 'Encryption key and field management', id, 2, 4, '/admin/encryption', 'key-round', '#F59E0B', true, true
FROM menu_items WHERE menu_code = 'administration'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Encryption Keys
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'encryption_keys', 'Encryption Keys', 'Manage encryption keys', id, 3, 1, '/admin/encryption/keys', 'key', true, true
FROM menu_items WHERE menu_code = 'encryption'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Encrypted Fields
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'encrypted_fields', 'Encrypted Fields', 'View encrypted database fields', id, 3, 2, '/admin/encryption/fields', 'database', true, true
FROM menu_items WHERE menu_code = 'encryption'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Key Rotation
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'key_rotation', 'Key Rotation', 'Encryption key rotation schedules', id, 3, 3, '/admin/encryption/rotation', 'rotate-cw', true, true
FROM menu_items WHERE menu_code = 'encryption'
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- =====================================================================================
-- SECTION 5: USER SETTINGS MENU - Security & Privacy
-- =====================================================================================

-- Settings Parent Menu (top-level for user settings)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, menu_color, is_visible, is_active)
VALUES ('settings', 'Settings', 'User settings and preferences', NULL, 1, 7, '/settings', 'settings', '#6B7280', true, true)
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Settings > Security (User menu)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'settings_security', 'Security', 'Security settings and MFA management', id, 2, 1, '/settings/security', 'shield', true, true
FROM menu_items WHERE menu_code = 'settings' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- Settings > Privacy (User menu)
INSERT INTO menu_items (menu_code, menu_label, menu_description, parent_menu_id, menu_level, sort_order, route_path, menu_icon, is_visible, is_active)
SELECT 'settings_privacy', 'Privacy', 'Privacy center and GDPR rights', id, 2, 2, '/settings/privacy', 'lock', true, true
FROM menu_items WHERE menu_code = 'settings' AND parent_menu_id IS NULL
LIMIT 1
ON CONFLICT (menu_code) DO UPDATE SET menu_label = EXCLUDED.menu_label, sort_order = EXCLUDED.sort_order, updated_at = NOW();

-- =====================================================================================
-- SECTION 6: ROLE-MENU ACCESS (Restrict admin menus to System Admin role)
-- =====================================================================================

-- Grant access to all Security menu items to System Admin role
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, mi.id, true, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE r.role_name = 'System Admin'
AND mi.menu_code IN (
    'security', 'security_monitoring', 'security_alerts', 'security_incidents', 'audit_logs', 'data_access_logs',
    'gdpr_compliance', 'consent_management', 'data_export_requests', 'data_deletion_requests', 'data_breach_management', 'compliance_reports',
    'authentication', 'sso_providers', 'mfa_policies', 'password_policies', 'session_management',
    'encryption', 'encryption_keys', 'encrypted_fields', 'key_rotation'
)
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_use = EXCLUDED.can_use,
    updated_at = NOW();

-- Grant access to user settings (Security & Privacy) to all authenticated users
INSERT INTO role_menu_items (role_id, menu_item_id, can_view, can_use, is_active)
SELECT r.id, mi.id, true, true, true
FROM roles r
CROSS JOIN menu_items mi
WHERE mi.menu_code IN ('settings_security', 'settings_privacy')
AND r.role_name != 'Guest' -- All authenticated users except guests
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
    can_view = EXCLUDED.can_view,
    can_use = EXCLUDED.can_use,
    updated_at = NOW();

-- =====================================================================================
-- Verification
-- =====================================================================================

DO $$
DECLARE
    v_menu_count INTEGER;
    v_role_menu_count INTEGER;
BEGIN
    -- Count Phase 8 menu items
    SELECT COUNT(*)
    INTO v_menu_count
    FROM menu_items
    WHERE menu_code IN (
        'security', 'security_monitoring', 'security_alerts', 'security_incidents', 'audit_logs', 'data_access_logs',
        'gdpr_compliance', 'consent_management', 'data_export_requests', 'data_deletion_requests', 'data_breach_management', 'compliance_reports',
        'authentication', 'sso_providers', 'mfa_policies', 'password_policies', 'session_management',
        'encryption', 'encryption_keys', 'encrypted_fields', 'key_rotation',
        'settings_security', 'settings_privacy'
    )
    AND is_deleted = false;

    -- Count role-menu assignments
    SELECT COUNT(*)
    INTO v_role_menu_count
    FROM role_menu_items rmi
    JOIN menu_items mi ON rmi.menu_item_id = mi.id
    WHERE mi.menu_code IN (
        'security', 'security_monitoring', 'security_alerts', 'security_incidents', 'audit_logs', 'data_access_logs',
        'gdpr_compliance', 'consent_management', 'data_export_requests', 'data_deletion_requests', 'data_breach_management', 'compliance_reports',
        'authentication', 'sso_providers', 'mfa_policies', 'password_policies', 'session_management',
        'encryption', 'encryption_keys', 'encrypted_fields', 'key_rotation',
        'settings_security', 'settings_privacy'
    )
    AND rmi.is_deleted = false;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Phase 8 Menu Items Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Menu Items Created: %', v_menu_count;
    RAISE NOTICE 'Role-Menu Assignments: %', v_role_menu_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v57_phase8_menu_items.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

