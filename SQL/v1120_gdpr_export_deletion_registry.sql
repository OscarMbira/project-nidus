-- ============================================================================
-- v1120: GDPR export/deletion module registry (public schema)
-- ============================================================================
-- projectplan/v1108_data_management_gdpr_plan.md Phase 0.
-- Replaces gdprService.js's hardcoded "users + user_projects + tasks + user_preferences" export/
-- anonymization scope with a data-driven registry, so future modules extend coverage via a seed
-- row instead of a gdprService.js code change. Seeded with the confirmed Tier-1 module list:
-- Risks, Issues, Changes, Assumptions, Constraints, Daily Log entries, Lessons.
--
-- owner_columns lists every column on table_name that is a FK to users(id) and represents "this
-- row is about this person" for export/anonymization purposes (an entry may have more than one,
-- e.g. both who identified a risk and who owns it).
--
-- Stakeholder/Governance body memberships were evaluated and excluded from v1: public.
-- project_governance_members stores members by free-text name/email, not a users(id) FK, so it
-- doesn't fit this registry's owner-column model. A future registry variant could support
-- email-based matching if this is picked up later — not needed for v1's confirmed scope.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gdpr_export_registry (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  module_name    TEXT NOT NULL,
  table_name     TEXT NOT NULL UNIQUE,
  owner_columns  TEXT[] NOT NULL,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.gdpr_export_registry IS
  'v1120: data-driven list of tables + owner columns that GDPR data export/anonymization walks. Add a row to extend coverage — no gdprService.js code change needed for a new module.';
COMMENT ON COLUMN public.gdpr_export_registry.owner_columns IS
  'Column names on table_name that FK to users(id) and represent this row being "about" that person.';

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES
  ('gdpr_export_registry', 'Data-driven registry of tables/columns walked by GDPR data export and deletion-anonymization (v1108/v1120)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description,
  is_system_table = EXCLUDED.is_system_table,
  updated_at = NOW();

ALTER TABLE public.gdpr_export_registry ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.gdpr_export_registry TO authenticated;
GRANT ALL ON public.gdpr_export_registry TO service_role;

-- Any authenticated user may read the active registry (it's configuration, not personal data) —
-- needed so a regular user's own export request can resolve what to fetch.
DROP POLICY IF EXISTS policy_gdpr_export_registry_select ON public.gdpr_export_registry;
CREATE POLICY policy_gdpr_export_registry_select ON public.gdpr_export_registry
  FOR SELECT TO authenticated
  USING (is_active = TRUE);

-- Only a PMO Admin/System Admin tier may add/change registry rows — this is system-wide
-- configuration, not scoped to any one account.
DROP POLICY IF EXISTS policy_gdpr_export_registry_admin_write ON public.gdpr_export_registry;
CREATE POLICY policy_gdpr_export_registry_admin_write ON public.gdpr_export_registry
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('PMO Admin', 'pmo_admin', 'System Admin')
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      JOIN public.roles r ON r.id = ur.role_id
      JOIN public.users u ON u.id = ur.user_id
      WHERE u.auth_user_id = auth.uid()
        AND r.role_name IN ('PMO Admin', 'pmo_admin', 'System Admin')
        AND ur.is_active = TRUE
        AND COALESCE(ur.is_deleted, FALSE) = FALSE
    )
  );

INSERT INTO public.gdpr_export_registry (module_name, table_name, owner_columns, notes)
VALUES
  ('Risks', 'risks', ARRAY['risk_owner_user_id', 'identified_by_user_id'], 'v26'),
  ('Issues', 'issues', ARRAY['reported_by_user_id', 'assigned_to_user_id'], 'v25'),
  ('Changes', 'change_requests', ARRAY['submitted_by'], 'v31'),
  ('Assumptions', 'assumptions', ARRAY['owner_user_id', 'identified_by_user_id'], 'v26'),
  ('Constraints', 'constraints_register', ARRAY['owner_user_id'], 'v1103'),
  ('Daily Log entries', 'daily_log_entries', ARRAY['created_by', 'person_responsible_id'], 'v166'),
  ('Lessons', 'lessons', ARRAY['logged_by_id', 'created_by'], 'v169')
ON CONFLICT (table_name) DO UPDATE SET
  module_name = EXCLUDED.module_name,
  owner_columns = EXCLUDED.owner_columns,
  notes = EXCLUDED.notes,
  updated_at = NOW();

DO $$ BEGIN
  RAISE NOTICE 'v1120_gdpr_export_deletion_registry.sql applied successfully';
END $$;
