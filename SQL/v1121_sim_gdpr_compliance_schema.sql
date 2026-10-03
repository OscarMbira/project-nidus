-- ============================================================================
-- v1121: sim schema GDPR compliance tables (Simulator parity for v54/v1119/v1120)
-- ============================================================================
-- projectplan/v1108_data_management_gdpr_plan.md Phase 0.
-- Genuinely new capability for Simulator — sim schema never had these tables. Mirrors v54's six
-- tables + v1120's export registry, with RLS correct from the start (no legacy bug to inherit).
--
-- Identity convention note: sim.practice_projects.user_id references auth.users(id) directly
-- (confirmed in v80_sim_project_mandate_tables.sql) — a different convention from public schema's
-- user_id-via-public.users.id. The "whose data is this" column on these tables (user_id) follows
-- that same sim convention (raw auth UUID, compared directly to auth.uid()). Audit columns
-- (created_by/updated_by/processed_by/deleted_by) follow the standard audit-field convention used
-- everywhere else in this schema (public.users(id) — role/permission checks only work through that
-- table via public.user_roles/public.roles, which are shared, not duplicated per schema).
-- Account scoping reuses public.accounts(id) (shared) and the same public.
-- is_pmo_admin_or_owner_for_account() helper from v1119 — SQL functions aren't schema-locked to
-- their caller, so no need to duplicate it into sim.
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.consent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id),
    consent_type VARCHAR(100) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT,
    consent_version VARCHAR(20) DEFAULT '1.0',
    consent_method VARCHAR(50) DEFAULT 'explicit',
    ip_address TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id)
);
CREATE INDEX IF NOT EXISTS idx_sim_consent_logs_user_id ON sim.consent_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_sim_consent_logs_account_id ON sim.consent_logs(account_id);

CREATE TABLE IF NOT EXISTS sim.data_processing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id),
    processing_purpose TEXT NOT NULL,
    data_categories TEXT[] NOT NULL,
    data_subjects TEXT[] NOT NULL,
    recipients TEXT[],
    retention_period VARCHAR(255),
    security_measures TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES public.users(id)
);
CREATE INDEX IF NOT EXISTS idx_sim_data_processing_records_account_id ON sim.data_processing_records(account_id);

CREATE TABLE IF NOT EXISTS sim.data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id),
    request_type VARCHAR(50) NOT NULL CHECK (request_type IN ('data_export', 'data_deletion')) DEFAULT 'data_export',
    request_status VARCHAR(50) NOT NULL CHECK (request_status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT NOW(),
    processed_at TIMESTAMP,
    processed_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    export_file_path TEXT,
    export_format VARCHAR(50) CHECK (export_format IN ('json', 'csv', 'pdf')) DEFAULT 'json',
    rejection_reason TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES public.users(id)
);
CREATE INDEX IF NOT EXISTS idx_sim_data_export_requests_user_id ON sim.data_export_requests(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_sim_data_export_requests_account_id ON sim.data_export_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_sim_data_export_requests_status ON sim.data_export_requests(request_status) WHERE request_status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS sim.data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id),
    request_status VARCHAR(50) NOT NULL CHECK (request_status IN ('pending', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT NOW(),
    scheduled_deletion_date TIMESTAMP,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    deletion_scope JSONB,
    retention_exceptions TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_sim_data_deletion_requests_user_id ON sim.data_deletion_requests(user_id) WHERE is_deleted = false;
CREATE INDEX IF NOT EXISTS idx_sim_data_deletion_requests_account_id ON sim.data_deletion_requests(account_id);
CREATE INDEX IF NOT EXISTS idx_sim_data_deletion_requests_status ON sim.data_deletion_requests(request_status) WHERE request_status IN ('pending', 'processing');

CREATE TABLE IF NOT EXISTS sim.privacy_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    account_id UUID REFERENCES public.accounts(id),
    allow_marketing_emails BOOLEAN DEFAULT false,
    allow_analytics_tracking BOOLEAN DEFAULT false,
    allow_third_party_sharing BOOLEAN DEFAULT false,
    data_retention_preference VARCHAR(50),
    communication_preferences JSONB,
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES public.users(id)
);
CREATE INDEX IF NOT EXISTS idx_sim_privacy_preferences_account_id ON sim.privacy_preferences(account_id);

CREATE TABLE IF NOT EXISTS sim.data_breach_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID REFERENCES public.accounts(id),
    breach_number VARCHAR(50) UNIQUE NOT NULL,
    breach_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
    affected_users_count INTEGER DEFAULT 0,
    affected_users UUID[],
    data_types_affected TEXT[],
    breach_detected_at TIMESTAMP DEFAULT NOW(),
    breach_reported_at TIMESTAMP,
    authority_notified_at TIMESTAMP,
    users_notified_at TIMESTAMP,
    mitigation_steps TEXT,
    status VARCHAR(50) CHECK (status IN ('detected', 'investigating', 'contained', 'remediated', 'closed')) DEFAULT 'detected',
    created_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id),
    updated_at TIMESTAMP DEFAULT NOW(),
    updated_by UUID REFERENCES public.users(id),
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    deleted_by UUID REFERENCES public.users(id)
);
CREATE INDEX IF NOT EXISTS idx_sim_data_breach_records_account_id ON sim.data_breach_records(account_id);
CREATE INDEX IF NOT EXISTS idx_sim_data_breach_records_status ON sim.data_breach_records(status) WHERE is_deleted = false;

