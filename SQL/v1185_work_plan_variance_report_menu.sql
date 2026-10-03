-- ============================================================================
-- v1185: Work Plan vs Timesheet Variance Report — new Reports taxonomy leaf (v1180)
-- ============================================================================
-- Same pattern as v1055's Reports taxonomy expansion — a new dedicated report page under the
-- existing Reports sidebar group (plat_grp_pm_reporting), granted to every role already
-- granted the group itself.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT v.id, v.menu_code, v.menu_label, v.menu_description, v.route_path,
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
       (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
       v.sort_order, 'structured', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  (gen_random_uuid(), 'plat_pm_rep_work_plan_variance', 'Work Plan Variance', 'Planned (Work Plan) vs actual (Timesheet) hours per team member, for Time & Material projects (taxonomy §3, Reports; v1180).', '/platform/reports/work-plan-variance', 140, 'scale')
) AS v(id, menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant to every role already granted the Reports group itself.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_grp_pm_reporting'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_rep_work_plan_variance' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1185: Work Plan Variance report menu item added under Reports.';
  RAISE NOTICE '================================================';
END $$;
