-- =====================================================================================
-- Phase 7: Integrations & API Development
-- Version: v49
-- Feature: Email Integration
-- Description: Email service configuration, delivery tracking, and template management
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- =====================================================================================
-- Table: email_configurations
-- Description: Email service provider configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS email_configurations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    config_name VARCHAR(255) NOT NULL UNIQUE,
    service_provider VARCHAR(50) NOT NULL, -- sendgrid, aws_ses, smtp, mailgun
    api_key TEXT, -- Will be encrypted in application (for SendGrid, Mailgun)
    api_secret TEXT, -- Will be encrypted in application (for some providers)
    smtp_config JSONB, -- SMTP configuration {host, port, username, password, tls}
    from_email VARCHAR(255) NOT NULL,
    from_name VARCHAR(255),
    reply_to_email VARCHAR(255),
    daily_send_limit INTEGER,
    monthly_send_limit INTEGER,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Add columns if they don't exist (for backward compatibility)
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS config_name VARCHAR(255);
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS service_provider VARCHAR(50);
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS api_key TEXT;
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS api_secret TEXT;
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS smtp_config JSONB;
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS from_email VARCHAR(255);
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS from_name VARCHAR(255);
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS reply_to_email VARCHAR(255);
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS daily_send_limit INTEGER;
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS monthly_send_limit INTEGER;
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE email_configurations ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================================================
-- Table: email_logs
-- Description: Email delivery logs and tracking
-- =====================================================================================
CREATE TABLE IF NOT EXISTS email_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email_config_id UUID REFERENCES email_configurations(id),
    to_email VARCHAR(255) NOT NULL,
    cc_emails TEXT[], -- Array of CC email addresses
    bcc_emails TEXT[], -- Array of BCC email addresses
    subject VARCHAR(500) NOT NULL,
    body_text TEXT, -- Plain text version
    body_html TEXT, -- HTML version
    template_id UUID, -- Reference to email_templates (added via FK after table creation)
    template_variables JSONB, -- Variables used to populate template
    project_id UUID REFERENCES projects(id),
    user_id UUID REFERENCES users(id), -- Recipient user if applicable
    message_id VARCHAR(255), -- Provider message ID
    delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, delivered, bounced, failed
    opened_at TIMESTAMP,
    clicked_at TIMESTAMP,
    bounced_at TIMESTAMP,
    bounce_reason TEXT,
    error_message TEXT,
    sent_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- Add columns if they don't exist (for backward compatibility)
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS email_config_id UUID;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS to_email VARCHAR(255);
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS cc_emails TEXT[];
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bcc_emails TEXT[];
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS subject VARCHAR(500);
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS template_variables JSONB;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS message_id VARCHAR(255);
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(20) DEFAULT 'pending';
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS opened_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS clicked_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bounced_at TIMESTAMP;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS bounce_reason TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE email_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMP;

-- =====================================================================================
-- Table: email_templates
-- Description: Email-specific templates with advanced features
-- =====================================================================================
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL UNIQUE,
    template_category VARCHAR(50), -- system, notification, marketing
    subject_line VARCHAR(500) NOT NULL,
    preview_text VARCHAR(255), -- Email preview text
    body_html TEXT NOT NULL,
    body_text TEXT, -- Plain text fallback
    template_variables JSONB, -- Available variables
    design_json JSONB, -- JSON for email builder

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Add columns if they don't exist (for backward compatibility)
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS template_code VARCHAR(100);
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS template_name VARCHAR(255);
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS template_category VARCHAR(50);
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS subject_line VARCHAR(500);
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS subject_template VARCHAR(500);
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS preview_text VARCHAR(255);
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS body_html TEXT;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS body_text TEXT;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS body_template_html TEXT;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS body_template_text TEXT;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS template_variables JSONB;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS design_json JSONB;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT false;
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- Remove NOT NULL constraints that prevent backward compatibility
DO $$
BEGIN
    -- Drop NOT NULL on template_code if it exists
    BEGIN
        ALTER TABLE email_templates ALTER COLUMN template_code DROP NOT NULL;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Drop NOT NULL on subject_template if it exists
    BEGIN
        ALTER TABLE email_templates ALTER COLUMN subject_template DROP NOT NULL;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Drop NOT NULL on subject_line if it exists
    BEGIN
        ALTER TABLE email_templates ALTER COLUMN subject_line DROP NOT NULL;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Drop NOT NULL on body_template_html if it exists
    BEGIN
        ALTER TABLE email_templates ALTER COLUMN body_template_html DROP NOT NULL;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Drop NOT NULL on body_template_text if it exists
    BEGIN
        ALTER TABLE email_templates ALTER COLUMN body_template_text DROP NOT NULL;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Drop NOT NULL on body_html if it exists
    BEGIN
        ALTER TABLE email_templates ALTER COLUMN body_html DROP NOT NULL;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;

    -- Drop NOT NULL on body_text if it exists
    BEGIN
        ALTER TABLE email_templates ALTER COLUMN body_text DROP NOT NULL;
    EXCEPTION
        WHEN undefined_column THEN NULL;
        WHEN others THEN NULL;
    END;
