-- ============================================================================
-- v439: ITTO — organisation-level templates (public.itto_templates)
-- PostgreSQL 15+ / Supabase. Prerequisites: accounts, users, user_has_access_to_account (v403)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.itto_templates (
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

CREATE INDEX IF NOT EXISTS idx_itto_templates_org ON public.itto_templates(organisation_id);
CREATE INDEX IF NOT EXISTS idx_itto_templates_status ON public.itto_templates(status) WHERE status <> 'archived';
CREATE INDEX IF NOT EXISTS idx_itto_templates_process ON public.itto_templates(process_group);
CREATE INDEX IF NOT EXISTS idx_itto_templates_knowledge ON public.itto_templates(knowledge_area);

ALTER TABLE public.itto_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS itto_templates_select ON public.itto_templates;
CREATE POLICY itto_templates_select ON public.itto_templates
  FOR SELECT TO authenticated
  USING (
    COALESCE(organisation_id::text, '') <> ''
    AND public.user_has_access_to_account(organisation_id)
  );

DROP POLICY IF EXISTS itto_templates_insert ON public.itto_templates;
CREATE POLICY itto_templates_insert ON public.itto_templates
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS itto_templates_update ON public.itto_templates;
CREATE POLICY itto_templates_update ON public.itto_templates
  FOR UPDATE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  )
  WITH CHECK (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

DROP POLICY IF EXISTS itto_templates_delete ON public.itto_templates;
CREATE POLICY itto_templates_delete ON public.itto_templates
  FOR DELETE TO authenticated
  USING (
    public.user_has_access_to_account(organisation_id)
    AND public.is_pmo_admin_user()
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.itto_templates TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('itto_templates', 'Organisation-level ITTO (Inputs, Tools & Techniques, Outputs) templates', FALSE, TRUE, 'governance')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
