-- ============================================================================
-- v440: ITTO — project-specific instances (public.project_ittos)
-- Prerequisites: v439, projects, auth_user_can_access_project (v406), user_roles, roles
-- ============================================================================

CREATE OR REPLACE FUNCTION public.itto_user_has_write_role_on_project(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_roles ur
      INNER JOIN public.roles r ON r.id = ur.role_id
      INNER JOIN public.users u ON u.id = ur.user_id
      WHERE ur.project_id = p_project_id
        AND u.auth_user_id = auth.uid()
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND r.role_name IN (
          'project_manager',
          'team_lead',
          'team_manager',
          'pm_team_manager'
        )
    );
$$;

CREATE OR REPLACE FUNCTION public.itto_user_can_delete_project_itto(p_project_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_project_id IS NOT NULL
    AND (
      EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE ur.project_id = p_project_id
          AND u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND r.role_name IN ('project_manager')
      )
      OR EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON r.id = ur.role_id
        INNER JOIN public.users u ON u.id = ur.user_id
        WHERE u.auth_user_id = auth.uid()
          AND ur.is_active = TRUE
          AND COALESCE(ur.is_deleted, FALSE) = FALSE
          AND ur.project_id IS NULL
          AND r.role_name IN ('system_admin', 'System Admin', 'super_admin', 'Super Admin')
      )
    );
$$;

COMMENT ON FUNCTION public.itto_user_has_write_role_on_project(UUID) IS
  'v352: PM / team lead / team managers may create or update project ITTOs.';
COMMENT ON FUNCTION public.itto_user_can_delete_project_itto(UUID) IS
  'v352: Project managers (and global system admins) may delete project ITTOs.';

CREATE TABLE IF NOT EXISTS public.project_ittos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  template_id UUID REFERENCES public.itto_templates(id) ON DELETE SET NULL,
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

CREATE INDEX IF NOT EXISTS idx_project_ittos_project ON public.project_ittos(project_id);
CREATE INDEX IF NOT EXISTS idx_project_ittos_template ON public.project_ittos(template_id);
CREATE INDEX IF NOT EXISTS idx_project_ittos_status ON public.project_ittos(status);
CREATE INDEX IF NOT EXISTS idx_project_ittos_draft ON public.project_ittos(is_draft) WHERE is_draft = TRUE;

ALTER TABLE public.project_ittos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_ittos_select ON public.project_ittos;
CREATE POLICY project_ittos_select ON public.project_ittos
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.projects pr
      WHERE pr.id = project_id
        AND COALESCE(pr.is_deleted, FALSE) = FALSE
        AND public.user_has_access_to_account(pr.account_id)
    )
  );

DROP POLICY IF EXISTS project_ittos_insert ON public.project_ittos;
CREATE POLICY project_ittos_insert ON public.project_ittos
  FOR INSERT TO authenticated
  WITH CHECK (
    public.auth_user_can_access_project(project_id)
    AND public.itto_user_has_write_role_on_project(project_id)
  );

DROP POLICY IF EXISTS project_ittos_update ON public.project_ittos;
CREATE POLICY project_ittos_update ON public.project_ittos
  FOR UPDATE TO authenticated
  USING (
    public.auth_user_can_access_project(project_id)
    AND public.itto_user_has_write_role_on_project(project_id)
  )
  WITH CHECK (
    public.auth_user_can_access_project(project_id)
    AND public.itto_user_has_write_role_on_project(project_id)
  );

DROP POLICY IF EXISTS project_ittos_delete ON public.project_ittos;
CREATE POLICY project_ittos_delete ON public.project_ittos
  FOR DELETE TO authenticated
  USING (
    public.auth_user_can_access_project(project_id)
    AND public.itto_user_can_delete_project_itto(project_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_ittos TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  ('project_ittos', 'Project-scoped ITTO instances (from templates or standalone)', FALSE, TRUE, 'governance')
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  table_category = EXCLUDED.table_category,
  updated_at = NOW();