END $$;

-- =====================================================================================
-- Table: email_subscriptions
-- Description: User email subscription preferences
-- =====================================================================================
CREATE TABLE IF NOT EXISTS email_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    subscription_type VARCHAR(50) NOT NULL, -- digest, notifications, marketing
    frequency VARCHAR(20), -- immediate, daily, weekly
    unsubscribed_at TIMESTAMP,
    unsubscribe_token VARCHAR(100) UNIQUE, -- Token for one-click unsubscribe

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT unique_user_subscription UNIQUE (user_id, subscription_type)
);

-- Add columns if they don't exist (for backward compatibility)
ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS subscription_type VARCHAR(50);
ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS frequency VARCHAR(20);
ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS unsubscribed_at TIMESTAMP;
ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS unsubscribe_token VARCHAR(100);
ALTER TABLE email_subscriptions ADD COLUMN IF NOT EXISTS is_subscribed BOOLEAN DEFAULT true;

-- =====================================================================================
-- Table: email_digests
-- Description: Scheduled email digest configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS email_digests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    digest_type VARCHAR(50), -- daily_summary, weekly_report, project_updates
    frequency VARCHAR(20) NOT NULL, -- daily, weekly, monthly
    send_time TIME, -- Time of day to send (e.g., 09:00:00)
    send_day INTEGER, -- Day of week (1-7) for weekly, day of month for monthly
    last_sent_at TIMESTAMP,
    next_send_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- Add columns if they don't exist (for backward compatibility)
ALTER TABLE email_digests ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE email_digests ADD COLUMN IF NOT EXISTS digest_type VARCHAR(50);
ALTER TABLE email_digests ADD COLUMN IF NOT EXISTS frequency VARCHAR(20);
ALTER TABLE email_digests ADD COLUMN IF NOT EXISTS send_time TIME;
ALTER TABLE email_digests ADD COLUMN IF NOT EXISTS send_day INTEGER;
ALTER TABLE email_digests ADD COLUMN IF NOT EXISTS last_sent_at TIMESTAMP;
ALTER TABLE email_digests ADD COLUMN IF NOT EXISTS next_send_at TIMESTAMP;
ALTER TABLE email_digests ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- =====================================================================================
-- Foreign Key Constraints (added after all tables are created)
-- =====================================================================================
-- Add foreign key from email_logs to email_templates
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'email_logs_template_id_fkey'
    ) THEN
        ALTER TABLE email_logs
        ADD CONSTRAINT email_logs_template_id_fkey
        FOREIGN KEY (template_id) REFERENCES email_templates(id);
    END IF;
END $$;

-- =====================================================================================
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_email_configurations_is_default ON email_configurations(is_default) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_email_configurations_provider ON email_configurations(service_provider) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_email_logs_to_email ON email_logs(to_email);
CREATE INDEX IF NOT EXISTS idx_email_logs_status ON email_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_email_logs_created_at ON email_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_logs_user_id ON email_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_project_id ON email_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_email_logs_config_id ON email_logs(email_config_id);

