-- =============================================================================
-- v1011: Optimize get_account_available_menu_item_ids() — statement timeout fix
-- =============================================================================
-- The v924 version ran 3 correlated EXISTS subqueries per menu_items row (fail-open
-- classification check, org-pack membership check, org-disabled check). Measured live
-- (service-role, zero contention, single isolated call): 1.7s and 1000 rows returned
-- (PostgREST's default page cap — the true menu_items count is likely higher). Under real
-- concurrent load (this RPC firing inside the same request batch as several other menu
-- queries), this was very plausibly the dominant contributor to the "canceling statement
-- due to statement timeout" errors seen loading the sidebar for project-scoped users.
--
-- This version is logically IDENTICAL (same fail-open semantics, same result set) but
-- restructured from per-row correlated EXISTS into LEFT JOINs against pre-computed,
-- DISTINCT-deduplicated CTEs, so Postgres can execute it as a small number of hash joins
-- over menu_items instead of re-evaluating 3 subqueries for every row. Each of the three
-- joined CTEs is DISTINCT on menu_item_id, so no row fan-out/duplication is introduced —
-- the join is 1:1-or-0 per menu_items row, exactly like the original EXISTS checks were.
--
--   NOT EXISTS (classified WHERE menu_item_id = mi.id)              <=> ci.menu_item_id IS NULL
--   EXISTS (org_pack_items WHERE menu_item_id = mi.id)               <=> opi.menu_item_id IS NOT NULL
--   NOT EXISTS (org_disabled_items WHERE menu_item_id = mi.id)       <=> odi.menu_item_id IS NULL
--
-- See SQL/v924_account_available_menu_items_rpc.sql for the original's full design notes
-- (fail-open rationale, Generic PM/Cross-Industry always-on, etc.) — unchanged here.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_account_available_menu_item_ids(p_account_id UUID)
RETURNS TABLE(menu_item_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH org_industries AS (
    SELECT industry_category_id FROM public.account_industries WHERE account_id = p_account_id
    UNION
    SELECT id FROM public.industry_categories WHERE name = 'Cross-Industry' AND is_active = TRUE
  ),
  org_pack_item_ids AS (
    SELECT DISTINCT ipmi.menu_item_id
    FROM public.industry_pack_menu_items ipmi
    JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id AND ip.is_active = TRUE
    WHERE ip.industry_category_id IN (SELECT industry_category_id FROM org_industries)
  ),
  org_disabled_item_ids AS (
    SELECT DISTINCT ipmi.menu_item_id
    FROM public.organisation_disabled_capabilities odc
    JOIN public.industry_pack_menu_items ipmi ON ipmi.id = odc.industry_pack_menu_item_id
    WHERE odc.account_id = p_account_id
  ),
  classified_item_ids AS (
    SELECT DISTINCT menu_item_id FROM public.industry_pack_menu_items
  )
  SELECT mi.id
  FROM public.menu_items mi
  LEFT JOIN classified_item_ids ci ON ci.menu_item_id = mi.id
  LEFT JOIN org_pack_item_ids opi ON opi.menu_item_id = mi.id
  LEFT JOIN org_disabled_item_ids odi ON odi.menu_item_id = mi.id
  WHERE mi.is_active = TRUE
    AND (
      ci.menu_item_id IS NULL
      OR (opi.menu_item_id IS NOT NULL AND odi.menu_item_id IS NULL)
    );
$$;

COMMENT ON FUNCTION public.get_account_available_menu_item_ids(UUID) IS
  'v918/v924/v1011: org-level menu availability (Core + Generic PM + selected Industry Packs − '
  'organisation_disabled_capabilities), fail-open for any menu item never classified into a '
  'pack. v1011 rewrote the body from per-row correlated EXISTS subqueries to LEFT JOINs '
  'against DISTINCT CTEs for performance (measured 1.7s under the old version, zero '
  'contention) — semantics unchanged. Consumed by useMenu.js/useSimMenu.js as an ADDITIONAL '
  'filter applied strictly after the existing role-grant hydration — never expands what a '
  'role grants, only narrows it to what the organisation makes available.';

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1011: get_account_available_menu_item_ids() rewritten for performance';
  RAISE NOTICE '================================================';
END $$;
