-- ============================================================================
-- Daily Log Storage Setup
-- Version: v168
-- Description: Storage bucket setup for daily log attachments
-- Date: 2026-01-19
-- ============================================================================
--
-- Purpose:
-- Creates storage bucket and policies for daily log attachments
--
-- Prerequisites:
-- - Supabase Storage must be enabled
-- - v166_daily_log_tables.sql must be run first
--
-- Note: This script provides SQL for storage policies.
-- The bucket itself must be created via Supabase Dashboard or API.
--
-- ============================================================================
-- STORAGE BUCKET CREATION (Run via Supabase Dashboard or API)
-- ============================================================================
--
-- Bucket Name: daily-log-attachments
-- Public: false (private bucket)
-- File Size Limit: 10 MB
-- Allowed MIME Types: (leave empty for all types)
--
-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================

-- Policy 1: Users can upload attachments for entries they can edit
DROP POLICY IF EXISTS "Users can upload daily log attachments" ON storage.objects;
CREATE POLICY "Users can upload daily log attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'daily-log-attachments'
  AND (storage.foldername(name))[1] = 'entries'
  AND EXISTS (
    SELECT 1 FROM daily_log_entries e
    JOIN daily_logs dl ON e.daily_log_id = dl.id
    WHERE e.id::text = (storage.foldername(name))[2]
      AND e.is_deleted = FALSE
      AND dl.is_deleted = FALSE
      AND (
        e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR EXISTS (
          SELECT 1 FROM daily_logs dl2
          WHERE dl2.id = dl.id
            AND dl2.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        )
        OR EXISTS (
          SELECT 1
          FROM user_roles ur
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

-- Policy 2: Users can read attachments for entries they can view
DROP POLICY IF EXISTS "Users can read daily log attachments" ON storage.objects;
CREATE POLICY "Users can read daily log attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'daily-log-attachments'
  AND (storage.foldername(name))[1] = 'entries'
  AND EXISTS (
    SELECT 1 
    FROM daily_log_entries e
    JOIN daily_logs dl ON e.daily_log_id = dl.id
    WHERE e.id::text = (storage.foldername(name))[2]
      AND e.is_deleted = FALSE
      AND dl.is_deleted = FALSE
      AND (
        e.person_responsible_id = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
        OR (
          (e.is_private = FALSE OR e.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1))
          AND (
            dl.visibility = 'public'
            OR (
              dl.visibility IN ('team', 'stakeholders') 
              AND EXISTS (
                SELECT 1 
                FROM user_projects up
                JOIN users u ON up.user_id = u.id
                WHERE u.auth_user_id = auth.uid()
                  AND up.project_id = dl.project_id
                  AND up.is_deleted = FALSE
              )
            )
            OR dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
            OR EXISTS (
              SELECT 1
              FROM user_roles ur
              JOIN roles r ON ur.role_id = r.id
              JOIN users u ON ur.user_id = u.id
              WHERE u.auth_user_id = auth.uid()
                AND r.role_name IN ('pmo_admin', 'System Admin')
                AND ur.is_active = TRUE
                AND ur.is_deleted = FALSE
            )
          )
        )
      )
  )
);

-- Policy 3: Users can delete their own uploads or PM can delete
DROP POLICY IF EXISTS "Users can delete daily log attachments" ON storage.objects;
CREATE POLICY "Users can delete daily log attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'daily-log-attachments'
  AND (storage.foldername(name))[1] = 'entries'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1 FROM daily_log_entries e
      JOIN daily_logs dl ON e.daily_log_id = dl.id
      WHERE e.id::text = (storage.foldername(name))[2]
        AND dl.created_by = (SELECT id FROM users WHERE auth_user_id = auth.uid() AND is_deleted = FALSE LIMIT 1)
    )
    OR EXISTS (
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      JOIN users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin', 'System Admin')
        AND ur.is_active = TRUE
        AND ur.is_deleted = FALSE
    )
  )
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

DO $$
DECLARE
  policies_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname LIKE '%daily log%';

  IF policies_count < 3 THEN
    RAISE WARNING 'Expected at least 3 storage policies, found %', policies_count;
  END IF;

  RAISE NOTICE '========================================';
  RAISE NOTICE 'Daily Log Storage Policies Created';
  RAISE NOTICE 'Policies: %', policies_count;
  RAISE NOTICE '========================================';
  RAISE NOTICE 'IMPORTANT: Create the storage bucket "daily-log-attachments"';
  RAISE NOTICE 'via Supabase Dashboard: Storage > New Bucket';
  RAISE NOTICE '========================================';
END $$;
