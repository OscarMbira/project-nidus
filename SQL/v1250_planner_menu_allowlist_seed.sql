-- ============================================================================
-- v1250 (seed): allow-list every Project Planner (`pln_`) menu row — v1239 Slice 6.3
-- Run after v1249 and v1254 (which creates the pln_ menu rows). Idempotent.
-- plat_/sim_ rows are never allow-listed (the table's CHECK refuses them).
-- ============================================================================

INSERT INTO public.planner_menu_allowlist (menu_item_id, menu_code)
SELECT mi.id, mi.menu_code
FROM public.menu_items mi
WHERE mi.menu_code LIKE 'pln\_%'
  AND COALESCE(mi.is_deleted, FALSE) = FALSE
ON CONFLICT (menu_item_id) DO NOTHING;

DO $$
DECLARE v_count INT;
BEGIN
  SELECT COUNT(*) INTO v_count FROM public.planner_menu_allowlist;
  IF v_count = 0 THEN
    RAISE WARNING 'v1250: no pln_ menu rows found — run v1254 first, then re-run this file';
  END IF;
  RAISE NOTICE 'v1250: % planner menu item(s) allow-listed', v_count;
END $$;
