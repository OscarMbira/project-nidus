-- =============================================================================
-- v1610 — v1359 Slice 1 (gap B5): undo the v1577 billing placement overreach
-- Plan: projectplan/v1359_v1353_to_v1356_gap_closure_plan.md
-- =============================================================================
-- SQL/v1577 meant to place its ten billing pages (plat_fin_* / sim_fin_* clients, invoices, rates, revenue, tax)
-- in Money & Resources for the pm, pmo_oversight, programme and portfolio placements, but matched EVERY menu code
-- containing "_fin_". The owner's check (v1608, 2026-11-27) shows it:
--   • CREATED placements for Banking & Financial Services register pages (fin_reg_fin_*), which belong under their
--     group entry (fin_cat_*, v1450) — they appeared a second time, at the top of Money & Resources;
--   • OVERWROTE existing placements: section, sort order and is_active — so Financial Reports (plat_pm_fin_reports,
--     v1450: Money & Resources, 35) changed order, and the retired FIN Environments page
--     (fin_reg_fin_core_banking_environments, switched off by v1469) was switched back on.
-- v1577 ran in one transaction at 2026-11-24 19:39:45.872935+00 (every row it touched carries that updated_at).
-- This file:
--   1. lists what it will change;
--   2. deletes the placements v1577 created for pages that are not billing pages;
--   3. restores what it overwrote: the retired Environments placement off again, Financial Reports sort 35;
--   4. lists anything else v1577 overwrote that this file did not restore (expected: none) — send it back if any.
-- Billing pages keep their placements. Idempotent: a second run finds nothing to change.
-- =============================================================================

-- ── 1. Before (read-only) ────────────────────────────────────────────────────
SELECT CASE WHEN pl.created_at = TIMESTAMPTZ '2026-11-24 19:39:45.872935+00' THEN 'created by v1577 — will be deleted'
            ELSE 'overwritten by v1577' END AS what,
       mi.menu_code, pl.placement_key, pl.section_code, pl.sort_order, pl.is_active
  FROM public.menu_item_placements pl
  JOIN public.menu_items mi ON mi.id = pl.menu_item_id
 WHERE mi.menu_code LIKE '%\_fin\_%'
   AND mi.menu_code NOT IN ('plat_fin_clients', 'plat_fin_invoices', 'plat_fin_rates', 'plat_fin_revenue', 'plat_fin_tax',
                            'sim_fin_clients', 'sim_fin_invoices', 'sim_fin_rates', 'sim_fin_revenue', 'sim_fin_tax')
   AND pl.placement_key IN ('pm', 'pmo_oversight', 'programme', 'portfolio')
   AND pl.updated_at = TIMESTAMPTZ '2026-11-24 19:39:45.872935+00'
 ORDER BY 1, mi.menu_code, pl.placement_key;

-- ── 2. Delete what v1577 created for non-billing pages ───────────────────────
DELETE FROM public.menu_item_placements pl
 USING public.menu_items mi
 WHERE mi.id = pl.menu_item_id
   AND mi.menu_code LIKE '%\_fin\_%'
   AND mi.menu_code NOT IN ('plat_fin_clients', 'plat_fin_invoices', 'plat_fin_rates', 'plat_fin_revenue', 'plat_fin_tax',
                            'sim_fin_clients', 'sim_fin_invoices', 'sim_fin_rates', 'sim_fin_revenue', 'sim_fin_tax')
   AND pl.placement_key IN ('pm', 'pmo_oversight', 'programme', 'portfolio')
   AND pl.created_at = TIMESTAMPTZ '2026-11-24 19:39:45.872935+00';

-- ── 3. Restore what v1577 overwrote ──────────────────────────────────────────
-- Retired page (v1469): placement off again.
UPDATE public.menu_item_placements pl
   SET is_active = FALSE, updated_at = NOW()
  FROM public.menu_items mi
 WHERE mi.id = pl.menu_item_id
   AND mi.menu_code = 'fin_reg_fin_core_banking_environments'
   AND pl.is_active = TRUE;

-- Financial Reports (v1450): Money & Resources, sort 35.
UPDATE public.menu_item_placements pl
   SET section_code = 'money_resources', sort_order = 35, updated_at = NOW()
  FROM public.menu_items mi
 WHERE mi.id = pl.menu_item_id
   AND mi.menu_code = 'plat_pm_fin_reports'
   AND pl.placement_key IN ('pm', 'pmo_oversight', 'programme', 'portfolio')
   AND pl.updated_at = TIMESTAMPTZ '2026-11-24 19:39:45.872935+00';

-- ── 4. After (read-only): anything v1577 overwrote that is still as v1577 left it ──
-- Expected: no rows. Rows here need their earlier section restored by hand — send the result back.
SELECT 'still as v1577 left it' AS what, mi.menu_code, pl.placement_key, pl.section_code, pl.sort_order, pl.is_active
  FROM public.menu_item_placements pl
  JOIN public.menu_items mi ON mi.id = pl.menu_item_id
 WHERE mi.menu_code LIKE '%\_fin\_%'
   AND mi.menu_code NOT IN ('plat_fin_clients', 'plat_fin_invoices', 'plat_fin_rates', 'plat_fin_revenue', 'plat_fin_tax',
                            'sim_fin_clients', 'sim_fin_invoices', 'sim_fin_rates', 'sim_fin_revenue', 'sim_fin_tax')
   AND pl.placement_key IN ('pm', 'pmo_oversight', 'programme', 'portfolio')
   AND pl.updated_at = TIMESTAMPTZ '2026-11-24 19:39:45.872935+00'
 ORDER BY mi.menu_code, pl.placement_key;
