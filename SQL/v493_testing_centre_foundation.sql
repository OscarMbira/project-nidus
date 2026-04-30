-- ============================================================================
-- v493 — PMIS Testing & Diagnostics Centre — Foundation (public + sim)
-- PostgreSQL 15+ (Supabase). Use tc_ prefix for all new tables (see v493 plan).
-- ============================================================================

-- -----------------------------------------------------------------------------
-- Permission helper: global testing_centre.* (not project-scoped)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.app_user_has_testing_centre_permission(p_code text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.users u
        JOIN public.user_roles ur ON ur.user_id = u.id AND ur.is_active = TRUE AND ur.is_deleted = FALSE
        JOIN public.role_permissions rp ON rp.role_id = ur.role_id AND rp.is_active = TRUE AND (rp.is_deleted = FALSE OR rp.is_deleted IS NULL)
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE u.auth_user_id = auth.uid()
          AND p.permission_code = p_code
    );
$$;

-- -----------------------------------------------------------------------------
-- Public schema: core tables
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tc_test_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    methodology_type VARCHAR(40) NOT NULL DEFAULT 'system',
    parent_module_id UUID REFERENCES public.tc_test_modules(id) ON DELETE SET NULL,
    route_path TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tc_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_code VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    module_id UUID REFERENCES public.tc_test_modules(id) ON DELETE SET NULL,
    feature_name TEXT,
    methodology_type VARCHAR(40) NOT NULL DEFAULT 'hybrid',
    test_type VARCHAR(64) NOT NULL DEFAULT 'manual',
    scenario_type VARCHAR(64) NOT NULL DEFAULT 'positive',
    priority VARCHAR(32) NOT NULL DEFAULT 'medium',
    severity_if_failed VARCHAR(32) NOT NULL DEFAULT 'medium',
    preconditions TEXT,
    test_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    test_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    expected_result TEXT,
    automation_key TEXT,
    playwright_spec_path TEXT,
    vitest_spec_path TEXT,
    database_test_path TEXT,
    expected_screenshot_id UUID,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(40) NOT NULL DEFAULT 'draft',
    owner_role TEXT,
    owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_reusable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tc_test_cases_code UNIQUE (test_case_code)
);

CREATE TABLE IF NOT EXISTS public.tc_test_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    environment_type VARCHAR(64) NOT NULL,
    base_url TEXT,
    api_base_url TEXT,
    database_reference TEXT,
    browser_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    seed_data_profile TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.tc_test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_code VARCHAR(64) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    suite_type VARCHAR(64) NOT NULL DEFAULT 'regression',
    methodology_type VARCHAR(40) NOT NULL DEFAULT 'hybrid',
    target_module_id UUID REFERENCES public.tc_test_modules(id) ON DELETE SET NULL,
    environment_id UUID REFERENCES public.tc_test_environments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tc_test_suites_code UNIQUE (suite_code)
);

CREATE TABLE IF NOT EXISTS public.tc_test_suite_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID NOT NULL REFERENCES public.tc_test_suites(id) ON DELETE CASCADE,
    tc_test_case_id UUID NOT NULL REFERENCES public.tc_test_cases(id) ON DELETE CASCADE,
    run_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_tc_suite_case UNIQUE (suite_id, tc_test_case_id)
);

CREATE TABLE IF NOT EXISTS public.tc_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tc_test_cases_module ON public.tc_test_cases(module_id) WHERE is_active;
CREATE INDEX IF NOT EXISTS idx_tc_test_cases_status ON public.tc_test_cases(status);
CREATE INDEX IF NOT EXISTS idx_tc_test_suite_cases_suite ON public.tc_test_suite_cases(suite_id);

-- -----------------------------------------------------------------------------
-- RLS: enable + policies
-- -----------------------------------------------------------------------------

ALTER TABLE public.tc_test_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_test_suite_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_test_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tc_settings ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.tc_test_modules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tc_test_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tc_test_suites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tc_test_suite_cases TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tc_test_environments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.tc_settings TO authenticated;

-- drop all first then create (idempotent re-run)
DROP POLICY IF EXISTS tc_test_modules_select ON public.tc_test_modules;
DROP POLICY IF EXISTS tc_test_modules_insert ON public.tc_test_modules;
DROP POLICY IF EXISTS tc_test_modules_update ON public.tc_test_modules;
DROP POLICY IF EXISTS tc_test_modules_delete ON public.tc_test_modules;

CREATE POLICY tc_test_modules_select ON public.tc_test_modules FOR SELECT TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_test_modules_insert ON public.tc_test_modules FOR INSERT TO authenticated
  WITH CHECK (app_user_has_testing_centre_permission('testing_centre.create'));
