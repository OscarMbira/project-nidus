-- ============================================================================
-- v1036: Quality taxonomy expansion (Platform PM sidebar)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3, Quality branch: Quality Plan
-- (Objectives/Standards/Criteria/Responsibilities), Quality Reviews (already wired), Acceptance
-- (Acceptance Criteria/Reviews/Accepted/Rejected-Rework), Non-Conformance (Register/Corrective
-- Action/Preventive Action/Closure).
--
-- Live audit found:
--   - Quality Plan: QMSView.jsx already covers Standards/Methods/Roles/Metrics/Tools/Records/
--     Reports (qmsQuality*Service.js family) — already correctly routed at the flat /platform/qms
--     using usePlatformProjectId(), just never linked from the Quality group.
--   - Acceptance: AcceptanceTestingPage.jsx already covers this, already routed and
--     usePlatformProjectId()-safe at /platform/ppd/acceptance — just never linked.
--   - Non-Conformance: public.quality_defects (v32) already has is_non_conformance,
--     corrective_action, preventive_action, closure_date columns, and
--     qualityManagementService.js already has full CRUD (getQualityDefects/saveQualityDefect/
--     deleteQualityDefect) — but ZERO frontend consumer anywhere in the app. This migration's
--     companion frontend change adds NonConformanceRegisterPage.jsx (new) at
--     /platform/quality/non-conformance to close that gap.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT gen_random_uuid(), v.menu_code, v.menu_label, v.menu_description, v.route_path,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_quality' AND COALESCE(is_deleted, FALSE) = FALSE),
  (SELECT menu_level FROM public.menu_items WHERE menu_code = 'plat_pm_quality_reg' AND COALESCE(is_deleted, FALSE) = FALSE),
  v.sort_order, 'universal', v.menu_icon, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_quality_plan',  'Quality Plan',     'Quality objectives, standards, acceptance criteria, and responsibilities (taxonomy §3, Quality > Quality Plan).', '/platform/qms', 5, 'clipboard-list'),
  ('plat_pm_quality_accept','Acceptance',       'Acceptance criteria, reviews, and accepted/rejected outcomes (taxonomy §3, Quality > Acceptance).', '/platform/ppd/acceptance', 25, 'check-circle'),
  ('plat_pm_quality_nc',    'Non-Conformance',  'Non-conformance register with corrective action, preventive action, and closure (taxonomy §3, Quality > Non-Conformance).', '/platform/quality/non-conformance', 35, 'alert-triangle')
) AS v(menu_code, menu_label, menu_description, route_path, sort_order, menu_icon)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.menu_code AND COALESCE(is_deleted, FALSE) = FALSE
);

INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_quality_reg'
JOIN public.menu_items dst ON dst.menu_code IN ('plat_pm_quality_plan', 'plat_pm_quality_accept', 'plat_pm_quality_nc')
  AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1036: Quality — Quality Plan, Acceptance, Non-Conformance leaves added';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, sort_order FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_quality', 'plat_pm_quality_plan', 'plat_pm_quality_reg', 'plat_pm_quality_accept', 'plat_pm_quality_nc')
--   ORDER BY sort_order;