CREATE INDEX IF NOT EXISTS idx_email_templates_category ON email_templates(template_category) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_email_templates_is_default ON email_templates(is_default) WHERE is_deleted = false AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_email_subscriptions_user_id ON email_subscriptions(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_type ON email_subscriptions(subscription_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_is_subscribed ON email_subscriptions(is_subscribed) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_email_subscriptions_token ON email_subscriptions(unsubscribe_token);

CREATE INDEX IF NOT EXISTS idx_email_digests_user_id ON email_digests(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_email_digests_next_send ON email_digests(next_send_at) WHERE is_active = true AND is_deleted = false;

-- =====================================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE email_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_digests ENABLE ROW LEVEL SECURITY;

-- Email Configurations policies (Admin only)
CREATE POLICY email_configurations_admin_all ON email_configurations
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('System Administrator', 'Superuser')
            AND ur.is_active = true
            AND r.is_active = true
        )
    );

-- Email Logs policies (Users can view their own email logs)
CREATE POLICY email_logs_own_select ON email_logs
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        to_email IN (SELECT email FROM users WHERE id = auth.uid())
    );

CREATE POLICY email_logs_admin_all ON email_logs
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('System Administrator', 'Superuser')
            AND ur.is_active = true
            AND r.is_active = true
        )
    );

-- Email Templates policies (All users can view, admins can modify)
CREATE POLICY email_templates_select ON email_templates
    FOR SELECT
    TO authenticated
    USING (is_deleted = false);

CREATE POLICY email_templates_admin_modify ON email_templates
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM user_roles ur
            JOIN roles r ON ur.role_id = r.id
            WHERE ur.user_id = auth.uid()
            AND r.role_name IN ('System Administrator', 'Superuser')
            AND ur.is_active = true
            AND r.is_active = true
        )
    );

-- Email Subscriptions policies (Users can manage their own subscriptions)
CREATE POLICY email_subscriptions_own ON email_subscriptions
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Email Digests policies (Users can manage their own digests)
CREATE POLICY email_digests_own ON email_digests
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false)
    WITH CHECK (user_id = auth.uid());

-- =====================================================================================
-- Ensure Unique Constraints Exist (for ON CONFLICT to work)
-- =====================================================================================
DO $$
BEGIN
    -- Ensure unique constraint on email_templates.template_name
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'email_templates_template_name_key'
        AND conrelid = 'email_templates'::regclass
    ) THEN
        ALTER TABLE email_templates ADD CONSTRAINT email_templates_template_name_key UNIQUE (template_name);
    END IF;

    -- Ensure unique constraint on email_configurations.config_name
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'email_configurations_config_name_key'
        AND conrelid = 'email_configurations'::regclass
    ) THEN
        ALTER TABLE email_configurations ADD CONSTRAINT email_configurations_config_name_key UNIQUE (config_name);
    END IF;

    -- Ensure unique constraint on email_subscriptions (user_id, subscription_type)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'unique_user_subscription'
        AND conrelid = 'email_subscriptions'::regclass
    ) THEN
        ALTER TABLE email_subscriptions ADD CONSTRAINT unique_user_subscription UNIQUE (user_id, subscription_type);
    END IF;

    -- Ensure unique constraint on database_tables.table_name (from v02)
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'database_tables_table_name_key'
        AND conrelid = 'database_tables'::regclass
    ) THEN
        ALTER TABLE database_tables ADD CONSTRAINT database_tables_table_name_key UNIQUE (table_name);
    END IF;
END $$;