-- Registry mirror (v1120's public.gdpr_export_registry equivalent) — Simulator's own Tier-1
-- module list, resolved against sim schema table names.
CREATE TABLE IF NOT EXISTS sim.practice_gdpr_export_registry (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name           TEXT NOT NULL,
  table_name            TEXT NOT NULL UNIQUE,
  owner_columns         TEXT[] NOT NULL,
  owner_identity_space  TEXT NOT NULL DEFAULT 'internal_user'
                          CHECK (owner_identity_space IN ('internal_user', 'auth_user')),
  is_active             BOOLEAN NOT NULL DEFAULT TRUE,
  notes                 TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE sim.practice_gdpr_export_registry IS
  'v1121: Simulator parity for public.gdpr_export_registry (v1120) — data-driven Tier-1 module list for practice-project data export/anonymization.';
COMMENT ON COLUMN sim.practice_gdpr_export_registry.owner_identity_space IS
  'v1121: sim schema tables are NOT consistent about what owner_columns reference — some
   (practice_risks/practice_issues/practice_change_requests/practice_daily_log_entries/
   practice_lesson_entries) reference auth.users(id) directly (''auth_user''), others
   (sim.assumptions, practice_constraints) reference public.users(id) (''internal_user'', the
   default). The export/anonymize service must match against the right identity value per row —
   auth.uid() for ''auth_user'' rows, the resolved public.users.id for ''internal_user'' rows.';

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('sim.consent_logs', 'Simulator GDPR consent decisions (v1108/v1121)', false, true),
  ('sim.data_processing_records', 'Simulator GDPR record of processing activities (v1108/v1121)', true, true),
  ('sim.data_export_requests', 'Simulator GDPR data export requests (v1108/v1121)', false, true),
  ('sim.data_deletion_requests', 'Simulator GDPR data deletion requests (v1108/v1121)', false, true),
  ('sim.privacy_preferences', 'Simulator user privacy preferences (v1108/v1121)', false, true),
  ('sim.data_breach_records', 'Simulator GDPR data breach incident tracking (v1108/v1121)', true, true),
  ('sim.practice_gdpr_export_registry', 'Simulator data-driven GDPR export/anonymization module registry (v1108/v1121)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

-- ----------------------------------------------------------------------------
-- RLS
-- ----------------------------------------------------------------------------
ALTER TABLE sim.consent_logs ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.consent_logs TO authenticated;
GRANT ALL ON sim.consent_logs TO service_role;
DROP POLICY IF EXISTS policy_sim_consent_logs ON sim.consent_logs;
CREATE POLICY policy_sim_consent_logs ON sim.consent_logs
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id))
  WITH CHECK (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id));

ALTER TABLE sim.data_processing_records ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.data_processing_records TO authenticated;
GRANT ALL ON sim.data_processing_records TO service_role;
DROP POLICY IF EXISTS policy_sim_data_processing_records ON sim.data_processing_records;
CREATE POLICY policy_sim_data_processing_records ON sim.data_processing_records
  FOR ALL TO authenticated
  USING (public.is_pmo_admin_or_owner_for_account(account_id))
  WITH CHECK (public.is_pmo_admin_or_owner_for_account(account_id));

ALTER TABLE sim.data_export_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.data_export_requests TO authenticated;
GRANT ALL ON sim.data_export_requests TO service_role;
DROP POLICY IF EXISTS policy_sim_data_export_requests ON sim.data_export_requests;
CREATE POLICY policy_sim_data_export_requests ON sim.data_export_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id))
  WITH CHECK (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id));

