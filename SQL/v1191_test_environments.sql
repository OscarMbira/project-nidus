-- ============================================================================
-- v1191: Project test environments (Platform + Simulator practice)
-- ============================================================================
-- Target Environment on a test suite is a multi-value pick from this catalogue.
-- Existing single environment text is copied into the catalogue and linked.
-- Run this in the Supabase SQL editor before saving a suite or opening Environments.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.test_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_test_environments_project_name
    ON public.test_environments (project_id, lower(name))
    WHERE is_deleted = FALSE;

CREATE INDEX IF NOT EXISTS idx_test_environments_project
    ON public.test_environments (project_id)
    WHERE is_deleted = FALSE;

ALTER TABLE public.test_suites
    ADD COLUMN IF NOT EXISTS environment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO public.test_environments (project_id, name)
SELECT DISTINCT s.project_id, btrim(s.environment)
FROM public.test_suites s
WHERE COALESCE(s.is_deleted, FALSE) = FALSE
  AND s.environment IS NOT NULL
  AND btrim(s.environment) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM public.test_environments e
    WHERE e.project_id = s.project_id
      AND lower(e.name) = lower(btrim(s.environment))
      AND e.is_deleted = FALSE
  );

UPDATE public.test_suites s
SET environment_ids = COALESCE((
    SELECT jsonb_agg(e.id ORDER BY e.name)
    FROM public.test_environments e
    WHERE e.project_id = s.project_id
      AND e.is_deleted = FALSE
      AND lower(e.name) = lower(btrim(s.environment))
), '[]'::jsonb)
WHERE COALESCE(s.is_deleted, FALSE) = FALSE
  AND s.environment IS NOT NULL
  AND btrim(s.environment) <> ''
  AND (s.environment_ids IS NULL OR s.environment_ids = '[]'::jsonb);

ALTER TABLE public.test_environments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON public.test_environments TO authenticated;

DROP POLICY IF EXISTS policy_test_environments_select ON public.test_environments;
CREATE POLICY policy_test_environments_select
    ON public.test_environments FOR SELECT
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM public.user_projects up
                JOIN public.users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = test_environments.project_id
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                JOIN public.users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

DROP POLICY IF EXISTS policy_test_environments_insert ON public.test_environments;
CREATE POLICY policy_test_environments_insert
    ON public.test_environments FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.user_projects up
            JOIN public.users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = test_environments.project_id
              AND up.is_deleted = FALSE
        )
        OR EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            JOIN public.users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin', 'System Admin')
              AND ur.is_active = TRUE
              AND ur.is_deleted = FALSE
        )
    );

DROP POLICY IF EXISTS policy_test_environments_update ON public.test_environments;
CREATE POLICY policy_test_environments_update
    ON public.test_environments FOR UPDATE
    TO authenticated
    USING (
        is_deleted = FALSE
        AND (
            EXISTS (
                SELECT 1 FROM public.user_projects up
                JOIN public.users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = test_environments.project_id
                  AND up.is_deleted = FALSE
            )
            OR EXISTS (
                SELECT 1 FROM public.user_roles ur
                JOIN public.roles r ON ur.role_id = r.id
                JOIN public.users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin', 'System Admin')
                  AND ur.is_active = TRUE
                  AND ur.is_deleted = FALSE
            )
        )
    );

CREATE TABLE IF NOT EXISTS sim.practice_test_environments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
    is_deleted BOOLEAN NOT NULL DEFAULT FALSE,
    deleted_at TIMESTAMPTZ,
    deleted_by UUID REFERENCES public.users(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_practice_test_environments_project_name
    ON sim.practice_test_environments (practice_project_id, lower(name))
    WHERE is_deleted = FALSE;

ALTER TABLE sim.practice_test_suites
    ADD COLUMN IF NOT EXISTS environment_ids JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO sim.practice_test_environments (practice_project_id, name)
SELECT DISTINCT s.practice_project_id, btrim(s.environment)
FROM sim.practice_test_suites s
WHERE COALESCE(s.is_deleted, FALSE) = FALSE
  AND s.environment IS NOT NULL
  AND btrim(s.environment) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM sim.practice_test_environments e
    WHERE e.practice_project_id = s.practice_project_id
      AND lower(e.name) = lower(btrim(s.environment))
      AND e.is_deleted = FALSE
  );

UPDATE sim.practice_test_suites s
SET environment_ids = COALESCE((
    SELECT jsonb_agg(e.id ORDER BY e.name)
    FROM sim.practice_test_environments e
    WHERE e.practice_project_id = s.practice_project_id
      AND e.is_deleted = FALSE
      AND lower(e.name) = lower(btrim(s.environment))
), '[]'::jsonb)
WHERE COALESCE(s.is_deleted, FALSE) = FALSE
  AND s.environment IS NOT NULL
  AND btrim(s.environment) <> ''
  AND (s.environment_ids IS NULL OR s.environment_ids = '[]'::jsonb);

ALTER TABLE sim.practice_test_environments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE ON sim.practice_test_environments TO authenticated;

DROP POLICY IF EXISTS policy_practice_test_environments_all ON sim.practice_test_environments;
CREATE POLICY policy_practice_test_environments_all
    ON sim.practice_test_environments
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.practice_projects pp
            WHERE pp.id = practice_test_environments.practice_project_id
              AND pp.user_id = sim.get_current_user_id()
              AND COALESCE(pp.is_deleted, FALSE) = FALSE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.practice_projects pp
            WHERE pp.id = practice_test_environments.practice_project_id
              AND pp.user_id = sim.get_current_user_id()
        )
    );

INSERT INTO public.menu_items (
    id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
    sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(),
    'plat_pm_testing_environments',
    'Environments',
    'Target environments a test suite can run against (v1191).',
    '/platform/testing/environments',
    parent.id,
    parent.menu_level + 1,
    85,
    'universal',
    'network',
    TRUE,
    TRUE,
    NOW(),
    NOW()
FROM public.menu_items parent
WHERE parent.menu_code = 'plat_pm_project_setup'
  AND COALESCE(parent.is_deleted, FALSE) = FALSE
  AND NOT EXISTS (
    SELECT 1 FROM public.menu_items existing
    WHERE existing.menu_code = 'plat_pm_testing_environments'
      AND COALESCE(existing.is_deleted, FALSE) = FALSE
  );

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_quality_testing'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_testing_environments' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE
SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('test_environments', 'Target environments a project test suite can run against', FALSE, TRUE),
    ('practice_test_environments', 'Target environments a practice test suite can run against', FALSE, TRUE)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    updated_at = NOW();
