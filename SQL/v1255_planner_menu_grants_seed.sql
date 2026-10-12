-- ============================================================================
-- v1255 (seed): role grants for the pln_ menus — v1239 Slice 5.2a (D11)
-- Run after v1254 and v1252 (plan_viewer). Idempotent.
--   account_owner   everything
--   project_manager everything except Billing, Upgrade and the two rules screens
--   team_member     Home, Projects, Schedule (view), Workload, Timesheets
--   plan_viewer     Home, Projects, Schedule (view), Planning Hub (view)
-- "View" grants set can_use = FALSE; writes are also refused by the database wall (v1251).
-- Group rows are granted whenever any of their children is, so the tree renders.
-- ============================================================================

WITH spec(role_name, menu_code, can_use) AS (
  SELECT 'account_owner', menu_code, TRUE FROM public.menu_items WHERE menu_code LIKE 'pln\_%'
  UNION ALL
  SELECT 'project_manager', menu_code, TRUE FROM public.menu_items
   WHERE menu_code LIKE 'pln\_%'
     AND menu_code NOT IN ('pln_settings_billing', 'pln_settings_upgrade', 'pln_settings_intelligence_rules', 'pln_settings_governance_rules')
  UNION ALL
  SELECT 'team_member', menu_code, menu_code IN ('pln_timesheets', 'pln_timesheets_my_week') FROM public.menu_items
   WHERE menu_code IN ('pln_home', 'pln_projects', 'pln_workload', 'pln_timesheets', 'pln_timesheets_my_week', 'pln_schedule')
      OR menu_code LIKE 'pln\_schedule\_%'
  UNION ALL
  SELECT 'plan_viewer', menu_code, FALSE FROM public.menu_items
   WHERE menu_code IN ('pln_home', 'pln_projects', 'pln_schedule', 'pln_hub')
      OR menu_code LIKE 'pln\_schedule\_%' OR menu_code LIKE 'pln\_hub\_%'
)
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, is_deleted, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, s.can_use, TRUE, FALSE, NOW(), NOW()
FROM spec s
JOIN public.roles r ON r.role_name = s.role_name AND r.account_id IS NULL AND r.is_active
JOIN public.menu_items mi ON mi.menu_code = s.menu_code AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = EXCLUDED.can_use, is_active = TRUE, is_deleted = FALSE, updated_at = NOW();

DO $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT ro.role_name, COUNT(*) AS n
      FROM public.role_menu_items rmi JOIN public.roles ro ON ro.id = rmi.role_id JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
     WHERE mi.menu_code LIKE 'pln\_%' AND rmi.is_active GROUP BY ro.role_name ORDER BY 1
  LOOP
    RAISE NOTICE 'v1255: % has % planner menu item(s)', r.role_name, r.n;
  END LOOP;
END $$;
