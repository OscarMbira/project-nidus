-- ================================================
-- File: v11_seed_data_system.sql
-- Description: System foundation seed data for Project Nidus
-- Version: 1.0
-- Date: 2025-11-15
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v01 through v09 must be run first (all tables must exist)
-- - v10_validation_tests.sql should pass all tests

-- Purpose:
-- Creates essential system foundation data:
-- 1. System Settings
-- 2. Email Templates

-- Note: This script is idempotent and can be run multiple times safely

-- ================================================
-- SECTION 1: SYSTEM SETTINGS
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: System Settings';
    RAISE NOTICE '================================================';
END $$;

-- Application Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('application', 'app_name', 'Application Name', '"Project Nidus"', 'string', 'Application name displayed in UI', true),
    ('application', 'app_version', 'Application Version', '"1.0.0"', 'string', 'Current application version', true),
    ('application', 'app_environment', 'Environment', '"development"', 'string', 'Application environment (development, staging, production)', false),
    ('application', 'app_tagline', 'Tagline', '"Multi-Methodology Project Management System"', 'string', 'Application tagline', true),
    ('application', 'app_description', 'Description', '"Flexible project management platform supporting multiple methodologies"', 'string', 'Application description', true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    setting_description = EXCLUDED.setting_description,
    updated_at = NOW();

-- Date & Time Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('datetime', 'default_timezone', 'Default Timezone', '"UTC"', 'string', 'Default timezone for the application', true),
    ('datetime', 'default_date_format', 'Date Format', '"YYYY-MM-DD"', 'string', 'Default date display format', true),
    ('datetime', 'default_time_format', 'Time Format', '"HH:mm:ss"', 'string', 'Default time display format', true),
    ('datetime', 'default_datetime_format', 'DateTime Format', '"YYYY-MM-DD HH:mm:ss"', 'string', 'Default datetime display format', true),
    ('datetime', 'week_start_day', 'Week Start Day', '"monday"', 'string', 'First day of the week (monday, sunday)', true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Localization Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('localization', 'default_language', 'Default Language', '"en"', 'string', 'Default language code (en, es, fr, de, etc.)', true),
    ('localization', 'default_currency', 'Default Currency', '"USD"', 'string', 'Default currency code (USD, EUR, GBP, etc.)', true),
    ('localization', 'decimal_separator', 'Decimal Separator', '"."', 'string', 'Decimal separator character', true),
    ('localization', 'thousands_separator', 'Thousands Separator', '","', 'string', 'Thousands separator character', true),
    ('localization', 'currency_position', 'Currency Position', '"before"', 'string', 'Currency symbol position (before, after)', true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Email Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('email', 'smtp_enabled', 'SMTP Enabled', 'false', 'boolean', 'Enable SMTP email sending', false),
    ('email', 'smtp_host', 'SMTP Host', '""', 'string', 'SMTP server hostname', false),
    ('email', 'smtp_port', 'SMTP Port', '587', 'number', 'SMTP server port', false),
    ('email', 'smtp_secure', 'SMTP Secure', 'true', 'boolean', 'Use TLS/SSL for SMTP', false),
    ('email', 'smtp_from_email', 'From Email', '"noreply@projectnidus.com"', 'string', 'Default FROM email address', false),
    ('email', 'smtp_from_name', 'From Name', '"Project Nidus"', 'string', 'Default FROM name', false),
    ('email', 'email_notifications_enabled', 'Email Notifications', 'true', 'boolean', 'Enable email notifications globally', true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Authentication Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('auth', 'password_min_length', 'Password Min Length', '8', 'number', 'Minimum password length', true),
    ('auth', 'password_require_uppercase', 'Require Uppercase', 'true', 'boolean', 'Require at least one uppercase letter', true),
    ('auth', 'password_require_lowercase', 'Require Lowercase', 'true', 'boolean', 'Require at least one lowercase letter', true),
    ('auth', 'password_require_number', 'Require Number', 'true', 'boolean', 'Require at least one number', true),
    ('auth', 'password_require_special', 'Require Special Char', 'true', 'boolean', 'Require at least one special character', true),
    ('auth', 'session_timeout_minutes', 'Session Timeout', '480', 'number', 'Session timeout in minutes (8 hours)', false),
    ('auth', 'max_login_attempts', 'Max Login Attempts', '5', 'number', 'Maximum failed login attempts before lockout', false),
    ('auth', 'lockout_duration_minutes', 'Lockout Duration', '30', 'number', 'Account lockout duration in minutes', false)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Feature Flags
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('features', 'enable_project_templates', 'Project Templates', 'true', 'boolean', 'Enable project templates feature', true),
    ('features', 'enable_time_tracking', 'Time Tracking', 'true', 'boolean', 'Enable time tracking feature', true),
    ('features', 'enable_resource_management', 'Resource Management', 'true', 'boolean', 'Enable resource management feature', true),
    ('features', 'enable_budget_tracking', 'Budget Tracking', 'true', 'boolean', 'Enable budget tracking feature', true),
    ('features', 'enable_document_management', 'Document Management', 'true', 'boolean', 'Enable document management feature', true),
    ('features', 'enable_reporting', 'Reporting', 'true', 'boolean', 'Enable reporting and analytics', true),
    ('features', 'enable_notifications', 'Notifications', 'true', 'boolean', 'Enable in-app notifications', true),
    ('features', 'enable_activity_feed', 'Activity Feed', 'true', 'boolean', 'Enable activity feed', true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- UI Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('ui', 'default_theme', 'Default Theme', '"light"', 'string', 'Default UI theme (light, dark)', true),
    ('ui', 'items_per_page', 'Items Per Page', '25', 'number', 'Default number of items per page in lists', true),
    ('ui', 'enable_animations', 'Enable Animations', 'true', 'boolean', 'Enable UI animations', true),
    ('ui', 'sidebar_default_state', 'Sidebar State', '"expanded"', 'string', 'Default sidebar state (expanded, collapsed)', true),
    ('ui', 'show_onboarding', 'Show Onboarding', 'true', 'boolean', 'Show onboarding tutorial for new users', true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Project Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('projects', 'auto_generate_project_code', 'Auto Generate Code', 'true', 'boolean', 'Automatically generate project codes', true),
    ('projects', 'project_code_prefix', 'Code Prefix', '"PRJ"', 'string', 'Prefix for auto-generated project codes', true),
    ('projects', 'project_code_length', 'Code Length', '6', 'number', 'Length of project code number portion', true),
    ('projects', 'default_project_privacy', 'Default Privacy', '"private"', 'string', 'Default project privacy (public, private)', true),
    ('projects', 'enable_project_approval', 'Require Approval', 'false', 'boolean', 'Require approval before project creation', false)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- Notification Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('notifications', 'notification_retention_days', 'Retention Days', '90', 'number', 'Days to retain notifications', false),
    ('notifications', 'batch_notifications', 'Batch Notifications', 'true', 'boolean', 'Batch similar notifications', true),
    ('notifications', 'notification_sound', 'Notification Sound', 'true', 'boolean', 'Play sound for new notifications', true),
    ('notifications', 'desktop_notifications', 'Desktop Notifications', 'true', 'boolean', 'Enable desktop notifications', true)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- File Upload Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('uploads', 'max_file_size_mb', 'Max File Size (MB)', '50', 'number', 'Maximum file size for uploads in MB', true),
    ('uploads', 'allowed_file_types', 'Allowed File Types', '["pdf","doc","docx","xls","xlsx","ppt","pptx","txt","jpg","jpeg","png","gif"]', 'json', 'Allowed file types for upload', true),
    ('uploads', 'enable_virus_scan', 'Virus Scanning', 'false', 'boolean', 'Enable virus scanning for uploads', false)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

-- System Maintenance Settings
INSERT INTO system_settings (setting_category, setting_key, setting_name, setting_value, setting_value_type, setting_description, is_public)
VALUES
    ('maintenance', 'maintenance_mode', 'Maintenance Mode', 'false', 'boolean', 'Enable maintenance mode (blocks user access)', true),
    ('maintenance', 'maintenance_message', 'Maintenance Message', '"System is under maintenance. Please check back later."', 'string', 'Message displayed during maintenance', true),
    ('maintenance', 'backup_enabled', 'Backups Enabled', 'true', 'boolean', 'Enable automated backups', false),
    ('maintenance', 'backup_frequency_hours', 'Backup Frequency', '24', 'number', 'Backup frequency in hours', false),
    ('maintenance', 'log_retention_days', 'Log Retention', '90', 'number', 'Days to retain system logs', false)
ON CONFLICT (setting_key) DO UPDATE SET
    setting_value = EXCLUDED.setting_value,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'System settings created successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- SECTION 2: EMAIL TEMPLATES
-- ================================================

DO $$
BEGIN
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Seed Data: Email Templates';
    RAISE NOTICE '================================================';
END $$;

-- Welcome Email Template
INSERT INTO email_templates (
    template_code,
    template_name,
    template_category,
    subject_template,
    body_template_html,
    body_template_text,
    available_variables,
    is_active
)
VALUES (
    'welcome_user',
    'Welcome to Project Nidus',
    'user',
    'Welcome to Project Nidus, {{user_name}}!',
    '<html><body><h1>Welcome to Project Nidus!</h1><p>Hello {{user_name}},</p><p>Your account has been created successfully. You can now log in and start managing your projects.</p><p><strong>Your Details:</strong></p><ul><li>Email: {{user_email}}</li><li>Account created: {{created_date}}</li></ul><p>Get started by visiting <a href="{{app_url}}">Project Nidus</a></p><p>Best regards,<br>The Project Nidus Team</p></body></html>',
    'Welcome to Project Nidus!\n\nHello {{user_name}},\n\nYour account has been created successfully. You can now log in and start managing your projects.\n\nYour Details:\n- Email: {{user_email}}\n- Account created: {{created_date}}\n\nGet started by visiting: {{app_url}}\n\nBest regards,\nThe Project Nidus Team',
    ARRAY['{{user_name}}', '{{user_email}}', '{{created_date}}', '{{app_url}}'],
    true
)
ON CONFLICT (template_code) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    subject_template = EXCLUDED.subject_template,
    body_template_html = EXCLUDED.body_template_html,
    body_template_text = EXCLUDED.body_template_text,
    updated_at = NOW();

-- Password Reset Email Template
INSERT INTO email_templates (
    template_code,
    template_name,
    template_category,
    subject_template,
    body_template_html,
    body_template_text,
    available_variables,
    is_active
)
VALUES (
    'password_reset',
    'Password Reset Request',
    'auth',
    'Password Reset Request - Project Nidus',
    '<html><body><h1>Password Reset Request</h1><p>Hello {{user_name}},</p><p>We received a request to reset your password. Click the link below to create a new password:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>This link will expire in {{expiry_hours}} hours.</p><p>If you didn''t request this, please ignore this email.</p><p>Best regards,<br>The Project Nidus Team</p></body></html>',
    'Password Reset Request\n\nHello {{user_name}},\n\nWe received a request to reset your password. Click the link below to create a new password:\n\n{{reset_url}}\n\nThis link will expire in {{expiry_hours}} hours.\n\nIf you didn''t request this, please ignore this email.\n\nBest regards,\nThe Project Nidus Team',
    ARRAY['{{user_name}}', '{{reset_url}}', '{{expiry_hours}}'],
    true
)
ON CONFLICT (template_code) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    subject_template = EXCLUDED.subject_template,
    body_template_html = EXCLUDED.body_template_html,
    body_template_text = EXCLUDED.body_template_text,
    updated_at = NOW();

-- Project Invitation Email Template
INSERT INTO email_templates (
    template_code,
    template_name,
    template_category,
    subject_template,
    body_template_html,
    body_template_text,
    available_variables,
    is_active
)
VALUES (
    'project_invitation',
    'Project Invitation',
    'project',
    'You''ve been invited to join {{project_name}}',
    '<html><body><h1>Project Invitation</h1><p>Hello {{user_name}},</p><p>{{invited_by}} has invited you to join the project:</p><h2>{{project_name}}</h2><p>{{project_description}}</p><p><strong>Your Role:</strong> {{project_role}}</p><p><a href="{{project_url}}">View Project</a></p><p>Best regards,<br>The Project Nidus Team</p></body></html>',
    'Project Invitation\n\nHello {{user_name}},\n\n{{invited_by}} has invited you to join the project:\n\n{{project_name}}\n{{project_description}}\n\nYour Role: {{project_role}}\n\nView Project: {{project_url}}\n\nBest regards,\nThe Project Nidus Team',
    ARRAY['{{user_name}}', '{{invited_by}}', '{{project_name}}', '{{project_description}}', '{{project_role}}', '{{project_url}}'],
    true
)
ON CONFLICT (template_code) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    subject_template = EXCLUDED.subject_template,
    body_template_html = EXCLUDED.body_template_html,
    body_template_text = EXCLUDED.body_template_text,
    updated_at = NOW();

-- Task Assignment Email Template
INSERT INTO email_templates (
    template_code,
    template_name,
    template_category,
    subject_template,
    body_template_html,
    body_template_text,
    available_variables,
    is_active
)
VALUES (
    'task_assignment',
    'New Task Assignment',
    'project',
    'You''ve been assigned to: {{task_name}}',
    '<html><body><h1>New Task Assignment</h1><p>Hello {{user_name}},</p><p>{{assigned_by}} has assigned you a new task:</p><h2>{{task_name}}</h2><p>{{task_description}}</p><p><strong>Details:</strong></p><ul><li>Project: {{project_name}}</li><li>Due Date: {{due_date}}</li><li>Priority: {{priority}}</li></ul><p><a href="{{task_url}}">View Task</a></p><p>Best regards,<br>The Project Nidus Team</p></body></html>',
    'New Task Assignment\n\nHello {{user_name}},\n\n{{assigned_by}} has assigned you a new task:\n\n{{task_name}}\n{{task_description}}\n\nDetails:\n- Project: {{project_name}}\n- Due Date: {{due_date}}\n- Priority: {{priority}}\n\nView Task: {{task_url}}\n\nBest regards,\nThe Project Nidus Team',
    ARRAY['{{user_name}}', '{{assigned_by}}', '{{task_name}}', '{{task_description}}', '{{project_name}}', '{{due_date}}', '{{priority}}', '{{task_url}}'],
    true
)
ON CONFLICT (template_code) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    subject_template = EXCLUDED.subject_template,
    body_template_html = EXCLUDED.body_template_html,
    body_template_text = EXCLUDED.body_template_text,
    updated_at = NOW();

-- Notification Digest Email Template
INSERT INTO email_templates (
    template_code,
    template_name,
    template_category,
    subject_template,
    body_template_html,
    body_template_text,
    available_variables,
    is_active
)
VALUES (
    'notification_digest',
    'Daily Notification Digest',
    'notification',
    'Your Project Nidus Daily Digest - {{notification_count}} notifications',
    '<html><body><h1>Daily Notification Digest</h1><p>Hello {{user_name}},</p><p>You have {{notification_count}} new notifications:</p>{{notification_list_html}}<p><a href="{{notifications_url}}">View All Notifications</a></p><p>Best regards,<br>The Project Nidus Team</p></body></html>',
    'Daily Notification Digest\n\nHello {{user_name}},\n\nYou have {{notification_count}} new notifications:\n\n{{notification_list_text}}\n\nView All Notifications: {{notifications_url}}\n\nBest regards,\nThe Project Nidus Team',
    ARRAY['{{user_name}}', '{{notification_count}}', '{{notification_list_html}}', '{{notification_list_text}}', '{{notifications_url}}'],
    true
)
ON CONFLICT (template_code) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    subject_template = EXCLUDED.subject_template,
    body_template_html = EXCLUDED.body_template_html,
    body_template_text = EXCLUDED.body_template_text,
    updated_at = NOW();

-- System Alert Email Template
INSERT INTO email_templates (
    template_code,
    template_name,
    template_category,
    subject_template,
    body_template_html,
    body_template_text,
    available_variables,
    is_active
)
VALUES (
    'system_alert',
    'System Alert',
    'system',
    '[{{alert_level}}] System Alert: {{alert_title}}',
    '<html><body><h1 style="color: {{alert_color}};">System Alert</h1><p><strong>Level:</strong> {{alert_level}}</p><p><strong>Title:</strong> {{alert_title}}</p><p><strong>Message:</strong></p><p>{{alert_message}}</p><p><strong>Time:</strong> {{alert_time}}</p><p>Best regards,<br>The Project Nidus System</p></body></html>',
    'System Alert\n\nLevel: {{alert_level}}\nTitle: {{alert_title}}\nMessage: {{alert_message}}\nTime: {{alert_time}}\n\nBest regards,\nThe Project Nidus System',
    ARRAY['{{alert_level}}', '{{alert_title}}', '{{alert_message}}', '{{alert_time}}', '{{alert_color}}'],
    true
)
ON CONFLICT (template_code) DO UPDATE SET
    template_name = EXCLUDED.template_name,
    subject_template = EXCLUDED.subject_template,
    body_template_html = EXCLUDED.body_template_html,
    body_template_text = EXCLUDED.body_template_text,
    updated_at = NOW();

DO $$
BEGIN
    RAISE NOTICE 'Email templates created successfully';
    RAISE NOTICE '';
END $$;

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_settings_count INTEGER;
    v_templates_count INTEGER;
BEGIN
    -- Count system settings
    SELECT COUNT(*)
    INTO v_settings_count
    FROM system_settings
    WHERE is_deleted = FALSE;

    -- Count email templates
    SELECT COUNT(*)
    INTO v_templates_count
    FROM email_templates
    WHERE is_deleted = FALSE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'System Foundation Seed Data Created';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'System Settings: %', v_settings_count;
    RAISE NOTICE 'Email Templates: %', v_templates_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v11_seed_data_system.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================

-- Next Steps:
-- Run v12_seed_data_rbac.sql to create roles and permissions
