-- =====================================================================================
-- Phase 7: Integrations & API Development
-- Version: v48
-- Feature: Notification Integrations (Slack/Teams)
-- Description: Slack and additional Teams notification configurations
-- Author: Development Team
-- Date: 2025-11-18
-- =====================================================================================

-- =====================================================================================
-- Table: slack_connections
-- Description: Slack workspace OAuth connection configurations
-- =====================================================================================
CREATE TABLE IF NOT EXISTS slack_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id VARCHAR(50) NOT NULL,
    workspace_name VARCHAR(255),
    team_id VARCHAR(50),
    user_id UUID NOT NULL REFERENCES users(id),
    access_token TEXT, -- Will be encrypted in application
    bot_access_token TEXT, -- Will be encrypted in application
    webhook_url TEXT, -- Incoming webhook URL
    app_id VARCHAR(50),
    scope TEXT[], -- OAuth scopes granted
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id),

    CONSTRAINT unique_slack_workspace UNIQUE (workspace_id, user_id)
);

-- =====================================================================================
-- Table: slack_notifications
-- Description: Slack notification delivery history
-- =====================================================================================
CREATE TABLE IF NOT EXISTS slack_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slack_connection_id UUID REFERENCES slack_connections(id),
    user_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    channel_id VARCHAR(50),
    channel_name VARCHAR(255),
    message TEXT NOT NULL,
    message_blocks JSONB, -- Slack Block Kit JSON
    notification_type VARCHAR(50), -- task_assigned, issue_created, etc.
    delivery_status VARCHAR(20) DEFAULT 'pending', -- pending, sent, failed
    slack_message_ts VARCHAR(50), -- Slack message timestamp (unique ID)
    thread_ts VARCHAR(50), -- Thread timestamp if replying to a thread
    error_message TEXT,
    sent_at TIMESTAMP,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: notification_rules
-- Description: Notification routing rules for projects and events
-- =====================================================================================
CREATE TABLE IF NOT EXISTS notification_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id),
    user_id UUID REFERENCES users(id),
    rule_name VARCHAR(255) NOT NULL,
    event_type VARCHAR(100) NOT NULL, -- task.created, issue.resolved, etc.
    notification_channel VARCHAR(20) NOT NULL, -- slack, teams, email, webhook
    channel_config JSONB NOT NULL, -- Configuration specific to the channel
    filters JSONB, -- Additional filters (e.g., priority, assignee)
    is_active BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 0, -- Rule priority for ordering

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Table: notification_templates
-- Description: Reusable notification message templates
-- =====================================================================================
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_name VARCHAR(255) NOT NULL UNIQUE,
    template_type VARCHAR(20) NOT NULL, -- slack, teams, email
    event_type VARCHAR(100), -- task.created, issue.resolved, etc.
    template_subject VARCHAR(500), -- For email
    template_body TEXT NOT NULL,
    template_variables JSONB, -- Available variables in template
    is_default BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,

    -- Standard audit fields
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES users(id)
);