CREATE POLICY tc_test_modules_update ON public.tc_test_modules FOR UPDATE TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY tc_test_modules_delete ON public.tc_test_modules FOR DELETE TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.delete'));

DROP POLICY IF EXISTS tc_test_cases_select ON public.tc_test_cases;
DROP POLICY IF EXISTS tc_test_cases_insert ON public.tc_test_cases;
DROP POLICY IF EXISTS tc_test_cases_update ON public.tc_test_cases;
DROP POLICY IF EXISTS tc_test_cases_delete ON public.tc_test_cases;
CREATE POLICY tc_test_cases_select ON public.tc_test_cases FOR SELECT TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_test_cases_insert ON public.tc_test_cases FOR INSERT TO authenticated
  WITH CHECK (app_user_has_testing_centre_permission('testing_centre.create'));
CREATE POLICY tc_test_cases_update ON public.tc_test_cases FOR UPDATE TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY tc_test_cases_delete ON public.tc_test_cases FOR DELETE TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.delete'));

DROP POLICY IF EXISTS tc_test_suites_select ON public.tc_test_suites;
DROP POLICY IF EXISTS tc_test_suites_insert ON public.tc_test_suites;
DROP POLICY IF EXISTS tc_test_suites_update ON public.tc_test_suites;
DROP POLICY IF EXISTS tc_test_suites_delete ON public.tc_test_suites;
CREATE POLICY tc_test_suites_select ON public.tc_test_suites FOR SELECT TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_test_suites_insert ON public.tc_test_suites FOR INSERT TO authenticated
  WITH CHECK (app_user_has_testing_centre_permission('testing_centre.create'));
CREATE POLICY tc_test_suites_update ON public.tc_test_suites FOR UPDATE TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY tc_test_suites_delete ON public.tc_test_suites FOR DELETE TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.delete'));

DROP POLICY IF EXISTS tc_test_environments_select ON public.tc_test_environments;
DROP POLICY IF EXISTS tc_test_environments_write ON public.tc_test_environments;
CREATE POLICY tc_test_environments_select ON public.tc_test_environments FOR SELECT TO authenticated
  USING (
    app_user_has_testing_centre_permission('testing_centre.view')
    OR app_user_has_testing_centre_permission('testing_centre.view_logs')
  );
CREATE POLICY tc_test_environments_write ON public.tc_test_environments FOR ALL TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.manage_environments'))
  WITH CHECK (app_user_has_testing_centre_permission('testing_centre.manage_environments'));

DROP POLICY IF EXISTS tc_settings_all ON public.tc_settings;
CREATE POLICY tc_settings_select ON public.tc_settings FOR SELECT TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY tc_settings_write ON public.tc_settings FOR ALL TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.configure'))
  WITH CHECK (app_user_has_testing_centre_permission('testing_centre.configure'));

