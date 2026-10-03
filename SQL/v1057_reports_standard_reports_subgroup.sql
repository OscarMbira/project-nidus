-- ============================================================================
-- v1057: Group the 9 individual report-type leaves into a "Standard Reports"
-- sub-section under Reports (mirrors v1056's "Reporting Tools" sub-group)
-- ============================================================================
-- Follow-up to v1055/v1056. User feedback (live sidebar screenshot, 2026-09-14): with
-- "Reporting Tools" now grouping the 4 engine/tooling items, the 9 report-type leaves
-- (Project Status Report ... Testing Report) sit as a long flat list of direct siblings under
-- Reports. Same fix as v1056: introduce one new sub-group node ("Standard Reports") under
-- Reports and re-parent the 9 report-type leaves under it. Grants on the 9 items are untouched
-- (only their parent_menu_id/menu_level move); the new sub-group node is granted to every role
-- that already has the Reports group itself, same pattern as v1052-v1056.
-- ============================================================================

-- 1. New sub-group node
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_pm_rep_standard', 'Standard Reports',
       'Project Status, Executive, Schedule, Cost, RAID, Change, Resource, Quality, and Testing Reports — the individual report outputs, as opposed to the Reporting Tools above.',
       NULL,
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
       (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
       50, 'structured', 'file-bar-chart', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_rep_standard' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 2. Re-parent the 9 report-type leaves under the new sub-group (grants untouched, sort order
-- kept as-is from v1055 so they stay in taxonomy order inside the new sub-group)
UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_rep_standard' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_rep_standard' AND COALESCE(is_deleted, FALSE) = FALSE),
    updated_at = NOW()
WHERE menu_code IN (
  'plat_pm_rep_status', 'plat_pm_rep_exec', 'plat_pm_rep_schedule', 'plat_pm_rep_cost',
  'plat_pm_rep_raid', 'plat_pm_rep_change', 'plat_pm_rep_resource', 'plat_pm_rep_quality', 'plat_pm_rep_testing'
) AND COALESCE(is_deleted, FALSE) = FALSE;

-- 3. Grant the new sub-group to every role already granted the Reports group itself.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_grp_pm_reporting'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_rep_standard' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1057: 9 report-type leaves grouped under new Standard Reports sub-section';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, parent_menu_id, menu_level FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_rep_standard','plat_pm_rep_status','plat_pm_rep_exec','plat_pm_rep_schedule',
--                        'plat_pm_rep_cost','plat_pm_rep_raid','plat_pm_rep_change','plat_pm_rep_resource',
--                        'plat_pm_rep_quality','plat_pm_rep_testing');
