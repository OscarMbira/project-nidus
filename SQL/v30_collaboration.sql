-- =====================================================
-- Collaboration Module
-- Version: 30
-- Date: 2025-01-XX
-- Description: Database tables for collaboration features (notifications, activity feeds, mentions, real-time collaboration)
-- Note: Extends existing notifications and activity_logs tables from v02
-- =====================================================

-- =====================================================
-- 1. Enhance Activity Logs Table (if needed)
-- =====================================================
-- Note: activity_logs already exists in v02_system_core_tables.sql
-- Adding collaboration-specific columns if they don't exist
DO $$ 
BEGIN
    -- Add project_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_logs' AND column_name = 'project_id') THEN
        ALTER TABLE activity_logs ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_activity_logs_project ON activity_logs(project_id, created_at DESC) WHERE is_deleted = false;
    END IF;
    
    -- Add activity_data JSONB if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_logs' AND column_name = 'activity_data') THEN
        ALTER TABLE activity_logs ADD COLUMN activity_data JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add visibility_scope if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'activity_logs' AND column_name = 'visibility_scope') THEN
        ALTER TABLE activity_logs ADD COLUMN visibility_scope VARCHAR(50) DEFAULT 'project';
        ALTER TABLE activity_logs ADD CONSTRAINT activity_logs_visibility_check 
            CHECK (visibility_scope IN ('project', 'team', 'private'));
    END IF;
END $$;

-- =====================================================
-- 2. Enhance Notifications Table (if needed)
-- =====================================================
-- Note: notifications already exists in v02_system_core_tables.sql
-- Adding collaboration-specific columns if they don't exist
DO $$ 
BEGIN
    -- Add sender_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'sender_id') THEN
        ALTER TABLE notifications ADD COLUMN sender_id UUID REFERENCES users(id) ON DELETE SET NULL;
        ALTER TABLE notifications ADD COLUMN sender_name VARCHAR(255);
    END IF;
    
    -- Add notification_data JSONB if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'notification_data') THEN
        ALTER TABLE notifications ADD COLUMN notification_data JSONB DEFAULT '{}'::jsonb;
    END IF;
    
    -- Add email_sent tracking if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'email_sent') THEN
        ALTER TABLE notifications ADD COLUMN email_sent BOOLEAN DEFAULT false;
        ALTER TABLE notifications ADD COLUMN email_sent_at TIMESTAMP WITH TIME ZONE;
        ALTER TABLE notifications ADD COLUMN push_sent BOOLEAN DEFAULT false;
        ALTER TABLE notifications ADD COLUMN push_sent_at TIMESTAMP WITH TIME ZONE;
    END IF;
    
    -- Add project_id if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name = 'notifications' AND column_name = 'project_id') THEN
        ALTER TABLE notifications ADD COLUMN project_id UUID REFERENCES projects(id) ON DELETE CASCADE;
        CREATE INDEX IF NOT EXISTS idx_notifications_project ON notifications(project_id) WHERE is_deleted = false;
    END IF;
END $$;

-- =====================================================
-- 3. Activity Logs Helper (for reference)
-- =====================================================
-- Note: activity_logs table structure from v02:
-- Existing columns: id, user_id, user_name, activity_type, activity_category, 
-- activity_description, entity_type, entity_id, entity_name, parent_entity_type, 
-- parent_entity_id, parent_entity_name, created_at, is_deleted, deleted_at
-- We've added: project_id, activity_data, visibility_scope

-- =====================================================
-- 4. Notifications Helper (for reference)
-- =====================================================
-- Note: notifications table structure from v02:
-- Existing columns: id, user_id, notification_type, notification_category, title, message,
-- related_entity_type, related_entity_id, delivery_method, email_template_id, is_read, 
-- read_at, is_sent, sent_at, action_url, action_label, priority, expires_at, created_at, 
-- created_by, is_deleted, deleted_at, deleted_by
-- We've added: sender_id, sender_name, notification_data, email_sent, email_sent_at, 
-- push_sent, push_sent_at, project_id

-- =====================================================
-- 5. Activity Logs Table (Reference - already exists)
-- =====================================================
-- The activity_logs table already exists, but we'll create a view for collaboration-specific queries
-- Note: activity_logs doesn't have is_deleted column, so we only filter by project is_deleted
CREATE OR REPLACE VIEW activity_logs_collaboration AS
SELECT 
    al.*,
    p.project_name,
    ps.status_name as project_status
FROM activity_logs al
LEFT JOIN projects p ON al.project_id = p.id
LEFT JOIN project_statuses ps ON p.status_id = ps.id
WHERE p.id IS NULL OR p.is_deleted = false;