-- =====================================================================================
-- Indexes for Performance
-- =====================================================================================
CREATE INDEX IF NOT EXISTS idx_slack_connections_workspace_id ON slack_connections(workspace_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_slack_connections_user_id ON slack_connections(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_slack_connections_is_active ON slack_connections(is_active) WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_slack_notifications_connection_id ON slack_notifications(slack_connection_id);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_user_id ON slack_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_project_id ON slack_notifications(project_id);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_status ON slack_notifications(delivery_status);
CREATE INDEX IF NOT EXISTS idx_slack_notifications_created_at ON slack_notifications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_rules_project_id ON notification_rules(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notification_rules_user_id ON notification_rules(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notification_rules_event_type ON notification_rules(event_type) WHERE is_deleted = false AND is_active = true;
CREATE INDEX IF NOT EXISTS idx_notification_rules_channel ON notification_rules(notification_channel) WHERE is_deleted = false AND is_active = true;

CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(template_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notification_templates_event_type ON notification_templates(event_type) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_notification_templates_is_default ON notification_templates(is_default) WHERE is_deleted = false AND is_active = true;

-- =====================================================================================
-- Row Level Security (RLS) Policies
-- =====================================================================================

-- Enable RLS on all tables
ALTER TABLE slack_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE slack_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_templates ENABLE ROW LEVEL SECURITY;

-- Slack Connections policies (users can only access their own connections)
CREATE POLICY slack_connections_own ON slack_connections
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Slack Notifications policies
CREATE POLICY slack_notifications_own_select ON slack_notifications
    FOR SELECT
    TO authenticated
    USING (
        user_id = auth.uid() OR
        EXISTS (
            SELECT 1 FROM user_projects up
            WHERE up.project_id = slack_notifications.project_id
            AND up.user_id = auth.uid()
        )
    );

-- Notification Rules policies
CREATE POLICY notification_rules_project_member ON notification_rules
    FOR SELECT
    TO authenticated
    USING (
        is_deleted = false AND (
            user_id = auth.uid() OR
            EXISTS (
                SELECT 1 FROM user_projects up
                WHERE up.project_id = notification_rules.project_id
                AND up.user_id = auth.uid()
            )
        )
    );

CREATE POLICY notification_rules_own_modify ON notification_rules
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid() AND is_deleted = false)
    WITH CHECK (user_id = auth.uid());

-- Notification Templates policies (all users can view, only admins can modify)
CREATE POLICY notification_templates_select ON notification_templates
    FOR SELECT
    TO authenticated
    USING (is_deleted = false);

CREATE POLICY notification_templates_admin_modify ON notification_templates
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

-- =====================================================================================
-- Seed Data: Default Notification Templates
-- =====================================================================================
INSERT INTO notification_templates (template_name, template_type, event_type, template_subject, template_body, is_default, is_active)
VALUES
    -- Slack Templates
    ('Slack: Task Assigned', 'slack', 'task.assigned', NULL,
     ':white_check_mark: *New Task Assigned*\n*Task:* {{task_name}}\n*Assigned to:* {{assignee_name}}\n*Project:* {{project_name}}\n*Due Date:* {{due_date}}\n<{{task_url}}|View Task>',
     true, true),
    ('Slack: Issue Created', 'slack', 'issue.created', NULL,
     ':warning: *New Issue Created*\n*Issue:* {{issue_title}}\n*Severity:* {{severity}}\n*Project:* {{project_name}}\n*Created by:* {{creator_name}}\n<{{issue_url}}|View Issue>',
     true, true),
    ('Slack: Milestone Reached', 'slack', 'milestone.reached', NULL,
     ':trophy: *Milestone Reached!*\n*Milestone:* {{milestone_name}}\n*Project:* {{project_name}}\n*Completion Date:* {{completion_date}}\nGreat job, team!',
     true, true),

    -- Teams Templates
    ('Teams: Task Assigned', 'teams', 'task.assigned', NULL,
     '**New Task Assigned**\n\n**Task:** {{task_name}}\n**Assigned to:** {{assignee_name}}\n**Project:** {{project_name}}\n**Due Date:** {{due_date}}\n\n[View Task]({{task_url}})',
     true, true),
    ('Teams: Issue Created', 'teams', 'issue.created', NULL,
     '**⚠️ New Issue Created**\n\n**Issue:** {{issue_title}}\n**Severity:** {{severity}}\n**Project:** {{project_name}}\n**Created by:** {{creator_name}}\n\n[View Issue]({{issue_url}})',
     true, true),

    -- Email Templates
    ('Email: Task Assigned', 'email', 'task.assigned',
     'New Task Assigned: {{task_name}}',
     '<h2>New Task Assigned</h2><p><strong>Task:</strong> {{task_name}}</p><p><strong>Assigned to:</strong> {{assignee_name}}</p><p><strong>Project:</strong> {{project_name}}</p><p><strong>Due Date:</strong> {{due_date}}</p><p><a href="{{task_url}}">View Task</a></p>',
     true, true),
    ('Email: Issue Created', 'email', 'issue.created',
     'New Issue: {{issue_title}}',
     '<h2>New Issue Created</h2><p><strong>Issue:</strong> {{issue_title}}</p><p><strong>Severity:</strong> {{severity}}</p><p><strong>Project:</strong> {{project_name}}</p><p><strong>Created by:</strong> {{creator_name}}</p><p><a href="{{issue_url}}">View Issue</a></p>',
     true, true)
ON CONFLICT (template_name) DO NOTHING;

-- =====================================================================================
-- Register tables in database_tables registry
-- =====================================================================================
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('slack_connections', 'Slack workspace OAuth connection configurations', false, true),
    ('slack_notifications', 'Slack notification delivery history', false, true),
    ('notification_rules', 'Notification routing rules for projects and events', false, true),
    ('notification_templates', 'Reusable notification message templates', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();

-- =====================================================================================
-- Comments for Documentation
-- =====================================================================================
COMMENT ON TABLE slack_connections IS 'Slack workspace OAuth connections for sending notifications';
COMMENT ON TABLE slack_notifications IS 'Track Slack notifications sent from the system';
COMMENT ON TABLE notification_rules IS 'Define rules for routing notifications to different channels based on events';
COMMENT ON TABLE notification_templates IS 'Reusable templates for notification messages across channels';

COMMENT ON COLUMN slack_connections.access_token IS 'Slack OAuth access token (encrypted in application layer)';
COMMENT ON COLUMN slack_connections.bot_access_token IS 'Slack Bot OAuth token (encrypted in application layer)';
COMMENT ON COLUMN slack_connections.webhook_url IS 'Incoming webhook URL for posting messages';

COMMENT ON COLUMN notification_rules.channel_config IS 'JSON configuration for the notification channel (e.g., Slack channel ID, Teams channel ID, email recipients)';
COMMENT ON COLUMN notification_templates.template_variables IS 'Available variables that can be used in the template (e.g., {{task_name}}, {{project_name}})';

-- =====================================================================================
-- End of v48_notification_integrations.sql
-- =====================================================================================
