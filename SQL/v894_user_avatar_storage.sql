-- =============================================================================
-- v894: Storage bucket + RLS for user profile pictures (v894 PRD/plan).
--
-- public.users.avatar_url already exists (v03) but has never been wired up —
-- this stores the storage PATH there (not a public URL), since the bucket is
-- private and images are served via short-lived signed URLs (mirrors the
-- existing user-signatures pattern from v868b).
--
-- Path: {account_id}/{auth_user_id}/avatar.{ext}
--   storage.foldername(name)[1] = account_id, [2] = auth_user_id.
--
-- Unlike user-signatures (owner-only read — a signature is sensitive), an
-- avatar must be visible to any authenticated user in the same account (it's
-- shown in the header/wherever that person is referenced), so SELECT uses the
-- existing public.user_has_access_to_account() helper (v737) rather than a
-- bare auth.uid() folder match. Write stays owner-only + account-matched.
--
-- No new table: avatars have no per-image metadata to track beyond the path
-- already living in users.avatar_url, unlike user_signature_images (which
-- needed a dedicated table for account_id/mime_type/file_size bookkeeping).
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-avatars',
  'user-avatars',
  false,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "Avatar: account members can view" ON storage.objects;
CREATE POLICY "Avatar: account members can view"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'user-avatars'
    AND public.user_has_access_to_account(NULLIF((storage.foldername(name))[1], '')::uuid)
);

DROP POLICY IF EXISTS "Avatar: owner can write their own" ON storage.objects;
CREATE POLICY "Avatar: owner can write their own"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'user-avatars'
    AND (storage.foldername(name))[2] = auth.uid()::text
    AND public.user_has_access_to_account(NULLIF((storage.foldername(name))[1], '')::uuid)
);

DO $$
BEGIN
  RAISE NOTICE 'v894_user_avatar_storage.sql applied — user-avatars bucket + RLS ensured';
END $$;