-- Fix duplicate policy name issue - I used FOR ALL on suite_cases incorrectly
DROP POLICY IF EXISTS tc_test_suite_cases_write ON public.tc_test_suite_cases;
CREATE POLICY tc_test_suite_cases_insert ON public.tc_test_suite_cases FOR INSERT TO authenticated
  WITH CHECK (app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY tc_test_suite_cases_update ON public.tc_test_suite_cases FOR UPDATE TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY tc_test_suite_cases_delete ON public.tc_test_suite_cases FOR DELETE TO authenticated
  USING (app_user_has_testing_centre_permission('testing_centre.delete'));

-- -----------------------------------------------------------------------------
-- RPC: dashboard metrics
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.get_testing_centre_dashboard_metrics()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  j jsonb;
BEGIN
  IF NOT app_user_has_testing_centre_permission('testing_centre.view') THEN
    RAISE EXCEPTION 'insufficient permission';
  END IF;
  SELECT jsonb_build_object(
    'total_cases', (SELECT COUNT(*)::int FROM tc_test_cases WHERE is_active),
    'ready_cases', (SELECT COUNT(*)::int FROM tc_test_cases WHERE is_active AND status = 'ready'),
    'automated_cases', (SELECT COUNT(*)::int FROM tc_test_cases WHERE is_active AND (playwright_spec_path IS NOT NULL OR vitest_spec_path IS NOT NULL)),
    'manual_cases', (SELECT COUNT(*)::int FROM tc_test_cases WHERE is_active AND playwright_spec_path IS NULL AND vitest_spec_path IS NULL),
    'draft_cases', (SELECT COUNT(*)::int FROM tc_test_cases WHERE is_active AND status = 'draft'),
    'deprecated_cases', (SELECT COUNT(*)::int FROM tc_test_cases WHERE is_active AND status = 'deprecated'),
    'active_suites', (SELECT COUNT(*)::int FROM tc_test_suites WHERE is_active),
    'active_environments', (SELECT COUNT(*)::int FROM tc_test_environments WHERE is_active)
  ) INTO j;
  RETURN j;
END;
$$;

-- -----------------------------------------------------------------------------
-- RPC: clone
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.clone_test_case(
  p_source_id uuid,
  p_new_title text,
  p_created_by uuid
) RETURNS public.tc_test_cases
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.tc_test_cases%ROWTYPE;
  new_id uuid;
  new_code text;
  row public.tc_test_cases%ROWTYPE;
BEGIN
  IF NOT app_user_has_testing_centre_permission('testing_centre.create') THEN
    RAISE EXCEPTION 'insufficient permission';
  END IF;
  SELECT * INTO src FROM public.tc_test_cases WHERE id = p_source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;
  new_code := src.test_case_code || '-COPY-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYMMDD');

  INSERT INTO public.tc_test_cases (
    test_case_code, title, description, module_id, feature_name, methodology_type, test_type, scenario_type,
    priority, severity_if_failed, preconditions, test_steps, test_data, expected_result,
    automation_key, playwright_spec_path, vitest_spec_path, database_test_path, tags, status, owner_role,
    is_reusable, is_active, created_by, updated_by
  ) VALUES (
    new_code, COALESCE(p_new_title, src.title || ' (Copy)'), src.description, src.module_id, src.feature_name,
    src.methodology_type, src.test_type, src.scenario_type, src.priority, src.severity_if_failed,
    src.preconditions, src.test_steps, src.test_data, src.expected_result, src.automation_key,
    src.playwright_spec_path, src.vitest_spec_path, src.database_test_path, src.tags, 'draft', src.owner_role,
    src.is_reusable, TRUE, p_created_by, p_created_by
  ) RETURNING * INTO row;
  RETURN row;
END;
$$;

CREATE OR REPLACE FUNCTION public.clone_test_suite(
  p_source_id uuid,
  p_new_name text,
  p_created_by uuid
) RETURNS public.tc_test_suites
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  src public.tc_test_suites%ROWTYPE;
  new_code text;
  row public.tc_test_suites%ROWTYPE;
  sc RECORD;
