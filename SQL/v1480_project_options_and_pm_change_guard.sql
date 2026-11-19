-- ============================================================================
-- v1480: Project option lists + Project Manager change guard (v1344, slice 1)
-- ============================================================================
-- PRD projectprd/v1344_project_setup_forms_fields_audit_seed_PRD.md amendments A1, A2.
--
-- 1. public.project_attribute_options — the option lists the project wizard uses for
--    Priority (new in the wizard), Billing Type and Classification (both were hard-coded in
--    React; rule 25.1). Values match what projects already store:
--      priority:        low · medium · high · critical      (projects.priority default 'medium')
--      billing_type:    time_and_material · fixed_price
--      classification:  strategic · tactical · operational
-- 2. Project Manager guard (A2): changing projects.project_manager_user_id is allowed only for
--    organisation admins (pmo_admin, org_admin, system_admin, super_admin, account_owner —
--    project_user_is_org_admin, v1472) or the service role. Setting it the first time (NULL →
--    someone) is allowed, so project creation keeps working. Every change is written to
--    audit_log (table projects, action 'change_project_manager').
-- After running: re-run SQL/v1251_planner_table_wall.sql (new table, CLAUDE.md table rule 6).
-- Idempotent.
-- ============================================================================

-- ── 1. Option lists ──────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.project_attribute_options (
  attribute      VARCHAR(40) NOT NULL,
  code           VARCHAR(40) NOT NULL,
  label          VARCHAR(120) NOT NULL,
  description    TEXT,
  display_order  INTEGER NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (attribute, code)
);
COMMENT ON TABLE public.project_attribute_options IS
  'v1480 (v1344): option lists for project wizard fields (priority, billing_type, classification). DB-driven per rule 25.1.';

ALTER TABLE public.project_attribute_options ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.project_attribute_options TO authenticated;
GRANT ALL ON public.project_attribute_options TO service_role;
DROP POLICY IF EXISTS policy_project_attribute_options_select ON public.project_attribute_options;
CREATE POLICY policy_project_attribute_options_select
  ON public.project_attribute_options FOR SELECT TO authenticated
  USING (is_active = TRUE);

INSERT INTO public.project_attribute_options (attribute, code, label, description, display_order)
VALUES
  ('priority', 'low', 'Low', 'Can wait; no deadline pressure.', 10),
  ('priority', 'medium', 'Medium', 'Normal priority (default).', 20),
  ('priority', 'high', 'High', 'Important to the organisation this period.', 30),
  ('priority', 'critical', 'Critical', 'Top priority; regulatory or business-critical.', 40),
  ('billing_type', 'time_and_material', 'Time & Material', 'Billed on hours worked; Work Plan shows Planned vs Actual.', 10),
  ('billing_type', 'fixed_price', 'Fixed Price', 'Agreed price for the agreed scope.', 20),
  ('classification', 'strategic', 'Strategic', 'Delivers organisational strategy.', 10),
  ('classification', 'tactical', 'Tactical', 'Medium-term improvement.', 20),
  ('classification', 'operational', 'Operational', 'Routine or business-as-usual delivery.', 30)
ON CONFLICT (attribute, code) DO UPDATE SET
  label = EXCLUDED.label, description = EXCLUDED.description,
  display_order = EXCLUDED.display_order, updated_at = NOW();

INSERT INTO public.database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('project_attribute_options', 'Option lists for project fields: priority, billing type, classification (v1344)', true, true)
ON CONFLICT (table_name) DO UPDATE SET
  table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

-- ── 2. Project Manager change guard ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trg_projects_guard_project_manager()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid;
BEGIN
  IF NEW.project_manager_user_id IS NOT DISTINCT FROM OLD.project_manager_user_id THEN
    RETURN NEW;
  END IF;

  v_caller := (SELECT id FROM users WHERE auth_user_id = auth.uid() LIMIT 1);

  -- First assignment (no PM yet) is allowed; replacing or clearing a PM needs an organisation admin.
  IF OLD.project_manager_user_id IS NOT NULL
     AND COALESCE(auth.role(), '') <> 'service_role'
     AND auth.uid() IS NOT NULL
     AND NOT public.project_user_is_org_admin(v_caller) THEN
    RAISE EXCEPTION 'Only a PMO Admin or organisation admin can change the Project Manager.'
      USING ERRCODE = '42501',
            HINT = 'Ask a PMO Admin to reassign the project.';
  END IF;

  INSERT INTO audit_log (table_name, record_id, action, action_details, performed_by)
  VALUES ('projects', NEW.id, 'change_project_manager',
          jsonb_build_object('from', OLD.project_manager_user_id, 'to', NEW.project_manager_user_id),
          v_caller);
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_projects_guard_project_manager ON public.projects;
CREATE TRIGGER trg_projects_guard_project_manager
  BEFORE UPDATE OF project_manager_user_id ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.trg_projects_guard_project_manager();

COMMENT ON FUNCTION public.trg_projects_guard_project_manager() IS
  'v1480 (v1344 A2): only organisation admins may replace or clear projects.project_manager_user_id (it carries full PM rights, v1472); every change goes to audit_log.';

NOTIFY pgrst, 'reload schema';

-- Check
SELECT attribute, count(*) AS options FROM public.project_attribute_options GROUP BY attribute ORDER BY attribute;
