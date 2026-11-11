-- ============================================================================
-- v1334: Register document attachments — storage access check (+ re-apply the storage rules)
-- ============================================================================
-- Owner report 2026-10-24: on LREG-2026-105 the attachment thumbnails show a file icon and the
-- preview never loads — the browser could not get a temporary link to the stored file.
-- The rows and the files exist, and the user can see the attachment list, so this checks the
-- storage side:
--   1. Re-applies the v1318 storage rules for local-register-attachments (idempotent).
--   2. Shows the storage rules on the bucket.
--   3. Repeats the browser's check as the user (Oscar Mbira) inside a transaction that is rolled
--      back: how many of the record's files storage would let the user open.
-- Run the whole file in the Supabase SQL editor and send the two result tables back.
-- ============================================================================

-- ── 1. Re-apply the attachment storage rules (same as v1318) ─────────────────────
DROP POLICY IF EXISTS "Platform: local-register-attachments via record access" ON storage.objects;
CREATE POLICY "Platform: local-register-attachments via record access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'local-register-attachments'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_can_access_local_register_record(NULLIF((storage.foldername(name))[2], '')::uuid)
)
WITH CHECK (
  bucket_id = 'local-register-attachments'
  AND (storage.foldername(name))[1] = 'platform'
  AND public.auth_user_can_write_local_register_attachment(NULLIF((storage.foldername(name))[2], '')::uuid)
);

DROP POLICY IF EXISTS "Simulator: local-register-attachments via record access" ON storage.objects;
CREATE POLICY "Simulator: local-register-attachments via record access"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'local-register-attachments'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_can_access_local_register_record(NULLIF((storage.foldername(name))[2], '')::uuid)
)
WITH CHECK (
  bucket_id = 'local-register-attachments'
  AND (storage.foldername(name))[1] = 'sim'
  AND sim.auth_user_can_write_local_register_attachment(NULLIF((storage.foldername(name))[2], '')::uuid)
);

-- ── 2. Storage rules that mention the bucket ─────────────────────────────────────
SELECT policyname, cmd, roles
FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND (qual ILIKE '%local-register-attachments%' OR with_check ILIKE '%local-register-attachments%');

-- ── 3. The browser's check, as the user (rolled back) ──────────────────────────────
BEGIN;
SELECT set_config('request.jwt.claims',
  '{"sub":"de3b5bd9-2315-4b91-975e-2dfc9f4710f2","role":"authenticated"}', TRUE);
SET LOCAL ROLE authenticated;
SELECT
  public.auth_user_can_access_local_register_record('00000000-0000-4000-a00c-000000000001'::uuid) AS user_can_access_record,
  (SELECT COUNT(*) FROM storage.objects
    WHERE bucket_id = 'local-register-attachments'
      AND name LIKE 'platform/00000000-0000-4000-a00c-000000000001/%') AS files_user_can_open;
ROLLBACK;
