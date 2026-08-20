-- =============================================================================
-- v866: process_template_attachments (public + sim) — document-level image/file
--       attachments for the process_templates system (v867 PRD/plan).
--
-- Companion to v861/v862 (form_field_attachments) but DOCUMENT-level, not
-- field-level — process_templates has no field-type concept at all (24 tables
-- of freeform document_data JSON), so attachments here belong to the whole
-- document, keyed by pm_template_nodes.id (a single real FK instead of a
-- 24-way polymorphic reference into project_charters/assumption_logs/etc.).
--
-- Versioning model identical to v861: attachment_group_id identifies the
-- logical attachment across versions; replace = new version row (old kept);
-- restore = new version carrying an old version's file forward; delete =
-- soft-delete every version sharing a group id. display_id assigned once on
-- version_number=1, copied forward by the app on replace/restore.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.process_template_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_node_id uuid NOT NULL REFERENCES public.pm_template_nodes(id) ON DELETE CASCADE,

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_process_template_attachments_one_current_per_group
    ON public.process_template_attachments (attachment_group_id)
    WHERE is_current = true AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_process_template_attachments_node
    ON public.process_template_attachments (template_node_id)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_process_template_attachments_group
    ON public.process_template_attachments (attachment_group_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_process_template_attachments_display_id
    ON public.process_template_attachments (display_id)
    WHERE display_id IS NOT NULL;

ALTER TABLE public.process_template_attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.process_template_attachments TO authenticated;

-- SELECT: same as pm_template_field_links — account access is enough to view.
DROP POLICY IF EXISTS policy_process_template_attachments_select ON public.process_template_attachments;
CREATE POLICY policy_process_template_attachments_select
    ON public.process_template_attachments FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = template_node_id
              AND public.user_has_access_to_account(n.account_id)
        )
    );

-- INSERT/UPDATE/DELETE: project-scoped nodes use public.auth_user_can_access_project
-- (joins users.auth_user_id — do NOT compare user_projects.user_id to auth.uid() directly).
-- Non-project scopes fall back to can_manage_pm_template_node(). See also v866d.
DROP POLICY IF EXISTS policy_process_template_attachments_write ON public.process_template_attachments;
CREATE POLICY policy_process_template_attachments_write
    ON public.process_template_attachments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = template_node_id
              AND (
                  (
                      n.scope_entity_type = 'project'
                      AND public.auth_user_can_access_project(n.scope_entity_id)
                  )
                  OR public.can_manage_pm_template_node(
                      n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
                  )
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.pm_template_nodes n
            WHERE n.id = template_node_id
              AND (
                  (
                      n.scope_entity_type = 'project'
                      AND public.auth_user_can_access_project(n.scope_entity_id)
                  )
                  OR public.can_manage_pm_template_node(
                      n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
                  )
              )
        )
    );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('process_template_attachments', 'Document-level image/file attachments (with version history) on process_templates documents (Project Charter, Business Case, etc.), keyed by pm_template_nodes.id.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

-- ---------------------------------------------------------------------------
-- sim schema mirror
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS sim.process_template_attachments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    template_node_id uuid NOT NULL REFERENCES sim.pm_template_nodes(id) ON DELETE CASCADE,

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

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_process_template_attachments_one_current_per_group
    ON sim.process_template_attachments (attachment_group_id)
    WHERE is_current = true AND is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_sim_process_template_attachments_node
    ON sim.process_template_attachments (template_node_id)
    WHERE is_deleted = false;

CREATE INDEX IF NOT EXISTS idx_sim_process_template_attachments_group
    ON sim.process_template_attachments (attachment_group_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_sim_process_template_attachments_display_id
    ON sim.process_template_attachments (display_id)
    WHERE display_id IS NOT NULL;

ALTER TABLE sim.process_template_attachments ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON sim.process_template_attachments TO authenticated;

DROP POLICY IF EXISTS policy_sim_process_template_attachments_select ON sim.process_template_attachments;
CREATE POLICY policy_sim_process_template_attachments_select
    ON sim.process_template_attachments FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = template_node_id
              AND public.user_has_access_to_account(n.account_id)
        )
    );

-- Same as public: project scope uses sim.auth_user_can_access_practice_project
-- (not a raw practice_projects.user_id = auth.uid() only check). See v866d.
DROP POLICY IF EXISTS policy_sim_process_template_attachments_write ON sim.process_template_attachments;
CREATE POLICY policy_sim_process_template_attachments_write
    ON sim.process_template_attachments FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = template_node_id
              AND (
                  (
                      n.scope_entity_type = 'project'
                      AND sim.auth_user_can_access_practice_project(n.scope_entity_id)
                  )
                  OR sim.can_manage_pm_template_node(
                      n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
                  )
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM sim.pm_template_nodes n
            WHERE n.id = template_node_id
              AND (
                  (
                      n.scope_entity_type = 'project'
                      AND sim.auth_user_can_access_practice_project(n.scope_entity_id)
                  )
                  OR sim.can_manage_pm_template_node(
                      n.account_id, n.tier, n.scope_entity_type, n.scope_entity_id, n.is_system_synced
                  )
              )
        )
    );

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
    ('sim.process_template_attachments', 'Document-level image/file attachments (with version history) on Simulator process_templates documents, keyed by sim.pm_template_nodes.id.', false, true)
ON CONFLICT (table_name) DO UPDATE SET
    table_description = EXCLUDED.table_description,
    is_system_table = EXCLUDED.is_system_table,
    is_active = EXCLUDED.is_active,
    updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE 'v866_process_template_attachments_table.sql applied';
END $$;
