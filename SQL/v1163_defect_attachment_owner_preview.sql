-- ============================================================================
-- Defect photo previews — owner can always read their upload
-- Version: v1163
--
-- Signed preview URLs are refused when storage SELECT does not match the
-- caller. Uploads set storage.objects.owner to auth.uid(), so the uploader
-- can preview immediately. Project members can preview via membership too.
-- Run this in the Supabase SQL editor.
-- ============================================================================

DROP POLICY IF EXISTS policy_defect_attachments_storage_select ON storage.objects;
CREATE POLICY policy_defect_attachments_storage_select
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'defect-attachments'
        AND (
            owner = auth.uid()
            OR EXISTS (
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
        )
    );

DROP POLICY IF EXISTS policy_sim_defect_attachments_select ON storage.objects;
CREATE POLICY policy_sim_defect_attachments_select
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'sim-defect-attachments'
        AND (
            owner = auth.uid()
            OR EXISTS (
                SELECT 1
                FROM sim.practice_projects pp
                WHERE pp.user_id = sim.get_current_user_id()
                  AND pp.id::text = split_part(storage.objects.name, '/', 1)
                  AND COALESCE(pp.is_deleted, false) = false
            )
        )
    );
