-- =============================================================================
-- v866b: Storage RLS for the 'process-template-attachments' bucket (v867 PRD/plan).
--
-- MANUAL STEP FIRST (same as v863b): create a bucket named
-- 'process-template-attachments' via the Supabase Dashboard or JS API — private,
-- 10MB file size limit, same MIME allowlist as v863b (images + pdf/doc(x)/xls(x)/ppt(x)).
--
-- Path convention: {platform|sim}/{template_node_id}/{attachment_group_id}-v{version}-{filename}
-- storage.foldername(name)[1] = mode, [2] = template_node_id (text form of the uuid).
--
-- Write policies use auth_user_can_access_project / auth_user_can_access_practice_project
-- for project-scoped nodes (same as v863b / v866d) — never user_projects.user_id = auth.uid().
-- =============================================================================

-- SELECT (preview/download signed URLs): matches the table's broader SELECT policy —
-- anyone with account access, not just the tier manager who can write.
DROP POLICY IF EXISTS "Platform: view process-template-attachments via account access" ON storage.objects;
CREATE POLICY "Platform: view process-template-attachments via account access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'platform'
    AND EXISTS (
        SELECT 1 FROM public.pm_template_nodes n
        WHERE n.id::text = (storage.foldername(name))[2]
          AND public.user_has_access_to_account(n.account_id)
    )
);

DROP POLICY IF EXISTS "Simulator: view process-template-attachments via account access" ON storage.objects;
CREATE POLICY "Simulator: view process-template-attachments via account access"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'sim'
    AND EXISTS (
        SELECT 1 FROM sim.pm_template_nodes n
        WHERE n.id::text = (storage.foldername(name))[2]
          AND public.user_has_access_to_account(n.account_id)
    )
);

DROP POLICY IF EXISTS "Platform: manage process-template-attachments via node management" ON storage.objects;
CREATE POLICY "Platform: manage process-template-attachments via node management"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'platform'
    AND EXISTS (
        SELECT 1 FROM public.pm_template_nodes n
        WHERE n.id::text = (storage.foldername(name))[2]
          AND (
              (
                  n.scope_entity_type = 'project'
                  AND public.auth_user_can_access_project(n.scope_entity_id)
              )
              OR public.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
          )
    )
);

DROP POLICY IF EXISTS "Platform: delete process-template-attachments via node management" ON storage.objects;
CREATE POLICY "Platform: delete process-template-attachments via node management"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'platform'
    AND EXISTS (
        SELECT 1 FROM public.pm_template_nodes n
        WHERE n.id::text = (storage.foldername(name))[2]
          AND (
              (
                  n.scope_entity_type = 'project'
                  AND public.auth_user_can_access_project(n.scope_entity_id)
              )
              OR public.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
          )
    )
);

DROP POLICY IF EXISTS "Simulator: manage process-template-attachments via node management" ON storage.objects;
CREATE POLICY "Simulator: manage process-template-attachments via node management"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'sim'
    AND EXISTS (
        SELECT 1 FROM sim.pm_template_nodes n
        WHERE n.id::text = (storage.foldername(name))[2]
          AND (
              (
                  n.scope_entity_type = 'project'
                  AND sim.auth_user_can_access_practice_project(n.scope_entity_id)
              )
              OR sim.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
          )
    )
);

DROP POLICY IF EXISTS "Simulator: delete process-template-attachments via node management" ON storage.objects;
CREATE POLICY "Simulator: delete process-template-attachments via node management"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'process-template-attachments'
    AND (storage.foldername(name))[1] = 'sim'
    AND EXISTS (
        SELECT 1 FROM sim.pm_template_nodes n
        WHERE n.id::text = (storage.foldername(name))[2]
          AND (
              (
                  n.scope_entity_type = 'project'
                  AND sim.auth_user_can_access_practice_project(n.scope_entity_id)
              )
              OR sim.can_manage_pm_template_node(
                  n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
              )
          )
    )
);

-- PMO Admin: full access regardless of tier/scope (matches v150/v863b pattern).
DROP POLICY IF EXISTS "PMO Admin: full access to process-template-attachments" ON storage.objects;
CREATE POLICY "PMO Admin: full access to process-template-attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'process-template-attachments'
    AND EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
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
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
          AND r.role_name = 'pmo_admin'
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
          AND r.is_deleted = FALSE
    )
);

DO $$
BEGIN
  RAISE NOTICE 'v866b_process_template_attachments_storage_rls.sql applied — remember to create the process-template-attachments bucket manually (see header).';
END $$;
