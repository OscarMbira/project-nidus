-- ============================================================================
-- v735_05: Admin System — support tickets, announcements, impersonation
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v735_01_admin_schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- support_tickets
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_number SERIAL,
    user_id UUID REFERENCES auth.users(id),
    subject VARCHAR(255) NOT NULL,
    category VARCHAR(50) CHECK (category IN ('account', 'billing', 'technical', 'feature_request', 'bug_report', 'general')),
    priority VARCHAR(20) CHECK (priority IN ('low', 'medium', 'high', 'critical')),
    status VARCHAR(20) CHECK (status IN ('open', 'in_progress', 'waiting_user', 'resolved', 'closed')),
    assigned_to UUID REFERENCES admin.admin_users(id),
    resolved_by UUID REFERENCES admin.admin_users(id),
    resolved_at TIMESTAMPTZ,
    is_auto_created BOOLEAN DEFAULT FALSE,
    source_error_hash VARCHAR(64),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT support_tickets_ticket_number_unique UNIQUE (ticket_number)
);

CREATE INDEX IF NOT EXISTS idx_support_tickets_user_id ON admin.support_tickets(user_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON admin.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON admin.support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON admin.support_tickets(priority);

COMMENT ON TABLE admin.support_tickets IS 'User support tickets managed by admin support staff';

-- ---------------------------------------------------------------------------
-- ticket_messages
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES admin.support_tickets(id) ON DELETE CASCADE,
    sender_type VARCHAR(20) NOT NULL CHECK (sender_type IN ('user', 'admin', 'system')),
    sender_user_id UUID REFERENCES auth.users(id),
    sender_admin_id UUID REFERENCES admin.admin_users(id),
    message_body TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT FALSE,
    attachments JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ticket_messages_ticket_id ON admin.ticket_messages(ticket_id);
CREATE INDEX IF NOT EXISTS idx_ticket_messages_created_at ON admin.ticket_messages(created_at);

COMMENT ON TABLE admin.ticket_messages IS 'Conversation thread messages for support tickets';

-- ---------------------------------------------------------------------------
-- announcements
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.announcements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    announcement_type VARCHAR(30) CHECK (announcement_type IN ('info', 'warning', 'maintenance', 'feature_update')),
    target_audience VARCHAR(50) CHECK (target_audience IN ('all', 'platform', 'simulator', 'subscription_tier')),
    target_subscription_tier VARCHAR(50),
    status VARCHAR(20) CHECK (status IN ('draft', 'scheduled', 'published', 'expired', 'archived')),
    publish_at TIMESTAMPTZ,
    expires_at TIMESTAMPTZ,
    created_by UUID REFERENCES admin.admin_users(id),
    updated_by UUID REFERENCES admin.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_announcements_status ON admin.announcements(status);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON admin.announcements(publish_at);

COMMENT ON TABLE admin.announcements IS 'System-wide announcements for Platform and Simulator users';

-- ---------------------------------------------------------------------------
-- impersonation_log (append-only)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.impersonation_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admin_user_id UUID NOT NULL REFERENCES admin.admin_users(id),
    impersonation_mode VARCHAR(20) NOT NULL CHECK (impersonation_mode IN ('user', 'role')),
    target_user_id UUID REFERENCES auth.users(id),
    target_role VARCHAR(50),
    target_system VARCHAR(20) CHECK (target_system IN ('platform', 'simulator')),
    reason TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    ended_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT,
    page_route VARCHAR(500),
    actions_log JSONB DEFAULT '[]'::JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_impersonation_log_admin_user_id ON admin.impersonation_log(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_log_started_at ON admin.impersonation_log(started_at DESC);

COMMENT ON TABLE admin.impersonation_log IS 'Immutable log of admin user and role impersonation sessions';

CREATE OR REPLACE FUNCTION admin.prevent_impersonation_log_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.ended_at IS NULL AND NEW.ended_at IS NOT NULL THEN
        RETURN NEW;
    END IF;
    RAISE EXCEPTION 'admin.impersonation_log is append-only except for setting ended_at';
END;
$$;

DROP TRIGGER IF EXISTS trg_impersonation_log_no_mutation ON admin.impersonation_log;
CREATE TRIGGER trg_impersonation_log_no_mutation
    BEFORE UPDATE OR DELETE ON admin.impersonation_log
    FOR EACH ROW
    EXECUTE FUNCTION admin.prevent_impersonation_log_mutation();

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_support_tickets_updated_at ON admin.support_tickets;
CREATE TRIGGER trg_support_tickets_updated_at
    BEFORE UPDATE ON admin.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION admin.set_updated_at();

DROP TRIGGER IF EXISTS trg_announcements_updated_at ON admin.announcements;
CREATE TRIGGER trg_announcements_updated_at
    BEFORE UPDATE ON admin.announcements
    FOR EACH ROW
    EXECUTE FUNCTION admin.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE admin.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.impersonation_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS support_tickets_admin ON admin.support_tickets;
CREATE POLICY support_tickets_admin ON admin.support_tickets
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

DROP POLICY IF EXISTS support_tickets_user_read ON admin.support_tickets;
CREATE POLICY support_tickets_user_read ON admin.support_tickets
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS ticket_messages_admin ON admin.ticket_messages;
CREATE POLICY ticket_messages_admin ON admin.ticket_messages
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

DROP POLICY IF EXISTS ticket_messages_user_read ON admin.ticket_messages;
CREATE POLICY ticket_messages_user_read ON admin.ticket_messages
    FOR SELECT TO authenticated
    USING (
        is_internal = FALSE
        AND EXISTS (
            SELECT 1 FROM admin.support_tickets t
            WHERE t.id = ticket_id AND t.user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS announcements_admin ON admin.announcements;
CREATE POLICY announcements_admin ON admin.announcements
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

DROP POLICY IF EXISTS announcements_public_read ON admin.announcements;
CREATE POLICY announcements_public_read ON admin.announcements
    FOR SELECT TO authenticated, anon
    USING (
        status = 'published'
        AND (publish_at IS NULL OR publish_at <= NOW())
        AND (expires_at IS NULL OR expires_at > NOW())
    );

DROP POLICY IF EXISTS impersonation_log_select ON admin.impersonation_log;
CREATE POLICY impersonation_log_select ON admin.impersonation_log
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

DROP POLICY IF EXISTS impersonation_log_insert ON admin.impersonation_log;
CREATE POLICY impersonation_log_insert ON admin.impersonation_log
    FOR INSERT TO authenticated
    WITH CHECK (admin.is_active_admin());

DROP POLICY IF EXISTS impersonation_log_update_end ON admin.impersonation_log;
CREATE POLICY impersonation_log_update_end ON admin.impersonation_log
    FOR UPDATE TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

GRANT SELECT, INSERT, UPDATE ON admin.support_tickets TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin.ticket_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin.announcements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON admin.impersonation_log TO authenticated;
GRANT ALL ON admin.support_tickets, admin.ticket_messages, admin.announcements, admin.impersonation_log TO service_role;

GRANT USAGE, SELECT ON SEQUENCE admin.support_tickets_ticket_number_seq TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Register tables
-- ---------------------------------------------------------------------------
INSERT INTO public.database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
    ('support_tickets', 'User support tickets managed by admin staff', 'admin', FALSE, TRUE, 'admin'),
    ('ticket_messages', 'Conversation messages for support tickets', 'admin', FALSE, TRUE, 'admin'),
    ('announcements', 'System-wide user announcements', 'admin', FALSE, TRUE, 'admin'),
    ('impersonation_log', 'Immutable admin impersonation session log', 'admin', TRUE, TRUE, 'admin')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    schema_name = EXCLUDED.schema_name,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