-- =====================================================
-- 6. Notifications Table (Reference - already exists)
-- =====================================================
-- The notifications table already exists, but we'll create a view for collaboration-specific queries
CREATE OR REPLACE VIEW notifications_collaboration AS
SELECT 
    n.*,
    sender.email as sender_email,
    sender.full_name as sender_full_name,
    p.project_name
FROM notifications n
LEFT JOIN users sender ON n.sender_id = sender.id
LEFT JOIN projects p ON n.project_id = p.id
WHERE n.is_deleted = false;

-- =====================================================
-- 7. Mentions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS mentions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Mentioned User
    mentioned_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Mention Context
    mention_type VARCHAR(50) NOT NULL, -- comment, task_description, document_content, etc.
    mention_source_type VARCHAR(50) NOT NULL, -- comment, task, document, etc.
    mention_source_id UUID NOT NULL,
    
    -- Mention Content
    mention_text TEXT, -- The text that contains the mention
    mention_position INTEGER, -- Position in the text where mention occurs
    
    -- Project Context
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Mentioner
    mentioned_by_id UUID REFERENCES users(id) ON DELETE SET NULL,
    mentioned_by_name VARCHAR(255),
    
    -- Notification Status
    notification_sent BOOLEAN DEFAULT false,
    notification_id UUID REFERENCES notifications(id) ON DELETE SET NULL,
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT mentions_type_check CHECK (mention_type IN (
        'comment', 'task_description', 'task_name', 'document_content',
        'issue_description', 'risk_description', 'change_request_description'
    )),
    CONSTRAINT mentions_source_check CHECK (mention_source_type IN (
        'comment', 'task', 'document', 'issue', 'risk', 'change_request', 'user_story'
    ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_mentions_user ON mentions(mentioned_user_id, created_at DESC) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_mentions_source ON mentions(mention_source_type, mention_source_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_mentions_project ON mentions(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_mentions_notification ON mentions(notification_sent) WHERE is_deleted = false AND notification_sent = false;

-- =====================================================
-- 4. Notification Preferences Table
-- =====================================================
CREATE TABLE IF NOT EXISTS notification_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- User
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    
    -- Preference Type
    preference_type VARCHAR(100) NOT NULL, -- notification_type or 'all'
    preference_category VARCHAR(50), -- task, project, comment, mention, etc.
    
    -- Channel Preferences
    email_enabled BOOLEAN DEFAULT true,
    in_app_enabled BOOLEAN DEFAULT true,
    push_enabled BOOLEAN DEFAULT false,
    sms_enabled BOOLEAN DEFAULT false,
    
    -- Frequency (for digest)
    digest_enabled BOOLEAN DEFAULT false,
    digest_frequency VARCHAR(50) DEFAULT 'daily', -- real_time, hourly, daily, weekly, never
    
    -- Quiet Hours
    quiet_hours_enabled BOOLEAN DEFAULT false,
    quiet_hours_start TIME DEFAULT '22:00:00',
    quiet_hours_end TIME DEFAULT '08:00:00',
    quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT notification_preferences_unique UNIQUE (user_id, preference_type),
    CONSTRAINT notification_preferences_frequency_check CHECK (digest_frequency IN ('real_time', 'hourly', 'daily', 'weekly', 'never'))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user ON notification_preferences(user_id);

-- =====================================================
-- 5. Collaboration Sessions Table
-- =====================================================
CREATE TABLE IF NOT EXISTS collaboration_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session Information
    session_name VARCHAR(255),
    session_type VARCHAR(50) NOT NULL, -- document_edit, comment_thread, real_time_view
    
    -- Entity Reference
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    
    -- Project Context
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    
    -- Session Status
    is_active BOOLEAN DEFAULT true,
    started_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMP WITH TIME ZONE,
    
    -- Session Metadata (JSONB)
    session_data JSONB DEFAULT '{}'::jsonb,
    -- Example: {"document_version": 1, "cursor_positions": {...}, "active_users": [...]}
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT collaboration_sessions_type_check CHECK (session_type IN (
        'document_edit', 'comment_thread', 'real_time_view', 'whiteboard', 'video_call'
    ))
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_entity ON collaboration_sessions(entity_type, entity_id, is_active) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_project ON collaboration_sessions(project_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_collaboration_sessions_active ON collaboration_sessions(is_active) WHERE is_deleted = false AND is_active = true;

-- =====================================================
-- 6. Collaboration Participants Table
-- =====================================================
CREATE TABLE IF NOT EXISTS collaboration_participants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    
    -- Session
    session_id UUID NOT NULL REFERENCES collaboration_sessions(id) ON DELETE CASCADE,
    
    -- Participant
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user_name VARCHAR(255),
    user_email VARCHAR(255),
    
    -- Participation Details
    joined_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMP WITH TIME ZONE,
    is_active BOOLEAN DEFAULT true,
    
    -- Participant Metadata (JSONB)
    participant_data JSONB DEFAULT '{}'::jsonb,
    -- Example: {"cursor_position": 123, "selection": {...}, "permissions": ["read", "write"]}
    
    -- Audit Fields
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    
    -- Constraints
    CONSTRAINT collaboration_participants_unique UNIQUE (session_id, user_id, is_deleted)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_session ON collaboration_participants(session_id, is_active) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_collaboration_participants_user ON collaboration_participants(user_id) WHERE is_deleted = false;

-- =====================================================
-- 7. Update Triggers
-- =====================================================

CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER trigger_notification_preferences_updated_at
    BEFORE UPDATE ON notification_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER trigger_collaboration_sessions_updated_at
    BEFORE UPDATE ON collaboration_sessions
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

CREATE TRIGGER trigger_collaboration_participants_updated_at
    BEFORE UPDATE ON collaboration_participants
    FOR EACH ROW
    EXECUTE FUNCTION update_notifications_updated_at();

-- =====================================================
-- 8. Helper Functions
-- =====================================================

-- Function to create notification from activity
CREATE OR REPLACE FUNCTION create_notification_from_activity(
    p_activity_id UUID
)
RETURNS UUID AS $$
DECLARE
    v_activity RECORD;
    v_notification_id UUID;
    v_recipient_id UUID;
BEGIN
    -- Get activity details
    SELECT * INTO v_activity
    FROM activity_logs
    WHERE id = p_activity_id AND is_deleted = false;
    
    IF NOT FOUND THEN
        RETURN NULL;
    END IF;
    
    -- Determine recipient based on activity type
    -- This is a simplified version - in production, you'd have more complex logic
    -- For example, if task_assigned, notify the assignee
    -- If comment_added, notify task owner and other commenters
    
    -- For now, return NULL as this would be handled by application logic
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Function to mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(
    p_notification_id UUID,
    p_user_id UUID
)
RETURNS BOOLEAN AS $$
BEGIN
    UPDATE notifications
    SET 
        is_read = true,
        read_at = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_notification_id 
        AND user_id = p_user_id
        AND is_deleted = false;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count
CREATE OR REPLACE FUNCTION get_unread_notification_count(
    p_user_id UUID
)
RETURNS INTEGER AS $$
DECLARE
    v_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_count
    FROM notifications
    WHERE user_id = p_user_id
        AND is_read = false
        AND is_deleted = false;
    
    RETURN v_count;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 9. Register Tables in database_tables
-- =====================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES 
    ('activity_logs', 'Activity feed and audit trail for all system actions', false, true, 'collaboration'),
    ('notifications', 'User notifications for various events and mentions', false, true, 'collaboration'),
    ('mentions', 'User mentions in comments, tasks, documents, etc.', false, true, 'collaboration'),
    ('notification_preferences', 'User notification preferences and settings', false, true, 'collaboration'),
    ('collaboration_sessions', 'Real-time collaboration sessions for documents and comments', false, true, 'collaboration'),
    ('collaboration_participants', 'Participants in collaboration sessions', false, true, 'collaboration')
ON CONFLICT (table_name) 
DO UPDATE SET 
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    table_category = EXCLUDED.table_category,
    is_active = EXCLUDED.is_active,
    updated_at = CURRENT_TIMESTAMP;

-- =====================================================
-- 10. Comments
-- =====================================================

COMMENT ON TABLE activity_logs IS 'Comprehensive activity feed for all system actions and changes';
COMMENT ON TABLE notifications IS 'User notifications for mentions, assignments, updates, and other events';
COMMENT ON TABLE mentions IS 'User mentions (@username) in various content types';
COMMENT ON TABLE notification_preferences IS 'User preferences for notification delivery channels and frequency';
COMMENT ON TABLE collaboration_sessions IS 'Real-time collaboration sessions for document editing and commenting';
COMMENT ON TABLE collaboration_participants IS 'Active participants in collaboration sessions';

COMMENT ON FUNCTION create_notification_from_activity IS 'Creates a notification from an activity log entry';
COMMENT ON FUNCTION mark_notification_read IS 'Marks a notification as read for a user';
COMMENT ON FUNCTION get_unread_notification_count IS 'Returns the count of unread notifications for a user';

