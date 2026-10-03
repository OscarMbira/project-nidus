-- ============================================================================
-- v1043: Fold "Strategy & OKRs" into Benefits
-- ============================================================================
-- Per user decision (2026-09-11): "Cross-Framework" had degraded to a 2-item wrapper for
-- project_manager (Knowledge & Resources — retired as redundant, v1042 — and Strategy & OKRs),
-- not worth its own top-level slot. Strategy & OKRs is a real, substantive feature (cycles,
-- objectives, key results, check-ins), so it's folded into Benefits rather than retired — OKR
-- progress tracking and benefits realization are closely related PM concepts (both measure
-- whether intended value/goals were actually achieved).
--
-- Same-id re-parent (role_menu_items grants keyed by menu_item_id, no grant migration needed —
-- identical pattern to v966h/i/j/k/o and v981/v1038/v1040). plat_sec_cross_fw itself is
-- deliberately NOT touched/deactivated here — it still has real, active children
-- (Automation/Collaboration/Dashboards & Analytics/Integrations/Notification Preferences/
-- Procurement & Contracts/Project Settings/Resources Hub) granted to other roles (pmo_admin
-- etc.); this migration only affects what project_manager (and any other role with
-- plat_xf_okr granted) sees.
-- ============================================================================

UPDATE public.menu_items
SET parent_menu_id = (SELECT id FROM public.menu_items WHERE menu_code = 'plat_pm_benefits' AND COALESCE(is_deleted, FALSE) = FALSE),
    menu_level = 2, sort_order = 90, updated_at = NOW()
WHERE menu_code = 'plat_xf_okr' AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1043: Strategy & OKRs (plat_xf_okr) re-parented from Cross-Framework to Benefits';
  RAISE NOTICE '================================================';
END $$;

-- Post-run verification (run manually):
--   SELECT menu_code, menu_label, route_path, is_active,
--     (SELECT menu_code FROM public.menu_items p WHERE p.id = m.parent_menu_id) AS parent_code
--   FROM public.menu_items m
--   WHERE menu_code = 'plat_xf_okr';
--   -- expect parent_code = plat_pm_benefits.
