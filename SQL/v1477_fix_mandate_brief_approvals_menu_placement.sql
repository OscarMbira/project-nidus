-- ============================================================================
-- v1477: Mandate / Brief Approvals — wrong Project Setup section + dashboard bounce
-- ============================================================================
-- Symptoms (live): under consolidated Project Setup, PMO users saw "Mandate Approvals" and
-- "Project Brief Approvals"; clicking them landed on /platform/dashboard?projectId=…
--
-- Causes:
--   1) v1460/v1461 default_section_code keyword order: "mandate"/"brief" mapped those workflow
--      leaves to project_setup before the later "approval" → risks_governance rule ran.
--   2) They were unplaced for pmo_oversight, so the safety-net used that wrong default.
--   3) (code) /platform/mandates and /platform/brief were PM-shared prefixes, so approval URLs
--      forced the PM shell and RoleScopeGate sent PMO-only users to the dashboard. Fixed in
--      packages/shared/src/utils/menuLayoutUtils.js (segment-boundary match + exclusions).
--
-- Fix: park the two canonical workflow leaves in risks_governance under the workflows category
-- for pmo_oversight, and correct default_section_code. Project Mandate / Project Brief
-- (plat_pm_s_*) stay in project_setup unchanged.
-- Idempotent. Run after v1476.
-- ============================================================================

UPDATE public.menu_items
SET default_section_code = 'risks_governance',
    updated_at = NOW()
WHERE menu_code IN (
  'pmo-workflows-mandate-approvals',
  'pmo-workflows-brief-approvals'
)
  AND COALESCE(is_deleted, FALSE) = FALSE;

INSERT INTO public.menu_item_placements (
  menu_item_id, placement_key, section_code, parent_menu_item_id, slot_key, sort_order, scope
)
SELECT
  mi.id,
  'pmo_oversight',
  'risks_governance',
  (
    SELECT id
    FROM public.menu_items
    WHERE menu_code = 'pmo-cat-workflows-approvals'
      AND COALESCE(is_deleted, FALSE) = FALSE
    LIMIT 1
  ),
  NULL,
  v.sort_order,
  'organisation'
FROM public.menu_items mi
JOIN (VALUES
  ('pmo-workflows-mandate-approvals', 10),
  ('pmo-workflows-brief-approvals',   20)
) AS v(menu_code, sort_order) ON v.menu_code = mi.menu_code
WHERE COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id, placement_key) DO UPDATE SET
  section_code = EXCLUDED.section_code,
  parent_menu_item_id = EXCLUDED.parent_menu_item_id,
  sort_order = EXCLUDED.sort_order,
  scope = EXCLUDED.scope,
  is_active = TRUE,
  updated_at = NOW();

-- Keep routes on the platform approval dashboards (PMO twin for mandate also exists).
UPDATE public.menu_items
SET route_path = CASE menu_code
      WHEN 'pmo-workflows-mandate-approvals' THEN '/platform/mandates/approvals'
      WHEN 'pmo-workflows-brief-approvals' THEN '/platform/briefs/approvals'
      ELSE route_path
    END,
    is_visible = TRUE,
    is_active = TRUE,
    updated_at = NOW()
WHERE menu_code IN (
  'pmo-workflows-mandate-approvals',
  'pmo-workflows-brief-approvals'
)
  AND COALESCE(is_deleted, FALSE) = FALSE;

-- Check
SELECT mi.menu_code, mi.menu_label, mi.route_path, mi.default_section_code,
       p.placement_key, p.section_code, parent.menu_code AS parent_code
FROM public.menu_items mi
LEFT JOIN public.menu_item_placements p
  ON p.menu_item_id = mi.id AND p.placement_key = 'pmo_oversight' AND p.is_active = TRUE
LEFT JOIN public.menu_items parent ON parent.id = p.parent_menu_item_id
WHERE mi.menu_code IN (
  'pmo-workflows-mandate-approvals',
  'pmo-workflows-brief-approvals',
  'plat_pm_s_mandate',
  'plat_pm_s_brief'
)
ORDER BY mi.menu_code;

DO $$
BEGIN
  RAISE NOTICE 'v1477: Mandate/Brief Approvals → risks_governance (pmo_oversight); Project Mandate/Brief unchanged.';
END $$;
