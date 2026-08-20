-- =============================================================================
-- v863b: Storage RLS for the 'form-field-attachments' bucket (v863 PRD/plan).
--
-- MANUAL STEP FIRST (per repo convention — storage buckets can't be created
-- via SQL): create a bucket named 'form-field-attachments' via the Supabase
-- Dashboard or JS API (see SQL/v150_supabase_storage_setup.sql §1 for the
-- two methods). Suggested settings: private, 10MB file size limit, allowed
-- MIME types = image/png, image/jpeg, image/gif, image/svg+xml, image/webp,
-- application/pdf, application/msword,
-- application/vnd.openxmlformats-officedocument.wordprocessingml.document,
-- application/vnd.ms-excel,
-- application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
-- application/vnd.ms-powerpoint,
-- application/vnd.openxmlformats-officedocument.presentationml.presentation.
--
-- Path convention (shared bucket across Platform + Simulator, scoped by
-- folder, per PRD decision to reuse one bucket rather than duplicate it):
--   {mode}/{form_instance_id}/{field_key}/{attachment_group_id}-v{version}-{filename}
-- where {mode} is 'platform' or 'sim' — storage.foldername(name)[1] = mode,
-- [2] = form_instance_id (text form of the uuid).
-- =============================================================================

DROP POLICY IF EXISTS "Platform: access form-field-attachments via project membership" ON storage.objects;
CREATE POLICY "Platform: access form-field-attachments via project membership"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'form-field-attachments'
    AND (storage.foldername(name))[1] = 'platform'
    AND EXISTS (
        SELECT 1 FROM public.form_instances fi
        WHERE fi.id::text = (storage.foldername(name))[2]
          AND public.auth_user_can_access_project(fi.project_id)
    )
)
WITH CHECK (
    bucket_id = 'form-field-attachments'
    AND (storage.foldername(name))[1] = 'platform'
    AND EXISTS (
        SELECT 1 FROM public.form_instances fi
        WHERE fi.id::text = (storage.foldername(name))[2]
          AND public.auth_user_can_access_project(fi.project_id)
    )
);

DROP POLICY IF EXISTS "Simulator: access form-field-attachments via practice project membership" ON storage.objects;
CREATE POLICY "Simulator: access form-field-attachments via practice project membership"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'form-field-attachments'
    AND (storage.foldername(name))[1] = 'sim'
    AND EXISTS (
        SELECT 1 FROM sim.form_instances fi
        WHERE fi.id::text = (storage.foldername(name))[2]
          AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
)
WITH CHECK (
    bucket_id = 'form-field-attachments'
    AND (storage.foldername(name))[1] = 'sim'
    AND EXISTS (
        SELECT 1 FROM sim.form_instances fi
        WHERE fi.id::text = (storage.foldername(name))[2]
          AND sim.auth_user_can_access_practice_project(fi.project_id)
    )
);

-- PMO Admin: full access regardless of project membership (matches v150 pattern).
DROP POLICY IF EXISTS "PMO Admin: full access to form-field-attachments" ON storage.objects;
CREATE POLICY "PMO Admin: full access to form-field-attachments"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'form-field-attachments'
    AND EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
          AND r.role_name = 'pmo_admin'
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
          AND r.is_deleted = FALSE
    )
)
WITH CHECK (
    bucket_id = 'form-field-attachments'
    AND EXISTS (
        SELECT 1
        FROM user_roles ur
        INNER JOIN roles r ON ur.role_id = r.id
        WHERE ur.user_id IN (SELECT id FROM users WHERE auth_user_id = auth.uid())
          AND r.role_name = 'pmo_admin'
          AND ur.is_active = TRUE
          AND ur.is_deleted = FALSE
          AND r.is_deleted = FALSE
    )
);

DO $$
BEGIN
  RAISE NOTICE 'v863b_form_field_attachments_storage_rls.sql applied — remember to create the form-field-attachments bucket manually (see header).';
END $$;
