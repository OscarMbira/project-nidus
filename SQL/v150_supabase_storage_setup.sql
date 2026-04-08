-- ================================================
-- File: v150_supabase_storage_setup.sql
-- Description: Supabase Storage bucket setup and RLS policies for document governance
-- Version: 1.0
-- Date: 2026-01-08
-- Author: Development Team
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites:
-- - v146_document_governance_tables.sql must be run first
-- - Supabase project must be set up
-- - Storage API must be enabled

-- Purpose:
-- 1. Documents the creation of Supabase Storage buckets (via Dashboard or API)
-- 2. Creates RLS policies for storage bucket access control
-- 3. Configures MIME type restrictions and file size limits

-- Note: Storage buckets must be created via Supabase Dashboard or JavaScript API
--       This file provides the SQL for RLS policies only

-- ================================================
-- SECTION 1: STORAGE BUCKET CREATION INSTRUCTIONS
-- ================================================

/*
IMPORTANT: Storage buckets cannot be created via SQL alone.
You must create the buckets using one of these methods:

METHOD 1: Supabase Dashboard
1. Go to https://app.supabase.com/project/YOUR_PROJECT/storage/buckets
2. Click "New Bucket"
3. Create bucket: "project-documents"
   - Name: project-documents
   - Public: NO (private bucket)
   - File size limit: 52428800 (50MB)
   - Allowed MIME types: application/pdf, application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/msword, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel, text/markdown, text/plain, image/png, image/jpeg, image/tiff, image/gif, image/svg+xml, application/zip, application/x-rar-compressed, application/vnd.openxmlformats-officedocument.presentationml.presentation, text/csv, application/json

4. Repeat for bucket: "programme-documents"
   - Same settings as above

METHOD 2: JavaScript/TypeScript (supabase-js)
```javascript
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

// Create project-documents bucket
await supabase.storage.createBucket('project-documents', {
  public: false,
  fileSizeLimit: 52428800, // 50MB
  allowedMimeTypes: [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
    'application/msword', // .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel', // .xls
    'text/markdown',
    'text/plain',
    'image/png',
    'image/jpeg',
    'image/tiff',
    'image/gif',
    'image/svg+xml',
    'application/zip',
    'application/x-rar-compressed',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
    'text/csv',
    'application/json'
  ]
})

// Create programme-documents bucket
await supabase.storage.createBucket('programme-documents', {
  public: false,
  fileSizeLimit: 52428800,
  allowedMimeTypes: [...] // same as above
})
```

FOLDER STRUCTURE:
Buckets use this folder structure:
- project-documents/{project_id}/{document_type_id}/{version}/{uuid}_{filename}
- programme-documents/{programme_id}/{document_type_id}/{version}/{uuid}_{filename}
*/

-- ================================================
-- SECTION 2: STORAGE RLS POLICIES
-- ================================================

-- Note: Supabase Storage uses the storage.objects table for RLS
-- Policies control SELECT (download), INSERT (upload), UPDATE, DELETE operations

-- ================================================
-- POLICY SET 1: project-documents bucket
-- ================================================

-- Policy 1.1: PMO Admin can do everything (full access)
CREATE POLICY "PMO Admin: Full access to project-documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'project-documents'
    AND EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    )
)
WITH CHECK (
    bucket_id = 'project-documents'
    AND EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    )
);

-- Policy 1.2: Project Manager can upload/download own project documents
CREATE POLICY "PM: Upload/Download own project documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'project-documents'
    AND (
        -- PM can access files in their own projects
        (storage.foldername(name))[1] IN (
            SELECT p.id::TEXT
            FROM projects p
            INNER JOIN user_roles ur ON ur.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            INNER JOIN roles r ON ur.role_id = r.id
            WHERE p.id = ur.project_id
            AND r.role_name IN ('project_manager', 'project_executive')
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND p.is_deleted = FALSE
        )
    )
)
WITH CHECK (
    bucket_id = 'project-documents'
    AND (
        (storage.foldername(name))[1] IN (
            SELECT p.id::TEXT
            FROM projects p
            INNER JOIN user_roles ur ON ur.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            INNER JOIN roles r ON ur.role_id = r.id
            WHERE p.id = ur.project_id
            AND r.role_name IN ('project_manager', 'project_executive')
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND p.is_deleted = FALSE
        )
    )
);

-- Policy 1.3: Executive can download (read-only) assigned project documents
CREATE POLICY "Executive: Download assigned project documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'project-documents'
    AND (
        -- Executive can download files from assigned projects
        (storage.foldername(name))[1] IN (
            SELECT pa.project_id::TEXT
            FROM project_assignments pa
            INNER JOIN users u ON pa.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
            AND pa.assignment_type = 'EXECUTIVE'
            AND pa.is_active = TRUE
            AND pa.is_deleted = FALSE
        )
    )
);

-- Policy 1.4: Team members can download documents from their projects
CREATE POLICY "Team: Download project documents"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'project-documents'
    AND (
        (storage.foldername(name))[1] IN (
            SELECT ur.project_id::TEXT
            FROM user_roles ur
            WHERE ur.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
    )
);

-- ================================================
-- POLICY SET 2: programme-documents bucket
-- ================================================

-- Policy 2.1: PMO Admin can do everything
CREATE POLICY "PMO Admin: Full access to programme-documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'programme-documents'
    AND EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    )
)
WITH CHECK (
    bucket_id = 'programme-documents'
    AND EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (
            SELECT id FROM users WHERE auth_user_id = auth.uid()
        )
        AND r.role_name = 'pmo_admin'
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
        AND r.is_deleted = FALSE
    )
);

