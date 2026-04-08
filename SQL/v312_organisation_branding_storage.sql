-- ============================================================
-- v312: Organisation Branding – Supabase Storage Bucket
-- Creates the 'organisation-branding' storage bucket and
-- access policies for brand asset uploads.
-- ============================================================

-- Create the storage bucket (public read so logos render in browser)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'organisation-branding',
  'organisation-branding',
  true,   -- public bucket: logos/images must be accessible without auth
  5242880, -- 5 MB global limit (individual limits enforced in application layer)
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/svg+xml',
    'image/x-icon',
    'image/vnd.microsoft.icon'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ──────────────────────────────────────────
-- Storage Policies
-- ──────────────────────────────────────────

-- SELECT (public read): Anyone can view uploaded brand assets
-- This is necessary for logos to render for all users including unauthenticated visitors
CREATE POLICY "organisation_branding_storage_public_read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'organisation-branding');

-- INSERT: Authenticated users can upload to their own account folder
-- Folder structure: organisation-branding/{account_id}/{asset_type}.{ext}
CREATE POLICY "organisation_branding_storage_insert_auth"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'organisation-branding'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- UPDATE: pmo_admin / super_admin can replace existing assets
CREATE POLICY "organisation_branding_storage_update_admin"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'organisation-branding'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );

-- DELETE: pmo_admin / super_admin can remove brand assets
CREATE POLICY "organisation_branding_storage_delete_admin"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'organisation-branding'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      WHERE ur.user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'super_admin', 'org_admin')
        AND (ur.is_deleted = false OR ur.is_deleted IS NULL)
    )
  );
