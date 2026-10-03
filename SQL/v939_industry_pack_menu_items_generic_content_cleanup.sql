-- ============================================================================
-- v939: Fix over-broad industry pack menu-item classification (v930 sidebar grouping bug)
-- ============================================================================
-- Root cause: v921's derivation seeds industry_pack_menu_items purely from role_menu_items
-- grants on industry-tagged built-in roles (SQL/v921, step 2). Those roles were themselves
-- seeded (v907/v913) by COPYING their full role_menu_items grant set from an existing generic
-- tier_source role (e.g. it_programme_manager copies programme_manager's grants wholesale) —
-- correct for RBAC (an IT Programme Manager legitimately needs Template Library, Document
-- Signatory, etc.), but it means v921's mechanical derivation tags those same generic/universal
-- menu items as "IT & Software Pack content" too, alongside every other industry. The result:
-- groupMenuTreeByIndustryPack() (v930, apps/*/src/config/pmoMenuHierarchyUtils.js) buckets
-- Template Library / Organisational Templates / Document Signatory / Field Templates etc. under
-- EVERY selected industry's section instead of leaving them in "Core Project Management" —
-- reported live: IT & Software Pack > Portfolio & Delivery showing these exact generic items.
--
-- Fix: a menu item claimed by a MAJORITY of the 9 real industry packs (i.e. more than half)
-- is by definition not industry-specific — remove it from every non-Cross-Industry pack's
-- classification. groupMenuTreeByIndustryPack()'s owner lookup already falls through to 'core'
-- for any menu_code with no industry_pack_menu_items row (see its `|| 'core'` default), so no
-- separate insert into the Cross-Industry pack is needed — removing the over-broad rows is
-- sufficient. Items genuinely specific to 1-4 industries are untouched.
--
-- Idempotent: safe to re-run (a second run finds nothing left above the threshold and deletes
-- 0 rows). NOTE — if SQL/v921 is ever re-run after new industry-tagged roles/grants are added,
-- re-run this file immediately after: v921's derivation is purely additive and does not itself
-- know about this majority-rule exclusion, so it would re-introduce the same over-broad rows.
-- Prerequisites: v906/v907/v913 (industry role catalog), v920/v921 (industry_packs schema+seed)
-- ============================================================================

DO $$
DECLARE
  v_total_packs INT;
  v_removed INT;
BEGIN
  SELECT COUNT(*) INTO v_total_packs
  FROM public.industry_packs ip
  JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
  WHERE ic.name <> 'Cross-Industry' AND ip.is_active = TRUE;

  WITH pack_counts AS (
    SELECT ipmi.menu_item_id, COUNT(DISTINCT ipmi.industry_pack_id) AS pack_count
    FROM public.industry_pack_menu_items ipmi
    JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id
    JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
    WHERE ic.name <> 'Cross-Industry'
    GROUP BY ipmi.menu_item_id
  ),
  generic_items AS (
    SELECT menu_item_id
    FROM pack_counts
    WHERE pack_count > v_total_packs / 2.0
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

  RAISE NOTICE 'v939: % of % real industry packs considered; removed % over-broad industry_pack_menu_items rows (majority-shared, now falls through to Core Project Management)', v_total_packs, v_total_packs, v_removed;
END $$;
