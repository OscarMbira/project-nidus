-- ============================================================================
-- v572: PM OPA copy / field tailoring (Platform + Simulator)
-- Prerequisites: v400_eef_opa_tables.sql, v04 projects, auth.users
-- ============================================================================

-- ---------------------------------------------------------------------------
-- PLATFORM
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.project_opa_customisations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  source_opa_id        UUID NOT NULL REFERENCES public.organisational_process_assets(id),
  created_by           UUID NOT NULL REFERENCES auth.users(id),
  custom_title         TEXT NOT NULL,
  custom_description   TEXT,
  version              TEXT DEFAULT '1.0',
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  notes                TEXT,
  is_on_hold           BOOLEAN DEFAULT FALSE,
  on_hold_reason       TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  is_deleted           BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_project_opa_customisations_project
  ON public.project_opa_customisations(project_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE INDEX IF NOT EXISTS idx_project_opa_customisations_source
  ON public.project_opa_customisations(source_opa_id);

CREATE TABLE IF NOT EXISTS public.project_template_field_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customisation_id        UUID NOT NULL REFERENCES public.project_opa_customisations(id) ON DELETE CASCADE,
  field_key               TEXT NOT NULL,
  field_label             TEXT NOT NULL,
  is_visible              BOOLEAN NOT NULL DEFAULT TRUE,
  is_required             BOOLEAN NOT NULL DEFAULT FALSE,
  custom_label            TEXT,
  sort_order              INT DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customisation_id, field_key)
);

CREATE INDEX IF NOT EXISTS idx_project_template_field_config_customisation
  ON public.project_template_field_config(customisation_id);

DROP TRIGGER IF EXISTS trg_project_opa_customisations_updated ON public.project_opa_customisations;
CREATE TRIGGER trg_project_opa_customisations_updated
  BEFORE UPDATE ON public.project_opa_customisations
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

DROP TRIGGER IF EXISTS trg_project_template_field_config_updated ON public.project_template_field_config;
CREATE TRIGGER trg_project_template_field_config_updated
  BEFORE UPDATE ON public.project_template_field_config
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

-- ---------------------------------------------------------------------------
-- SIMULATOR (project_id = simulation_runs.id)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sim.project_opa_customisations (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id           UUID NOT NULL REFERENCES sim.simulation_runs(id) ON DELETE CASCADE,
  source_opa_id        UUID NOT NULL REFERENCES sim.organisational_process_assets(id),
  created_by           UUID NOT NULL REFERENCES auth.users(id),
  custom_title         TEXT NOT NULL,
  custom_description   TEXT,
  version              TEXT DEFAULT '1.0',
  status               TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'archived')),
  notes                TEXT,
  is_on_hold           BOOLEAN DEFAULT FALSE,
  on_hold_reason       TEXT,
  is_active            BOOLEAN DEFAULT TRUE,
  is_deleted           BOOLEAN DEFAULT FALSE,
  created_at           TIMESTAMPTZ DEFAULT NOW(),
  updated_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_project_opa_customisations_project
  ON sim.project_opa_customisations(project_id)
  WHERE COALESCE(is_deleted, FALSE) = FALSE;

CREATE TABLE IF NOT EXISTS sim.project_template_field_config (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customisation_id        UUID NOT NULL REFERENCES sim.project_opa_customisations(id) ON DELETE CASCADE,
  field_key               TEXT NOT NULL,
  field_label             TEXT NOT NULL,
  is_visible              BOOLEAN NOT NULL DEFAULT TRUE,
  is_required             BOOLEAN NOT NULL DEFAULT FALSE,
  custom_label            TEXT,
  sort_order              INT DEFAULT 0,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (customisation_id, field_key)
);

DROP TRIGGER IF EXISTS trg_sim_project_opa_customisations_updated ON sim.project_opa_customisations;
CREATE TRIGGER trg_sim_project_opa_customisations_updated
  BEFORE UPDATE ON sim.project_opa_customisations
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

