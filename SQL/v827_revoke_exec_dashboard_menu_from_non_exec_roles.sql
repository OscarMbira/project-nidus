-- =============================================================================
-- v827: Remove "Executive Dashboard" from Project Manager (and other non-exec)
--        sidebars
-- Plan: projectplan/v826_pm_pmo_dashboard_access_gate_fix_plan.md
--
-- Problem: v683 section 6 granted project_manager EVERY 'plat_%' menu item apart
-- from an exclusion list. That list excludes 'plat_sec_exec%' but NOT
-- 'plat_exec_dashboard', so the org-wide Executive Dashboard
-- (/platform/executive/dashboard) shows in the Project Manager sidebar under
-- "Dashboard" and pulls PMs out of their project-scoped /pm/dashboard.
--
-- Fix: revoke plat_exec_dashboard from every role except the executive /
-- PMO / org-admin audience it was built for. Application-side, the page also
-- redirects non-executive users to /pm/dashboard (ExecutiveDashboard.jsx).
-- Prerequisites: v681 (menu item), v683 (role assignments)
-- =============================================================================

UPDATE public.role_menu_items rmi
SET can_view   = FALSE,
    can_use    = FALSE,
    is_active  = FALSE,
    updated_at = NOW()
FROM public.menu_items mi,
     public.roles r
WHERE rmi.menu_item_id = mi.id
  AND rmi.role_id = r.id
  AND mi.menu_code = 'plat_exec_dashboard'
  AND r.role_name NOT IN (
      'executive',
      'pmo_admin',
      'org_admin',
      'system_admin',
      'super_admin',
      'account_owner'
  );

-- Report what remains visible (executive/PMO audience only)
DO $$
DECLARE
    v_remaining INT;
    v_revoked   INT;
BEGIN
    SELECT COUNT(*) INTO v_remaining
    FROM public.role_menu_items rmi
    JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
    WHERE mi.menu_code = 'plat_exec_dashboard'
      AND rmi.is_active = TRUE;

    SELECT COUNT(*) INTO v_revoked
    FROM public.role_menu_items rmi
    JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
    WHERE mi.menu_code = 'plat_exec_dashboard'
      AND rmi.is_active = FALSE;

    RAISE NOTICE 'v827 applied: plat_exec_dashboard active grants = %, revoked grants = %',
        v_remaining, v_revoked;
END $$;
