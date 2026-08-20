-- =============================================================================
-- v866e: Process-template attachments — bucket + bulletproof RLS
--
-- Live symptom (after v866d): storage POST …/object/process-template-attachments
-- returns 400 Bad Request / "new row violates row-level security policy" while
-- document field saves still work.
--
-- Root causes addressed:
--   1) Bucket often never created (v866b is policies-only). Missing bucket → 400.
--   2) Storage policies that JOIN pm_template_nodes under invoker RLS are fragile;
--      use SECURITY DEFINER helpers with row_security = off (same spirit as
--      auth_user_can_access_project) keyed by template_node_id from the path.
--   3) Align storage to FOR ALL (like v863b form-field-attachments) so INSERT/
--      SELECT/UPDATE/DELETE share one clear WITH CHECK / USING.
--
-- Apply after: v866, v866b, v866d (safe to re-run; idempotent).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1) Ensure bucket exists (10MB, private, MIME allowlist + octet-stream fallback)
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'process-template-attachments',
  'process-template-attachments',
  false,
  10485760,
  ARRAY[
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/svg+xml',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 2) SECURITY DEFINER helpers — lookup node by id without invoker RLS blocking
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.auth_user_can_write_process_template_attachment(p_template_node_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_template_node_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pm_template_nodes n
      WHERE n.id = p_template_node_id
        AND COALESCE(n.is_system_synced, FALSE) = FALSE
        AND public.user_has_access_to_account(n.account_id)
        AND (
          (
            n.scope_entity_type = 'project'
            AND n.scope_entity_id IS NOT NULL
            AND public.auth_user_can_access_project(n.scope_entity_id)
          )
          OR public.can_manage_pm_template_node(
            n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
          )
        )
    );
$$;

COMMENT ON FUNCTION public.auth_user_can_write_process_template_attachment(UUID) IS
  'TRUE if the caller may upload/manage process_template_attachments for this pm_template_nodes.id (v866e).';

CREATE OR REPLACE FUNCTION public.auth_user_can_read_process_template_attachment(p_template_node_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT
    p_template_node_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.pm_template_nodes n
      WHERE n.id = p_template_node_id
        AND public.user_has_access_to_account(n.account_id)
    );
$$;

CREATE OR REPLACE FUNCTION sim.auth_user_can_write_process_template_attachment(p_template_node_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT
    p_template_node_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM sim.pm_template_nodes n
      WHERE n.id = p_template_node_id
        AND COALESCE(n.is_system_synced, FALSE) = FALSE
        AND public.user_has_access_to_account(n.account_id)
        AND (
          (
            n.scope_entity_type = 'project'
            AND n.scope_entity_id IS NOT NULL
            AND sim.auth_user_can_access_practice_project(n.scope_entity_id)
          )
          OR sim.can_manage_pm_template_node(
            n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
          )
        )
    );
$$;

CREATE OR REPLACE FUNCTION sim.auth_user_can_read_process_template_attachment(p_template_node_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = sim, public
SET row_security = off
AS $$
  SELECT
    p_template_node_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM sim.pm_template_nodes n
      WHERE n.id = p_template_node_id
        AND public.user_has_access_to_account(n.account_id)
    );
$$;

GRANT EXECUTE ON FUNCTION public.auth_user_can_write_process_template_attachment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auth_user_can_read_process_template_attachment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_write_process_template_attachment(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION sim.auth_user_can_read_process_template_attachment(UUID) TO authenticated;

-- ---------------------------------------------------------------------------
-- 3) Table RLS — public + sim
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_process_template_attachments_select ON public.process_template_attachments;
CREATE POLICY policy_process_template_attachments_select
    ON public.process_template_attachments FOR SELECT TO authenticated
    USING (public.auth_user_can_read_process_template_attachment(template_node_id));

DROP POLICY IF EXISTS policy_process_template_attachments_write ON public.process_template_attachments;
CREATE POLICY policy_process_template_attachments_write
    ON public.process_template_attachments FOR ALL TO authenticated
    USING (public.auth_user_can_write_process_template_attachment(template_node_id))
    WITH CHECK (public.auth_user_can_write_process_template_attachment(template_node_id));

DROP POLICY IF EXISTS policy_sim_process_template_attachments_select ON sim.process_template_attachments;
CREATE POLICY policy_sim_process_template_attachments_select
    ON sim.process_template_attachments FOR SELECT TO authenticated
    USING (sim.auth_user_can_read_process_template_attachment(template_node_id));

DROP POLICY IF EXISTS policy_sim_process_template_attachments_write ON sim.process_template_attachments;
CREATE POLICY policy_sim_process_template_attachments_write
    ON sim.process_template_attachments FOR ALL TO authenticated
    USING (sim.auth_user_can_write_process_template_attachment(template_node_id))
    WITH CHECK (sim.auth_user_can_write_process_template_attachment(template_node_id));

-- ---------------------------------------------------------------------------
-- 4) Storage RLS — drop prior named policies, replace with FOR ALL helpers
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Platform: view process-template-attachments via account access" ON storage.objects;
DROP POLICY IF EXISTS "Simulator: view process-template-attachments via account access" ON storage.objects;
DROP POLICY IF EXISTS "Platform: manage process-template-attachments via node management" ON storage.objects;
DROP POLICY IF EXISTS "Platform: delete process-template-attachments via node management" ON storage.objects;
DROP POLICY IF EXISTS "Simulator: manage process-template-attachments via node management" ON storage.objects;
DROP POLICY IF EXISTS "Simulator: delete process-template-attachments via node management" ON storage.objects;
DROP POLICY IF EXISTS "PMO Admin: full access to process-template-attachments" ON storage.objects;
DROP POLICY IF EXISTS "Platform: process-template-attachments via node access" ON storage.objects;
DROP POLICY IF EXISTS "Simulator: process-template-attachments via node access" ON storage.objects;

-- Path: {platform|sim}/{template_node_id}/...
-- storage.foldername(name)[1] = mode, [2] = template_node_id text
CREATE POLICY "Platform: process-template-attachments via node access"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'platform'
    AND public.auth_user_can_read_process_template_attachment(
      NULLIF((storage.foldername(name))[2], '')::uuid
    )
)
WITH CHECK (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'platform'
    AND public.auth_user_can_write_process_template_attachment(
      NULLIF((storage.foldername(name))[2], '')::uuid
    )
);

CREATE POLICY "Simulator: process-template-attachments via node access"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'sim'
    AND sim.auth_user_can_read_process_template_attachment(
      NULLIF((storage.foldername(name))[2], '')::uuid
    )
)
WITH CHECK (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'sim'
    AND sim.auth_user_can_write_process_template_attachment(
      NULLIF((storage.foldername(name))[2], '')::uuid
    )
);

-- PMO Admin full access (belt-and-braces; helpers already include PMO via can_manage /
-- auth_user_can_access_project → is_pmo_admin_user, but keep explicit storage path)
CREATE POLICY "PMO Admin: full access to process-template-attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'process-template-attachments'
    AND EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND r.role_name = 'pmo_admin'
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
          AND r.is_deleted = FALSE
    )
)
WITH CHECK (
    bucket_id = 'process-template-attachments'
    AND EXISTS (
        SELECT 1
        FROM public.user_roles ur
        INNER JOIN public.roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM public.users WHERE auth_user_id = auth.uid())
          AND r.role_name = 'pmo_admin'
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
          AND r.is_deleted = FALSE
    )
);

DO $$
BEGIN
  RAISE NOTICE 'v866e_process_template_attachments_bucket_and_rls.sql applied — bucket ensured + SECURITY DEFINER write helpers wired';
END $$;
