-- ============================================================================
-- v1173d: Timesheet Overview Report — Reports taxonomy leaf
-- ============================================================================
-- New leaf under the same "Reports" group (plat_grp_pm_reporting) as v1055's 9 leaves — role-
-- tiered (PMO Admin/Account Owner see it org-wide; PM/TM see it scoped to their own projects,
-- enforced client-side in TimesheetOverviewReport.jsx / timesheetOverviewService.js, not by a
-- separate menu grant — every role already granted the Reports group gets this leaf too, same
-- as v1055).
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_pm_rep_timesheet_overview', 'Timesheet Overview',
       'Hours, overtime, and onsite/offshore patterns by project and person — organisation-wide for PMO, scoped to your own projects for PM/Team Manager.',
       '/platform/reports/timesheet-overview',
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
       (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
       140, 'structured', 'clock', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_rep_timesheet_overview' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_grp_pm_reporting'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_rep_timesheet_overview' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1173d: Timesheet Overview report leaf added under Reports (plat_grp_pm_reporting)';
  RAISE NOTICE '================================================';
END $$;
