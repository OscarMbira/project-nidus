-- ============================================================================
-- v735_06: Admin System — error monitoring, aggregation, archiving
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v735_01, v735_05 (support_tickets FK)
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- system_error_log
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.system_error_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_hash VARCHAR(64) NOT NULL,
    user_id UUID REFERENCES auth.users(id),
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    system VARCHAR(20) NOT NULL CHECK (system IN ('platform', 'simulator')),
    page_route VARCHAR(500),
    component_name VARCHAR(255),
    error_type VARCHAR(30) NOT NULL CHECK (error_type IN ('js_error', 'api_error', 'slow_load', 'rls_error', 'route_error', 'render_error')),
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    browser VARCHAR(100),
    os VARCHAR(100),
    device_type VARCHAR(20) CHECK (device_type IN ('desktop', 'mobile', 'tablet')),
    session_id VARCHAR(100),
    user_description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_system_error_log_error_hash ON admin.system_error_log(error_hash);
CREATE INDEX IF NOT EXISTS idx_system_error_log_created_at ON admin.system_error_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_error_log_system ON admin.system_error_log(system);
CREATE INDEX IF NOT EXISTS idx_system_error_log_error_type ON admin.system_error_log(error_type);

COMMENT ON TABLE admin.system_error_log IS 'Raw client-side and API error events from Platform and Simulator';

-- ---------------------------------------------------------------------------
-- error_aggregations
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.error_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    error_hash VARCHAR(64) UNIQUE NOT NULL,
    error_type VARCHAR(30) NOT NULL,
    error_message TEXT NOT NULL,
    page_route VARCHAR(500),
    component_name VARCHAR(255),
    system VARCHAR(20) NOT NULL,
    first_seen_at TIMESTAMPTZ NOT NULL,
    last_seen_at TIMESTAMPTZ NOT NULL,
    occurrence_count INTEGER DEFAULT 1,
    affected_user_count INTEGER DEFAULT 1,
    affected_user_ids UUID[] DEFAULT '{}',
    status VARCHAR(30) NOT NULL DEFAULT 'new'
        CHECK (status IN ('new', 'acknowledged', 'investigating', 'resolved', 'ignored', 'recurring')),
    severity VARCHAR(20) DEFAULT 'medium'
        CHECK (severity IN ('low', 'medium', 'high', 'critical')),
    auto_ticket_id UUID REFERENCES admin.support_tickets(id),
    resolved_by UUID REFERENCES admin.admin_users(id),
    resolved_at TIMESTAMPTZ,
    resolution_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_error_aggregations_status ON admin.error_aggregations(status);
CREATE INDEX IF NOT EXISTS idx_error_aggregations_last_seen_at ON admin.error_aggregations(last_seen_at DESC);
CREATE INDEX IF NOT EXISTS idx_error_aggregations_system ON admin.error_aggregations(system);

COMMENT ON TABLE admin.error_aggregations IS 'Deduplicated error groups keyed by error_hash';

-- ---------------------------------------------------------------------------
-- error_alert_rules — ensure full definition (stub may exist from v735_01)
-- ---------------------------------------------------------------------------
ALTER TABLE admin.error_alert_rules
    ADD COLUMN IF NOT EXISTS page_route_pattern VARCHAR(500),
    ADD COLUMN IF NOT EXISTS system VARCHAR(20),
    ADD COLUMN IF NOT EXISTS threshold_users INTEGER DEFAULT 3,
    ADD COLUMN IF NOT EXISTS threshold_occurrences INTEGER DEFAULT 10,
    ADD COLUMN IF NOT EXISTS time_window_minutes INTEGER DEFAULT 60,
    ADD COLUMN IF NOT EXISTS auto_ticket_priority VARCHAR(20) DEFAULT 'high',
    ADD COLUMN IF NOT EXISTS notify_role VARCHAR(50) DEFAULT 'support_admin',
    ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES admin.admin_users(id),
    ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

CREATE INDEX IF NOT EXISTS idx_error_alert_rules_active ON admin.error_alert_rules(is_active) WHERE is_active = TRUE;

