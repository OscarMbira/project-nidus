-- =============================================================================
-- v1098: Governance chart gallery — storage bucket + project_governance_charts
-- Prerequisites: v1020 (project_governance_structure / auth_user_can_access_project)
-- Path: {project_id}/{auth_user_id}/{uuid}.{ext}
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'governance-charts',
  'governance-charts',
  false,
  5242880, -- 5MB
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE TABLE IF NOT EXISTS public.project_governance_charts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  mime_type TEXT,
  file_size BIGINT,
  caption TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by UUID REFERENCES public.users(id),
  updated_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT project_governance_charts_storage_path_unique UNIQUE (storage_path)
);

CREATE INDEX IF NOT EXISTS idx_project_governance_charts_project
  ON public.project_governance_charts (project_id, sort_order, created_at);

ALTER TABLE public.project_governance_charts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS policy_project_governance_charts_select ON public.project_governance_charts;
CREATE POLICY policy_project_governance_charts_select ON public.project_governance_charts
  FOR SELECT TO authenticated
  USING (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_governance_charts_insert ON public.project_governance_charts;
CREATE POLICY policy_project_governance_charts_insert ON public.project_governance_charts
  FOR INSERT TO authenticated
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_governance_charts_update ON public.project_governance_charts;
CREATE POLICY policy_project_governance_charts_update ON public.project_governance_charts
  FOR UPDATE TO authenticated
  USING (public.auth_user_can_access_project(project_id))
  WITH CHECK (public.auth_user_can_access_project(project_id));

DROP POLICY IF EXISTS policy_project_governance_charts_delete ON public.project_governance_charts;
CREATE POLICY policy_project_governance_charts_delete ON public.project_governance_charts
  FOR DELETE TO authenticated
  USING (public.auth_user_can_access_project(project_id));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.project_governance_charts TO authenticated;

-- Storage: project members (or PMO / System Admin / account owner) can view
DROP POLICY IF EXISTS "Governance charts: project members can view" ON storage.objects;
CREATE POLICY "Governance charts: project members can view"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'governance-charts'
  AND (
    EXISTS (
      SELECT 1
      FROM public.project_memberships pm
      JOIN public.users u ON pm.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND pm.project_id = NULLIF((storage.foldername(name))[1], '')::uuid
        AND pm.is_active = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    )
    OR EXISTS (
      SELECT 1
      FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'System Admin', 'system_admin', 'account_owner')
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
        AND COALESCE(r.is_active, TRUE) = TRUE
        AND COALESCE(u.is_deleted, FALSE) = FALSE
    )
  )
);

DROP POLICY IF EXISTS "Governance charts: project members can insert" ON storage.objects;
CREATE POLICY "Governance charts: project members can insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'governance-charts'
  AND EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.users u ON pm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND pm.project_id = NULLIF((storage.foldername(name))[1], '')::uuid
      AND pm.is_active = TRUE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
  )
);

DROP POLICY IF EXISTS "Governance charts: project members can update" ON storage.objects;
CREATE POLICY "Governance charts: project members can update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'governance-charts'
  AND EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.users u ON pm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND pm.project_id = NULLIF((storage.foldername(name))[1], '')::uuid
      AND pm.is_active = TRUE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
  )
)
WITH CHECK (
  bucket_id = 'governance-charts'
  AND EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.users u ON pm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND pm.project_id = NULLIF((storage.foldername(name))[1], '')::uuid
      AND pm.is_active = TRUE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
  )
);

DROP POLICY IF EXISTS "Governance charts: project members can delete" ON storage.objects;
CREATE POLICY "Governance charts: project members can delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'governance-charts'
  AND EXISTS (
    SELECT 1
    FROM public.project_memberships pm
    JOIN public.users u ON pm.user_id = u.id
    WHERE u.auth_user_id = auth.uid()
      AND pm.project_id = NULLIF((storage.foldername(name))[1], '')::uuid
      AND pm.is_active = TRUE
      AND COALESCE(u.is_deleted, FALSE) = FALSE
  )
);

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'project_governance_charts',
  'Governance Structure chart/image/PDF gallery files per project (v1098)',
  false,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table;

DO $$
BEGIN
  RAISE NOTICE 'v1098: governance-charts bucket + project_governance_charts table/RLS applied';
END $$;
