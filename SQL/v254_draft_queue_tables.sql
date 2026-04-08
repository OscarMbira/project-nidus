-- ============================================================================
-- Draft Queue System - Database Foundation
-- Version: v254
-- Created: 2026-01-31
-- Description: System-wide draft/hold queue for forms in progress
-- ============================================================================

-- ============================================================================
-- 1. DRAFT QUEUE TABLE (Platform - public schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS draft_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User context
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organisation_id UUID REFERENCES accounts(id) ON DELETE SET NULL,
    project_id UUID REFERENCES projects(id) ON DELETE SET NULL,

    -- Record identification
    entity_type VARCHAR(100) NOT NULL,           -- 'project', 'benefit', 'issue', etc.
    entity_id UUID,                              -- NULL for new records, set for edits
    entity_title VARCHAR(255),                   -- Display title in queue

    -- Form state
    form_data JSONB NOT NULL DEFAULT '{}',       -- Complete form state
    form_mode VARCHAR(20) DEFAULT 'create',      -- 'create' or 'edit'
    form_route VARCHAR(500),                     -- Route to resume editing

    -- Progress tracking
    completion_percentage INTEGER DEFAULT 0,     -- 0-100
    required_fields_total INTEGER DEFAULT 0,
    required_fields_completed INTEGER DEFAULT 0,

    -- Hold metadata
    hold_reason VARCHAR(500),                    -- Optional note from user
    hold_status VARCHAR(50) DEFAULT 'active',    -- 'active', 'resumed', 'expired', 'deleted'

    -- Configurable expiration
    expiry_days INTEGER DEFAULT 14,              -- Configurable per record
    expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '14 days'),

    -- Timestamps
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_saved_at TIMESTAMPTZ DEFAULT NOW(),
    resumed_at TIMESTAMPTZ,

    -- Audit
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    is_deleted BOOLEAN DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES auth.users(id),

    -- Constraints
    CONSTRAINT valid_hold_status CHECK (hold_status IN ('active', 'resumed', 'expired', 'deleted')),
    CONSTRAINT valid_expiry_days CHECK (expiry_days >= 1 AND expiry_days <= 90),
    CONSTRAINT valid_form_mode CHECK (form_mode IN ('create', 'edit')),
    CONSTRAINT valid_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

-- Add comments
COMMENT ON TABLE draft_queue IS 'System-wide draft/hold queue for forms in progress';
COMMENT ON COLUMN draft_queue.entity_type IS 'Type of entity being created/edited (project, benefit, issue, etc.)';
COMMENT ON COLUMN draft_queue.entity_id IS 'NULL for new records, set for edits';
COMMENT ON COLUMN draft_queue.form_data IS 'Complete form state stored as JSONB';
COMMENT ON COLUMN draft_queue.hold_status IS 'active=can resume, resumed=completed, expired=past expiry, deleted=soft deleted';
COMMENT ON COLUMN draft_queue.expiry_days IS 'Number of days until draft expires (configurable per project type)';

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_draft_queue_user_id
    ON draft_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_draft_queue_entity_type
    ON draft_queue(entity_type);

CREATE INDEX IF NOT EXISTS idx_draft_queue_hold_status
    ON draft_queue(hold_status);

CREATE INDEX IF NOT EXISTS idx_draft_queue_project_id
    ON draft_queue(project_id);

CREATE INDEX IF NOT EXISTS idx_draft_queue_organisation_id
    ON draft_queue(organisation_id);

CREATE INDEX IF NOT EXISTS idx_draft_queue_expires_at
    ON draft_queue(expires_at)
    WHERE hold_status = 'active';

CREATE INDEX IF NOT EXISTS idx_draft_queue_user_entity
    ON draft_queue(user_id, entity_type)
    WHERE hold_status = 'active';

CREATE INDEX IF NOT EXISTS idx_draft_queue_user_active
    ON draft_queue(user_id)
    WHERE hold_status = 'active' AND is_deleted = FALSE;

-- ============================================================================
-- 3. DRAFT EXPIRY CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS draft_expiry_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Configuration scope
    organisation_id UUID REFERENCES accounts(id) ON DELETE CASCADE,
    project_type_id UUID REFERENCES project_types(id) ON DELETE CASCADE,
    entity_type VARCHAR(100),                    -- NULL = applies to all entity types

    -- Expiry settings
    expiry_days INTEGER NOT NULL DEFAULT 14,
    warning_days INTEGER DEFAULT 3,              -- Days before expiry to warn user

    -- Priority (higher = more specific, takes precedence)
    priority INTEGER DEFAULT 0,                  -- 0=global, 1=org, 2=project_type, 3=entity

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    updated_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,

    -- Constraints
    CONSTRAINT valid_config_expiry_days CHECK (expiry_days >= 1 AND expiry_days <= 90),
    CONSTRAINT valid_warning_days CHECK (warning_days >= 1 AND warning_days < expiry_days)
);

