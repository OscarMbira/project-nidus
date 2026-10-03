-- ================================================
-- File: v1167_simulator_pmo_reference_data_menu_and_routes.sql
-- Description: Sidebar menu entries + role grants for Simulator's PMO reference-data pages
--              (Project Types, Project Statuses, Funding Sources, Budget Categories,
--              Portfolio Categories, Assignment Roles) — now routed in
--              apps/simulator/src/routes/simulatorRoutes.jsx under /simulator/pmo/*.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Prerequisites: v909_simulator_manage_roles_menu.sql (defines the 'sim_pmo_cat_admin' parent)

-- Purpose:
-- These 6 pages (apps/simulator/src/pages/platform-app/{ProjectTypes,ProjectStatuses,
-- FundingSources,BudgetCategories,PortfolioCategories,AssignmentRoles}.jsx) already existed
-- as files and were already lazy-imported in Simulator's route files, but were never actually
-- mounted as <Route> elements — genuinely unreachable, discovered while building the
-- Assignment Roles feature (v1164-v1166). Also fixed: PmoConfigurationHome.jsx's "Reference
-- Data" card previously pointed at /simulator/pmo/dashboard (the PMO analytics dashboard, not
-- a reference-data page) — now points at /simulator/pmo/project-types, and a new "Assignment
-- Roles" card was added alongside it.
--
-- Role grants: the 5 pre-existing siblings get the same PMO-admin-only tier Platform's
-- equivalents use (v727 precedent). Assignment Roles gets the broader PMO/PM/Team Manager
-- grant, matching its Platform counterpart (v1166) — deliberately, per explicit user request.

-- ── Menu items — nested under the Simulator 'sim_pmo_cat_admin' parent (Practice Administration) ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.mc, v.ml, v.md, v.rp,
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('sim-pmo-project-types',       'Project Types',       'Project type definitions',                 '/simulator/pmo/project-types',       60, 'layers'),
  ('sim-pmo-project-statuses',    'Project Statuses',    'Project status definitions',                '/simulator/pmo/project-statuses',    70, 'layers'),
  ('sim-pmo-funding-sources',     'Funding Sources',     'Funding source options for budgets',        '/simulator/pmo/funding-sources',     80, 'dollar-sign'),
  ('sim-pmo-budget-categories',   'Budget Categories',   'Budget category options',                   '/simulator/pmo/budget-categories',   90, 'dollar-sign'),
  ('sim-pmo-portfolio-categories','Portfolio Categories','Portfolio category options',                '/simulator/pmo/portfolio-categories',93, 'layers'),
  ('sim-pmo-assignment-roles',    'Assignment Roles',    'Role options offered when assigning a resource', '/simulator/pmo/assignment-roles', 95, 'user-cog')
) AS v(mc, ml, md, rp, so, ic)
ON CONFLICT (menu_code) DO UPDATE SET
  menu_label = EXCLUDED.menu_label,
  menu_description = EXCLUDED.menu_description,
  route_path = EXCLUDED.route_path,
  parent_menu_id = EXCLUDED.parent_menu_id,
  menu_icon = EXCLUDED.menu_icon,
  sort_order = EXCLUDED.sort_order,
  is_visible = TRUE,
  is_active = TRUE,
  is_deleted = FALSE,
  updated_at = NOW();

-- ── Role grants: the 5 pre-existing siblings — PMO-admin tier only (matches Platform's v727) ──

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code IN (
    'sim-pmo-project-types', 'sim-pmo-project-statuses', 'sim-pmo-funding-sources',
    'sim-pmo-budget-categories', 'sim-pmo-portfolio-categories'
  )
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN ('pmo_admin', 'system_admin', 'account_owner')
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── Role grants: Assignment Roles — broader PMO/PM/Team Manager tier (matches v1166) ──

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim-pmo-assignment-roles'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager',
    'team_lead', 'pm_team_lead', 'team_member', 'pm_team_member'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_menu_count INTEGER;
    v_grant_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_menu_count
    FROM public.menu_items
    WHERE menu_code LIKE 'sim-pmo-%' AND menu_code IN (
      'sim-pmo-project-types', 'sim-pmo-project-statuses', 'sim-pmo-funding-sources',
      'sim-pmo-budget-categories', 'sim-pmo-portfolio-categories', 'sim-pmo-assignment-roles'
    )
    AND COALESCE(is_deleted, FALSE) = FALSE;

    SELECT COUNT(*) INTO v_grant_count
    FROM public.role_menu_items rmi
    JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
    WHERE mi.menu_code IN (
      'sim-pmo-project-types', 'sim-pmo-project-statuses', 'sim-pmo-funding-sources',
      'sim-pmo-budget-categories', 'sim-pmo-portfolio-categories', 'sim-pmo-assignment-roles'
    )
    AND rmi.can_view = TRUE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Simulator PMO reference-data menu items created: % (expected 6)', v_menu_count;
    RAISE NOTICE 'Total role grants across all 6: %', v_grant_count;
    RAISE NOTICE '================================================';
END $$;
