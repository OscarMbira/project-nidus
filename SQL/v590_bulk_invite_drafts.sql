-- =============================================================================
-- v590_bulk_invite_drafts.sql
-- Bulk project team invite: draft/hold queue for CSV/Excel upload wizard
-- Prerequisites: projects, users, project_roles
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.bulk_invite_drafts (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id          UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  created_by          UUID NOT NULL REFERENCES public.users(id),
  default_role_id     UUID REFERENCES public.project_roles(id),
  custom_message      TEXT,
  members             JSONB NOT NULL DEFAULT '[]'::jsonb,
  pending_new_roles   JSONB NOT NULL DEFAULT '[]'::jsonb,
  validation_errors   JSONB NOT NULL DEFAULT '[]'::jsonb,
  draft_status        VARCHAR(20) NOT NULL DEFAULT 'draft',
  results             JSONB,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_bulk_invite_drafts_status CHECK (
    draft_status IN ('draft', 'sending', 'completed', 'cancelled')
  )
);

COMMENT ON TABLE public.bulk_invite_drafts IS
  'Hold queue for bulk project member invitation wizard (CSV/Excel upload).';
COMMENT ON COLUMN public.bulk_invite_drafts.members IS
  'Parsed rows: email, first_name, last_name, role_id, role_name, isNewRole, selected, status, etc.';
COMMENT ON COLUMN public.bulk_invite_drafts.pending_new_roles IS
  'New roles pending PM confirmation before insert into project_roles templates.';
COMMENT ON COLUMN public.bulk_invite_drafts.validation_errors IS
  'Last validation run snapshot for resume without re-upload.';
COMMENT ON COLUMN public.bulk_invite_drafts.custom_message IS
  'NULL = per-role auto-template; non-NULL = single message for all rows.';

CREATE INDEX IF NOT EXISTS idx_bulk_invite_drafts_project
  ON public.bulk_invite_drafts (project_id);

CREATE INDEX IF NOT EXISTS idx_bulk_invite_drafts_creator_status
  ON public.bulk_invite_drafts (created_by, draft_status)
  WHERE draft_status = 'draft';

CREATE OR REPLACE FUNCTION public.update_bulk_invite_drafts_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bulk_invite_drafts_updated ON public.bulk_invite_drafts;
CREATE TRIGGER trg_bulk_invite_drafts_updated
  BEFORE UPDATE ON public.bulk_invite_drafts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_bulk_invite_drafts_timestamp();

ALTER TABLE public.bulk_invite_drafts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bulk_invite_drafts_select ON public.bulk_invite_drafts;
DROP POLICY IF EXISTS bulk_invite_drafts_insert ON public.bulk_invite_drafts;
DROP POLICY IF EXISTS bulk_invite_drafts_update ON public.bulk_invite_drafts;
DROP POLICY IF EXISTS bulk_invite_drafts_delete ON public.bulk_invite_drafts;

CREATE POLICY bulk_invite_drafts_select ON public.bulk_invite_drafts
  FOR SELECT TO authenticated
  USING (
    created_by IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY bulk_invite_drafts_insert ON public.bulk_invite_drafts
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY bulk_invite_drafts_update ON public.bulk_invite_drafts
  FOR UPDATE TO authenticated
  USING (
    created_by IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  )
  WITH CHECK (
    created_by IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );

CREATE POLICY bulk_invite_drafts_delete ON public.bulk_invite_drafts
  FOR DELETE TO authenticated
  USING (
    created_by IN (
      SELECT u.id FROM public.users u WHERE u.auth_user_id = auth.uid()
    )
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bulk_invite_drafts TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES (
  'bulk_invite_drafts',
  'Draft/hold queue for bulk project team invitation CSV/Excel wizard',
  false,
  true
)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();
