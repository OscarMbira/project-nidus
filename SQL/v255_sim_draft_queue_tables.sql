-- ============================================================================
-- Simulator Draft Queue System - Database Foundation
-- Version: v255
-- Created: 2026-01-31
-- Description: Draft/hold queue for Simulator practice forms (sim schema)
-- ============================================================================

-- ============================================================================
-- 1. DRAFT QUEUE TABLE (Simulator - sim schema)
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.draft_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- User context
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    scenario_id UUID REFERENCES sim.scenarios(id) ON DELETE SET NULL,

    -- Record identification
    entity_type VARCHAR(100) NOT NULL,           -- 'sim_project', 'sim_benefit', 'sim_issue', etc.
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
    CONSTRAINT sim_valid_hold_status CHECK (hold_status IN ('active', 'resumed', 'expired', 'deleted')),
    CONSTRAINT sim_valid_expiry_days CHECK (expiry_days >= 1 AND expiry_days <= 90),
    CONSTRAINT sim_valid_form_mode CHECK (form_mode IN ('create', 'edit')),
    CONSTRAINT sim_valid_completion CHECK (completion_percentage >= 0 AND completion_percentage <= 100)
);

-- Add comments
COMMENT ON TABLE sim.draft_queue IS 'Draft/hold queue for Simulator practice forms';
COMMENT ON COLUMN sim.draft_queue.entity_type IS 'Type of practice entity being created/edited (sim_project, sim_benefit, etc.)';
COMMENT ON COLUMN sim.draft_queue.scenario_id IS 'Reference to the simulation scenario if applicable';

-- ============================================================================
-- 2. INDEXES FOR PERFORMANCE
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_sim_draft_queue_user_id
    ON sim.draft_queue(user_id);

CREATE INDEX IF NOT EXISTS idx_sim_draft_queue_entity_type
    ON sim.draft_queue(entity_type);

CREATE INDEX IF NOT EXISTS idx_sim_draft_queue_hold_status
    ON sim.draft_queue(hold_status);

CREATE INDEX IF NOT EXISTS idx_sim_draft_queue_scenario_id
    ON sim.draft_queue(scenario_id);

CREATE INDEX IF NOT EXISTS idx_sim_draft_queue_expires_at
    ON sim.draft_queue(expires_at)
    WHERE hold_status = 'active';

CREATE INDEX IF NOT EXISTS idx_sim_draft_queue_user_entity
    ON sim.draft_queue(user_id, entity_type)
    WHERE hold_status = 'active';

CREATE INDEX IF NOT EXISTS idx_sim_draft_queue_user_active
    ON sim.draft_queue(user_id)
    WHERE hold_status = 'active' AND is_deleted = FALSE;

-- ============================================================================
-- 3. SIMULATOR DRAFT EXPIRY CONFIGURATION TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.draft_expiry_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Configuration scope (simplified for simulator - no org/project type)
    entity_type VARCHAR(100),                    -- NULL = applies to all entity types

    -- Expiry settings
    expiry_days INTEGER NOT NULL DEFAULT 14,
    warning_days INTEGER DEFAULT 3,              -- Days before expiry to warn user

    -- Priority (higher = more specific)
    priority INTEGER DEFAULT 0,

    -- Audit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_by UUID REFERENCES auth.users(id),
    is_active BOOLEAN DEFAULT TRUE,

    -- Constraints
    CONSTRAINT sim_config_valid_expiry CHECK (expiry_days >= 1 AND expiry_days <= 90),
    CONSTRAINT sim_config_valid_warning CHECK (warning_days >= 1 AND warning_days < expiry_days)
);

COMMENT ON TABLE sim.draft_expiry_config IS 'Draft expiration settings for simulator practice forms';

-- Default configuration
INSERT INTO sim.draft_expiry_config (entity_type, expiry_days, warning_days, priority)
VALUES (NULL, 14, 3, 0)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 4. ENFORCE MAXIMUM 15 ACTIVE DRAFTS PER USER (Simulator)
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.check_max_active_drafts()
RETURNS TRIGGER AS $$
DECLARE
    active_count INTEGER;
BEGIN
    IF NEW.hold_status = 'active' THEN
        SELECT COUNT(*) INTO active_count
        FROM sim.draft_queue
        WHERE user_id = NEW.user_id
            AND hold_status = 'active'
            AND is_deleted = FALSE
            AND id != COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

        IF active_count >= 15 THEN
            RAISE EXCEPTION 'Maximum active practice drafts limit (15) reached. Please resume or delete existing drafts.';
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sim_enforce_max_drafts ON sim.draft_queue;

