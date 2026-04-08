-- ============================================================================
-- Lessons Log Storage Setup
-- Version: v171
-- Description: Supabase Storage policies for lesson attachments
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Sets up Supabase Storage bucket and policies for lesson attachments
--
-- Prerequisites:
-- - v169_lessons_log_enhancement.sql must be run first
-- - lesson_attachments table must exist
--
-- ============================================================================
-- SECTION 1: CREATE STORAGE BUCKET
-- ============================================================================

-- Create bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'lesson-attachments',
  'lesson-attachments',
  false,
  10485760, -- 10MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ]
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- SECTION 2: STORAGE POLICIES
-- ============================================================================

-- Policy 1: Users can upload lesson attachments
DROP POLICY IF EXISTS "Users can upload lesson attachments" ON storage.objects;
CREATE POLICY "Users can upload lesson attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'lesson-attachments'
  AND (storage.foldername(name))[1] IN (
    SELECT id::text
    FROM lessons_learned
    WHERE is_deleted = FALSE
  )
  AND EXISTS (
    SELECT 1 FROM lessons_learned l
    JOIN user_projects up ON l.project_id = up.project_id
    JOIN users u ON up.user_id = u.id
    WHERE l.id::text = (storage.foldername(name))[1]
      AND u.auth_user_id = auth.uid()
      AND up.is_deleted = FALSE
  )
);

-- Policy 2: Users can read lesson attachments
DROP POLICY IF EXISTS "Users can read lesson attachments" ON storage.objects;
CREATE POLICY "Users can read lesson attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'lesson-attachments'
  AND EXISTS (
    SELECT 1 FROM lessons_learned l
    WHERE l.id::text = (storage.foldername(name))[1]
      AND l.is_deleted = FALSE
      AND (
        EXISTS (
          SELECT 1 FROM user_projects up
          JOIN users u ON up.user_id = u.id
          WHERE up.project_id = l.project_id
            AND u.auth_user_id = auth.uid()
            AND up.is_deleted = FALSE
        )
        OR EXISTS (
          SELECT 1 FROM user_roles ur
          JOIN roles r ON ur.role_id = r.id
          JOIN users u ON ur.user_id = u.id
          WHERE u.auth_user_id = auth.uid()
            AND r.role_name IN ('pmo_admin', 'System Admin')
            AND ur.is_active = TRUE
            AND ur.is_deleted = FALSE
        )
      )
  )
);

-- Policy 3: Users can delete their own uploads or PM can delete any
DROP POLICY IF EXISTS "Users can delete lesson attachments" ON storage.objects;
CREATE POLICY "Users can delete lesson attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'lesson-attachments'
  AND (
    EXISTS (
      SELECT 1 FROM lesson_attachments la
      JOIN lessons_learned l ON la.lesson_id = l.id
      WHERE la.file_path = name
        AND la.uploaded_by = (
          SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1
        )
        AND la.is_deleted = FALSE
    )
    OR EXISTS (
      SELECT 1 FROM lesson_attachments la
      JOIN lessons_learned l ON la.lesson_id = l.id
      JOIN user_projects up ON l.project_id = up.project_id
      JOIN users u ON up.user_id = u.id
      WHERE la.file_path = name
        AND u.auth_user_id = auth.uid()
        AND up.access_level IN ('owner', 'admin')
        AND up.is_deleted = FALSE
    )
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  bucket_exists BOOLEAN;
  policies_count INTEGER;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM storage.buckets WHERE id = 'lesson-attachments'
  ) INTO bucket_exists;

  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%lesson%';

  IF bucket_exists AND policies_count >= 3 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Lessons Log Storage Setup Complete';
    RAISE NOTICE 'Bucket: lesson-attachments';
    RAISE NOTICE 'Policies: %', policies_count;
    RAISE NOTICE '========================================';
  ELSE
    RAISE WARNING 'Storage setup incomplete. Bucket exists: %, Policies: %', bucket_exists, policies_count;
  END IF;
END $$;
