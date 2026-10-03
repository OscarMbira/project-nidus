-- ============================================================================
-- v1019: Fix get_account_available_menu_item_ids() silently truncating at 1000 rows
-- ============================================================================
-- Root cause of "Cost Management shows only Budget, not My Expenses/Expense
-- Approvals/Financial Reports" (all four confirmed correctly granted, active,
-- and visible in menu_items/role_menu_items — this was never a grants problem).
--
-- get_account_available_menu_item_ids() (v918/v924/v1011) is declared
-- `RETURNS TABLE(menu_item_id UUID)` — a row-set. PostgREST caps ANY row-set
-- result at 1000 rows by default unless the client explicitly paginates via
-- Range headers, which useMenu.js's plain `.rpc(...)` call does not do. The
-- function has no ORDER BY, so for an account with 1000+ available items
-- (confirmed live: this account's account_industries selection plus Core/
-- Generic PM produces 1000+ ids), WHICH 1000 survive the truncation is
-- arbitrary — confirmed live: My Expenses/Expense Approvals/Financial Reports
-- (created June) were silently cut, while a brand-new Budget row (created
-- today) happened to land inside the truncated set.
--
-- v1011 already rewrote this function's body for query speed but didn't
-- address this separate truncation issue — measured then as "1.7s and 1000
-- rows returned (PostgREST's default page cap — the true count is likely
-- higher)" and flagged as a hint, never actually fixed.
--
-- Fix: return a single UUID[] value instead of a row-set. PostgREST does not
-- apply its collection row-cap to a scalar/array-typed return — the whole
-- array comes back in one response regardless of size. Client code
-- (useMenu.js/useSimMenu.js) updated in the same change to consume the new
-- shape (a plain array of ids, not an array of {menu_item_id} row objects).
-- ============================================================================

-- CREATE OR REPLACE cannot change an existing function's return type
-- (TABLE(menu_item_id UUID) → UUID[]) — must drop first.
DROP FUNCTION IF EXISTS public.get_account_available_menu_item_ids(UUID);

CREATE FUNCTION public.get_account_available_menu_item_ids(p_account_id UUID)
RETURNS UUID[]
LANGUAGE sql
STABLE
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
  SELECT ARRAY_AGG(mi.id)
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
  'v918/v924/v1011/v1019: org-level menu availability (Core + Generic PM + selected Industry Packs − '
  'organisation_disabled_capabilities), fail-open for any menu item never classified into a pack. '
  'v1019 changed the return type from TABLE(menu_item_id UUID) to UUID[] — PostgREST silently caps '
  'row-set results at 1000 rows with no ORDER BY to make that deterministic, which was dropping '
  'arbitrary legitimately-available items for any account with 1000+ available ids. An array return '
  'is not subject to that cap. Consumed by useMenu.js/useSimMenu.js as an ADDITIONAL filter applied '
  'strictly after the existing role-grant hydration — never expands what a role grants, only narrows '
  'it to what the organisation makes available.';

-- DROP FUNCTION resets grants — re-apply (matches v918/v924's original grant to authenticated).
GRANT EXECUTE ON FUNCTION public.get_account_available_menu_item_ids(UUID) TO authenticated;

DO $$
BEGIN
  RAISE NOTICE '================================================';
  RAISE NOTICE 'v1019: get_account_available_menu_item_ids() now returns UUID[] — no more 1000-row truncation';
  RAISE NOTICE '================================================';
END $$;
