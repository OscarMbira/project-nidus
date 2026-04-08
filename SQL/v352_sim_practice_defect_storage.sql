-- ============================================================================
-- Simulator — Practice defect attachments storage bucket
-- Version: v352
-- Date: 2026-03-27
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'sim-defect-attachments',
    'sim-defect-attachments',
    FALSE,
    10485760,
    ARRAY[
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp',
        'image/gif',
        'application/pdf'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    file_size_limit    = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS policy_sim_defect_attachments_select ON storage.objects;
CREATE POLICY policy_sim_defect_attachments_select
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'sim-defect-attachments'
        AND EXISTS (
            SELECT 1 FROM sim.practice_defect_attachments da
            JOIN sim.practice_defects d ON da.defect_id = d.id
            JOIN sim.practice_projects pp ON pp.id = d.practice_project_id
            WHERE pp.user_id = sim.get_current_user_id()
              AND da.file_path = storage.objects.name
              AND COALESCE(d.is_deleted, false) = false
        )
    );

DROP POLICY IF EXISTS policy_sim_defect_attachments_insert ON storage.objects;
CREATE POLICY policy_sim_defect_attachments_insert
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'sim-defect-attachments'
        AND EXISTS (
            SELECT 1 FROM sim.practice_projects pp
            WHERE pp.user_id = sim.get_current_user_id()
              AND COALESCE(pp.is_deleted, false) = false
        )
    );

DROP POLICY IF EXISTS policy_sim_defect_attachments_delete ON storage.objects;
CREATE POLICY policy_sim_defect_attachments_delete
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'sim-defect-attachments'
        AND EXISTS (
            SELECT 1 FROM sim.practice_defect_attachments da
            JOIN sim.practice_defects d ON da.defect_id = d.id
            JOIN sim.practice_projects pp ON pp.id = d.practice_project_id
            WHERE pp.user_id = sim.get_current_user_id()
              AND da.file_path = storage.objects.name
        )
    );
