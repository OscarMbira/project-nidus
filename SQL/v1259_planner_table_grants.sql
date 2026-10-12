-- ============================================================================
-- v1259: table privileges for the Project Planner tables (fix found in the owner test, 2026-10-11)
-- v1247 / v1249 / v1251 created these tables with RLS read policies but no GRANT, so the API
-- roles got "permission denied for table …" (e.g. the Planner pricing page). Those files now
-- include the grants; this file applies them to a database where they already ran. Idempotent.
-- Rows are still filtered by each table's RLS policy.
-- ============================================================================
GRANT SELECT ON public.planner_plan_limits TO anon, authenticated;     -- public pricing page
GRANT SELECT ON public.planner_menu_allowlist TO authenticated;        -- downgrade warning, Admin
GRANT SELECT ON public.planner_table_allowlist TO authenticated;       -- wall diagnostics
GRANT ALL ON public.planner_plan_limits, public.planner_menu_allowlist, public.planner_table_allowlist TO service_role;
NOTIFY pgrst, 'reload schema';

-- Check: each row should show anon/authenticated SELECT as listed above.
SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
  FROM information_schema.role_table_grants
 WHERE table_schema = 'public'
   AND table_name IN ('planner_plan_limits', 'planner_menu_allowlist', 'planner_table_allowlist')
   AND grantee IN ('anon', 'authenticated')
 GROUP BY table_name, grantee ORDER BY 1, 2;
