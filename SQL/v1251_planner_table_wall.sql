-- ============================================================================
-- v1251: Project Planner database wall — v1239 Slice 6.4 (D6)
-- Run after v1247 (helpers) and v1249. Idempotent; re-run whenever the allow-list is
-- regenerated or a new public table is created (new-table checklist, CLAUDE.md addendum).
-- Rollback: v1251r_planner_table_wall_rollback.sql.
--
-- 1. planner_table_allowlist — public tables the Planner app touches directly. GENERATED from
--    the Planner's import graph by scripts/generate-planner-table-allowlist.mjs (CI checks it is
--    current). Do not hand-edit the generated block.
-- 2. For every RLS-enabled public table NOT in the list: a RESTRICTIVE policy that refuses all
--    access when the caller's current account is a Planner-edition account. Platform sessions
--    are unaffected (the check is TRUE for them). Fail-closed: a forgotten table is walled.
-- 3. For allow-listed tables: RESTRICTIVE write policies that refuse INSERT/UPDATE/DELETE while
--    a planner trial is read-only (trial ended, not paid).
-- 4. Planner role rules on tasks (story 7.3): on a planner project, only the account owner or
--    the project manager may create/delete tasks or change the plan; anyone else may update only
--    progress fields on tasks assigned to them. plan_viewer therefore cannot change anything.
-- Tables without RLS are listed in a WARNING (the wall cannot cover them until RLS is on).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.planner_table_allowlist (
  table_name TEXT PRIMARY KEY,
  added_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
ALTER TABLE public.planner_table_allowlist ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS planner_table_allowlist_read ON public.planner_table_allowlist;
CREATE POLICY planner_table_allowlist_read ON public.planner_table_allowlist FOR SELECT TO authenticated USING (TRUE);
GRANT SELECT ON public.planner_table_allowlist TO authenticated;
GRANT ALL ON public.planner_table_allowlist TO service_role;

-- BEGIN GENERATED planner_table_allowlist (scripts/generate-planner-table-allowlist.mjs --write)
INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('account_billing_delegates'),
  ('accounts'),
  ('custom_field_definitions'),
  ('custom_field_values'),
  ('governance_rules'),
  ('intelligence_rules'),
  ('inter_project_dependencies'),
  ('micro_plan_activities'),
  ('micro_plan_comments'),
  ('micro_plan_versions'),
  ('organisation_invitations'),
  ('organisation_regional_format_settings'),
  ('payment_transactions'),
  ('plan_ai_sessions'),
  ('plan_collision_alerts'),
  ('plan_confidence_forecasts'),
  ('plan_governance_findings'),
  ('plan_governance_rules'),
  ('plan_health_scores'),
  ('plan_intelligence_findings'),
  ('plan_intelligence_rules'),
  ('plan_pbs_nodes'),
  ('plan_pfd_edges'),
  ('plan_recovery_options'),
  ('plan_scenario_task_snapshots'),
  ('plan_scenarios'),
  ('planner_plan_limits'),
  ('platform_subscriptions'),
  ('pm_template_entity_assignment'),
  ('pm_template_field_links'),
  ('pm_template_nodes'),
  ('portfolio_projects'),
  ('portfolios'),
  ('practice_portfolio_projects'),
  ('practice_programme_projects'),
  ('practice_programmes'),
  ('practice_teams'),
  ('process_template_document_signatories'),
  ('process_template_node_links'),
  ('process_template_signatory_requirements'),
  ('process_template_signatory_scope_policies'),
  ('profiles'),
  ('programme_projects'),
  ('programmes'),
  ('project_baselines'),
  ('project_calendar_exceptions'),
  ('project_calendars'),
  ('project_memberships'),
  ('project_micro_plans'),
  ('project_regional_format_settings'),
  ('project_roles'),
  ('projects'),
  ('regional_format_local_field_definitions'),
  ('resource_calendar'),
  ('resources'),
  ('risks'),
  ('roles'),
  ('site_content'),
  ('site_nav_links'),
  ('site_pages'),
  ('site_products'),
  ('stakeholders'),
  ('subscription_plans'),
  ('task_dependencies'),
  ('task_statuses'),
  ('tasks'),
  ('team_members'),
  ('teams'),
  ('timesheet_entries'),
  ('user_projects'),
  ('user_roles'),
  ('user_signature_images'),
  ('users')
ON CONFLICT (table_name) DO NOTHING;
DELETE FROM public.planner_table_allowlist WHERE table_name NOT IN ('account_billing_delegates', 'accounts', 'custom_field_definitions', 'custom_field_values', 'governance_rules', 'intelligence_rules', 'inter_project_dependencies', 'micro_plan_activities', 'micro_plan_comments', 'micro_plan_versions', 'organisation_invitations', 'organisation_regional_format_settings', 'payment_transactions', 'plan_ai_sessions', 'plan_collision_alerts', 'plan_confidence_forecasts', 'plan_governance_findings', 'plan_governance_rules', 'plan_health_scores', 'plan_intelligence_findings', 'plan_intelligence_rules', 'plan_pbs_nodes', 'plan_pfd_edges', 'plan_recovery_options', 'plan_scenario_task_snapshots', 'plan_scenarios', 'planner_plan_limits', 'platform_subscriptions', 'pm_template_entity_assignment', 'pm_template_field_links', 'pm_template_nodes', 'portfolio_projects', 'portfolios', 'practice_portfolio_projects', 'practice_programme_projects', 'practice_programmes', 'practice_teams', 'process_template_document_signatories', 'process_template_node_links', 'process_template_signatory_requirements', 'process_template_signatory_scope_policies', 'profiles', 'programme_projects', 'programmes', 'project_baselines', 'project_calendar_exceptions', 'project_calendars', 'project_memberships', 'project_micro_plans', 'project_regional_format_settings', 'project_roles', 'projects', 'regional_format_local_field_definitions', 'resource_calendar', 'resources', 'risks', 'roles', 'site_content', 'site_nav_links', 'site_pages', 'site_products', 'stakeholders', 'subscription_plans', 'task_dependencies', 'task_statuses', 'tasks', 'team_members', 'teams', 'timesheet_entries', 'user_projects', 'user_roles', 'user_signature_images', 'users');
-- END GENERATED planner_table_allowlist

-- Planner tables created by v1239 itself are always allowed.
INSERT INTO public.planner_table_allowlist (table_name) VALUES
  ('planner_plan_limits'), ('planner_menu_allowlist'), ('planner_table_allowlist'), ('menu_items'), ('role_menu_items')
ON CONFLICT (table_name) DO NOTHING;

-- Session helpers (evaluated once per statement through (SELECT …) in the policies).
CREATE OR REPLACE FUNCTION public.planner_session_is_planner()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT COALESCE(public.auth_user_account_edition() = 'planner', FALSE);
$$;

CREATE OR REPLACE FUNCTION public.planner_session_can_write()
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
  SELECT NOT public.planner_session_is_planner()
      OR public.auth_user_account_can_write(public.auth_user_current_account_id());
$$;
GRANT EXECUTE ON FUNCTION public.planner_session_is_planner() TO authenticated;
GRANT EXECUTE ON FUNCTION public.planner_session_can_write() TO authenticated;

-- Report (the Supabase SQL editor does not show NOTICE/WARNING, so the outcome is returned as
-- a result set at the end of this file).
CREATE TEMP TABLE IF NOT EXISTS v1251_report (table_name TEXT, table_owner TEXT, outcome TEXT, detail TEXT) ON COMMIT DROP;
TRUNCATE v1251_report;

-- Walls
-- Skips tables that belong to an extension (e.g. PostGIS spatial_ref_sys) and carries on past any
-- table this role may not alter (owned by another role), listing both in a WARNING — one such
-- table must not stop the whole wall from being built.
DO $$
DECLARE
  t RECORD;
  v_walled INT := 0;
  v_guarded INT := 0;
  v_no_rls TEXT[] := '{}';
  v_skipped TEXT[] := '{}';
BEGIN
  FOR t IN
    SELECT c.relname AS name, c.relrowsecurity AS rls, pg_get_userbyid(c.relowner) AS owner
      FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
       AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e')
     ORDER BY c.relname
  LOOP
    BEGIN
      -- Drop old versions first so re-runs reflect the current allow-list.
      EXECUTE format('DROP POLICY IF EXISTS planner_wall ON public.%I', t.name);
      EXECUTE format('DROP POLICY IF EXISTS planner_write_wall_ins ON public.%I', t.name);
      EXECUTE format('DROP POLICY IF EXISTS planner_write_wall_upd ON public.%I', t.name);
      EXECUTE format('DROP POLICY IF EXISTS planner_write_wall_del ON public.%I', t.name);

      IF NOT t.rls THEN
        v_no_rls := array_append(v_no_rls, t.name);
        INSERT INTO v1251_report VALUES (t.name, t.owner, 'NOT COVERED', 'RLS is disabled on this table');
        CONTINUE;
      END IF;

      IF EXISTS (SELECT 1 FROM public.planner_table_allowlist a WHERE a.table_name = t.name) THEN
        EXECUTE format('CREATE POLICY planner_write_wall_ins ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated WITH CHECK ((SELECT public.planner_session_can_write()))', t.name);
        EXECUTE format('CREATE POLICY planner_write_wall_upd ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated USING ((SELECT public.planner_session_can_write())) WITH CHECK ((SELECT public.planner_session_can_write()))', t.name);
        EXECUTE format('CREATE POLICY planner_write_wall_del ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated USING ((SELECT public.planner_session_can_write()))', t.name);
        v_guarded := v_guarded + 1;
        INSERT INTO v1251_report VALUES (t.name, t.owner, 'write-guarded', 'allow-listed');
      ELSE
        EXECUTE format('CREATE POLICY planner_wall ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (NOT (SELECT public.planner_session_is_planner())) WITH CHECK (NOT (SELECT public.planner_session_is_planner()))', t.name);
        v_walled := v_walled + 1;
        INSERT INTO v1251_report VALUES (t.name, t.owner, 'walled', NULL);
      END IF;
    EXCEPTION WHEN insufficient_privilege OR object_not_in_prerequisite_state THEN
      v_skipped := array_append(v_skipped, t.name || ' (' || SQLERRM || ')');
      INSERT INTO v1251_report VALUES (t.name, t.owner, 'NOT COVERED', SQLERRM || ' (current_user ' || current_user || ')');
    END;
  END LOOP;
  RAISE NOTICE 'v1251: % table(s) walled for planner sessions, % allow-listed table(s) write-guarded', v_walled, v_guarded;
  IF array_length(v_no_rls, 1) > 0 THEN
    RAISE WARNING 'v1251: % public table(s) have RLS disabled and are NOT covered by the wall: %', array_length(v_no_rls, 1), array_to_string(v_no_rls, ', ');
  END IF;
  IF array_length(v_skipped, 1) > 0 THEN
    RAISE WARNING 'v1251: % table(s) could not be changed by this role and are NOT covered: %', array_length(v_skipped, 1), array_to_string(v_skipped, '; ');
  END IF;
END $$;

-- Planner role rules on tasks (story 7.3)
CREATE OR REPLACE FUNCTION public.trg_planner_task_role_rules()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public SET row_security = off
AS $$
DECLARE
  v_project UUID := COALESCE(NEW.project_id, OLD.project_id);
  v_me UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN COALESCE(NEW, OLD); END IF; -- service jobs
  IF (SELECT a.product_edition FROM public.projects p JOIN public.accounts a ON a.id = p.account_id WHERE p.id = v_project) IS DISTINCT FROM 'planner' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF public.planner_can_manage_project(v_project) THEN RETURN COALESCE(NEW, OLD); END IF;

  IF TG_OP <> 'UPDATE' THEN
    RAISE EXCEPTION 'Only the project manager can add or delete tasks' USING ERRCODE = '42501';
  END IF;
  v_me := (SELECT id FROM public.users WHERE auth_user_id = auth.uid() LIMIT 1);
  IF OLD.assigned_to_user_id IS DISTINCT FROM v_me THEN
    RAISE EXCEPTION 'You can only update tasks assigned to you' USING ERRCODE = '42501';
  END IF;
  -- Progress fields only.
  IF (to_jsonb(NEW) - ARRAY['percentage_complete', 'actual_start_date', 'actual_end_date', 'actual_hours', 'completion_date',
                             'updated_at', 'updated_by', 'row_version'])
     IS DISTINCT FROM
     (to_jsonb(OLD) - ARRAY['percentage_complete', 'actual_start_date', 'actual_end_date', 'actual_hours', 'completion_date',
                             'updated_at', 'updated_by', 'row_version']) THEN
    RAISE EXCEPTION 'You can update progress on your tasks; ask the project manager to change the plan' USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_planner_task_role_rules ON public.tasks;
CREATE TRIGGER trg_planner_task_role_rules BEFORE INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW EXECUTE FUNCTION public.trg_planner_task_role_rules();

INSERT INTO database_tables (table_name, table_description, is_system_table, is_active)
VALUES ('planner_table_allowlist', 'Public tables a Project Planner session may use (generated); all others are walled for planner accounts', true, true)
ON CONFLICT (table_name) DO UPDATE SET table_description = EXCLUDED.table_description, is_system_table = EXCLUDED.is_system_table, updated_at = NOW();

NOTIFY pgrst, 'reload schema';

-- What the wall covers (visible in the SQL editor): totals first, then every table NOT covered.
SELECT table_name, table_owner, outcome, detail FROM (
  SELECT 0 AS k, 'TOTAL' AS table_name, NULL::text AS table_owner, outcome, COUNT(*)::text AS detail
    FROM v1251_report GROUP BY outcome
  UNION ALL
  SELECT 1, table_name, table_owner, outcome, detail FROM v1251_report WHERE outcome = 'NOT COVERED'
) r
ORDER BY k, outcome, table_name;
