-- ============================================================================
-- v1055: Reports taxonomy expansion — the 9 missing Reports leaves
-- ============================================================================
-- Audit (2026-09-12) found the "Reports" sidebar group (plat_grp_pm_reporting) only exposed
-- Report Library (a literal "Coming Soon" placeholder — since rebuilt as a real hub in this
-- change), Report Builder, Analytics Dashboards, and Custom Metrics — i.e. only "Custom
-- Reports" of the taxonomy's 10 report types (Documentation/Core_PM_and_Industry_Menu_
-- Taxonomy.md §3, Reports) had a real home. This migration adds the other 9 as their own
-- findable sidebar menu items under the same group, per the user's explicit choice: build all
-- 9 now, each independently clickable (same pattern as the Project Closure taxonomy leaves in
-- v1052-v1054).
--
-- Four are brand-new dedicated report pages (no existing register covers them):
--   Project Status Report, Executive Report, Schedule Report, Cost Report
-- Five are cross-listings of already-live registers (thin wrapper — same register, a second
-- taxonomy location, same precedent as RAID Assumptions / Planning Assumptions):
--   RAID Report        -> /platform/raid-log             (plat_pm_raid_log, v879)
--   Change Report       -> /platform/change-requests       (v1033 Change Control hub)
--   Resource Report      -> /platform/resources             (plat_pm_resource_dir, v681)
--   Quality Report       -> /pm/controls/quality-register    (plat_pm_quality_reg, v879)
--   Testing Report        -> /platform/testing/cases          (plat_pm_testing_cases_repo, v1037)
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
  (gen_random_uuid(), 'plat_pm_rep_status',   'Project Status Report', 'Overview, milestones, top risks, open issues, and recent changes (taxonomy §3, Reports).', '/platform/reports/status', 50, 'file-text'),
  (gen_random_uuid(), 'plat_pm_rep_exec',     'Executive Report',      'Budget, schedule, risk, and change performance at a glance (taxonomy §3, Reports).', '/platform/reports/executive', 60, 'bar-chart-2'),
  (gen_random_uuid(), 'plat_pm_rep_schedule', 'Schedule Report',       'Milestones and tasks with status and due dates (taxonomy §3, Reports).', '/platform/reports/schedule', 70, 'calendar'),
  (gen_random_uuid(), 'plat_pm_rep_cost',     'Cost Report',           'Budget vs actual spend and the cost actuals ledger (taxonomy §3, Reports).', '/platform/reports/cost', 80, 'dollar-sign'),
  (gen_random_uuid(), 'plat_pm_rep_raid',     'RAID Report',           'Risks, assumptions, issues, and dependencies register (taxonomy §3, Reports). Cross-listing of the RAID Log.', '/platform/raid-log', 90, 'shield-alert'),
  (gen_random_uuid(), 'plat_pm_rep_change',   'Change Report',         'Change requests, assessment, decisions, and implementation (taxonomy §3, Reports). Cross-listing of Change Requests.', '/platform/change-requests', 100, 'git-branch'),
  (gen_random_uuid(), 'plat_pm_rep_resource', 'Resource Report',       'Resource directory and allocation across the project (taxonomy §3, Reports). Cross-listing of the Resource Directory.', '/platform/resources', 110, 'users'),
  (gen_random_uuid(), 'plat_pm_rep_quality',  'Quality Report',        'Quality register — activities, inspections, and reviews (taxonomy §3, Reports). Cross-listing of the Quality Register.', '/pm/controls/quality-register', 120, 'check-circle'),
  (gen_random_uuid(), 'plat_pm_rep_testing',  'Testing Report',        'Test case repository and execution results (taxonomy §3, Reports). Cross-listing of Test Cases.', '/platform/testing/cases', 130, 'clipboard-check')
) AS v(id, menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grant each to every role already granted the Reports group itself.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_grp_pm_reporting'
JOIN public.menu_items dst ON dst.menu_code IN (
  'plat_pm_rep_status', 'plat_pm_rep_exec', 'plat_pm_rep_schedule', 'plat_pm_rep_cost',
  'plat_pm_rep_raid', 'plat_pm_rep_change', 'plat_pm_rep_resource', 'plat_pm_rep_quality', 'plat_pm_rep_testing'
) AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1055: 9 Reports taxonomy leaves added under Reports (plat_grp_pm_reporting)';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_rep_status','plat_pm_rep_exec','plat_pm_rep_schedule','plat_pm_rep_cost',
--                        'plat_pm_rep_raid','plat_pm_rep_change','plat_pm_rep_resource','plat_pm_rep_quality','plat_pm_rep_testing');
