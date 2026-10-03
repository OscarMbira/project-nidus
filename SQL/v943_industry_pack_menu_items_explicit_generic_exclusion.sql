-- ============================================================================
-- v943: Precise, minimal fix for the reported "generic PM chrome under IT & Software Pack" bug
-- ============================================================================
-- Both prior attempts were too broad and risked (v940 confirmed) deleting genuinely
-- industry-specific content along with the intended generic items:
--   - v939: "shared by a majority of the 9 industry packs" — too weak, didn't clear these items.
--   - v940: "also granted to any untagged/generic built-in role" — too strong, matched
--     everything also granted to admin/oversight roles (pmo_admin, portfolio_manager, etc.),
--     which includes the real, hand-curated Local Register Engine content (v934 grants those to
--     the same role set for oversight access). SQL/v942 restored what v940 wrongly removed.
--
-- This migration instead targets EXACTLY the small, known, explicitly-named set of menu items
-- reported live under "IT & Software Pack > Portfolio & Delivery" that are template/document
-- administration tooling, not IT-specific business content — matched by exact label, not a
-- heuristic, so there is no risk of collateral removal of anything else. If a future report
-- names another generic item mis-bucketed under an industry pack, add its label to this list in
-- a NEW migration rather than reaching for a broad heuristic again.
--
-- Idempotent: safe to re-run. Same v921 re-run caveat as v939/v940 applies: if v921 (or v934) is
-- ever re-run after new grants are added, re-run this file afterward too.
-- ============================================================================

DO $$
DECLARE
  v_removed INT;
BEGIN
  WITH generic_items AS (
    SELECT id AS menu_item_id
    FROM public.menu_items
    WHERE menu_label IN (
      'Template Library',
      'Organisational Templates',
      'Document Signatory',
      'Field Templates',
      'Project Execution'
    )
  ),
  deleted AS (
    DELETE FROM public.industry_pack_menu_items ipmi
    USING generic_items gi, public.industry_packs ip, public.industry_categories ic
    WHERE ipmi.menu_item_id = gi.menu_item_id
      AND ipmi.industry_pack_id = ip.id
      AND ip.industry_category_id = ic.id
      AND ic.name <> 'Cross-Industry'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_removed FROM deleted;

  RAISE NOTICE 'v943: removed % industry_pack_menu_items rows for the 5 explicitly-named generic template/admin items (now fall through to Core Project Management)', v_removed;
END $$;

-- Read-only verification — returns rows directly in the Results tab.
SELECT mi.menu_label, ic.name AS still_classified_under
FROM public.industry_pack_menu_items ipmi
JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id
JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id
WHERE mi.menu_label IN (
  'Template Library', 'Organisational Templates', 'Document Signatory',
  'Field Templates', 'Project Execution'
)
ORDER BY mi.menu_label, ic.name;
