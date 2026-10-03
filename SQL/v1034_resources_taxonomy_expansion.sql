-- ============================================================================
-- v1034: Resources taxonomy expansion (Platform PM sidebar)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3, Resources branch: Resource Plan
-- (Demand/Supply/Skills Requirements/Forecast), Assignments (Project/Work Package/Role
-- Assignments/Assignment History), Capacity (Availability/Allocation/Over-allocation/Forecast),
-- Timesheets (Time Entry/Approvals/Exceptions/Utilisation).
--
-- Live audit found:
--   - Capacity: ResourceCapacity.jsx already covers Availability/Allocation/Over-allocation/
--     Forecast (is_over_allocated, planned_allocation_hours fields) — already wired, no gap.
--   - Assignments: plat_pm_manage_members already wired (v966ah) — no gap.
--   - Timesheets: v966ag already re-parented plat_tm_timesheets ("Time Entry") and
--     plat_tl_timesheet_mgmt ("Approvals") under plat_pm_resources — but these codes came from
--     the TM/TL layouts and were never independently granted to PM-scoped roles, so they
--     silently don't render for a "Project Manager" role despite being correctly parented (same
--     "leaf/group missing its own grant" bug class as v1021/v1030). Their own pages
--     (MyTimesheetsPage.jsx / TeamTimesheetsPage.jsx) already have Entries/Exceptions/
--     Utilisation tabs (built earlier this session), so fixing the grant closes Exceptions and
--     Utilisation too — no new UI needed.
--   - Resource Plan: ResourceForecasts.jsx is a real, comprehsnive page (demand_supply_gap_count,
--     "Forecast resource demand", "Balanced supply/demand") covering Demand/Supply/Forecast, but
--     was never registered in any route — completely dead code until this migration's companion
--     frontend change added a route for it.
-- ============================================================================

-- ── 1. Fix the Timesheets grant gap ──────────────────────────────────────────────────────────

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_capacity'
JOIN public.menu_items dst ON dst.menu_code IN ('plat_tm_timesheets', 'plat_tl_timesheet_mgmt')
  AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- ── 2. Add the missing "Resource Plan" leaf ──────────────────────────────────────────────────

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), 'plat_pm_resource_plan', 'Resource Plan',
  'Resource demand, supply, skills requirements, and forecast across projects (taxonomy §3, Resources > Resource Plan).',
  '/platform/resources/plan',
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_resources' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level FROM public.menu_items WHERE menu_code = 'plat_pm_capacity' AND COALESCE(is_deleted, FALSE) = FALSE),
  5, 'universal', 'trending-up', TRUE, TRUE, NOW(), NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = 'plat_pm_resource_plan' AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_capacity'
JOIN public.menu_items dst ON dst.menu_code = 'plat_pm_resource_plan' AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1034: Timesheets (Time Entry/Approvals) granted to PM roles; Resource Plan leaf added';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT mi.menu_code, mi.menu_label, mi.route_path,
--          (SELECT COUNT(*) FROM public.role_menu_items rmi WHERE rmi.menu_item_id = mi.id AND rmi.can_view = TRUE AND rmi.is_active = TRUE AND COALESCE(rmi.is_deleted, FALSE) = FALSE) AS grant_count
--   FROM public.menu_items mi
--   WHERE mi.menu_code IN ('plat_pm_resources', 'plat_pm_resource_plan', 'plat_pm_capacity', 'plat_pm_resource_dir', 'plat_pm_manage_members', 'plat_tm_timesheets', 'plat_tl_timesheet_mgmt')
--   ORDER BY mi.sort_order;
