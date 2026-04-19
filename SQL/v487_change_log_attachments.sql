-- ============================================================================
-- v487 — change_log_attachments: table + RLS + storage bucket
-- Database: PostgreSQL 15+ (Supabase public schema)
-- ============================================================================

-- TABLE
CREATE TABLE IF NOT EXISTS public.change_log_attachments (
  id               UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Parent
  log_entry_id     UUID NOT NULL REFERENCES public.change_log(id) ON DELETE CASCADE,

  -- File info
  file_name        VARCHAR(255) NOT NULL,
  file_path        TEXT         NOT NULL,   -- Path in Supabase Storage
  file_url         TEXT,                    -- Public URL
  file_size        INTEGER,                 -- Bytes
  file_type        VARCHAR(100),            -- MIME type
  file_extension   VARCHAR(20),

  -- Classify upload
  attachment_type  VARCHAR(20)  DEFAULT 'document'  -- 'document' | 'screenshot'
    CHECK (attachment_type IN ('document', 'screenshot')),

  -- Optional description
  description      TEXT,

  -- Actor
  uploaded_by      UUID REFERENCES public.users(id),

  -- Audit
  created_at       TIMESTAMP    DEFAULT NOW(),
  is_deleted       BOOLEAN      DEFAULT FALSE,
  deleted_at       TIMESTAMP,
  deleted_by       UUID REFERENCES public.users(id)
);

CREATE INDEX IF NOT EXISTS idx_cla_log_entry_id
  ON public.change_log_attachments(log_entry_id) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cla_uploaded_by
  ON public.change_log_attachments(uploaded_by) WHERE is_deleted = FALSE;
CREATE INDEX IF NOT EXISTS idx_cla_attachment_type
  ON public.change_log_attachments(attachment_type) WHERE is_deleted = FALSE;

-- GRANTS
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_log_attachments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.change_log_attachments TO service_role;

-- RLS
ALTER TABLE public.change_log_attachments ENABLE ROW LEVEL SECURITY;

-- SELECT: same scope as change_log — project members + PMO/Admin
DROP POLICY IF EXISTS policy_cla_select ON public.change_log_attachments;
CREATE POLICY policy_cla_select
  ON public.change_log_attachments FOR SELECT TO authenticated
  USING (
    is_deleted = FALSE
    AND EXISTS (
      SELECT 1 FROM public.change_log cl
      WHERE cl.id = change_log_attachments.log_entry_id
        AND (
          EXISTS (
            SELECT 1 FROM public.user_roles ur
            JOIN public.roles r ON ur.role_id = r.id
            JOIN public.users u ON ur.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND r.role_name IN ('pmo_admin','System Admin','PMO Admin')
              AND ur.is_active = TRUE AND ur.is_deleted = FALSE
          )
          OR EXISTS (
            SELECT 1 FROM public.user_projects up
            JOIN public.users u ON up.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND up.project_id = cl.project_id AND up.is_deleted = FALSE
          )
          OR EXISTS (
            SELECT 1 FROM public.project_memberships pm
            JOIN public.users u ON pm.user_id = u.id
            WHERE u.auth_user_id = auth.uid()
              AND pm.project_id = cl.project_id AND pm.is_active = TRUE
          )
          OR EXISTS (
            SELECT 1 FROM public.projects p
            WHERE p.id = cl.project_id AND p.is_deleted = FALSE
              AND p.project_manager_user_id = get_user_id_from_auth(auth.uid())
          )
        )
    )
  );

-- INSERT: any project member on that log entry's project
DROP POLICY IF EXISTS policy_cla_insert ON public.change_log_attachments;
CREATE POLICY policy_cla_insert
  ON public.change_log_attachments FOR INSERT TO authenticated
  WITH CHECK (
    uploaded_by = get_user_id_from_auth(auth.uid())
  );

-- DELETE (soft): uploader OR pmo/admin
DROP POLICY IF EXISTS policy_cla_delete ON public.change_log_attachments;
CREATE POLICY policy_cla_delete
  ON public.change_log_attachments FOR UPDATE TO authenticated
  USING (
    uploaded_by = get_user_id_from_auth(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON ur.role_id = r.id
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('pmo_admin','System Admin','PMO Admin')
        AND ur.is_active = TRUE AND ur.is_deleted = FALSE
    )
  );

-- Register table
INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('change_log_attachments', 'File and screenshot attachments on change log entries', false, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description, updated_at = NOW();

-- ============================================================================
-- STORAGE BUCKET (run separately in Supabase Dashboard > Storage if needed)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('change-log-attachments', 'change-log-attachments', false)
-- ON CONFLICT (id) DO NOTHING;
-- ============================================================================
