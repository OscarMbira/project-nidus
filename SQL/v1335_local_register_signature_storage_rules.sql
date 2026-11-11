-- ============================================================================
-- v1335: Register document sign-off — re-apply the signature storage rules (from v1318)
-- ============================================================================
-- v1334 showed that the v1318 storage rules for local-register-attachments were missing in the
-- database (thumbnails and previews could not load until they were re-applied). The same v1318
-- section also created the rules for the local-register-signatures bucket, so this re-applies
-- them before anyone signs a document: signers upload their signature image, viewers of the
-- record can see it. Identical to v1318; idempotent.
-- ============================================================================

DROP POLICY IF EXISTS "Platform: read local-register-signatures via record access" ON storage.objects;
CREATE POLICY "Platform: read local-register-signatures via record access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_can_access_local_register_record(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Platform: upload local-register-signatures as pending signatory" ON storage.objects;
CREATE POLICY "Platform: upload local-register-signatures as pending signatory"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Platform: replace local-register-signatures as pending signatory" ON storage.objects;
CREATE POLICY "Platform: replace local-register-signatures as pending signatory"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
)
WITH CHECK (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Simulator: read local-register-signatures via record access" ON storage.objects;
CREATE POLICY "Simulator: read local-register-signatures via record access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_can_access_local_register_record(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Simulator: upload local-register-signatures as pending signatory" ON storage.objects;
CREATE POLICY "Simulator: upload local-register-signatures as pending signatory"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Simulator: replace local-register-signatures as pending signatory" ON storage.objects;
CREATE POLICY "Simulator: replace local-register-signatures as pending signatory"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
)
WITH CHECK (
  bucket_id = 'local-register-signatures'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_is_pending_local_register_signatory(NULLIF((storage.foldername(name))[2], '')::uuid)
);

SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND (qual ILIKE '%local-register-%' OR with_check ILIKE '%local-register-%')
ORDER BY policyname;