DROP TRIGGER IF EXISTS trg_sim_project_template_field_config_updated ON sim.project_template_field_config;
CREATE TRIGGER trg_sim_project_template_field_config_updated
  BEFORE UPDATE ON sim.project_template_field_config
  FOR EACH ROW EXECUTE FUNCTION public.trg_eef_opa_touch_updated_at();

-- ---------------------------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_opa_customisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_template_field_config TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_opa_customisations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_template_field_config TO authenticated;

-- ---------------------------------------------------------------------------
-- RLS: PLATFORM
-- ---------------------------------------------------------------------------
ALTER TABLE public.project_opa_customisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_template_field_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_opa_customisations_select ON public.project_opa_customisations;
CREATE POLICY project_opa_customisations_select ON public.project_opa_customisations
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      public.auth_user_can_access_project(project_id)
      OR public.is_pmo_admin_user()
    )
  );

DROP POLICY IF EXISTS project_opa_customisations_insert ON public.project_opa_customisations;
CREATE POLICY project_opa_customisations_insert ON public.project_opa_customisations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.user_can_insert_project_template_copy(project_id)
  );

DROP POLICY IF EXISTS project_opa_customisations_update ON public.project_opa_customisations;
CREATE POLICY project_opa_customisations_update ON public.project_opa_customisations
  FOR UPDATE TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      public.is_pmo_admin_user()
      OR (
        public.auth_user_can_access_project(project_id)
        AND public.user_can_update_project_template_copy(created_by)
      )
    )
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    OR (
      public.auth_user_can_access_project(project_id)
      AND public.user_can_update_project_template_copy(created_by)
    )
  );

DROP POLICY IF EXISTS project_template_field_config_select ON public.project_template_field_config;
CREATE POLICY project_template_field_config_select ON public.project_template_field_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_opa_customisations c
      WHERE c.id = customisation_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND (
          public.auth_user_can_access_project(c.project_id)
          OR public.is_pmo_admin_user()
        )
    )
  );

DROP POLICY IF EXISTS project_template_field_config_insert ON public.project_template_field_config;
CREATE POLICY project_template_field_config_insert ON public.project_template_field_config
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_opa_customisations c
      WHERE c.id = customisation_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND public.auth_user_can_access_project(c.project_id)
        AND (
          public.is_pmo_admin_user()
          OR public.user_can_update_project_template_copy(c.created_by)
        )
    )
  );

DROP POLICY IF EXISTS project_template_field_config_update ON public.project_template_field_config;
CREATE POLICY project_template_field_config_update ON public.project_template_field_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_opa_customisations c
      WHERE c.id = customisation_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND (
          public.is_pmo_admin_user()
          OR (
            public.auth_user_can_access_project(c.project_id)
            AND public.user_can_update_project_template_copy(c.created_by)
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_opa_customisations c
      WHERE c.id = customisation_id
        AND (
          public.is_pmo_admin_user()
          OR (
            public.auth_user_can_access_project(c.project_id)
            AND public.user_can_update_project_template_copy(c.created_by)
          )
        )
    )
  );

DROP POLICY IF EXISTS project_template_field_config_delete ON public.project_template_field_config;
CREATE POLICY project_template_field_config_delete ON public.project_template_field_config
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_opa_customisations c
      WHERE c.id = customisation_id
        AND (
          public.is_pmo_admin_user()
          OR public.user_can_update_project_template_copy(c.created_by)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- RLS: SIMULATOR
-- ---------------------------------------------------------------------------
ALTER TABLE sim.project_opa_customisations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_template_field_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_project_opa_customisations_select ON sim.project_opa_customisations;
CREATE POLICY sim_project_opa_customisations_select ON sim.project_opa_customisations
  FOR SELECT TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      public.sim_auth_user_owns_run(project_id)
      OR public.is_pmo_admin_user()
    )
  );

