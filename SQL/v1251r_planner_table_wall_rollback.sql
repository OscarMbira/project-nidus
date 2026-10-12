-- ============================================================================
-- v1251r: roll back the Project Planner database wall (v1251). Kill-switch level: planner
-- sessions are no longer walled (use together with turning planner_public_signup off).
-- Leaves planner_table_allowlist in place (harmless) so v1251 can be re-applied.
-- ============================================================================
DO $$
DECLARE t RECORD;
BEGIN
  -- Only tables that actually carry a planner policy (so other owners' tables are never touched).
  FOR t IN SELECT DISTINCT c.relname AS name
             FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public' AND p.polname IN ('planner_wall', 'planner_write_wall_ins', 'planner_write_wall_upd', 'planner_write_wall_del')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS planner_wall ON public.%I', t.name);
    EXECUTE format('DROP POLICY IF EXISTS planner_write_wall_ins ON public.%I', t.name);
    EXECUTE format('DROP POLICY IF EXISTS planner_write_wall_upd ON public.%I', t.name);
    EXECUTE format('DROP POLICY IF EXISTS planner_write_wall_del ON public.%I', t.name);
  END LOOP;
END $$;
DROP TRIGGER IF EXISTS trg_planner_task_role_rules ON public.tasks;
NOTIFY pgrst, 'reload schema';
DO $$ BEGIN RAISE NOTICE 'v1251r: planner wall removed'; END $$;
