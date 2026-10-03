-- ============================================================================
-- v1056: Group Report Library / Report Builder / Analytics Dashboards / Custom
-- Metrics into their own "Reporting Tools" sub-section under Reports
-- ============================================================================
-- Follow-up to v1055. User feedback (live sidebar screenshot, 2026-09-12): once the 9 new
-- report-type leaves were added as flat siblings, the original 4 items (Report Library, Report
-- Builder, Analytics Dashboards, Custom Metrics — the reporting *engine*/tooling, as opposed to
-- the 9 report *outputs*) got visually lost among them. Fix: introduce one new sub-group node
-- ("Reporting Tools") under Reports and re-parent those 4 existing items under it, leaving the
-- 9 report-type leaves as direct children of Reports. Grants on the 4 existing items are
-- untouched (only their parent_menu_id/menu_level move); the new sub-group node is granted to
-- every role that already has the Reports group itself, same pattern as v1052-v1055.
-- ============================================================================

-- 1. New sub-group node
INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), 'plat_pm_rep_tools', 'Reporting Tools',
       'Report Library, Report Builder, Analytics Dashboards, and Custom Metrics — the reporting engine, as opposed to the individual report types below.',
       NULL,
       (SELECT id FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
       (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_grp_pm_reporting' AND COALESCE(is_deleted, FALSE) = FALSE),
       5, 'structured', 'folder-cog', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_rep_tools' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- 2. Re-parent the 4 existing tooling items under the new sub-group (grants untouched)
UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_rep_tools' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_rep_tools' AND COALESCE(is_deleted, FALSE) = FALSE),
    updated_at = NOW()
WHERE menu_code IN ('plat_pm_rep_library', 'plat_pm_rep_builder', 'plat_pm_analytics', 'plat_pm_custom_metrics')
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- 3. Grant the new sub-group to every role already granted the Reports group itself.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_grp_pm_reporting'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_rep_tools' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1056: Report Library/Builder/Analytics Dashboards/Custom Metrics grouped under new Reporting Tools sub-section';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, parent_menu_id, menu_level FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_rep_tools','plat_pm_rep_library','plat_pm_rep_builder','plat_pm_analytics','plat_pm_custom_metrics');
