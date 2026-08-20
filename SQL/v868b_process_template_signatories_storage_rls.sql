-- =============================================================================
-- v868b: Storage buckets + RLS for signatories (v868 PRD/plan).
--
-- Two buckets:
--   1) process-template-signatures — the signature image copied in at signing
--      time, one per (template_node_id, signing_round, slot_order). Path:
--      {platform|sim}/{template_node_id}/{signing_round}/{slot_order}/signature.{ext}
--      storage.foldername(name)[1]=mode, [2]=template_node_id, [3]=signing_round,
--      [4]=slot_order.
--   2) user-signatures — the personal saved-signature convenience asset. Path:
--      {auth_user_id}/signature.{ext}. storage.foldername(name)[1]=auth_user_id.
--
-- Buckets are created directly via INSERT INTO storage.buckets (the v866e
-- approach) rather than "create manually via Dashboard" instructions — that
-- manual step was the single biggest source of confusion/rework debugging
-- v867's rollout, so this file is self-sufficient from a fresh database.
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'process-template-signatures',
  'process-template-signatures',
  false,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'user-signatures',
  'user-signatures',
  false,
  2097152, -- 2MB
  ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/svg+xml', 'image/webp', 'application/octet-stream']
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- process-template-signatures — read: account access via node. write: ONLY
-- the assigned signatory for that exact pending slot (mirrors the table's
-- own two-tier design — this is the "Case B" half; there is no administrative
-- write path into this bucket, since only the signatory ever uploads here).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_can_write_signature_object(
    p_template_node_id UUID, p_signing_round INT, p_slot_order INT
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.process_template_document_signatories s
    JOIN public.users u ON u.id = s.assigned_user_id
    WHERE s.template_node_id = p_template_node_id
      AND s.signing_round = p_signing_round
      AND s.slot_order = p_slot_order
      AND s.status = 'pending'
      AND u.auth_user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM public.process_template_document_signatories prior
        WHERE prior.template_node_id = p_template_node_id
          AND prior.signing_round = p_signing_round
          AND prior.slot_order < p_slot_order
          AND prior.status <> 'signed'
      )
  );
$$;

CREATE OR REPLACE FUNCTION sim.auth_user_can_write_signature_object(
    p_template_node_id UUID, p_signing_round INT, p_slot_order INT
)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT EXISTS (
    SELECT 1 FROM sim.process_template_document_signatories s
    JOIN public.users u ON u.id = s.assigned_user_id
    WHERE s.template_node_id = p_template_node_id
      AND s.signing_round = p_signing_round
      AND s.slot_order = p_slot_order
      AND s.status = 'pending'
      AND u.auth_user_id = auth.uid()
      AND NOT EXISTS (
        SELECT 1 FROM sim.process_template_document_signatories prior
        WHERE prior.template_node_id = p_template_node_id
          AND prior.signing_round = p_signing_round
          AND prior.slot_order < p_slot_order
          AND prior.status <> 'signed'
      )
  );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_can_write_signature_object(UUID, INT, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_write_signature_object(UUID, INT, INT) TO authenticated;

DROP POLICY IF EXISTS "Platform: process-template-signatures via node access" ON storage.objects;
CREATE POLICY "Platform: process-template-signatures via node access"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'process-template-signatures'
    AND (storage.foldername(name))[1] = 'platform'
    AND public.auth_user_can_read_document_signatories(
      NULLIF((storage.foldername(name))[2], '')::uuid
    )
)
WITH CHECK (
    bucket_id = 'process-template-signatures'
    AND (storage.foldername(name))[1] = 'platform'
    AND public.auth_user_can_write_signature_object(
      NULLIF((storage.foldername(name))[2], '')::uuid,
      NULLIF((storage.foldername(name))[3], '')::int,
      NULLIF((storage.foldername(name))[4], '')::int
    )
);

DROP POLICY IF EXISTS "Simulator: process-template-signatures via node access" ON storage.objects;
CREATE POLICY "Simulator: process-template-signatures via node access"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'process-template-signatures'
    AND (storage.foldername(name))[1] = 'sim'
    AND sim.auth_user_can_read_document_signatories(
      NULLIF((storage.foldername(name))[2], '')::uuid
    )
)
WITH CHECK (
    bucket_id = 'process-template-signatures'
    AND (storage.foldername(name))[1] = 'sim'
    AND sim.auth_user_can_write_signature_object(
      NULLIF((storage.foldername(name))[2], '')::uuid,
      NULLIF((storage.foldername(name))[3], '')::int,
      NULLIF((storage.foldername(name))[4], '')::int
    )
);

DROP POLICY IF EXISTS "PMO Admin: full access to process-template-signatures" ON storage.objects;
CREATE POLICY "PMO Admin: full access to process-template-signatures"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'process-template-signatures' AND public.is_pmo_admin_user())
WITH CHECK (bucket_id = 'process-template-signatures' AND public.is_pmo_admin_user());

-- ---------------------------------------------------------------------------
-- user-signatures — owner-only, both read and write. Simple direct auth.uid()
-- comparison to the path's first folder segment; no helper function needed
-- (no cross-schema lookup involved, unlike the bucket above).
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Own saved signature image" ON storage.objects;
CREATE POLICY "Own saved signature image"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'user-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'user-signatures'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

DO $$
BEGIN
  RAISE NOTICE 'v868b_process_template_signatories_storage_rls.sql applied — buckets ensured + SECURITY DEFINER write helpers wired';
END $$;