BEGIN
  IF NOT app_user_has_testing_centre_permission('testing_centre.create') THEN
    RAISE EXCEPTION 'insufficient permission';
  END IF;
  SELECT * INTO src FROM public.tc_test_suites WHERE id = p_source_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'source not found'; END IF;
  new_code := src.suite_code || '-COPY-' || to_char(NOW() AT TIME ZONE 'UTC', 'YYMMDD');

  INSERT INTO public.tc_test_suites (suite_code, name, description, suite_type, methodology_type, target_module_id, environment_id, is_active, created_by)
  VALUES (new_code, COALESCE(p_new_name, src.name || ' (Copy)'), src.description, src.suite_type, src.methodology_type, src.target_module_id, src.environment_id, TRUE, p_created_by)
  RETURNING * INTO row;

  FOR sc IN
    SELECT * FROM public.tc_test_suite_cases WHERE suite_id = p_source_id ORDER BY run_order
  LOOP
    INSERT INTO public.tc_test_suite_cases (suite_id, tc_test_case_id, run_order, is_required)
    VALUES (row.id, sc.tc_test_case_id, sc.run_order, sc.is_required);
  END LOOP;

  RETURN row;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_testing_centre_dashboard_metrics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_test_case(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.clone_test_suite(uuid, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.app_user_has_testing_centre_permission(text) TO authenticated;

-- -----------------------------------------------------------------------------
-- Permissions
-- -----------------------------------------------------------------------------

INSERT INTO public.permissions (permission_code, permission_name, permission_description, permission_category, permission_module, permission_type, is_system_permission, is_active)
VALUES
  ('testing_centre.view', 'View Testing Centre', 'View test cases, suites, runs, diagnostics', 'quality', 'testing_centre', 'read', true, true),
  ('testing_centre.create', 'Create Testing Centre records', 'Create test cases, suites, sessions', 'quality', 'testing_centre', 'create', true, true),
  ('testing_centre.edit', 'Edit Testing Centre records', 'Edit test artefacts', 'quality', 'testing_centre', 'update', true, true),
  ('testing_centre.delete', 'Delete Testing Centre records', 'Delete test artefacts', 'quality', 'testing_centre', 'delete', true, true),
  ('testing_centre.run', 'Execute test runs', 'Start or schedule test runs', 'quality', 'testing_centre', 'execute', true, true),
  ('testing_centre.configure', 'Configure Testing Centre', 'Scripts, data manager, global settings', 'quality', 'testing_centre', 'update', true, true),
  ('testing_centre.approve_fix', 'Approve testing-related fixes', 'Close / approve test defects', 'quality', 'testing_centre', 'execute', true, true),
  ('testing_centre.view_logs', 'View test run logs and traces', 'Access detailed run logs', 'quality', 'testing_centre', 'read', true, true),
  ('testing_centre.manage_environments', 'Manage test environments', 'Create environments and base URLs', 'quality', 'testing_centre', 'update', true, true)
ON CONFLICT (permission_code) DO UPDATE SET
  permission_name = EXCLUDED.permission_name,
  permission_description = EXCLUDED.permission_description,
  updated_at = NOW();

-- Broad role grant (tune in production)
INSERT INTO public.role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_code IN (
  'testing_centre.view', 'testing_centre.create', 'testing_centre.edit', 'testing_centre.delete',
  'testing_centre.run', 'testing_centre.configure', 'testing_centre.approve_fix', 'testing_centre.view_logs',
  'testing_centre.manage_environments'
)
  AND r.role_name IN ('system_admin', 'pmo_admin', 'System Admin', 'admin')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

INSERT INTO public.role_permissions (role_id, permission_id, is_active, is_deleted)
SELECT r.id, p.id, TRUE, FALSE
FROM public.roles r
CROSS JOIN public.permissions p
WHERE p.permission_code IN (
  'testing_centre.view', 'testing_centre.create', 'testing_centre.edit',
  'testing_centre.run', 'testing_centre.view_logs', 'testing_centre.configure'
)
  AND r.role_name IN ('project_manager', 'programme_manager', 'scrum_master', 'product_owner', 'team_lead', 'tester', 'pm_team_manager')
ON CONFLICT (role_id, permission_id) DO UPDATE SET is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

-- -----------------------------------------------------------------------------
-- database_tables registry
-- -----------------------------------------------------------------------------

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active) VALUES
  ('tc_test_modules', 'PMIS Testing Centre: logical modules / routes', false, true),
  ('tc_test_cases', 'PMIS Testing Centre: test case library (tc_ prefix)', false, true),
  ('tc_test_suites', 'PMIS Testing Centre: test suites', false, true),
  ('tc_test_suite_cases', 'PMIS Testing Centre: cases in a suite', false, true),
  ('tc_test_environments', 'PMIS Testing Centre: run environments', false, true),
  ('tc_settings', 'PMIS Testing Centre: key/value settings', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_active = TRUE;

-- -----------------------------------------------------------------------------
-- Sim schema mirrors
-- -----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sim.tc_test_modules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code VARCHAR(64) NOT NULL UNIQUE,
    description TEXT,
    methodology_type VARCHAR(40) NOT NULL DEFAULT 'system',
    parent_module_id UUID REFERENCES sim.tc_test_modules(id) ON DELETE SET NULL,
    route_path TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.tc_test_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    environment_type VARCHAR(64) NOT NULL,
    base_url TEXT,
    api_base_url TEXT,
    database_reference TEXT,
    browser_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    seed_data_profile TEXT,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.tc_test_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_case_code VARCHAR(64) NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    module_id UUID REFERENCES sim.tc_test_modules(id) ON DELETE SET NULL,
    feature_name TEXT,
    methodology_type VARCHAR(40) NOT NULL DEFAULT 'hybrid',
    test_type VARCHAR(64) NOT NULL DEFAULT 'manual',
    scenario_type VARCHAR(64) NOT NULL DEFAULT 'positive',
    priority VARCHAR(32) NOT NULL DEFAULT 'medium',
    severity_if_failed VARCHAR(32) NOT NULL DEFAULT 'medium',
    preconditions TEXT,
    test_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
    test_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    expected_result TEXT,
    automation_key TEXT,
    playwright_spec_path TEXT,
    vitest_spec_path TEXT,
    database_test_path TEXT,
    expected_screenshot_id UUID,
    tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    status VARCHAR(40) NOT NULL DEFAULT 'draft',
    owner_role TEXT,
    owner_user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_reusable BOOLEAN NOT NULL DEFAULT TRUE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sim_tc_test_cases_code UNIQUE (test_case_code)
);

CREATE TABLE IF NOT EXISTS sim.tc_test_suites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_code VARCHAR(64) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    suite_type VARCHAR(64) NOT NULL DEFAULT 'regression',
    methodology_type VARCHAR(40) NOT NULL DEFAULT 'hybrid',
    target_module_id UUID REFERENCES sim.tc_test_modules(id) ON DELETE SET NULL,
    environment_id UUID REFERENCES sim.tc_test_environments(id) ON DELETE SET NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    practice_project_id UUID REFERENCES sim.practice_projects(id) ON DELETE SET NULL,
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sim_tc_test_suites_code UNIQUE (suite_code)
);

