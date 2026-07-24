-- ============================================================================
-- v735_04: Admin System — feature flags, maintenance, settings migration
-- PostgreSQL 15+ / Supabase
-- Prerequisites: v735_01_admin_schema.sql
-- ============================================================================

-- ---------------------------------------------------------------------------
-- feature_flags
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flag_key VARCHAR(100) UNIQUE NOT NULL,
    flag_name VARCHAR(255) NOT NULL,
    description TEXT,
    is_enabled BOOLEAN DEFAULT FALSE,
    rollout_percentage INTEGER DEFAULT 100 CHECK (rollout_percentage BETWEEN 0 AND 100),
    applies_to VARCHAR(20) CHECK (applies_to IN ('platform', 'simulator', 'both', 'admin')),
    updated_by UUID REFERENCES admin.admin_users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_feature_flags_applies_to ON admin.feature_flags(applies_to);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON admin.feature_flags(is_enabled);

COMMENT ON TABLE admin.feature_flags IS 'Feature toggles for Platform, Simulator, and Admin applications';

-- ---------------------------------------------------------------------------
-- maintenance_windows
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admin.maintenance_windows (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    target_system VARCHAR(20) CHECK (target_system IN ('platform', 'simulator', 'both')),
    status VARCHAR(20) CHECK (status IN ('scheduled', 'active', 'completed', 'cancelled')),
    message TEXT NOT NULL,
    scheduled_start TIMESTAMPTZ NOT NULL,
    scheduled_end TIMESTAMPTZ,
    actual_start TIMESTAMPTZ,
    actual_end TIMESTAMPTZ,
    created_by UUID REFERENCES admin.admin_users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_maintenance_windows_status ON admin.maintenance_windows(status);
CREATE INDEX IF NOT EXISTS idx_maintenance_windows_scheduled_start ON admin.maintenance_windows(scheduled_start);

COMMENT ON TABLE admin.maintenance_windows IS 'Scheduled and active maintenance windows for Platform/Simulator';

-- ---------------------------------------------------------------------------
-- Consolidate legacy settings into admin.system_settings (1.19 / 16D.1)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'system_settings'
    ) THEN
        INSERT INTO admin.system_settings (setting_key, setting_value, setting_type, category, description)
        SELECT
            ss.setting_key,
            COALESCE(ss.setting_value, ss.default_value, ''),
            CASE lower(COALESCE(ss.setting_value_type, 'string'))
                WHEN 'number' THEN 'integer'
                WHEN 'boolean' THEN 'boolean'
                WHEN 'json' THEN 'json'
                ELSE 'text'
            END,
            COALESCE(ss.setting_category, 'legacy'),
            COALESCE(ss.setting_description, ss.setting_name)
        FROM public.system_settings ss
        WHERE COALESCE(ss.is_deleted, FALSE) = FALSE
          AND COALESCE(ss.is_active, TRUE) = TRUE
        ON CONFLICT (setting_key) DO NOTHING;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name = 'admin_system_settings'
    ) THEN
        INSERT INTO admin.system_settings (setting_key, setting_value, setting_type, category, description, is_sensitive)
        SELECT
            ass.setting_key,
            COALESCE(ass.setting_value::TEXT, ''),
            CASE lower(COALESCE(ass.setting_type, 'string'))
                WHEN 'number' THEN 'integer'
                WHEN 'boolean' THEN 'boolean'
                WHEN 'json' THEN 'json'
                ELSE 'text'
            END,
            COALESCE(ass.setting_category, 'legacy'),
            ass.description,
            COALESCE(ass.is_sensitive, FALSE)
        FROM public.admin_system_settings ass
        ON CONFLICT (setting_key) DO NOTHING;
    END IF;
END $$;

-- Backward-compatible read view for legacy callers (public schema)
CREATE OR REPLACE VIEW public.v_admin_system_settings_compat AS
SELECT
    s.id,
    s.setting_key,
    s.setting_value,
    s.setting_type AS setting_value_type,
    s.category AS setting_category,
    s.description,
    s.is_sensitive,
    s.updated_at,
    s.created_at
FROM admin.system_settings s;

COMMENT ON VIEW public.v_admin_system_settings_compat IS
  'Backward-compatible view over admin.system_settings for legacy Platform/Simulator code paths';

GRANT SELECT ON public.v_admin_system_settings_compat TO authenticated, anon, service_role;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
ALTER TABLE admin.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin.maintenance_windows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS feature_flags_select ON admin.feature_flags;
CREATE POLICY feature_flags_select ON admin.feature_flags
    FOR SELECT TO authenticated, anon
    USING (TRUE);

DROP POLICY IF EXISTS feature_flags_modify ON admin.feature_flags;
CREATE POLICY feature_flags_modify ON admin.feature_flags
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

DROP POLICY IF EXISTS maintenance_windows_all ON admin.maintenance_windows;
CREATE POLICY maintenance_windows_all ON admin.maintenance_windows
    FOR ALL TO authenticated
    USING (admin.is_active_admin())
    WITH CHECK (admin.is_active_admin());

DROP POLICY IF EXISTS maintenance_windows_public_read ON admin.maintenance_windows;
CREATE POLICY maintenance_windows_public_read ON admin.maintenance_windows
    FOR SELECT TO authenticated, anon
    USING (status IN ('scheduled', 'active'));

GRANT SELECT ON admin.feature_flags TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON admin.feature_flags TO authenticated;
GRANT ALL ON admin.feature_flags TO service_role;

GRANT SELECT ON admin.maintenance_windows TO authenticated, anon;
GRANT SELECT, INSERT, UPDATE ON admin.maintenance_windows TO authenticated;
GRANT ALL ON admin.maintenance_windows TO service_role;

-- ---------------------------------------------------------------------------
-- Register tables
-- ---------------------------------------------------------------------------
INSERT INTO public.database_tables (table_name, table_description, schema_name, is_system_table, is_active, table_category)
VALUES
    ('feature_flags', 'Feature toggles for Platform, Simulator, and Admin', 'admin', TRUE, TRUE, 'admin'),
    ('maintenance_windows', 'Scheduled and active maintenance windows', 'admin', FALSE, TRUE, 'admin')
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    schema_name = EXCLUDED.schema_name,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    table_category = EXCLUDED.table_category,
    updated_at = NOW();