-- =====================================================================================
-- Seed Data: Default Email Templates
-- =====================================================================================
INSERT INTO email_templates (template_code, template_name, template_category, subject_line, subject_template, preview_text, body_html, body_text, body_template_html, body_template_text, is_default, is_active)
VALUES
    ('WELCOME_EMAIL', 'Welcome Email', 'system', 'Welcome to Project Nidus!', 'Welcome to Project Nidus!', 'Get started with your new account',
     '<h1>Welcome to Project Nidus!</h1><p>Hi {{user_name}},</p><p>Thank you for joining Project Nidus. We''re excited to have you on board!</p><p><a href="{{dashboard_url}}">Get Started</a></p>',
     'Welcome to Project Nidus!\n\nHi {{user_name}},\n\nThank you for joining Project Nidus. We''re excited to have you on board!\n\nGet Started: {{dashboard_url}}',
     '<h1>Welcome to Project Nidus!</h1><p>Hi {{user_name}},</p><p>Thank you for joining Project Nidus. We''re excited to have you on board!</p><p><a href="{{dashboard_url}}">Get Started</a></p>',
     'Welcome to Project Nidus!\n\nHi {{user_name}},\n\nThank you for joining Project Nidus. We''re excited to have you on board!\n\nGet Started: {{dashboard_url}}',
     true, true),

    ('TASK_ASSIGNMENT', 'Task Assignment', 'notification', 'New Task Assigned: {{task_name}}', 'New Task Assigned: {{task_name}}', 'You have been assigned a new task',
     '<h2>New Task Assigned</h2><p>Hi {{assignee_name}},</p><p>You have been assigned a new task:</p><p><strong>Task:</strong> {{task_name}}</p><p><strong>Project:</strong> {{project_name}}</p><p><strong>Due Date:</strong> {{due_date}}</p><p><a href="{{task_url}}">View Task</a></p>',
     'New Task Assigned\n\nHi {{assignee_name}},\n\nYou have been assigned a new task:\nTask: {{task_name}}\nProject: {{project_name}}\nDue Date: {{due_date}}\n\nView Task: {{task_url}}',
     '<h2>New Task Assigned</h2><p>Hi {{assignee_name}},</p><p>You have been assigned a new task:</p><p><strong>Task:</strong> {{task_name}}</p><p><strong>Project:</strong> {{project_name}}</p><p><strong>Due Date:</strong> {{due_date}}</p><p><a href="{{task_url}}">View Task</a></p>',
     'New Task Assigned\n\nHi {{assignee_name}},\n\nYou have been assigned a new task:\nTask: {{task_name}}\nProject: {{project_name}}\nDue Date: {{due_date}}\n\nView Task: {{task_url}}',
     true, true),

    ('ISSUE_NOTIFICATION', 'Issue Notification', 'notification', 'New Issue: {{issue_title}}', 'New Issue: {{issue_title}}', 'An issue requires your attention',
     '<h2>New Issue Created</h2><p><strong>Issue:</strong> {{issue_title}}</p><p><strong>Severity:</strong> {{severity}}</p><p><strong>Project:</strong> {{project_name}}</p><p><strong>Created by:</strong> {{creator_name}}</p><p><a href="{{issue_url}}">View Issue</a></p>',
     'New Issue Created\n\nIssue: {{issue_title}}\nSeverity: {{severity}}\nProject: {{project_name}}\nCreated by: {{creator_name}}\n\nView Issue: {{issue_url}}',
     '<h2>New Issue Created</h2><p><strong>Issue:</strong> {{issue_title}}</p><p><strong>Severity:</strong> {{severity}}</p><p><strong>Project:</strong> {{project_name}}</p><p><strong>Created by:</strong> {{creator_name}}</p><p><a href="{{issue_url}}">View Issue</a></p>',
     'New Issue Created\n\nIssue: {{issue_title}}\nSeverity: {{severity}}\nProject: {{project_name}}\nCreated by: {{creator_name}}\n\nView Issue: {{issue_url}}',
     true, true),

    ('DAILY_DIGEST', 'Daily Digest', 'notification', 'Your Daily Project Summary', 'Your Daily Project Summary', 'Here''s what happened today',
     '<h2>Daily Project Summary</h2><p>Hi {{user_name}},</p><p>Here''s your daily summary:</p><p><strong>Tasks Completed:</strong> {{tasks_completed}}</p><p><strong>New Tasks:</strong> {{new_tasks}}</p><p><strong>Upcoming Deadlines:</strong> {{upcoming_deadlines}}</p><p><a href="{{dashboard_url}}">View Dashboard</a></p>',
     'Daily Project Summary\n\nHi {{user_name}},\n\nHere''s your daily summary:\nTasks Completed: {{tasks_completed}}\nNew Tasks: {{new_tasks}}\nUpcoming Deadlines: {{upcoming_deadlines}}\n\nView Dashboard: {{dashboard_url}}',
     '<h2>Daily Project Summary</h2><p>Hi {{user_name}},</p><p>Here''s your daily summary:</p><p><strong>Tasks Completed:</strong> {{tasks_completed}}</p><p><strong>New Tasks:</strong> {{new_tasks}}</p><p><strong>Upcoming Deadlines:</strong> {{upcoming_deadlines}}</p><p><a href="{{dashboard_url}}">View Dashboard</a></p>',
     'Daily Project Summary\n\nHi {{user_name}},\n\nHere''s your daily summary:\nTasks Completed: {{tasks_completed}}\nNew Tasks: {{new_tasks}}\nUpcoming Deadlines: {{upcoming_deadlines}}\n\nView Dashboard: {{dashboard_url}}',
     true, true),

    ('PASSWORD_RESET', 'Password Reset', 'system', 'Reset Your Password', 'Reset Your Password', 'Click here to reset your password',
     '<h2>Password Reset Request</h2><p>Hi {{user_name}},</p><p>We received a request to reset your password. Click the link below to create a new password:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>If you didn''t request this, please ignore this email.</p><p>This link expires in 1 hour.</p>',
     'Password Reset Request\n\nHi {{user_name}},\n\nWe received a request to reset your password. Click the link below:\n{{reset_url}}\n\nIf you didn''t request this, please ignore this email.\nThis link expires in 1 hour.',
     '<h2>Password Reset Request</h2><p>Hi {{user_name}},</p><p>We received a request to reset your password. Click the link below to create a new password:</p><p><a href="{{reset_url}}">Reset Password</a></p><p>If you didn''t request this, please ignore this email.</p><p>This link expires in 1 hour.</p>',
     'Password Reset Request\n\nHi {{user_name}},\n\nWe received a request to reset your password. Click the link below:\n{{reset_url}}\n\nIf you didn''t request this, please ignore this email.\nThis link expires in 1 hour.',
     true, true)