-- Policy 2.2: Programme Manager can upload/download own programme documents
CREATE POLICY "Programme Manager: Upload/Download own programme documents"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'programme-documents'
    AND (
        (storage.foldername(name))[1] IN (
            SELECT prog.id::TEXT
            FROM programmes prog
            WHERE prog.programme_manager_user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND prog.is_deleted = FALSE
        )
    )
)
WITH CHECK (
    bucket_id = 'programme-documents'
    AND (
        (storage.foldername(name))[1] IN (
            SELECT prog.id::TEXT
            FROM programmes prog
            WHERE prog.programme_manager_user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND prog.is_deleted = FALSE
        )
    )
);

-- Policy 2.3: Users can download programme documents for their projects
CREATE POLICY "Users: Download programme documents for their projects"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'programme-documents'
    AND (
        (storage.foldername(name))[1] IN (
            SELECT pp.programme_id::TEXT
            FROM programme_projects pp
            INNER JOIN user_roles ur ON ur.project_id = pp.project_id
            WHERE ur.user_id IN (
                SELECT id FROM users WHERE auth_user_id = auth.uid()
            )
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
            AND pp.is_deleted = FALSE
        )
    )
);

-- ================================================
-- SECTION 3: HELPER FUNCTIONS FOR STORAGE
-- ================================================

-- Function to get file MIME type from extension
CREATE OR REPLACE FUNCTION get_mime_type_from_extension(
    p_file_extension VARCHAR(10)
)
RETURNS VARCHAR(100)
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN CASE LOWER(p_file_extension)
        WHEN 'pdf' THEN 'application/pdf'
        WHEN 'docx' THEN 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        WHEN 'doc' THEN 'application/msword'
        WHEN 'xlsx' THEN 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        WHEN 'xls' THEN 'application/vnd.ms-excel'
        WHEN 'md' THEN 'text/markdown'
        WHEN 'txt' THEN 'text/plain'
        WHEN 'png' THEN 'image/png'
        WHEN 'jpg' THEN 'image/jpeg'
        WHEN 'jpeg' THEN 'image/jpeg'
        WHEN 'tiff' THEN 'image/tiff'
        WHEN 'tif' THEN 'image/tiff'
        WHEN 'gif' THEN 'image/gif'
        WHEN 'svg' THEN 'image/svg+xml'
        WHEN 'zip' THEN 'application/zip'
        WHEN 'rar' THEN 'application/x-rar-compressed'
        WHEN 'pptx' THEN 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        WHEN 'csv' THEN 'text/csv'
        WHEN 'json' THEN 'application/json'
        ELSE 'application/octet-stream'
    END;
END;
$$;

COMMENT ON FUNCTION get_mime_type_from_extension IS 'Returns MIME type for a given file extension';

-- Function to validate file extension
CREATE OR REPLACE FUNCTION is_allowed_file_extension(
    p_file_extension VARCHAR(10)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    RETURN LOWER(p_file_extension) IN (
        'pdf', 'docx', 'doc', 'xlsx', 'xls', 'md', 'txt',
        'png', 'jpg', 'jpeg', 'tiff', 'tif', 'gif', 'svg',
        'zip', 'rar', 'pptx', 'csv', 'json'
    );
END;
$$;

COMMENT ON FUNCTION is_allowed_file_extension IS 'Returns TRUE if file extension is allowed for upload';

-- Function to format file size for display
CREATE OR REPLACE FUNCTION format_file_size(
    p_bytes BIGINT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    IF p_bytes IS NULL THEN
        RETURN '0 B';
    ELSIF p_bytes < 1024 THEN
        RETURN p_bytes || ' B';
    ELSIF p_bytes < 1048576 THEN
        RETURN ROUND(p_bytes::DECIMAL / 1024, 2) || ' KB';
    ELSIF p_bytes < 1073741824 THEN
        RETURN ROUND(p_bytes::DECIMAL / 1048576, 2) || ' MB';
    ELSE
        RETURN ROUND(p_bytes::DECIMAL / 1073741824, 2) || ' GB';
    END IF;
END;
$$;

COMMENT ON FUNCTION format_file_size IS 'Formats file size in bytes to human-readable format (B, KB, MB, GB)';

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_policies_count INTEGER;
    v_functions_count INTEGER;
BEGIN
    -- Count RLS policies created
    SELECT COUNT(*)
    INTO v_policies_count
    FROM pg_policies
    WHERE schemaname = 'storage'
        AND tablename = 'objects'
        AND policyname LIKE '%project-documents%'
        OR policyname LIKE '%programme-documents%';

    -- Count helper functions
    SELECT COUNT(*)
    INTO v_functions_count
    FROM pg_proc
    WHERE proname IN ('get_mime_type_from_extension', 'is_allowed_file_extension', 'format_file_size');

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Supabase Storage Setup Completed';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'RLS Policies Created: %', v_policies_count;
    RAISE NOTICE 'Helper Functions Created: %', v_functions_count;
    RAISE NOTICE '================================================';
    RAISE NOTICE 'IMPORTANT: Storage buckets must be created manually!';
    RAISE NOTICE 'Create buckets via Supabase Dashboard or JavaScript API:';
    RAISE NOTICE '1. project-documents (private, 50MB limit)';
    RAISE NOTICE '2. programme-documents (private, 50MB limit)';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'Allowed file extensions:';
    RAISE NOTICE 'Documents: pdf, docx, doc, xlsx, xls, md, txt';
    RAISE NOTICE 'Images: png, jpg, jpeg, tiff, tif, gif, svg';
    RAISE NOTICE 'Archives: zip, rar';
    RAISE NOTICE 'Others: pptx, csv, json';
    RAISE NOTICE '================================================';
    RAISE NOTICE 'v150_supabase_storage_setup.sql completed successfully';
    RAISE NOTICE '================================================';
END $$;

-- ================================================
-- END OF FILE
-- ================================================
