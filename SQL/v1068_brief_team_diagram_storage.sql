-- =============================================================================
-- v1068: Storage bucket + RLS for Project Brief team-structure diagrams
--
-- Replaces the free-text "Team structure diagram URL" field with an upload/paste
-- image stored in private Supabase Storage. public.project_briefs.team_structure_diagram_url
-- holds the storage PATH (not a public URL); display uses short-lived signed URLs
-- (same pattern as user-avatars / user-signatures).
--
-- Path: {project_id}/{auth_user_id}/team-structure-diagram.{ext}
--   storage.foldername(name)[1] = project_id
--   storage.foldername(name)[2] = auth_user_id
--
-- Membership check uses public.project_memberships (not the legacy/non-existent
-- project_members name that appeared in older brief RLS drafts).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'brief-team-diagrams',
  'brief-team-diagrams',
  false,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Project members (or PMO / System Admin) can view diagrams for their projects
DROP POLICY IF EXISTS "Brief team diagram: project members can view" ON storage.objects;
CREATE POLICY "Brief team diagram: project members can view"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'brief-team-diagrams'
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

-- Owner can write/replace/delete their own path under a project they belong to
DROP POLICY IF EXISTS "Brief team diagram: owner can write" ON storage.objects;
CREATE POLICY "Brief team diagram: owner can write"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'brief-team-diagrams'
  AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'brief-team-diagrams'
  AND (storage.foldername(name))[2] = auth.uid()::text
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

DO $$
BEGIN
  RAISE NOTICE 'v1068_brief_team_diagram_storage.sql applied — brief-team-diagrams bucket + RLS ensured';
END $$;