CREATE TRIGGER sim_enforce_max_drafts
BEFORE INSERT ON sim.draft_queue
FOR EACH ROW
EXECUTE FUNCTION sim.check_max_active_drafts();

-- ============================================================================
-- 5. AUTO-UPDATE TIMESTAMPS TRIGGER
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.update_draft_queue_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.last_saved_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sim_draft_queue_timestamp ON sim.draft_queue;

CREATE TRIGGER sim_draft_queue_timestamp
BEFORE UPDATE ON sim.draft_queue
FOR EACH ROW
EXECUTE FUNCTION sim.update_draft_queue_timestamp();

-- ============================================================================
-- 6. GET SIMULATOR DRAFT EXPIRY DAYS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.get_draft_expiry_days(p_entity_type VARCHAR)
RETURNS INTEGER AS $$
DECLARE
    v_expiry_days INTEGER;
BEGIN
    -- Check entity specific
    IF p_entity_type IS NOT NULL THEN
        SELECT expiry_days INTO v_expiry_days
        FROM sim.draft_expiry_config
        WHERE entity_type = p_entity_type
            AND is_active = TRUE
        ORDER BY priority DESC
        LIMIT 1;

        IF v_expiry_days IS NOT NULL THEN
            RETURN v_expiry_days;
        END IF;
    END IF;

    -- Return global default
    SELECT expiry_days INTO v_expiry_days
    FROM sim.draft_expiry_config
    WHERE entity_type IS NULL
        AND is_active = TRUE
    ORDER BY priority DESC
    LIMIT 1;

    RETURN COALESCE(v_expiry_days, 14);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 7. EXPIRE OLD SIMULATOR DRAFTS FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.expire_old_drafts()
RETURNS INTEGER AS $$
DECLARE
    expired_count INTEGER;
BEGIN
    UPDATE sim.draft_queue
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

-- ============================================================================
-- 8. GET SIMULATOR USER DRAFT STATISTICS
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.get_user_draft_stats(p_user_id UUID)
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
        FROM sim.draft_queue dq
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
        FROM sim.draft_queue
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

-- ============================================================================
-- 9. GET SIMULATOR DRAFT BADGE COUNTS
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.get_draft_badge_counts(p_user_id UUID)
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
        FROM sim.draft_queue
        WHERE user_id = p_user_id
            AND hold_status = 'active'
            AND is_deleted = FALSE
        GROUP BY entity_type
    ) counts;

    RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 10. CHECK EXISTING SIMULATOR DRAFT
-- ============================================================================

CREATE OR REPLACE FUNCTION sim.check_existing_draft(
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
    FROM sim.draft_queue dq
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

-- ============================================================================
-- 11. RLS POLICIES
-- ============================================================================

ALTER TABLE sim.draft_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.draft_expiry_config ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view own sim drafts" ON sim.draft_queue;
DROP POLICY IF EXISTS "Users can create own sim drafts" ON sim.draft_queue;
DROP POLICY IF EXISTS "Users can update own sim drafts" ON sim.draft_queue;
DROP POLICY IF EXISTS "Users can delete own sim drafts" ON sim.draft_queue;
DROP POLICY IF EXISTS "Anyone can view sim expiry config" ON sim.draft_expiry_config;

-- Users can only see their own drafts
CREATE POLICY "Users can view own sim drafts"
ON sim.draft_queue FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create own sim drafts"
ON sim.draft_queue FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own sim drafts"
ON sim.draft_queue FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own sim drafts"
ON sim.draft_queue FOR DELETE
USING (auth.uid() = user_id);

-- Anyone can view expiry configuration
CREATE POLICY "Anyone can view sim expiry config"
ON sim.draft_expiry_config FOR SELECT
USING (TRUE);

-- ============================================================================
-- 12. REGISTER TABLES
-- ============================================================================

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.draft_queue', 'Simulator practice forms draft/hold queue for users to save and resume later', false, true),
    ('sim.draft_expiry_config', 'Configurable draft expiration settings for simulator practice forms', true, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    updated_at = NOW();

-- ============================================================================
-- 13. GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION sim.get_draft_expiry_days TO authenticated;
GRANT EXECUTE ON FUNCTION sim.expire_old_drafts TO authenticated;
GRANT EXECUTE ON FUNCTION sim.get_user_draft_stats TO authenticated;
GRANT EXECUTE ON FUNCTION sim.get_draft_badge_counts TO authenticated;
GRANT EXECUTE ON FUNCTION sim.check_existing_draft TO authenticated;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Simulator Draft Queue System (v255) - Migration completed successfully';
    RAISE NOTICE 'Tables created: sim.draft_queue, sim.draft_expiry_config';
    RAISE NOTICE 'Functions created in sim schema for practice forms draft management';
END $$;
