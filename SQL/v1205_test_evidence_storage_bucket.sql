-- ============================================================================
-- v1205: Test evidence storage bucket + RLS (PRD v1204, Slice 1)
-- ============================================================================
-- The code has referenced the 'testing-centre-evidence' bucket since v494, but
-- the bucket itself was never created — uploads and "open file" both fail with
-- "StorageApiError: Object not found" / "Bucket not found". This creates it and
-- adds storage.objects policies scoped to the project behind each file, using
-- the path shape the app writes: executions/<test_case_execution_id>/<file>.
--
-- Run this in the Supabase SQL editor.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'testing-centre-evidence',
  'testing-centre-evidence',
  FALSE,
  26214400, -- 25MB; "any file type" per PRD decision 2, so no allowed_mime_types restriction
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit;

-- Resolve the project behind an object path of the form
-- 'executions/<test_case_execution_id>/<file name>' and defer to the existing
-- project-access helper (public.auth_user_can_access_project, v406).
CREATE OR REPLACE FUNCTION public.test_evidence_object_can_access(p_object_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
DECLARE
  v_exec_id UUID;
  v_project_id UUID;
BEGIN
  BEGIN
    v_exec_id := split_part(p_object_name, '/', 2)::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    RETURN FALSE;
  END;

  SELECT project_id INTO v_project_id
  FROM public.test_case_executions
  WHERE id = v_exec_id;

  IF v_project_id IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN public.auth_user_can_access_project(v_project_id);
END;
$$;

REVOKE ALL ON FUNCTION public.test_evidence_object_can_access(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.test_evidence_object_can_access(TEXT) TO authenticated;

DROP POLICY IF EXISTS policy_test_evidence_objects_select ON storage.objects;
CREATE POLICY policy_test_evidence_objects_select
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'testing-centre-evidence'
    AND (owner = auth.uid() OR public.test_evidence_object_can_access(name))
  );

DROP POLICY IF EXISTS policy_test_evidence_objects_insert ON storage.objects;
CREATE POLICY policy_test_evidence_objects_insert
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'testing-centre-evidence'
    AND public.test_evidence_object_can_access(name)
  );

NOTIFY pgrst, 'reload schema';