DROP POLICY IF EXISTS sim_project_opa_customisations_insert ON sim.project_opa_customisations;
CREATE POLICY sim_project_opa_customisations_insert ON sim.project_opa_customisations
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND public.sim_auth_user_owns_run(project_id)
    AND (
      public.is_pmo_admin_user()
      OR EXISTS (
        SELECT 1 FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND r.role_name IN ('project_manager', 'team_lead', 'system_admin', 'pmo_admin')
      )
    )
  );

DROP POLICY IF EXISTS sim_project_opa_customisations_update ON sim.project_opa_customisations;
CREATE POLICY sim_project_opa_customisations_update ON sim.project_opa_customisations
  FOR UPDATE TO authenticated
  USING (
    COALESCE(is_deleted, FALSE) = FALSE
    AND (
      public.is_pmo_admin_user()
      OR (
        public.sim_auth_user_owns_run(project_id)
        AND public.user_can_update_project_template_copy(created_by)
      )
    )
  )
  WITH CHECK (
    public.is_pmo_admin_user()
    OR (
      public.sim_auth_user_owns_run(project_id)
      AND public.user_can_update_project_template_copy(created_by)
    )
  );

DROP POLICY IF EXISTS sim_project_template_field_config_select ON sim.project_template_field_config;
CREATE POLICY sim_project_template_field_config_select ON sim.project_template_field_config
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.project_opa_customisations c
      WHERE c.id = customisation_id
        AND COALESCE(c.is_deleted, FALSE) = FALSE
        AND (
          public.sim_auth_user_owns_run(c.project_id)
          OR public.is_pmo_admin_user()
        )
    )
  );

DROP POLICY IF EXISTS sim_project_template_field_config_insert ON sim.project_template_field_config;
CREATE POLICY sim_project_template_field_config_insert ON sim.project_template_field_config
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.project_opa_customisations c
      WHERE c.id = customisation_id
        AND public.sim_auth_user_owns_run(c.project_id)
        AND (
          public.is_pmo_admin_user()
          OR public.user_can_update_project_template_copy(c.created_by)
        )
    )
  );

DROP POLICY IF EXISTS sim_project_template_field_config_update ON sim.project_template_field_config;
CREATE POLICY sim_project_template_field_config_update ON sim.project_template_field_config
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.project_opa_customisations c
      WHERE c.id = customisation_id
        AND (
          public.is_pmo_admin_user()
          OR (
            public.sim_auth_user_owns_run(c.project_id)
            AND public.user_can_update_project_template_copy(c.created_by)
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.project_opa_customisations c
      WHERE c.id = customisation_id
        AND (
          public.is_pmo_admin_user()
          OR (
            public.sim_auth_user_owns_run(c.project_id)
            AND public.user_can_update_project_template_copy(c.created_by)
          )
        )
    )
  );

DROP POLICY IF EXISTS sim_project_template_field_config_delete ON sim.project_template_field_config;
CREATE POLICY sim_project_template_field_config_delete ON sim.project_template_field_config
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.project_opa_customisations c
      WHERE c.id = customisation_id
        AND (
          public.is_pmo_admin_user()
          OR public.user_can_update_project_template_copy(c.created_by)
        )
    )
  );

-- ---------------------------------------------------------------------------
-- database_tables registry
-- ---------------------------------------------------------------------------
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  (
    'project_opa_customisations',
    'Project-scoped tailored copies of PMO OPA templates',
    false,
    true,
    'org_knowledge'
  ),
  (
    'project_template_field_config',
    'Per-field visibility and labels for project OPA customisations',
    false,
    true,
    'org_knowledge'
  ),
  (
    'sim.project_opa_customisations',
    'Simulator: project-scoped OPA template customisations (FK to simulation_runs)',
    false,
    true,
    'org_knowledge'
  ),
  (
    'sim.project_template_field_config',
    'Simulator: field visibility config for OPA customisations',
    false,
    true,
    'org_knowledge'
  )
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v572_project_opa_tailoring_tables.sql applied';
END $$;