-- ---------------------------------------------------------------------------
-- system_error_log_archive (partitioned parent)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.system_error_log_archive (
    id UUID NOT NULL,
    error_hash VARCHAR(64) NOT NULL,
    user_id UUID,
    user_email VARCHAR(255),
    user_role VARCHAR(50),
    system VARCHAR(20) NOT NULL,
    page_route VARCHAR(500),
    component_name VARCHAR(255),
    error_type VARCHAR(30) NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    browser VARCHAR(100),
    os VARCHAR(100),
    device_type VARCHAR(20),
    session_id VARCHAR(100),
    user_description TEXT,
    created_at TIMESTAMPTZ NOT NULL,
    archived_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

COMMENT ON TABLE admin.system_error_log_archive IS 'Cold storage archive for raw error log entries older than retention period';

-- Default partition catches rows until monthly partitions are created
CREATE TABLE IF NOT EXISTS admin.system_error_log_archive_default
    PARTITION OF admin.system_error_log_archive DEFAULT;

-- ---------------------------------------------------------------------------
-- admin.compute_error_hash
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.compute_error_hash(
    p_error_type TEXT,
    p_error_message TEXT,
    p_page_route TEXT DEFAULT NULL
)
RETURNS VARCHAR(64)
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT encode(
    digest(
      COALESCE(p_error_type, '') || '|' ||
      COALESCE(p_error_message, '') || '|' ||
      COALESCE(p_page_route, ''),
      'sha256'
    ),
    'hex'
  );
$$;

-- ---------------------------------------------------------------------------
-- admin.system_error_log_set_hash — BEFORE INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.system_error_log_set_hash()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.error_hash IS NULL OR NEW.error_hash = '' THEN
        NEW.error_hash := admin.compute_error_hash(NEW.error_type, NEW.error_message, NEW.page_route);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_error_log_set_hash ON admin.system_error_log;
CREATE TRIGGER trg_system_error_log_set_hash
    BEFORE INSERT ON admin.system_error_log
    FOR EACH ROW
    EXECUTE FUNCTION admin.system_error_log_set_hash();

-- ---------------------------------------------------------------------------
-- admin.process_error_event — AFTER INSERT
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.process_error_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public
AS $$
DECLARE
    v_agg admin.error_aggregations%ROWTYPE;
    v_rule admin.error_alert_rules%ROWTYPE;
    v_ticket_id UUID;
    v_user_threshold INTEGER;
    v_count_threshold INTEGER;
    v_window_minutes INTEGER;
    v_window_start TIMESTAMPTZ;
    v_recent_users INTEGER;
    v_recent_occurrences INTEGER;
    v_should_ticket BOOLEAN := FALSE;
    v_priority TEXT := 'high';
    v_route_matches BOOLEAN;
BEGIN
    SELECT * INTO v_agg
    FROM admin.error_aggregations
    WHERE error_hash = NEW.error_hash
    FOR UPDATE;

    IF FOUND THEN
        UPDATE admin.error_aggregations
        SET occurrence_count = occurrence_count + 1,
            last_seen_at = NEW.created_at,
            affected_user_ids = CASE
                WHEN NEW.user_id IS NOT NULL AND NOT (NEW.user_id = ANY (affected_user_ids))
                    THEN array_append(affected_user_ids, NEW.user_id)
                ELSE affected_user_ids
            END,
            affected_user_count = CASE
                WHEN NEW.user_id IS NOT NULL AND NOT (NEW.user_id = ANY (affected_user_ids))
                    THEN affected_user_count + 1
                ELSE affected_user_count
            END,
            status = CASE
                WHEN status = 'resolved' THEN 'recurring'
                ELSE status
            END,
            severity = CASE
                WHEN NEW.error_type = 'rls_error' THEN 'critical'
                WHEN NEW.error_type IN ('api_error', 'render_error') THEN 'high'
                ELSE severity
            END,
            updated_at = NOW()
        WHERE id = v_agg.id
        RETURNING * INTO v_agg;
    ELSE
        INSERT INTO admin.error_aggregations (
            error_hash,
            error_type,
            error_message,
            page_route,
            component_name,
            system,
            first_seen_at,
            last_seen_at,
            occurrence_count,
            affected_user_count,
            affected_user_ids,
            severity
        )
        VALUES (
            NEW.error_hash,
            NEW.error_type,
            NEW.error_message,
            NEW.page_route,
            NEW.component_name,
            NEW.system,
            NEW.created_at,
            NEW.created_at,
            1,
            CASE WHEN NEW.user_id IS NOT NULL THEN 1 ELSE 0 END,
            CASE WHEN NEW.user_id IS NOT NULL THEN ARRAY[NEW.user_id] ELSE '{}' END,
            CASE
                WHEN NEW.error_type = 'rls_error' THEN 'critical'
                WHEN NEW.error_type = 'slow_load' THEN 'low'
                ELSE 'medium'
            END
        )
        RETURNING * INTO v_agg;
    END IF;

    v_user_threshold := COALESCE(admin.get_system_setting('errors.auto_ticket_user_threshold', '3')::INTEGER, 3);
    v_count_threshold := COALESCE(admin.get_system_setting('errors.auto_ticket_count_threshold', '10')::INTEGER, 10);
    v_window_minutes := COALESCE(admin.get_system_setting('errors.auto_ticket_window_minutes', '60')::INTEGER, 60);
    v_window_start := NEW.created_at - (v_window_minutes || ' minutes')::INTERVAL;

    SELECT COUNT(DISTINCT e.user_id)::INTEGER,
           COUNT(*)::INTEGER
    INTO v_recent_users, v_recent_occurrences
    FROM admin.system_error_log e
    WHERE e.error_hash = NEW.error_hash
      AND e.created_at >= v_window_start;

    IF NEW.error_type = 'rls_error' THEN
        v_should_ticket := TRUE;
        v_priority := 'critical';
    END IF;

    IF NEW.page_route ~* '(checkout|payment|subscription)' THEN
        v_should_ticket := TRUE;
        v_priority := 'critical';
    END IF;

    IF v_recent_users >= v_user_threshold OR v_recent_occurrences >= v_count_threshold THEN
        v_should_ticket := TRUE;
        v_priority := COALESCE(v_priority, 'high');
    END IF;

    IF v_agg.status = 'recurring' AND v_agg.auto_ticket_id IS NOT NULL THEN
        v_should_ticket := TRUE;
        v_priority := 'high';
    END IF;

    FOR v_rule IN
        SELECT *
        FROM admin.error_alert_rules
        WHERE is_active = TRUE
          AND (error_type IS NULL OR error_type = NEW.error_type)
          AND (system IS NULL OR system = NEW.system)
    LOOP
        IF v_rule.page_route_pattern IS NOT NULL THEN
            IF NEW.page_route IS NULL THEN
                CONTINUE;
            END IF;
            v_route_matches := NEW.page_route ~* '(checkout|payment|subscription)';
            IF v_rule.page_route_pattern ILIKE '%checkout%'
               OR v_rule.page_route_pattern ILIKE '%payment%'
               OR v_rule.page_route_pattern ILIKE '%subscription%'
            THEN
                IF NOT v_route_matches THEN
                    CONTINUE;
                END IF;
            END IF;
        END IF;

        IF v_recent_users >= v_rule.threshold_users
           OR v_recent_occurrences >= v_rule.threshold_occurrences
        THEN
            v_should_ticket := TRUE;
            v_priority := v_rule.auto_ticket_priority;
        END IF;
    END LOOP;

    IF v_should_ticket AND v_agg.auto_ticket_id IS NULL THEN
        INSERT INTO admin.support_tickets (
            user_id,
            subject,
            category,
            priority,
            status,
            is_auto_created,
            source_error_hash
        )
        VALUES (
            NEW.user_id,
            format('[Auto] %s on %s — %s users affected',
                NEW.error_type,
                COALESCE(NEW.page_route, 'unknown'),
                GREATEST(v_agg.affected_user_count, 1)
            ),
            'technical',
            v_priority,
            'open',
            TRUE,
            NEW.error_hash
        )
        RETURNING id INTO v_ticket_id;

        UPDATE admin.error_aggregations
        SET auto_ticket_id = v_ticket_id,
            updated_at = NOW()
        WHERE id = v_agg.id;
    END IF;

    RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_system_error_log_process ON admin.system_error_log;
CREATE TRIGGER trg_system_error_log_process
    AFTER INSERT ON admin.system_error_log
    FOR EACH ROW
    EXECUTE FUNCTION admin.process_error_event();

DROP TRIGGER IF EXISTS trg_error_aggregations_updated_at ON admin.error_aggregations;
CREATE TRIGGER trg_error_aggregations_updated_at
    BEFORE UPDATE ON admin.error_aggregations
    FOR EACH ROW
    EXECUTE FUNCTION admin.set_updated_at();

-- ---------------------------------------------------------------------------
-- admin.archive_old_errors
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION admin.archive_old_errors(p_retention_days INTEGER DEFAULT NULL)
RETURNS TABLE (archived_count BIGINT, deleted_count BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = admin, public
AS $$
DECLARE
    v_retention INTEGER;
    v_cutoff TIMESTAMPTZ;
    v_archived BIGINT;
    v_deleted BIGINT;
BEGIN
    v_retention := COALESCE(
        p_retention_days,
        admin.get_system_setting('errors.retention_days', '90')::INTEGER,
        90
    );
    v_cutoff := NOW() - (v_retention || ' days')::INTERVAL;

    INSERT INTO admin.system_error_log_archive (
        id, error_hash, user_id, user_email, user_role, system,
        page_route, component_name, error_type, error_message, stack_trace,
        browser, os, device_type, session_id, user_description, created_at, archived_at
    )
    SELECT
        id, error_hash, user_id, user_email, user_role, system,
        page_route, component_name, error_type, error_message, stack_trace,
        browser, os, device_type, session_id, user_description, created_at, NOW()
    FROM admin.system_error_log
    WHERE created_at < v_cutoff;

    GET DIAGNOSTICS v_archived = ROW_COUNT;

    DELETE FROM admin.system_error_log
    WHERE created_at < v_cutoff;

    GET DIAGNOSTICS v_deleted = ROW_COUNT;

    RETURN QUERY SELECT v_archived, v_deleted;
END;
$$;

COMMENT ON FUNCTION admin.archive_old_errors IS
  'Moves raw error log rows older than retention period to system_error_log_archive and deletes from hot table.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE admin.system_error_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.error_aggregations ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.system_error_log_archive ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS system_error_log_insert ON admin.system_error_log;
CREATE POLICY system_error_log_insert ON admin.system_error_log
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS system_error_log_admin_select ON admin.system_error_log;
CREATE POLICY system_error_log_admin_select ON admin.system_error_log
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

DROP POLICY IF EXISTS error_aggregations_admin ON admin.error_aggregations;
CREATE POLICY error_aggregations_admin ON admin.error_aggregations
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

DROP POLICY IF EXISTS system_error_log_archive_admin ON admin.system_error_log_archive;
CREATE POLICY system_error_log_archive_admin ON admin.system_error_log_archive
    FOR SELECT TO authenticated
    USING (admin.is_active_admin());

GRANT SELECT, INSERT ON admin.system_error_log TO authenticated;
GRANT ALL ON admin.system_error_log TO service_role;

GRANT SELECT, INSERT, UPDATE ON admin.error_aggregations TO authenticated;
GRANT ALL ON admin.error_aggregations TO service_role;

GRANT SELECT ON admin.system_error_log_archive TO authenticated;
GRANT ALL ON admin.system_error_log_archive TO service_role;

GRANT EXECUTE ON FUNCTION admin.compute_error_hash TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.process_error_event TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION admin.archive_old_errors TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Register tables
-- ---------------------------------------------------------------------------
INSERT INTO public.database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
    ('system_error_log', 'Raw error events from Platform and Simulator apps', 'admin', TRUE, TRUE, 'admin'),
    ('error_aggregations', 'Deduplicated error groups for monitoring dashboard', 'admin', TRUE, TRUE, 'admin'),
    ('system_error_log_archive', 'Archived raw error log entries (cold storage)', 'admin', TRUE, TRUE, 'admin')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    schema_name = EXCLUDED.schema_name,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();

-- error_alert_rules registered in v735_01; refresh description
INSERT INTO public.database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
    ('error_alert_rules', 'Configurable error auto-ticketing and alert thresholds', 'admin', TRUE, TRUE, 'admin')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    schema_name = EXCLUDED.schema_name,
    updated_at = NOW();
