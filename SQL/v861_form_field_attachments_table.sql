-- =============================================================================
-- v861: form_field_attachments (public schema) — field-level image/file
--       attachments for the Dynamic Form Engine (v863 PRD/plan).
-- Depends on: v502_form_engine_tables.sql (form_instances), v858 (access helper
--             public.auth_user_can_access_project).
--
-- Versioning model (PRD v863 decision #15/#16):
--   - attachment_group_id identifies "the same logical attachment over time".
--     The app generates one UUID and inserts it as BOTH id and
--     attachment_group_id for a brand-new attachment's first version — no
--     trigger needed to self-reference the row's own id.
--   - "Replace" inserts a NEW row with the same attachment_group_id, the next
--     version_number, is_current = true, and flips the previous current row's
--     is_current to false. Old rows/storage objects are kept, not deleted.
--   - "Delete" soft-deletes every version row sharing an attachment_group_id.
--   - display_id is assigned once (version_number = 1) by the Admin ID
--     Generation trigger (v864) and copied forward by the app on later
--     versions — the trigger only fires meaningfully on the first version.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.form_field_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_instance_id uuid NOT NULL REFERENCES public.form_instances(id) ON DELETE CASCADE,
    field_key text NOT NULL,

    attachment_group_id uuid NOT NULL,
    version_number int NOT NULL DEFAULT 1,
    is_current boolean NOT NULL DEFAULT true,

    storage_bucket text NOT NULL,
    storage_path text NOT NULL,
    file_name text NOT NULL,
    mime_type text NOT NULL,
    file_size bigint NOT NULL,
    caption text,
    display_id text,

    uploaded_by uuid NULL REFERENCES public.users(id),
    uploaded_at timestamptz NOT NULL DEFAULT now(),

    is_deleted boolean NOT NULL DEFAULT false,
    deleted_at timestamptz,
    deleted_by uuid NULL REFERENCES public.users(id),

    created_at timestamptz NOT NULL DEFAULT now()
);

-- At most one current, non-deleted version per logical attachment.
CREATE UNIQUE INDEX IF NOT EXISTS uq_form_field_attachments_one_current_per_group
    ON public.form_field_attachments (attachment_group_id)
    WHERE is_current = true AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_form_field_attachments_instance_field
    ON public.form_field_attachments (form_instance_id, field_key)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_form_field_attachments_group
    ON public.form_field_attachments (attachment_group_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_form_field_attachments_display_id
    ON public.form_field_attachments (display_id)
    WHERE display_id IS NOT NULL;

ALTER TABLE public.form_field_attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.form_field_attachments TO authenticated;

DROP POLICY IF EXISTS policy_form_field_attachments_all ON public.form_field_attachments;
CREATE POLICY policy_form_field_attachments_all
    ON public.form_field_attachments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.form_instances fi
            WHERE fi.id = form_instance_id
              AND public.auth_user_can_access_project(fi.project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.form_instances fi
            WHERE fi.id = form_instance_id
              AND public.auth_user_can_access_project(fi.project_id)
        )
    );

-- Register new table in database_tables registry (mandatory per CLAUDE.md).
INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('form_field_attachments', 'Field-level image/file attachments (with version history) on Dynamic Form Engine instances.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v861_form_field_attachments_table.sql applied';
END $$;
