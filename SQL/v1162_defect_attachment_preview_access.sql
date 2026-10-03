-- ============================================================================
-- Defect photo previews — let project members read private attachment files
-- Version: v1162
--
-- The photo bucket is private. A signed preview only works when the signed-in
-- user can SELECT the storage object. The previous rule only matched
-- user_projects, so a member recorded in project_memberships could upload a
-- photo and then not load it.
-- Run this in the Supabase SQL editor.
-- ============================================================================

DROP POLICY IF EXISTS policy_defect_attachments_storage_select ON storage.objects;
CREATE POLICY policy_defect_attachments_storage_select
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'defect-attachments'
        AND EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.auth_user_id = auth.uid()
              AND (
                    EXISTS (
                        SELECT 1
                        FROM public.project_memberships pm
                        WHERE pm.user_id = u.id
                          AND pm.project_id::text = split_part(storage.objects.name, '/', 1)
                          AND COALESCE(pm.is_active, true) = true
                          AND pm.invitation_status = 'accepted'
                    )
                    OR EXISTS (
                        SELECT 1
                        FROM public.user_projects up
                        WHERE up.user_id = u.id
                          AND up.project_id::text = split_part(storage.objects.name, '/', 1)
                          AND COALESCE(up.is_deleted, false) = false
                    )
                  )
        )
    );

DROP POLICY IF EXISTS policy_sim_defect_attachments_select ON storage.objects;
CREATE POLICY policy_sim_defect_attachments_select
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'sim-defect-attachments'
        AND EXISTS (
            SELECT 1
            FROM sim.practice_projects pp
            WHERE pp.user_id = sim.get_current_user_id()
              AND pp.id::text = split_part(storage.objects.name, '/', 1)
              AND COALESCE(pp.is_deleted, false) = false
        )
    );
