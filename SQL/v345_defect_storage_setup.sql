-- ============================================================================
-- Defect Attachments — Supabase Storage Setup
-- Version: v345
-- Description: Creates the defect-attachments storage bucket and policies
-- Date: 2026-03-27
-- ============================================================================
--
-- Storage bucket: defect-attachments
-- Access: authenticated users who are project members
-- Max file size: enforced at application layer (10MB)
-- Allowed types: images (PNG, JPG, WEBP, GIF), PDF
-- Path pattern: {project_id}/{defect_id}/{filename}
--
-- ============================================================================

-- ============================================================================
-- SECTION 1: CREATE STORAGE BUCKET
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'defect-attachments',
    'defect-attachments',
    FALSE,                          -- Private bucket; use signed URLs
    10485760,                       -- 10 MB limit
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

-- ============================================================================
-- SECTION 2: STORAGE RLS POLICIES
-- ============================================================================

-- SELECT (download): project members can download attachments for their projects
DROP POLICY IF EXISTS policy_defect_attachments_storage_select ON storage.objects;
CREATE POLICY policy_defect_attachments_storage_select
    ON storage.objects FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'defect-attachments'
        AND EXISTS (
            SELECT 1 FROM defect_attachments da
            JOIN defects d ON da.defect_id = d.id
            JOIN user_projects up ON up.project_id = d.project_id
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND da.file_path   = storage.objects.name
              AND d.is_deleted   = FALSE
              AND up.is_deleted  = FALSE
        )
    );

-- INSERT (upload): project members can upload attachments
DROP POLICY IF EXISTS policy_defect_attachments_storage_insert ON storage.objects;
CREATE POLICY policy_defect_attachments_storage_insert
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'defect-attachments'
        AND EXISTS (
            SELECT 1 FROM user_projects up
            JOIN users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.is_deleted  = FALSE
        )
    );

-- DELETE: uploader or PM+ roles can delete their own attachments
DROP POLICY IF EXISTS policy_defect_attachments_storage_delete ON storage.objects;
CREATE POLICY policy_defect_attachments_storage_delete
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'defect-attachments'
        AND (
            owner = auth.uid()
            OR EXISTS (
                SELECT 1 FROM user_roles ur
                JOIN roles r ON ur.role_id = r.id
                JOIN users u ON ur.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND r.role_name IN ('pmo_admin','System Admin','project_manager')
                  AND ur.is_active   = TRUE
                  AND ur.is_deleted  = FALSE
            )
        )
    );