-- Add comments
COMMENT ON TABLE draft_expiry_config IS 'Configurable draft expiration settings per project type, organisation, or entity';
COMMENT ON COLUMN draft_expiry_config.priority IS '0=global default, 1=org level, 2=project type, 3=entity specific';

-- Indexes for config lookup
CREATE INDEX IF NOT EXISTS idx_draft_expiry_config_org
    ON draft_expiry_config(organisation_id);

CREATE INDEX IF NOT EXISTS idx_draft_expiry_config_project_type
    ON draft_expiry_config(project_type_id);

CREATE INDEX IF NOT EXISTS idx_draft_expiry_config_entity
    ON draft_expiry_config(entity_type);

CREATE INDEX IF NOT EXISTS idx_draft_expiry_config_lookup
    ON draft_expiry_config(organisation_id, project_type_id, entity_type, priority DESC)
    WHERE is_active = TRUE;

-- ============================================================================
-- 4. DEFAULT GLOBAL CONFIGURATION
-- ============================================================================

INSERT INTO draft_expiry_config (entity_type, expiry_days, warning_days, priority)
VALUES (NULL, 14, 3, 0)
ON CONFLICT DO NOTHING;

-- Entity-specific defaults (Issues expire faster as they're urgent by nature)
INSERT INTO draft_expiry_config (entity_type, expiry_days, warning_days, priority)
VALUES
    ('issue', 7, 2, 1),
    ('issue_report', 7, 2, 1)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 5. ENFORCE MAXIMUM 15 ACTIVE DRAFTS PER USER
-- ============================================================================

CREATE OR REPLACE FUNCTION check_max_active_drafts()
RETURNS TRIGGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    -- Only check on insert of new active drafts
    IF NEW.hold_status = 'active' THEN
        SELECT COUNT(*) INTO active_count
        FROM draft_queue
        WHERE user_id = NEW.user_id
            AND hold_status = 'active'
            AND is_deleted = FALSE
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF active_count >= 15 THEN
            RAISE EXCEPTION 'Maximum active drafts limit (15) reached. Please resume or delete existing drafts before creating new ones.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists and recreate
DROP TRIGGER IF EXISTS enforce_max_drafts ON draft_queue;

CREATE TRIGGER enforce_max_drafts
BEFORE INSERT ON draft_queue
FOR EACH ROW
EXECUTE FUNCTION check_max_active_drafts();

-- ============================================================================
-- 6. AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION update_draft_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_saved_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS draft_queue_timestamp ON draft_queue;

CREATE TRIGGER draft_queue_timestamp
BEFORE UPDATE ON draft_queue
FOR EACH ROW
EXECUTE FUNCTION update_draft_queue_timestamp();

-- ============================================================================
-- 7. GET DRAFT EXPIRY DAYS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_draft_expiry_days(
    p_organisation_id UUID,
    p_project_type_id UUID,
    p_entity_type VARCHAR
)
RETURNS INTEGER AS $$
DECLARE
    v_expiry_days INTEGER;
BEGIN
    -- Check entity + project type specific (highest priority)
    IF p_project_type_id IS NOT NULL AND p_entity_type IS NOT NULL THEN
        SELECT expiry_days INTO v_expiry_days
        FROM draft_expiry_config
        WHERE (organisation_id IS NULL OR organisation_id = p_organisation_id)
            AND project_type_id = p_project_type_id
            AND entity_type = p_entity_type
            AND is_active = TRUE
        ORDER BY priority DESC, organisation_id NULLS LAST
        LIMIT 1;

        IF v_expiry_days IS NOT NULL THEN
            RETURN v_expiry_days;
        END IF;
    END IF;

    -- Check entity specific (global)
    IF p_entity_type IS NOT NULL THEN
        SELECT expiry_days INTO v_expiry_days
        FROM draft_expiry_config
        WHERE (organisation_id IS NULL OR organisation_id = p_organisation_id)
            AND project_type_id IS NULL
            AND entity_type = p_entity_type
            AND is_active = TRUE
        ORDER BY priority DESC, organisation_id NULLS LAST
        LIMIT 1;

        IF v_expiry_days IS NOT NULL THEN
            RETURN v_expiry_days;
        END IF;
    END IF;

    -- Check project type default
    IF p_project_type_id IS NOT NULL THEN
        SELECT expiry_days INTO v_expiry_days
        FROM draft_expiry_config
        WHERE (organisation_id IS NULL OR organisation_id = p_organisation_id)
            AND project_type_id = p_project_type_id
            AND entity_type IS NULL
            AND is_active = TRUE
        ORDER BY priority DESC, organisation_id NULLS LAST
        LIMIT 1;

        IF v_expiry_days IS NOT NULL THEN
            RETURN v_expiry_days;
        END IF;
    END IF;

    -- Check organisation default
    IF p_organisation_id IS NOT NULL THEN
        SELECT expiry_days INTO v_expiry_days
        FROM draft_expiry_config
        WHERE organisation_id = p_organisation_id
            AND project_type_id IS NULL
            AND entity_type IS NULL
            AND is_active = TRUE
        LIMIT 1;

        IF v_expiry_days IS NOT NULL THEN
            RETURN v_expiry_days;
        END IF;
    END IF;

    -- Return system default
    RETURN 14;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_draft_expiry_days IS 'Get expiry days based on org, project type, and entity type hierarchy';

-- ============================================================================
-- 8. EXPIRE OLD DRAFTS FUNCTION (For cron job)
-- ============================================================================

CREATE OR REPLACE FUNCTION expire_old_drafts()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE draft_queue
    SET
        hold_status = 'expired',
        updated_at = NOW()
    WHERE
        hold_status = 'active'
        AND is_deleted = FALSE
        AND expires_at < NOW();

    GET DIAGNOSTICS expired_count = ROW_COUNT;
    RETURN expired_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION expire_old_drafts IS 'Mark expired drafts - run daily via cron';

-- ============================================================================
-- 9. GET USER DRAFT STATISTICS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_draft_stats(p_user_id UUID)
RETURNS TABLE (
    total_drafts INTEGER,
    active_drafts INTEGER,
    expiring_soon INTEGER,
    remaining_slots INTEGER,
    by_entity_type JSONB
) AS $$
BEGIN
    RETURN QUERY
    WITH entity_counts AS (
        SELECT
            dq.entity_type,
            COUNT(*)::INTEGER as type_count
        FROM draft_queue dq
        WHERE dq.user_id = p_user_id
            AND dq.hold_status = 'active'
            AND dq.is_deleted = FALSE
        GROUP BY dq.entity_type
    ),
    totals AS (
        SELECT
            COUNT(*)::INTEGER as total,
            COUNT(*) FILTER (WHERE hold_status = 'active')::INTEGER as active,
            COUNT(*) FILTER (WHERE hold_status = 'active' AND expires_at < NOW() + INTERVAL '3 days')::INTEGER as expiring
        FROM draft_queue
        WHERE user_id = p_user_id
            AND is_deleted = FALSE
    )
    SELECT
        t.total,
        t.active,
        t.expiring,
        (15 - t.active)::INTEGER as remaining,
        COALESCE(
            (SELECT jsonb_object_agg(ec.entity_type, ec.type_count) FROM entity_counts ec),
            '{}'::jsonb
        )
    FROM totals t;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_user_draft_stats IS 'Get draft statistics for a user including counts by entity type';

-- ============================================================================
-- 10. GET DRAFT BADGE COUNTS FUNCTION (For sidebar menus)
-- ============================================================================

CREATE OR REPLACE FUNCTION get_draft_badge_counts(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
    result JSONB;
BEGIN
    SELECT COALESCE(
        jsonb_object_agg(entity_type, count),
        '{}'::jsonb
    ) INTO result
    FROM (
        SELECT entity_type, COUNT(*)::INTEGER as count
        FROM draft_queue
        WHERE user_id = p_user_id
            AND hold_status = 'active'
            AND is_deleted = FALSE
        GROUP BY entity_type
    ) counts;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_draft_badge_counts IS 'Get draft counts by entity type for sidebar badge display';

-- ============================================================================
-- 11. CHECK EXISTING DRAFT FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION check_existing_draft(
    p_user_id UUID,
    p_entity_type VARCHAR,
    p_entity_id UUID DEFAULT NULL
)
RETURNS TABLE (
    draft_id UUID,
    entity_title VARCHAR,
    completion_percentage INTEGER,
    last_saved_at TIMESTAMPTZ,
    hold_reason VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dq.id,
        dq.entity_title,
        dq.completion_percentage,
        dq.last_saved_at,
        dq.hold_reason
    FROM draft_queue dq
    WHERE dq.user_id = p_user_id
        AND dq.entity_type = p_entity_type
        AND dq.hold_status = 'active'
        AND dq.is_deleted = FALSE
        AND (
            (p_entity_id IS NULL AND dq.entity_id IS NULL AND dq.form_mode = 'create')
            OR (p_entity_id IS NOT NULL AND dq.entity_id = p_entity_id)
        )
    ORDER BY dq.last_saved_at DESC
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_existing_draft IS 'Check if user has an existing draft for entity type/id';

-- ============================================================================
-- 12. GET EXPIRING DRAFTS FOR NOTIFICATIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION get_expiring_drafts(p_warning_days INTEGER DEFAULT 3)
RETURNS TABLE (
    draft_id UUID,
    user_id UUID,
    entity_type VARCHAR,
    entity_title VARCHAR,
    expires_at TIMESTAMPTZ,
    days_remaining INTEGER
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        dq.id,
        dq.user_id,
        dq.entity_type,
        dq.entity_title,
        dq.expires_at,
        EXTRACT(DAY FROM (dq.expires_at - NOW()))::INTEGER as days_remaining
    FROM draft_queue dq
    WHERE dq.hold_status = 'active'
        AND dq.is_deleted = FALSE
        AND dq.expires_at > NOW()
        AND dq.expires_at <= NOW() + (p_warning_days || ' days')::INTERVAL
    ORDER BY dq.expires_at ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_expiring_drafts IS 'Get drafts expiring within warning period for notifications';

-- ============================================================================
-- 13. RLS POLICIES
-- ============================================================================

-- Enable RLS
ALTER TABLE draft_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE draft_expiry_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own drafts" ON draft_queue;
DROP POLICY IF EXISTS "Users can create own drafts" ON draft_queue;
DROP POLICY IF EXISTS "Users can update own drafts" ON draft_queue;
DROP POLICY IF EXISTS "Users can delete own drafts" ON draft_queue;
DROP POLICY IF EXISTS "PMO Admin can view org drafts" ON draft_queue;
DROP POLICY IF EXISTS "Anyone can view expiry config" ON draft_expiry_config;
DROP POLICY IF EXISTS "PMO Admin can manage expiry config" ON draft_expiry_config;

-- Users can only see their own drafts
CREATE POLICY "Users can view own drafts"
ON draft_queue FOR SELECT
USING (auth.uid() = user_id);

-- Users can create their own drafts (limit enforced by trigger)
CREATE POLICY "Users can create own drafts"
ON draft_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own drafts
CREATE POLICY "Users can update own drafts"
ON draft_queue FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own drafts
CREATE POLICY "Users can delete own drafts"
ON draft_queue FOR DELETE
USING (auth.uid() = user_id);

-- PMO Admin can view all drafts in their organisation (for oversight)
CREATE POLICY "PMO Admin can view org drafts"
ON draft_queue FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN accounts a ON a.owner_user_id = auth.uid()
        WHERE ur.user_id = auth.uid()
            AND r.role_name = 'pmo_admin'
            AND ur.is_active = TRUE
            AND a.id = draft_queue.organisation_id
    )
);

-- Anyone can view expiry configuration
CREATE POLICY "Anyone can view expiry config"
ON draft_expiry_config FOR SELECT
USING (TRUE);

-- PMO Admin can manage expiry config for their organisation
CREATE POLICY "PMO Admin can manage expiry config"
ON draft_expiry_config FOR ALL
USING (
    organisation_id IS NULL  -- Global configs
    OR EXISTS (
        SELECT 1 FROM user_roles ur
        JOIN roles r ON ur.role_id = r.id
        JOIN accounts a ON a.owner_user_id = auth.uid()
        WHERE ur.user_id = auth.uid()
            AND r.role_name = 'pmo_admin'
            AND ur.is_active = TRUE
            AND a.id = draft_expiry_config.organisation_id
    )
);

-- ============================================================================
-- 14. REGISTER TABLES IN DATABASE_TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('draft_queue', 'System-wide draft/hold queue for forms in progress. Users can put records on hold and resume later.', false, true),
    ('draft_expiry_config', 'Configurable draft expiration settings per project type, organisation, or entity type', true, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- 15. GRANT PERMISSIONS
-- ============================================================================

-- Grant table access to authenticated role (RLS policies then restrict by row)
GRANT SELECT, INSERT, UPDATE, DELETE ON draft_queue TO authenticated;
GRANT SELECT ON draft_expiry_config TO authenticated;

-- Grant execute permissions on functions
GRANT EXECUTE ON FUNCTION get_draft_expiry_days TO authenticated;
GRANT EXECUTE ON FUNCTION expire_old_drafts TO authenticated;
GRANT EXECUTE ON FUNCTION get_user_draft_stats TO authenticated;
GRANT EXECUTE ON FUNCTION get_draft_badge_counts TO authenticated;
GRANT EXECUTE ON FUNCTION check_existing_draft TO authenticated;
GRANT EXECUTE ON FUNCTION get_expiring_drafts TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Draft Queue System (v254) - Migration completed successfully';
    RAISE NOTICE 'Tables created: draft_queue, draft_expiry_config';
    RAISE NOTICE 'Functions created: get_draft_expiry_days, expire_old_drafts, get_user_draft_stats, get_draft_badge_counts, check_existing_draft, get_expiring_drafts';
    RAISE NOTICE 'Triggers created: enforce_max_drafts (15 limit), draft_queue_timestamp';
    RAISE NOTICE 'RLS policies applied for user-based and PMO Admin access';
END $$;
