-- ============================================================================
-- v1050: Add Measures, Realisation Tracking, and Post-Implementation Review
-- under the Benefits taxonomy group (taxonomy §3)
-- ============================================================================
-- Documentation/Core_PM_and_Industry_Menu_Taxonomy.md §3 Benefits: Benefits Register /
-- Benefit Owners / Measures / Target Dates / Realisation Tracking / Post-Implementation Review.
--
-- Audit findings (2026-09-12):
--   Benefits Register   — already correct (plat_pm_benefits_reg).
--   Benefit Owners      — NOT a separate leaf: benefits.benefit_owner_user_id is a field on
--                         each benefit record, already visible/editable in the Register. Adding
--                         a second sidebar entry for the same register would be a true content
--                         duplicate (same pattern already fixed 6+ times this session) — skipped.
--   Target Dates        — same story: benefits.expected_realization_date /
--                         actual_realization_date are fields on each benefit row in the
--                         Register. Skipped for the same reason.
--   Measures            — genuine gap: BenefitMeasurementsPage (/platform/benefits/measurements)
--                         is a fully built, working page with no menu item pointing at it.
--   Realisation Tracking — genuine gap: BenefitsRealizationPage (/platform/benefits/realization)
--                         is a richer dashboard (adds benefits-vs-cost analysis on top of the
--                         simpler stat cards already embedded in the Register's own "Dashboard"
--                         tab) with no menu item pointing at it.
--   Post-Implementation Review — real gap: public.benefit_realization_reports (v40) and full
--                         CRUD service functions already existed, but no page/route consumed
--                         them at all. New pages built this change:
--                         BenefitRealizationReports.jsx (list) + BenefitRealizationReportForm.jsx
--                         (create/view/edit), registered at /platform/benefits/realization-reports.
-- ============================================================================

INSERT INTO public.menu_items (
  id, menu_code, menu_label, menu_description, route_path, parent_menu_id, menu_level,
  sort_order, methodology, menu_icon, is_active, is_visible, created_at, updated_at
)
SELECT
  gen_random_uuid(), v.mc, v.ml, v.md, v.rp,
  (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_benefits' AND COALESCE(is_deleted, FALSE) = FALSE),
  3, v.so, 'universal', v.ic, TRUE, TRUE, NOW(), NOW()
FROM (VALUES
  ('plat_pm_ben_measures',     'Measures',                    'Benefit measurement definitions and recorded values.', '/platform/benefits/measurements',           20, 'ruler'),
  ('plat_pm_ben_realisation',  'Realisation Tracking',        'Benefits realised vs. planned, including cost comparison.', '/platform/benefits/realization',       30, 'activity'),
  ('plat_pm_ben_pir',          'Post-Implementation Review',  'Formal reviews of whether planned benefits were realised.', '/platform/benefits/realization-reports', 40, 'file-check')
) AS v(mc, ml, md, rp, so, ic)
WHERE NOT EXISTS (
  SELECT 1 FROM public.menu_items WHERE menu_code = v.mc AND COALESCE(is_deleted, FALSE) = FALSE
);

-- Grants — same roles already granted the Benefits top-level group itself.
INSERT INTO public.role_menu_items (id, role_id, menu_item_id, can_view, can_use, is_active, created_at, updated_at)
SELECT gen_random_uuid(), src.role_id, dst.id, TRUE, TRUE, TRUE, NOW(), NOW()
FROM public.role_menu_items src
JOIN public.menu_items ref ON ref.id = src.menu_item_id AND ref.menu_code = 'plat_pm_benefits'
JOIN public.menu_items dst ON dst.menu_code IN ('plat_pm_ben_measures', 'plat_pm_ben_realisation', 'plat_pm_ben_pir')
  AND COALESCE(dst.is_deleted, FALSE) = FALSE
WHERE src.can_view = TRUE AND src.is_active = TRUE AND COALESCE(src.is_deleted, FALSE) = FALSE
ON CONFLICT (role_id, menu_item_id) DO UPDATE SET can_view = TRUE, can_use = TRUE, is_active = TRUE, updated_at = NOW();

-- Register the new table usage (benefit_realization_reports already registered in database_tables
-- by v40; no new table created here, so no database_tables insert needed).

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1050: Measures, Realisation Tracking, Post-Implementation Review added under Benefits';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, is_active FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_ben_measures', 'plat_pm_ben_realisation', 'plat_pm_ben_pir');
