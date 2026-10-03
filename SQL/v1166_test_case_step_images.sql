-- ============================================================================
-- Test case step images (upload / paste)
-- Version: v1166
--
-- Action, Expected Result, and Test Data on a test step can each hold images.
-- Files live in a private bucket. The step row keeps the file list as JSON.
-- Run this in the Supabase SQL editor.
-- ============================================================================

ALTER TABLE public.test_case_steps
  ADD COLUMN IF NOT EXISTS action_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS expected_result_images JSONB NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS test_data_images JSONB NOT NULL DEFAULT '[]'::jsonb;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'test-case-attachments',
  'test-case-attachments',
  FALSE,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS policy_test_case_attachments_select ON storage.objects;
CREATE POLICY policy_test_case_attachments_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'test-case-attachments'
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
            OR EXISTS (
              SELECT 1
              FROM public.projects p
              WHERE p.id::text = split_part(storage.objects.name, '/', 1)
                AND p.project_manager_user_id = u.id
                AND COALESCE(p.is_deleted, false) = false
            )
          )
      )
    )
  );

DROP POLICY IF EXISTS policy_test_case_attachments_insert ON storage.objects;
CREATE POLICY policy_test_case_attachments_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'test-case-attachments'
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
          OR EXISTS (
            SELECT 1
            FROM public.projects p
            WHERE p.id::text = split_part(storage.objects.name, '/', 1)
              AND p.project_manager_user_id = u.id
              AND COALESCE(p.is_deleted, false) = false
          )
        )
    )
  );

DROP POLICY IF EXISTS policy_test_case_attachments_delete ON storage.objects;
CREATE POLICY policy_test_case_attachments_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'test-case-attachments'
    AND owner = auth.uid()
  );

DO $$
BEGIN
  IF to_regclass('sim.practice_test_case_steps') IS NOT NULL THEN
    ALTER TABLE sim.practice_test_case_steps
      ADD COLUMN IF NOT EXISTS action_images JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS expected_result_images JSONB NOT NULL DEFAULT '[]'::jsonb,
      ADD COLUMN IF NOT EXISTS test_data_images JSONB NOT NULL DEFAULT '[]'::jsonb;
  END IF;
END $$;

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sim-test-case-attachments',
  'sim-test-case-attachments',
  FALSE,
  10485760,
  ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS policy_sim_test_case_attachments_select ON storage.objects;
CREATE POLICY policy_sim_test_case_attachments_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'sim-test-case-attachments'
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

DROP POLICY IF EXISTS policy_sim_test_case_attachments_insert ON storage.objects;
CREATE POLICY policy_sim_test_case_attachments_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'sim-test-case-attachments'
    AND EXISTS (
      SELECT 1
      FROM sim.practice_projects pp
      WHERE pp.user_id = sim.get_current_user_id()
        AND pp.id::text = split_part(storage.objects.name, '/', 1)
        AND COALESCE(pp.is_deleted, false) = false
    )
  );

DROP POLICY IF EXISTS policy_sim_test_case_attachments_delete ON storage.objects;
CREATE POLICY policy_sim_test_case_attachments_delete
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'sim-test-case-attachments'
    AND owner = auth.uid()
  );
