-- =============================================================================
-- v529_invitation_message_templates_tables.sql
-- Phase 13 — Account-scoped default invitation message templates per project role
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.invitation_message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  role_name TEXT NOT NULL,
  template_label TEXT,
  subject_line TEXT,
  message_body TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_invitation_message_templates_account_role UNIQUE (account_id, role_name)
);

CREATE INDEX IF NOT EXISTS idx_invitation_message_templates_account_id
  ON public.invitation_message_templates (account_id);

COMMENT ON TABLE public.invitation_message_templates IS
  'Phase 13: default invitation copy per project role template (role_name matches project_roles.role_name).';

ALTER TABLE public.invitation_message_templates ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.invitation_message_templates TO authenticated;

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active, table_category)
VALUES
  (
    'invitation_message_templates',
    'Account-scoped default invitation messages per project role (Phase 13)',
    false,
    true,
    'account'
  )
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  updated_at = NOW();

DO $$ BEGIN RAISE NOTICE 'v529_invitation_message_templates_tables.sql applied'; END $$;
