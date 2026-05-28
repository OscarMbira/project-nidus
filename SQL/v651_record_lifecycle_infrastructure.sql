-- v651: Record lifecycle shared infrastructure (public schema)
-- @see projectplan/v639_Record_Lifecycle_Management_Plan.md
-- Prerequisites: accounts, projects, users, is_user_pmo_admin()

CREATE OR REPLACE FUNCTION public.set_lifecycle_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ── record_lifecycle_config ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.record_lifecycle_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  approval_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  level_approval_mode VARCHAR(20) NOT NULL DEFAULT 'any'
    CHECK (level_approval_mode IN ('any', 'all')),
  history_retention_days INTEGER DEFAULT NULL
    CHECK (history_retention_days IS NULL OR history_retention_days > 0),
  auto_archive_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  archive_retention_years INTEGER DEFAULT NULL
    CHECK (archive_retention_years IS NULL OR archive_retention_years > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  configured_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_lifecycle_config_scope UNIQUE (account_id, project_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_config_account_table
  ON public.record_lifecycle_config (account_id, table_name) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_lifecycle_config_project_table
  ON public.record_lifecycle_config (project_id, table_name) WHERE is_active = TRUE;
CREATE INDEX IF NOT EXISTS idx_lifecycle_config_auto_archive
  ON public.record_lifecycle_config (auto_archive_enabled) WHERE auto_archive_enabled = TRUE;

-- ── record_archive_config ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.record_archive_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  history_retention_days INTEGER
    CHECK (history_retention_days IS NULL OR history_retention_days > 0),
  auto_archive_enabled BOOLEAN,
  archive_retention_years INTEGER
    CHECK (archive_retention_years IS NULL OR archive_retention_years > 0),
  override_reason TEXT NOT NULL,
  regulatory_reference VARCHAR(255),
  effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_until DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  configured_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_archive_config_account_table UNIQUE (account_id, table_name)
);

CREATE INDEX IF NOT EXISTS idx_archive_config_account_table
  ON public.record_archive_config (account_id, table_name) WHERE is_active = TRUE;

-- ── record_authorisers ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.record_authorisers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  table_name VARCHAR(100) NOT NULL,
  authoriser_user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL DEFAULT 1 CHECK (approval_level >= 1),
  role_label VARCHAR(100),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_record_authorisers UNIQUE (account_id, project_id, table_name, authoriser_user_id)
);

CREATE INDEX IF NOT EXISTS idx_record_authorisers_table_level
  ON public.record_authorisers (account_id, table_name, approval_level) WHERE is_active = TRUE;

-- ── record_authorisation_requests ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.record_authorisation_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type VARCHAR(100) NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  root_record_id UUID NOT NULL,
  record_id UUID NOT NULL,
  submission_batch_id UUID NOT NULL,
  submitted_by UUID REFERENCES public.users(id),
  authoriser_id UUID REFERENCES public.users(id),
  approval_level INTEGER NOT NULL DEFAULT 1,
  role_label VARCHAR(100),
  status VARCHAR(20) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('waiting', 'pending', 'approved', 'rejected', 'withdrawn')),
  submission_notes TEXT,
  decision_notes TEXT,
  submitted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_auth_requests_root ON public.record_authorisation_requests (root_record_id);
CREATE INDEX IF NOT EXISTS idx_auth_requests_batch ON public.record_authorisation_requests (submission_batch_id);
CREATE INDEX IF NOT EXISTS idx_auth_requests_pending ON public.record_authorisation_requests (authoriser_id, status)
  WHERE status = 'pending';

-- ── record_lifecycle_logs ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.record_lifecycle_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  record_type VARCHAR(100) NOT NULL,
  root_record_id UUID NOT NULL,
  record_id UUID NOT NULL,
  table_name VARCHAR(100) NOT NULL,
  from_status VARCHAR(30),
  to_status VARCHAR(30) NOT NULL,
  operation VARCHAR(30) NOT NULL,
  performed_by UUID REFERENCES public.users(id),
  reason TEXT,
  version_number INTEGER,
  snapshot_data JSONB,
  performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lifecycle_logs_root ON public.record_lifecycle_logs (root_record_id);
CREATE INDEX IF NOT EXISTS idx_lifecycle_logs_table ON public.record_lifecycle_logs (table_name, root_record_id);

-- updated_at triggers
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'record_lifecycle_config', 'record_archive_config', 'record_authorisers'
  ] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_updated_at ON public.%I', t, t);
    EXECUTE format(
      'CREATE TRIGGER trg_%s_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_lifecycle_updated_at()',
      t, t
    );
  END LOOP;
END $$;

-- RLS
ALTER TABLE public.record_lifecycle_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_archive_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_authorisers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_authorisation_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.record_lifecycle_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_lifecycle_config_pmo ON public.record_lifecycle_config;
CREATE POLICY policy_lifecycle_config_pmo ON public.record_lifecycle_config
  FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_archive_config_pmo ON public.record_archive_config;
CREATE POLICY policy_archive_config_pmo ON public.record_archive_config
  FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_authorisers_pmo ON public.record_authorisers;
CREATE POLICY policy_authorisers_pmo ON public.record_authorisers
  FOR ALL TO authenticated
  USING (public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_auth_requests_select ON public.record_authorisation_requests;
CREATE POLICY policy_auth_requests_select ON public.record_authorisation_requests
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS policy_auth_requests_actor ON public.record_authorisation_requests;
CREATE POLICY policy_auth_requests_actor ON public.record_authorisation_requests
  FOR ALL TO authenticated
  USING (authoriser_id = auth.uid() OR submitted_by = auth.uid() OR public.is_user_pmo_admin(auth.uid()))
  WITH CHECK (authoriser_id = auth.uid() OR submitted_by = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

DROP POLICY IF EXISTS policy_lifecycle_logs_select ON public.record_lifecycle_logs;
CREATE POLICY policy_lifecycle_logs_select ON public.record_lifecycle_logs
  FOR SELECT TO authenticated USING (TRUE);

DROP POLICY IF EXISTS policy_lifecycle_logs_insert ON public.record_lifecycle_logs;
CREATE POLICY policy_lifecycle_logs_insert ON public.record_lifecycle_logs
  FOR INSERT TO authenticated WITH CHECK (performed_by = auth.uid() OR public.is_user_pmo_admin(auth.uid()));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.record_lifecycle_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.record_archive_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.record_authorisers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.record_authorisation_requests TO authenticated;
GRANT SELECT, INSERT ON public.record_lifecycle_logs TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('record_lifecycle_config', 'Per-table lifecycle approval and retention settings', false, true),
  ('record_archive_config', 'Table-specific archive retention overrides', false, true),
  ('record_authorisers', 'Authoriser chain per table and scope', false, true),
  ('record_authorisation_requests', 'Per-authoriser approval requests per submission', false, true),
  ('record_lifecycle_logs', 'Audit log of record status transitions', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v651_record_lifecycle_infrastructure.sql completed'; END $$;
