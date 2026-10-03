-- ============================================================================
-- v963aa: PMIS Core Gap Closure — Phase 17: Custom Fields stub redirect
-- ============================================================================
-- projectplan/v963_pmis_core_gap_closure_plan.md Phase 17.
-- The GAP-04 Custom Fields stub (pmis-gaps module) was 100% redundant with the already-built
-- Local Data Extensions module. Point the existing sidebar menu items straight at the real
-- feature's route instead of the old stub route (the stub route itself now also client-side
-- redirects via <Navigate>, so this is defence in depth, not the only fix).
-- ============================================================================

UPDATE public.menu_items
SET route_path = '/app/local-data-extensions/field-definitions', updated_at = NOW()
WHERE menu_code IN ('pm_custom_fields', 'pmo_custom_fields', 'platform_custom_fields')
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- Simulator parity (rule 34.1) — same redirect for the sim-side menu items (v649).
UPDATE public.menu_items
SET route_path = '/simulator/local-data-extensions/field-definitions', updated_at = NOW()
WHERE menu_code IN ('sim_pm_custom_fields', 'sim_pmo_custom_fields')
  AND COALESCE(is_deleted, FALSE) = FALSE;

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.menu_items
  WHERE menu_code IN (
    'pm_custom_fields', 'pmo_custom_fields', 'platform_custom_fields',
    'sim_pm_custom_fields', 'sim_pmo_custom_fields'
  )
  AND (
    route_path = '/app/local-data-extensions/field-definitions'
    OR route_path = '/simulator/local-data-extensions/field-definitions'
  );
  RAISE NOTICE 'v963aa: % custom-fields menu_items rows redirected to Local Data Extensions', v_count;
END $$;