CREATE TABLE IF NOT EXISTS sim.tc_test_suite_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    suite_id UUID NOT NULL REFERENCES sim.tc_test_suites(id) ON DELETE CASCADE,
    tc_test_case_id UUID NOT NULL REFERENCES sim.tc_test_cases(id) ON DELETE CASCADE,
    run_order INTEGER NOT NULL DEFAULT 0,
    is_required BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_sim_tc_suite_case UNIQUE (suite_id, tc_test_case_id)
);

CREATE TABLE IF NOT EXISTS sim.tc_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT NOT NULL UNIQUE,
    setting_value JSONB NOT NULL DEFAULT '{}'::jsonb,
    description TEXT,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Sim RLS: grant to authenticated
ALTER TABLE sim.tc_test_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_test_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_test_suites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_test_suite_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_test_environments ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.tc_settings ENABLE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT ALL ON sim.tc_test_modules, sim.tc_test_cases, sim.tc_test_suites, sim.tc_test_suite_cases, sim.tc_test_environments, sim.tc_settings TO authenticated;

-- Simple sim policies: match platform permission via same function (user is global)
DROP POLICY IF EXISTS stc_test_cases_select ON sim.tc_test_cases;
CREATE POLICY stc_test_cases_select ON sim.tc_test_cases FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
-- ... abbreviated: apply same 4 ops as public for all sim tc_* tables
CREATE POLICY stc_test_cases_i ON sim.tc_test_cases FOR INSERT TO authenticated
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.create'));
CREATE POLICY stc_test_cases_u ON sim.tc_test_cases FOR UPDATE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY stc_test_cases_d ON sim.tc_test_cases FOR DELETE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.delete'));

DROP POLICY IF EXISTS stc_modules_s ON sim.tc_test_modules;
CREATE POLICY stc_modules_s ON sim.tc_test_modules FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY stc_modules_i ON sim.tc_test_modules FOR INSERT TO authenticated
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.create'));
CREATE POLICY stc_modules_u ON sim.tc_test_modules FOR UPDATE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY stc_modules_d ON sim.tc_test_modules FOR DELETE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.delete'));

DROP POLICY IF EXISTS stc_env_s ON sim.tc_test_environments;
CREATE POLICY stc_env_s ON sim.tc_test_environments FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view') OR public.app_user_has_testing_centre_permission('testing_centre.view_logs'));
CREATE POLICY stc_env_w ON sim.tc_test_environments FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.manage_environments'))
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.manage_environments'));

DROP POLICY IF EXISTS stc_suites_s ON sim.tc_test_suites;
CREATE POLICY stc_suites_s ON sim.tc_test_suites FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY stc_suites_i ON sim.tc_test_suites FOR INSERT TO authenticated
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.create'));
CREATE POLICY stc_suites_u ON sim.tc_test_suites FOR UPDATE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY stc_suites_d ON sim.tc_test_suites FOR DELETE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.delete'));

DROP POLICY IF EXISTS stc_suc_s ON sim.tc_test_suite_cases;
CREATE POLICY stc_suc_s ON sim.tc_test_suite_cases FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY stc_suc_i ON sim.tc_test_suite_cases FOR INSERT TO authenticated
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY stc_suc_u ON sim.tc_test_suite_cases FOR UPDATE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.edit'));
CREATE POLICY stc_suc_d ON sim.tc_test_suite_cases FOR DELETE TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.delete'));

DROP POLICY IF EXISTS stc_set_s ON sim.tc_settings;
CREATE POLICY stc_set_s ON sim.tc_settings FOR SELECT TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.view'));
CREATE POLICY stc_set_w ON sim.tc_settings FOR ALL TO authenticated
  USING (public.app_user_has_testing_centre_permission('testing_centre.configure'))
  WITH CHECK (public.app_user_has_testing_centre_permission('testing_centre.configure'));

-- End v493
COMMENT ON TABLE public.tc_test_cases IS 'v493 — Testing Centre case library; distinct from legacy public.test_cases';
