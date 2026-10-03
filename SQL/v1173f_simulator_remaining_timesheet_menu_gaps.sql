-- ================================================
-- File: v1173f_simulator_remaining_timesheet_menu_gaps.sql
-- Description: Closes the two remaining Simulator sidebar gaps for v1173 — project-level
--              Timesheet Settings and the Timesheet Overview report. Both routes/pages already
--              existed (built in the same change as their Platform equivalents) but had no
--              Simulator sidebar entry point.
-- Version: 1.0
-- Database: PostgreSQL 15+ (Supabase)
-- ================================================

-- Purpose:
-- 1) Project-level Timesheet Settings: Simulator has no "Project Setup" sidebar section at all
--    (confirmed — unlike v1061's Regional & Format Settings, which deferred sidebar wiring for
--    an EXISTING Project Setup branch, there's no branch here to defer into). Nested under
--    'sim_pmo_cat_admin' instead, labelled to make clear it's the project-override page, not
--    the organisation one (which already has its own leaf there, v1173e).
-- 2) Timesheet Overview report: Simulator's reporting menu is shaped differently from
--    Platform's generic "Reports" taxonomy (v1055, never mirrored to Simulator for any of its
--    9 leaves). The closest existing GROUP (not a flat single-destination leaf) is
--    'sim_grp_pm_del_reporting' (Checkpoint/Highlight/Exception/End Stage/End Project Reports) —
--    nested there as a sibling report type.

-- ── 1) Project-level Timesheet Settings — nested under sim_pmo_cat_admin ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim-pmo-project-timesheet-settings', 'Timesheet Settings (Project Override)',
       'Override the organisation''s standard daily hours, overtime maximums, or working days for your current project',
       '/simulator/project-setup/timesheet-settings',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_pmo_cat_admin' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       2, 99, 'universal', 'settings', TRUE, TRUE, NOW(), NOW()
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

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), r.id, mi.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.menu_items mi
CROSS JOIN public.roles r
WHERE mi.menu_code = 'sim-pmo-project-timesheet-settings'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
  AND COALESCE(r.is_deleted, FALSE) = FALSE
  -- Broader than the org-level leaf's PMO-admin-only tier — a Project Manager needs to reach
  -- their own project's override, same delivery-tier grant as pmo-admin-assignment-roles.
  AND lower(replace(r.role_name, ' ', '_')) IN (
    'pmo_admin', 'org_admin', 'system_admin', 'super_admin', 'account_owner',
    'portfolio_manager', 'programme_manager', 'project_manager', 'team_manager',
    'pm_portfolio_manager', 'pm_programme_manager', 'pm_project_manager', 'pm_team_manager'
  )
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET
  can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── 2) Timesheet Overview report — nested under sim_grp_pm_del_reporting ──

INSERT INTO public.menu_items (
  id, menu_code, menu_label, route_path, parent_menu_id, menu_level, sort_order,
  methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'sim_pm_s_timesheet_overview', 'Timesheet Overview',
       '/simulator/reports/timesheet-overview',
       (SELECT id FROM public.menu_items WHERE menu_code = 'sim_grp_pm_del_reporting' AND COALESCE(is_deleted, FALSE) = FALSE LIMIT 1),
       3, 60, 'structured', 'clock', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'sim_pm_s_timesheet_overview' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant to every role already granted the parent reporting group.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'sim_grp_pm_del_reporting'
JOIN public.menu_items dst ON dst.menu_code = 'sim_pm_s_timesheet_overview' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ================================================
-- VERIFICATION
-- ================================================

DO $$
DECLARE
    v_settings_menu_id UUID;
    v_overview_menu_id UUID;
    v_overview_grant_count INTEGER;
BEGIN
    SELECT id INTO v_settings_menu_id FROM public.menu_items WHERE menu_code = 'sim-pmo-project-timesheet-settings' AND COALESCE(is_deleted, FALSE) = FALSE;
    SELECT id INTO v_overview_menu_id FROM public.menu_items WHERE menu_code = 'sim_pm_s_timesheet_overview' AND COALESCE(is_deleted, FALSE) = FALSE;

    SELECT COUNT(*) INTO v_overview_grant_count
    FROM public.role_menu_items WHERE menu_item_id = v_overview_menu_id AND can_view = TRUE;

    RAISE NOTICE '================================================';
    RAISE NOTICE 'Simulator project timesheet settings menu item: %', v_settings_menu_id;
    RAISE NOTICE 'Simulator timesheet overview menu item: % (roles granted: %)', v_overview_menu_id, v_overview_grant_count;
    RAISE NOTICE '================================================';
END $$;
