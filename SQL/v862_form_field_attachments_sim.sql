-- =============================================================================
-- v862: form_field_attachments (sim schema) — mirror of v861 for the
--       Simulator (parity rule 34). See v861 for the versioning model.
-- Depends on: v503_form_engine_sim.sql (sim.form_instances), v858 (access
--             helper sim.auth_user_can_access_practice_project).
-- =============================================================================

CREATE TABLE IF NOT EXISTS sim.form_field_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    form_instance_id uuid NOT NULL REFERENCES sim.form_instances(id) ON DELETE CASCADE,
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

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_form_field_attachments_one_current_per_group
    ON sim.form_field_attachments (attachment_group_id)
    WHERE is_current = true AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_sim_form_field_attachments_instance_field
    ON sim.form_field_attachments (form_instance_id, field_key)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_sim_form_field_attachments_group
    ON sim.form_field_attachments (attachment_group_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_form_field_attachments_display_id
    ON sim.form_field_attachments (display_id)
    WHERE display_id IS NOT NULL;

ALTER TABLE sim.form_field_attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.form_field_attachments TO authenticated;

DROP POLICY IF EXISTS policy_sim_form_field_attachments_all ON sim.form_field_attachments;
CREATE POLICY policy_sim_form_field_attachments_all
    ON sim.form_field_attachments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.form_instances fi
            WHERE fi.id = form_instance_id
              AND sim.auth_user_can_access_practice_project(fi.project_id)
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.form_instances fi
            WHERE fi.id = form_instance_id
              AND sim.auth_user_can_access_practice_project(fi.project_id)
        )
    );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.form_field_attachments', 'Field-level image/file attachments (with version history) on Simulator Dynamic Form Engine instances.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v862_form_field_attachments_sim.sql applied';
END $$;
