-- ============================================================================
-- v1065: Fix Project Mandate menu route (Project Setup → wrong page / homepage)
-- ============================================================================
-- plat_pm_s_mandate still points at '/pmo/mandates' (v681). There is no React route for
-- that exact path — only /pmo/mandates/create|…/view|…/edit|approvals and
-- /platform/mandates/list. Unmatched paths hit App.jsx `*` → Navigate to "/" (marketing home).
--
-- Correct hub (same as v671 / pmo sidebar categories): /platform/mandates/list
-- ============================================================================

UPDATE public.menu_items
SET
  route_path = '/platform/mandates/list',
  updated_at = NOW()
WHERE menu_code = 'plat_pm_s_mandate'
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND route_path IS DISTINCT FROM '/platform/mandates/list';

-- Sibling sibling that used the same dead path (if still active)
UPDATE public.menu_items
SET
  route_path = '/platform/mandates/list',
  updated_at = NOW()
WHERE menu_code = 'plat_s_mandates'
  AND COALESCE(is_deleted, FALSE) = FALSE
  AND (
    route_path IS NULL
    OR route_path = '/pmo/mandates'
    OR route_path = ''
  );

DO $$
BEGIN
  RAISE NOTICE 'v1065: plat_pm_s_mandate (+ plat_s_mandates if needed) route_path → /platform/mandates/list';
END $$;

-- Verify:
--   SELECT menu_code, menu_label, route_path FROM public.menu_items
--   WHERE menu_code IN ('plat_pm_s_mandate', 'plat_s_mandates')
--     AND COALESCE(is_deleted, FALSE) = FALSE;
