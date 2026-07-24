-- =============================================================================
-- v776f: Legacy structured lists (Track C) + RLS
-- Plan: projectplan/v775_legacy_template_upload_plan.md (v776 numbering)
-- Prerequisites: v776_legacy_document_templates_tables.sql
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.pmo_legacy_structured_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  list_type TEXT NOT NULL,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  pm_template_node_id UUID NULL REFERENCES public.pm_template_nodes(id) ON DELETE SET NULL,
  global_template_id UUID NULL,
  is_system_synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NULL REFERENCES public.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_plsl_list_type CHECK (
    list_type IN ('risk_register', 'raid_log', 'stakeholder_register', 'budget')
  ),
  CONSTRAINT chk_plsl_status CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT chk_plsl_rows_array CHECK (jsonb_typeof(rows) = 'array'),
  CONSTRAINT chk_plsl_version CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_plsl_account ON public.pmo_legacy_structured_lists (account_id);
CREATE INDEX IF NOT EXISTS idx_plsl_type ON public.pmo_legacy_structured_lists (list_type);
CREATE INDEX IF NOT EXISTS idx_plsl_status ON public.pmo_legacy_structured_lists (status);
CREATE INDEX IF NOT EXISTS idx_plsl_node ON public.pmo_legacy_structured_lists (pm_template_node_id);

COMMENT ON TABLE public.pmo_legacy_structured_lists IS
  'Track C: uploaded standalone risk/RAID/stakeholder/budget lists as structured JSONB rows.';

CREATE TABLE IF NOT EXISTS sim.pmo_legacy_structured_lists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL,
  title TEXT NOT NULL,
  list_type TEXT NOT NULL,
  rows JSONB NOT NULL DEFAULT '[]'::jsonb,
  column_mapping JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'draft',
  version INTEGER NOT NULL DEFAULT 1,
  pm_template_node_id UUID NULL,
  global_template_id UUID NULL,
  is_system_synced BOOLEAN NOT NULL DEFAULT FALSE,
  created_by UUID NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_sim_plsl_list_type CHECK (
    list_type IN ('risk_register', 'raid_log', 'stakeholder_register', 'budget')
  ),
  CONSTRAINT chk_sim_plsl_status CHECK (
    status IN ('draft', 'published', 'archived')
  ),
  CONSTRAINT chk_sim_plsl_rows_array CHECK (jsonb_typeof(rows) = 'array'),
  CONSTRAINT chk_sim_plsl_version CHECK (version >= 1)
);

CREATE INDEX IF NOT EXISTS idx_sim_plsl_account ON sim.pmo_legacy_structured_lists (account_id);

-- RLS public
ALTER TABLE public.pmo_legacy_structured_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plsl_select_published" ON public.pmo_legacy_structured_lists;
CREATE POLICY "plsl_select_published" ON public.pmo_legacy_structured_lists
  FOR SELECT USING (
    status = 'published'
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

DROP POLICY IF EXISTS "plsl_insert_pmo" ON public.pmo_legacy_structured_lists;
CREATE POLICY "plsl_insert_pmo" ON public.pmo_legacy_structured_lists
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

DROP POLICY IF EXISTS "plsl_update_pmo" ON public.pmo_legacy_structured_lists;
CREATE POLICY "plsl_update_pmo" ON public.pmo_legacy_structured_lists
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

DROP POLICY IF EXISTS "plsl_delete_pmo" ON public.pmo_legacy_structured_lists;
CREATE POLICY "plsl_delete_pmo" ON public.pmo_legacy_structured_lists
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','pmo_manager','platform_admin')
    )
  );

ALTER TABLE sim.pmo_legacy_structured_lists ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sim_plsl_select" ON sim.pmo_legacy_structured_lists;
CREATE POLICY "sim_plsl_select" ON sim.pmo_legacy_structured_lists
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "sim_plsl_write" ON sim.pmo_legacy_structured_lists;
CREATE POLICY "sim_plsl_write" ON sim.pmo_legacy_structured_lists
  FOR ALL TO authenticated
  USING (true)
  WITH CHECK (true);

DO $$
BEGIN
  RAISE NOTICE 'v776f_legacy_structured_lists.sql applied';
END $$;
