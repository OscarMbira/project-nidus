-- ============================================================================
-- v1045: Add "Resource Calendar" menu item under Resources
-- ============================================================================
-- User request (2026-09-11): the resource_calendar table (v27) and a full per-resource
-- ResourceCalendar.jsx component already existed, but were only reachable from inside each
-- individual resource's own detail page — no project-wide "see every resource's availability at
-- once" entry point existed anywhere in the sidebar. New page ResourceCalendarOverviewPage.jsx
-- (/platform/resources/calendar) adds that directory view, reusing the existing modal for
-- per-resource editing rather than duplicating it.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_resource_calendar', 'Resource Calendar',
  'Availability across all resources for the month, with quick access to each resource''s own calendar (taxonomy §3, Resources).',
  '/platform/resources/calendar',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level + 1 FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE),
  30, 'universal', 'calendar', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_resource_calendar' AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant to every role that already has the Resources group itself granted.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_resources'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_resource_calendar' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1045: Resource Calendar added under Resources';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, is_active FROM public.menu_items WHERE menu_code = 'plat_pm_resource_calendar';
--   SELECT count(*) FROM public.role_menu_items rmi JOIN public.menu_items mi ON mi.id = rmi.menu_item_id
--   WHERE mi.menu_code = 'plat_pm_resource_calendar' AND rmi.can_view AND rmi.is_active;
