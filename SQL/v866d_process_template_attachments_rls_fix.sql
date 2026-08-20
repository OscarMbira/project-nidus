-- =============================================================================
-- v866d: Fix process_template_attachments RLS (table + storage)
--
-- Bug: v866 / v866b write policies compared public.user_projects.user_id to
-- auth.uid(). user_projects.user_id is public.users.id (internal), not the auth
-- UUID — so Project Managers who can edit document content via
-- auth_user_can_access_project() still failed attachment upload/insert with
-- "new row violates row-level security policy" / storage 403.
--
-- Fix: for project-scoped nodes use the same helpers as form-field attachments
-- (v863b) and content-table parity (v841/v849):
--   public.auth_user_can_access_project(n.scope_entity_id)
--   sim.auth_user_can_access_practice_project(n.scope_entity_id)
-- Non-project scopes still use can_manage_pm_template_node().
--
-- Apply after: v866, v866b (and preferably v841 so the helpers are current).
-- Idempotent: DROP POLICY IF EXISTS + CREATE.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- public.process_template_attachments write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_process_template_attachments_write ON public.process_template_attachments;
CREATE POLICY policy_process_template_attachments_write
    ON public.process_template_attachments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = template_node_id
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
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = template_node_id
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

-- ---------------------------------------------------------------------------
-- sim.process_template_attachments write
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS policy_sim_process_template_attachments_write ON sim.process_template_attachments;
CREATE POLICY policy_sim_process_template_attachments_write
    ON sim.process_template_attachments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = template_node_id
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
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = template_node_id
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

-- ---------------------------------------------------------------------------
-- Storage INSERT/DELETE — Platform
-- ---------------------------------------------------------------------------
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

-- ---------------------------------------------------------------------------
-- Storage INSERT/DELETE — Simulator
-- ---------------------------------------------------------------------------
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

DO $$
BEGIN
  RAISE NOTICE 'v866d_process_template_attachments_rls_fix.sql applied — project-scoped writes use auth_user_can_access_project / auth_user_can_access_practice_project';
END $$;
