-- ============================================================================
-- v941: Diagnostic ONLY — no data changes. Returns rows (not RAISE NOTICE) so the
-- output shows directly in the SQL editor's Results tab regardless of whether the
-- client surfaces NOTICE/log messages.
-- ============================================================================
-- Run this after v940 and paste back the full result set (or a screenshot of it).

SELECT
  mi.menu_label,
  mi.menu_code,
  mi.parent_menu_id,
  ic.name AS pack_industry_name,
  ip.pack_name,
  ipmi.industry_pack_id
FROM public.industry_pack_menu_items ipmi
JOIN public.industry_packs ip ON ip.id = ipmi.industry_pack_id
JOIN public.industry_categories ic ON ic.id = ip.industry_category_id
JOIN public.menu_items mi ON mi.id = ipmi.menu_item_id
WHERE ic.name = 'IT & Software'
  AND (
    mi.menu_label ILIKE '%template%' OR
    mi.menu_label ILIKE '%signatory%' OR
    mi.menu_label ILIKE '%organisational%' OR
    mi.menu_label ILIKE '%execution%'
  )
ORDER BY mi.menu_label;

-- If the query above returns ZERO rows, the DB-side classification is already clean and the
-- sidebar is showing STALE data — do a hard reload (Ctrl+Shift+R / Cmd+Shift+R) or clear
-- localStorage for this site and reload, not just a normal refresh, then check again before
-- assuming the SQL fix didn't work.
