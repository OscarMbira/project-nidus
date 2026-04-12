-- ============================================================================
-- v441: ITTO — Simulator (sim.itto_templates, sim.project_ittos)
-- Prerequisites: v439–v440, sim.practice_projects, user_has_access_to_account, is_pmo_admin_user
-- ============================================================================

CREATE TABLE IF NOT EXISTS sim.itto_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  process_group TEXT NOT NULL DEFAULT 'Planning'
    CHECK (process_group IN (
      'Initiating', 'Planning', 'Executing', 'Monitoring & Controlling', 'Closing'
    )),
  knowledge_area TEXT NOT NULL DEFAULT 'Integration',
  description TEXT,
  inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools_techniques JSONB NOT NULL DEFAULT '[]'::jsonb,
  outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  draft_expires_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sim.project_ittos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  practice_project_id UUID NOT NULL REFERENCES sim.practice_projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES sim.itto_templates(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  process_group TEXT NOT NULL DEFAULT 'Planning'
    CHECK (process_group IN (
      'Initiating', 'Planning', 'Executing', 'Monitoring & Controlling', 'Closing'
    )),
  knowledge_area TEXT NOT NULL DEFAULT 'Integration',
  description TEXT,
  inputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  tools_techniques JSONB NOT NULL DEFAULT '[]'::jsonb,
  outputs JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  status TEXT NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'archived')),
  is_draft BOOLEAN NOT NULL DEFAULT FALSE,
  draft_expires_at TIMESTAMPTZ,
  tailoring_notes TEXT,
  created_by UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sim_itto_templates_org ON sim.itto_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_sim_project_ittos_pp ON sim.project_ittos(practice_project_id);

GRANT USAGE ON SCHEMA sim TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.itto_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sim.project_ittos TO authenticated;

ALTER TABLE sim.itto_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim.project_ittos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS sim_itto_templates_select ON sim.itto_templates;
CREATE POLICY sim_itto_templates_select ON sim.itto_templates
  FOR SELECT TO authenticated
  USING (public.user_has_access_to_account(organisation_id));

DROP POLICY IF EXISTS sim_itto_templates_insert ON sim.itto_templates;
CREATE POLICY sim_itto_templates_insert ON sim.itto_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS sim_itto_templates_update ON sim.itto_templates;
CREATE POLICY sim_itto_templates_update ON sim.itto_templates
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS sim_itto_templates_delete ON sim.itto_templates;
CREATE POLICY sim_itto_templates_delete ON sim.itto_templates
  FOR DELETE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS sim_project_ittos_all ON sim.project_ittos;
CREATE POLICY sim_project_ittos_all ON sim.project_ittos FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_id
        AND COALESCE(pp.is_deleted, FALSE) = FALSE
        AND (pp.user_id = auth.uid() OR public.is_pmo_admin_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM sim.practice_projects pp
      WHERE pp.id = practice_project_id
        AND COALESCE(pp.is_deleted, FALSE) = FALSE
        AND (pp.user_id = auth.uid() OR public.is_pmo_admin_user())
    )
  );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('sim.itto_templates', 'Simulator organisation ITTO templates', FALSE, TRUE, 'simulation'),
  ('sim.project_ittos', 'Simulator practice project ITTO instances', FALSE, TRUE, 'simulation')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
