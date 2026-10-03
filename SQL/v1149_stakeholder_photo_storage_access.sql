-- =============================================================================
-- v1149: Stop stakeholder photo uploads timing out (HTTP 544).
--
-- The browser POST to
--   /storage/v1/object/stakeholder-photos/...
-- returns 544. That is the Cloudflare gateway killing a storage rule that
-- calls public.user_has_access_to_account(). The same call hung profile
-- pictures until v1066 set row_security = off on that function.
--
-- Press Ctrl+A in the Supabase SQL editor, then Run, so every statement runs.
-- The last statement returns one row: policy name "Stakeholder photos: access".
-- =============================================================================

CREATE OR REPLACE FUNCTION public.user_has_access_to_account(p_account_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_uid UUID;
BEGIN
  SELECT id INTO v_uid FROM public.users WHERE auth_user_id = auth.uid();
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.accounts a
    WHERE a.id = p_account_id
      AND COALESCE(a.is_deleted, FALSE) = FALSE
      AND (
        a.owner_user_id = v_uid
        OR EXISTS (
          SELECT 1
          FROM public.organisation_invitations oi
          WHERE oi.organisation_id = p_account_id
            AND oi.invitation_status = 'accepted'
            AND COALESCE(oi.is_deleted, FALSE) = FALSE
            AND (
              oi.accepted_by_user_id = v_uid
              OR oi.invited_user_id = v_uid
            )
        )
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          INNER JOIN public.user_roles ur ON ur.project_id = p.id
          WHERE p.account_id = p_account_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND ur.user_id = v_uid
            AND ur.is_active = TRUE
            AND COALESCE(ur.is_deleted, FALSE) = FALSE
        )
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          INNER JOIN public.project_memberships pm ON pm.project_id = p.id
          WHERE p.account_id = p_account_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND pm.user_id = v_uid
            AND COALESCE(pm.is_active, TRUE) = TRUE
            AND pm.invitation_status = 'accepted'
        )
        OR EXISTS (
          SELECT 1
          FROM public.projects p
          INNER JOIN public.user_projects up ON up.project_id = p.id
          WHERE p.account_id = p_account_id
            AND COALESCE(p.is_deleted, FALSE) = FALSE
            AND up.user_id = v_uid
            AND COALESCE(up.is_deleted, FALSE) = FALSE
            AND COALESCE(up.is_active, TRUE) = TRUE
        )
      )
  );
END;
$$;

DO $v1149$
DECLARE
  pol record;
BEGIN
  PERFORM set_config('lock_timeout', '8s', true);

  INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  VALUES (
    'stakeholder-photos',
    'stakeholder-photos',
    false,
    2097152,
    ARRAY['image/png', 'image/jpeg', 'image/gif', 'image/webp']
  )
  ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

  FOR pol IN
    SELECT policyname
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND (
        policyname ILIKE '%stakeholder photo%'
        OR COALESCE(qual, '') ILIKE '%stakeholder-photos%'
        OR COALESCE(with_check, '') ILIKE '%stakeholder-photos%'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;

  EXECUTE $policy$
    CREATE POLICY "Stakeholder photos: access"
    ON storage.objects
    FOR ALL
    TO authenticated
    USING (bucket_id = 'stakeholder-photos')
    WITH CHECK (bucket_id = 'stakeholder-photos')
  $policy$;
END
$v1149$;

SELECT policyname
FROM pg_policies
WHERE schemaname = 'storage'
  AND tablename = 'objects'
  AND (
    policyname ILIKE '%stakeholder photo%'
    OR COALESCE(qual, '') ILIKE '%stakeholder-photos%'
    OR COALESCE(with_check, '') ILIKE '%stakeholder-photos%'
  )
ORDER BY policyname;