ON CONFLICT (template_name) DO NOTHING;

-- =====================================================================================
-- Register tables in database_tables registry
-- =====================================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('email_configurations', 'Email service provider configurations', false, true),
    ('email_logs', 'Email delivery logs and tracking', false, true),
    ('email_templates', 'Email templates with HTML and text versions', false, true),
    ('email_subscriptions', 'User email subscription preferences', false, true),
    ('email_digests', 'Scheduled email digest configurations', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =====================================================================================
-- Comments for Documentation
-- =====================================================================================
COMMENT ON TABLE email_configurations IS 'Email service provider configurations (SendGrid, AWS SES, SMTP)';
COMMENT ON TABLE email_logs IS 'Track email delivery, opens, clicks, and bounces';
COMMENT ON TABLE email_templates IS 'Email templates with HTML design and variable substitution';
COMMENT ON TABLE email_subscriptions IS 'User preferences for email subscriptions and frequency';
COMMENT ON TABLE email_digests IS 'Scheduled email digests (daily, weekly, monthly summaries)';

COMMENT ON COLUMN email_configurations.api_key IS 'API key for email service provider (encrypted in application layer)';
COMMENT ON COLUMN email_configurations.smtp_config IS 'SMTP configuration JSON: {host, port, username, password, tls}';
COMMENT ON COLUMN email_logs.delivery_status IS 'Email delivery status: pending, sent, delivered, bounced, failed';
COMMENT ON COLUMN email_subscriptions.unsubscribe_token IS 'Unique token for one-click unsubscribe links';

-- =====================================================================================
-- End of v49_email_integration.sql
-- =====================================================================================