ALTER TABLE sim.data_deletion_requests ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.data_deletion_requests TO authenticated;
GRANT ALL ON sim.data_deletion_requests TO service_role;
DROP POLICY IF EXISTS policy_sim_data_deletion_requests ON sim.data_deletion_requests;
CREATE POLICY policy_sim_data_deletion_requests ON sim.data_deletion_requests
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id))
  WITH CHECK (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id));

ALTER TABLE sim.privacy_preferences ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.privacy_preferences TO authenticated;
GRANT ALL ON sim.privacy_preferences TO service_role;
DROP POLICY IF EXISTS policy_sim_privacy_preferences ON sim.privacy_preferences;
CREATE POLICY policy_sim_privacy_preferences ON sim.privacy_preferences
  FOR ALL TO authenticated
  USING (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id))
  WITH CHECK (user_id = auth.uid() OR public.is_pmo_admin_or_owner_for_account(account_id));

ALTER TABLE sim.data_breach_records ENABLE ROW LEVEL SECURITY;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.data_breach_records TO authenticated;
GRANT ALL ON sim.data_breach_records TO service_role;
DROP POLICY IF EXISTS policy_sim_data_breach_records ON sim.data_breach_records;
CREATE POLICY policy_sim_data_breach_records ON sim.data_breach_records
  FOR ALL TO authenticated
  USING (public.is_pmo_admin_or_owner_for_account(account_id))
  WITH CHECK (public.is_pmo_admin_or_owner_for_account(account_id));

ALTER TABLE sim.practice_gdpr_export_registry ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON sim.practice_gdpr_export_registry TO authenticated;
GRANT ALL ON sim.practice_gdpr_export_registry TO service_role;
DROP POLICY IF EXISTS policy_sim_gdpr_export_registry_select ON sim.practice_gdpr_export_registry;
CREATE POLICY policy_sim_gdpr_export_registry_select ON sim.practice_gdpr_export_registry
  FOR SELECT TO authenticated
  USING (is_active = TRUE);
DROP POLICY IF EXISTS policy_sim_gdpr_export_registry_admin_write ON sim.practice_gdpr_export_registry;
CREATE POLICY policy_sim_gdpr_export_registry_admin_write ON sim.practice_gdpr_export_registry
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('PMO Admin', 'pmo_admin', 'sim_pmo_admin', 'simulator_admin', 'System Admin')
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('PMO Admin', 'pmo_admin', 'sim_pmo_admin', 'simulator_admin', 'System Admin')
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  );

-- ----------------------------------------------------------------------------
-- Tier-1 registry seed — verified against live table definitions (v232/v233/v794/v963b/v235/
-- v1132), not assumed. Note owner columns here reference auth.users(id) directly (these
-- module tables' own convention — see header comment), which the service layer (Phase 4) must
-- account for when matching "is this row about the requesting user" (compare against auth.uid(),
-- not a resolved public.users.id, for these particular tables).
-- ----------------------------------------------------------------------------
INSERT INTO sim.practice_gdpr_export_registry (module_name, table_name, owner_columns, owner_identity_space, notes)
VALUES
  ('Risks', 'practice_risks', ARRAY['risk_owner_user_id', 'identified_by_user_id'], 'auth_user', 'v232'),
  ('Issues', 'practice_issues', ARRAY['reported_by_user_id', 'assigned_to_user_id'], 'auth_user', 'v233'),
  ('Changes', 'practice_change_requests', ARRAY['submitted_by'], 'auth_user', 'v794'),
  ('Assumptions', 'assumptions', ARRAY['owner_user_id'], 'internal_user', 'v963b sim.assumptions'),
  ('Constraints', 'practice_constraints', ARRAY['owner_user_id'], 'internal_user', 'v1132'),
  ('Daily Log entries', 'practice_daily_log_entries', ARRAY['created_by'], 'auth_user', 'v235'),
  ('Lessons', 'practice_lesson_entries', ARRAY['identified_by_user_id', 'created_by'], 'auth_user', 'v235')
ON CONFLICT (table_name) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  owner_columns = EXCLUDED.owner_columns,
  owner_identity_space = EXCLUDED.owner_identity_space,
  notes = EXCLUDED.notes,
  updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1121_sim_gdpr_compliance_schema.sql applied successfully';
END $$;
