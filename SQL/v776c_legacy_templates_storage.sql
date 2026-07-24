-- =============================================================================
-- v776c: Supabase Storage bucket legacy-templates (Track B)
-- Prerequisites: v776 tables (metadata); shared by Platform + Admin
-- =============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'legacy-templates',
  'legacy-templates',
  false,
  26214400, -- 25MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'text/xml',
    'application/xml',
    'text/plain',
    'application/octet-stream'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Path convention: {account_id}/{template_id}/{filename}
DROP POLICY IF EXISTS "legacy_templates_insert" ON storage.objects;
CREATE POLICY "legacy_templates_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'legacy-templates');

DROP POLICY IF EXISTS "legacy_templates_select" ON storage.objects;
CREATE POLICY "legacy_templates_select"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'legacy-templates');

DROP POLICY IF EXISTS "legacy_templates_update" ON storage.objects;
CREATE POLICY "legacy_templates_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'legacy-templates')
WITH CHECK (bucket_id = 'legacy-templates');

DROP POLICY IF EXISTS "legacy_templates_delete" ON storage.objects;
CREATE POLICY "legacy_templates_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'legacy-templates');

DO $$
BEGIN
  RAISE NOTICE 'v776c_legacy_templates_storage.sql applied';
END $$;
